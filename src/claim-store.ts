/**
 * cellar-door-exit — Claim Store
 *
 * Local storage and retrieval of trust claims, attestations, and credentials
 * associated with EXIT markers. The claim store is a local-first database
 * that agents use to accumulate and present trust evidence.
 *
 * Design: append-only by default, with optional GDPR deleteBySubject().
 * Claims are stored as opaque blobs — the store validates structure, not truth.
 */

import { createHash } from "node:crypto";

// ─── Types ───────────────────────────────────────────────────────────────────

/** A stored claim — any attestation, credential, or trust artifact. */
export interface StoredClaim {
  /** Unique claim ID (content-addressed hash if not provided). */
  id: string;
  /** DID of the subject this claim is about. */
  subject: string;
  /** Type of claim (e.g., "exit_marker", "witness_attestation", "identity", "reputation", "custom"). */
  type: ClaimType | string;
  /** The claim payload — opaque to the store. */
  payload: Record<string, unknown>;
  /** Who issued this claim (DID or URI). */
  issuer: string;
  /** When this claim was created (ISO 8601). */
  issuedAt: string;
  /** When this claim expires (ISO 8601). Null = no expiry. */
  expiresAt?: string;
  /** Optional tags for filtering. */
  tags?: string[];
  /** Optional reference to an EXIT marker ID. */
  markerRef?: string;
}

/** Well-known claim types. */
export enum ClaimType {
  /** Reference to an EXIT marker. */
  ExitMarker = "exit_marker",
  /** Witness attestation from a third party. */
  WitnessAttestation = "witness_attestation",
  /** Identity claim (opaque). */
  Identity = "identity",
  /** TSA timestamp receipt. */
  Timestamp = "timestamp",
  /** Custom / application-defined. */
  Custom = "custom",
}

/** Query options for retrieving claims. */
export interface ClaimQuery {
  /** Filter by subject DID. */
  subject?: string;
  /** Filter by claim type. */
  type?: ClaimType | string;
  /** Filter by issuer. */
  issuer?: string;
  /** Filter by tag (any match). */
  tags?: string[];
  /** Filter by marker reference. */
  markerRef?: string;
  /** Only include non-expired claims. Default: true. */
  excludeExpired?: boolean;
  /** Maximum results. Default: 100. */
  limit?: number;
  /** Sort order. Default: "newest". */
  sort?: "newest" | "oldest";
}

/** Claim store statistics. */
export interface ClaimStoreStats {
  totalClaims: number;
  claimsByType: Record<string, number>;
  uniqueSubjects: number;
  uniqueIssuers: number;
  expiredClaims: number;
}

// ─── Claim Store Interface ───────────────────────────────────────────────────

/** Abstract claim store — implement for different backends. */
export interface ClaimStoreBackend {
  put(claim: StoredClaim): Promise<void> | void;
  get(id: string): Promise<StoredClaim | null> | StoredClaim | null;
  query(q: ClaimQuery): Promise<StoredClaim[]> | StoredClaim[];
  delete(id: string): Promise<boolean> | boolean;
  deleteBySubject(subject: string): Promise<number> | number;
  stats(): Promise<ClaimStoreStats> | ClaimStoreStats;
}

// ─── In-Memory Implementation ────────────────────────────────────────────────

/**
 * In-memory claim store. Suitable for testing and single-session use.
 * For persistence, implement ClaimStoreBackend with a database.
 */
export class MemoryClaimStore implements ClaimStoreBackend {
  private claims: Map<string, StoredClaim> = new Map();

  put(claim: StoredClaim): void {
    if (!claim.id) {
      claim = { ...claim, id: this.computeId(claim) };
    }
    this.validateClaim(claim);
    this.claims.set(claim.id, { ...claim });
  }

  get(id: string): StoredClaim | null {
    return this.claims.get(id) ?? null;
  }

  query(q: ClaimQuery): StoredClaim[] {
    const excludeExpired = q.excludeExpired !== false;
    const limit = q.limit ?? 100;
    const now = new Date().toISOString();

    let results = Array.from(this.claims.values());

    // Apply filters
    if (q.subject) results = results.filter(c => c.subject === q.subject);
    if (q.type) results = results.filter(c => c.type === q.type);
    if (q.issuer) results = results.filter(c => c.issuer === q.issuer);
    if (q.markerRef) results = results.filter(c => c.markerRef === q.markerRef);
    if (q.tags?.length) {
      results = results.filter(c =>
        c.tags?.some(t => q.tags!.includes(t))
      );
    }
    if (excludeExpired) {
      results = results.filter(c => !c.expiresAt || c.expiresAt > now);
    }

    // Sort
    if (q.sort === "oldest") {
      results.sort((a, b) => a.issuedAt.localeCompare(b.issuedAt));
    } else {
      results.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
    }

    return results.slice(0, limit);
  }

