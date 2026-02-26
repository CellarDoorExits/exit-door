/**
 * cellar-door-exit — Dispute Resolution Framework
 *
 * Key principle: "Disputes never block exit" — a disputed marker is still
 * valid, just flagged. Disputes are metadata ON the marker.
 */

import { sign, verify, publicKeyFromDid, didFromPublicKey } from "./crypto.js";
import { canonicalize } from "./marker.js";
import type { ExitMarker, DataIntegrityProof } from "./types.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DisputeState = "none" | "active" | "resolved" | "expired";

export interface DisputeRecord {
  /** Unique dispute identifier. */
  id: string;
  /** ID of the marker being disputed. */
  markerId: string;
  /** DID of the entity filing the dispute. */
  filerDid: string;
  /** Reason for the dispute. */
  reason: string;
  /** DID of the arbiter assigned to resolve. */
  arbiterDid: string;
  /** When the dispute was filed (ISO 8601 UTC). */
  filedAt: string;
  /** When the dispute window expires (ISO 8601 UTC). Optional. */
  expiresAt?: string;
  /** References to evidence (hashes or URIs). */
  evidenceRefs: string[];
  /** Resolution outcome, if resolved. */
  resolution?: DisputeResolution;
}

export interface DisputeResolution {
  /** The arbiter's decision. */
  outcome: "upheld" | "dismissed" | "settled";
  /** Brief summary of the resolution. */
  summary: string;
  /** When the resolution was issued (ISO 8601 UTC). */
  resolvedAt: string;
  /** Arbiter's cryptographic signature over the resolution. */
  proof: DataIntegrityProof;
}

// ─── Functions ───────────────────────────────────────────────────────────────

/**
 * Create a new dispute record against an EXIT marker.
 *
 * @param markerId - ID of the marker being disputed.
 * @param reason - Reason for the dispute.
 * @param arbiterDid - DID of the arbiter.
 * @param filerDid - DID of the entity filing.
 * @param evidenceRefs - Optional evidence references.
 * @param expiresAt - Optional expiry (ISO 8601).
 */
export function createDispute(
  markerId: string,
  reason: string,
  arbiterDid: string,
  filerDid: string,
  evidenceRefs: string[] = [],
  expiresAt?: string,
): DisputeRecord {
  if (!markerId) throw new Error("markerId is required");
  if (!reason) throw new Error("reason is required");
  if (!arbiterDid || !arbiterDid.startsWith("did:")) throw new Error("arbiterDid must be a valid DID");
  if (!filerDid || !filerDid.startsWith("did:")) throw new Error("filerDid must be a valid DID");

  const now = new Date().toISOString();
  return {
    id: `dispute:${markerId}:${Date.now()}`,
    markerId,
    filerDid,
    reason,
    arbiterDid,
    filedAt: now,
    expiresAt,
    evidenceRefs,
  };
}

/**
 * Resolve a dispute. The arbiter signs the resolution with their private key.
 *
 * @param dispute - The dispute to resolve.
 * @param outcome - The resolution outcome.
 * @param summary - Brief summary of the decision.
 * @param arbiterPrivateKey - Arbiter's Ed25519 private key.
 * @returns Updated DisputeRecord with resolution attached.
 */
export function resolveDispute(
  dispute: DisputeRecord,
  outcome: "upheld" | "dismissed" | "settled",
  summary: string,
  arbiterPrivateKey: Uint8Array,
): DisputeRecord {
  if (dispute.resolution) throw new Error("Dispute is already resolved");

  const resolvedAt = new Date().toISOString();
  const payload = canonicalize({ disputeId: dispute.id, outcome, summary, resolvedAt });
  const data = new TextEncoder().encode(payload);
  const signature = sign(data, arbiterPrivateKey);

  const resolution: DisputeResolution = {
    outcome,
    summary,
    resolvedAt,
    proof: {
      type: "Ed25519Signature2020",
      created: resolvedAt,
      verificationMethod: dispute.arbiterDid,
      proofValue: Buffer.from(signature).toString("base64"),
    },
  };

  return { ...dispute, resolution };
}

/**
 * Verify the arbiter's signature on a dispute resolution.
 *
 * @param dispute - The dispute with resolution to verify.
 * @returns true if the signature is valid.
 */
export function verifyDisputeResolution(dispute: DisputeRecord): boolean {
  if (!dispute.resolution) return false;

  const { outcome, summary, resolvedAt, proof } = dispute.resolution;
  const payload = canonicalize({ disputeId: dispute.id, outcome, summary, resolvedAt });
  const data = new TextEncoder().encode(payload);

  try {
    const publicKey = publicKeyFromDid(proof.verificationMethod);
    const signature = Uint8Array.from(Buffer.from(proof.proofValue, "base64"));
    return verify(data, signature, publicKey);
  } catch {
    return false;
  }
}

/**
 * Check if a marker has an active dispute (via Module C).
 *
 * @param marker - The EXIT marker to check.
 * @returns true if the marker has at least one unresolved dispute.
 */
export function isDisputed(marker: ExitMarker): boolean {
  return getDisputeStatus(marker) === "active";
}

/**
 * Get the dispute status of a marker.
 *
 * Checks Module C disputes and the core status field.
 *
 * @param marker - The EXIT marker.
 * @returns The dispute state.
 */
export function getDisputeStatus(marker: ExitMarker): DisputeState {
  // Check Module C disputes
  const disputes = marker.dispute?.disputes;
  if (!disputes || disputes.length === 0) {
    // Fall back to core status
    return marker.status === "disputed" ? "active" : "none";
  }

  const now = new Date();
  let hasActive = false;
  let hasResolved = false;

  for (const d of disputes) {
    if (d.resolution) {
      hasResolved = true;
    } else if (d.disputeExpiry && new Date(d.disputeExpiry) < now) {
      // Expired, not active
    } else {
      hasActive = true;
    }
  }

  if (hasActive) return "active";
  if (hasResolved) return "resolved";
  return "expired";
}
