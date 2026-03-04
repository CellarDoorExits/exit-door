/**
 * cellar-door-exit — Marker Amendment & Revocation
 *
 * Supports amending marker fields and revoking markers entirely.
 * Amendments and revocations are content-addressed and signed.
 */

import { sha256 } from "@noble/hashes/sha256";
import { canonicalize } from "./marker.js";
import type { Signer } from "./signer.js";
import { proofTypeForAlgorithm } from "./signer.js";
import type { ExitMarker } from "./types.js";

const AMENDMENT_PREFIX = "exit-amendment-v1.2:";
const REVOCATION_PREFIX = "exit-revocation-v1.2:";

/** Proof attached to amendments/revocations */
export interface SignedProof {
  type: string;
  created: string;
  verificationMethod: string;
  proofValue: string;
}

export interface AmendmentMarker {
  amendmentId: string;
  type: "AmendmentMarker";
  originalMarkerId: string;
  amendedFields: Record<string, unknown>;
  reason: string;
  created: string;
  proof?: SignedProof;
}

export interface RevocationMarker {
  revocationId: string;
  type: "RevocationMarker";
  targetMarkerId: string;
  reason: string;
  created: string;
  proof?: SignedProof;
}

export interface ResolvedMarker {
  marker: ExitMarker;
  isRevoked: boolean;
  amendmentCount: number;
}

function hexHash(data: Uint8Array): string {
  const hash = sha256(data);
  return Array.from(hash).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create a signed AmendmentMarker.
 */
export async function createAmendment(
  originalMarker: ExitMarker,
  amendedFields: Record<string, unknown>,
  reason: string,
  signer: Signer,
): Promise<AmendmentMarker> {
  const created = new Date().toISOString();

  const unsigned: Omit<AmendmentMarker, "amendmentId" | "proof"> = {
    type: "AmendmentMarker",
    originalMarkerId: originalMarker.id,
    amendedFields,
    reason,
    created,
  };

  const canonical = canonicalize(unsigned);
  const amendmentId = hexHash(new TextEncoder().encode(canonical));

  const data = new TextEncoder().encode(AMENDMENT_PREFIX + canonical);
  const signature = await signer.sign(data);
  const proofValue = Buffer.from(signature).toString("base64");

  return {
    amendmentId,
    ...unsigned,
    proof: {
      type: proofTypeForAlgorithm(signer.algorithm),
      created,
      verificationMethod: signer.did(),
      proofValue,
    },
  };
}

/**
 * Create a signed RevocationMarker.
 */
export async function createRevocation(
  targetMarkerId: string,
  reason: string,
  signer: Signer,
): Promise<RevocationMarker> {
  const created = new Date().toISOString();

  const unsigned: Omit<RevocationMarker, "revocationId" | "proof"> = {
    type: "RevocationMarker",
    targetMarkerId,
    reason,
    created,
  };

  const canonical = canonicalize(unsigned);
  const revocationId = hexHash(new TextEncoder().encode(canonical));

  const data = new TextEncoder().encode(REVOCATION_PREFIX + canonical);
  const signature = await signer.sign(data);
  const proofValue = Buffer.from(signature).toString("base64");

  return {
    revocationId,
    ...unsigned,
    proof: {
      type: proofTypeForAlgorithm(signer.algorithm),
      created,
      verificationMethod: signer.did(),
      proofValue,
    },
  };
}

/**
 * Apply a single amendment to a marker. Returns a new object.
 */
export function applyAmendment(marker: ExitMarker, amendment: AmendmentMarker): ExitMarker {
  return { ...marker, ...amendment.amendedFields } as ExitMarker;
}

/**
 * Apply multiple amendments in creation-time order. Returns a new object.
 */
export function applyAmendments(marker: ExitMarker, amendments: AmendmentMarker[]): ExitMarker {
  const sorted = [...amendments].sort((a, b) =>
    new Date(a.created).getTime() - new Date(b.created).getTime()
  );
  return sorted.reduce((m, a) => applyAmendment(m, a), marker);
}

/**
 * Resolve a marker with its amendments and revocations.
 */
export function resolveMarker(
  marker: ExitMarker,
  amendments: AmendmentMarker[],
  revocations: RevocationMarker[],
): ResolvedMarker {
  const resolved = applyAmendments(marker, amendments);
  const isRevoked = revocations.some(r => r.targetMarkerId === marker.id);
  return {
    marker: resolved,
    isRevoked,
    amendmentCount: amendments.length,
  };
}

/**
 * Verify an amendment's signature against the expected signer DID.
 */
export async function verifyAmendmentSignature(
  amendment: AmendmentMarker,
  signer: Signer,
): Promise<boolean> {
  if (!amendment.proof) return false;
  if (amendment.proof.verificationMethod !== signer.did()) return false;

  const { amendmentId: _id, proof: _proof, ...unsigned } = amendment;
  const canonical = canonicalize(unsigned);
  const data = new TextEncoder().encode(AMENDMENT_PREFIX + canonical);
  const signature = new Uint8Array(Buffer.from(amendment.proof.proofValue, "base64"));

  return signer.verify(data, signature);
}

/**
 * Verify a revocation's signature against the expected signer DID.
 */
export async function verifyRevocationSignature(
  revocation: RevocationMarker,
  signer: Signer,
): Promise<boolean> {
  if (!revocation.proof) return false;
  if (revocation.proof.verificationMethod !== signer.did()) return false;

  const { revocationId: _id, proof: _proof, ...unsigned } = revocation;
  const canonical = canonicalize(unsigned);
  const data = new TextEncoder().encode(REVOCATION_PREFIX + canonical);
  const signature = new Uint8Array(Buffer.from(revocation.proof.proofValue, "base64"));

  return signer.verify(data, signature);
}