  delete(id: string): boolean {
    return this.claims.delete(id);
  }

  /** GDPR Article 17 — delete all claims for a subject. Returns count deleted. */
  deleteBySubject(subject: string): number {
    let count = 0;
    for (const [id, claim] of this.claims) {
      if (claim.subject === subject) {
        this.claims.delete(id);
        count++;
      }
    }
    return count;
  }

  stats(): ClaimStoreStats {
    const now = new Date().toISOString();
    const claims = Array.from(this.claims.values());
    const byType: Record<string, number> = {};
    const subjects = new Set<string>();
    const issuers = new Set<string>();
    let expired = 0;

    for (const c of claims) {
      byType[c.type] = (byType[c.type] ?? 0) + 1;
      subjects.add(c.subject);
      issuers.add(c.issuer);
      if (c.expiresAt && c.expiresAt <= now) expired++;
    }

    return {
      totalClaims: claims.length,
      claimsByType: byType,
      uniqueSubjects: subjects.size,
      uniqueIssuers: issuers.size,
      expiredClaims: expired,
    };
  }

  /** Clear all claims. */
  clear(): void {
    this.claims.clear();
  }

  private computeId(claim: StoredClaim): string {
    const hash = createHash("sha256");
    hash.update(claim.subject);
    hash.update(claim.type);
    hash.update(claim.issuer);
    hash.update(claim.issuedAt);
    hash.update(JSON.stringify(claim.payload));
    return `claim:${hash.digest("hex").slice(0, 32)}`;
  }

  private validateClaim(claim: StoredClaim): void {
    if (!claim.subject) throw new Error("Claim must have a subject");
    if (!claim.type) throw new Error("Claim must have a type");
    if (!claim.issuer) throw new Error("Claim must have an issuer");
    if (!claim.issuedAt) throw new Error("Claim must have an issuedAt timestamp");
    if (!claim.payload || typeof claim.payload !== "object") {
      throw new Error("Claim must have an object payload");
    }
  }
}

// ─── Convenience: Create Claims from EXIT Artifacts ──────────────────────────

import type { ExitMarker, TimestampAttachment, WitnessAttachment, IdentityClaimAttachment } from "./types.js";

/**
 * Create a claim from an EXIT marker.
 */
export function claimFromMarker(marker: ExitMarker): StoredClaim {
  return {
    id: `claim:marker:${marker.id}`,
    subject: marker.subject,
    type: ClaimType.ExitMarker,
    payload: {
      markerId: marker.id,
      origin: marker.origin,
      exitType: marker.exitType,
      status: marker.status,
      selfAttested: marker.selfAttested,
    },
    issuer: marker.subject,
    issuedAt: marker.timestamp,
    markerRef: marker.id,
  };
}

/**
 * Create claims from a marker's trust enhancers.
 */
export function claimsFromTrustEnhancers(
  marker: ExitMarker
): StoredClaim[] {
  const claims: StoredClaim[] = [];
  const te = marker.trustEnhancers;
  if (!te) return claims;

  // Timestamps
  if (te.timestamps) {
    for (const ts of te.timestamps) {
      claims.push({
        id: `claim:tsa:${ts.hash.slice(0, 16)}`,
        subject: marker.subject,
        type: ClaimType.Timestamp,
        payload: { tsaUrl: ts.tsaUrl, hash: ts.hash, timestamp: ts.timestamp },
        issuer: ts.tsaUrl,
        issuedAt: ts.timestamp,
        markerRef: marker.id,
      });
    }
  }

  // Witnesses
  if (te.witnesses) {
    for (const w of te.witnesses) {
      claims.push({
        id: `claim:witness:${w.witnessDid.slice(-16)}:${marker.id.slice(-8)}`,
        subject: marker.subject,
        type: ClaimType.WitnessAttestation,
        payload: { attestation: w.attestation, signatureType: w.signatureType },
        issuer: w.witnessDid,
        issuedAt: w.timestamp,
        markerRef: marker.id,
      });
    }
  }

  // Identity claims
  if (te.identityClaims) {
    for (const ic of te.identityClaims) {
      claims.push({
        id: `claim:identity:${ic.scheme}:${ic.value.slice(-16)}`,
        subject: marker.subject,
        type: ClaimType.Identity,
        payload: { scheme: ic.scheme, value: ic.value, issuer: ic.issuer },
        issuer: ic.issuer ?? marker.subject,
        issuedAt: ic.issuedAt,
        expiresAt: ic.expiresAt,
        markerRef: marker.id,
      });
    }
  }

  return claims;
}

/**
 * Ingest a marker and all its trust enhancers into a claim store.
 */
export function ingestMarker(
  store: ClaimStoreBackend,
  marker: ExitMarker
): void {
  store.put(claimFromMarker(marker));
  for (const claim of claimsFromTrustEnhancers(marker)) {
    store.put(claim);
  }
}
