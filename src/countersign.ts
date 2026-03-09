/**
 * cellar-door-exit — Counter-Signature & Witness Functions
 *
 * Convenience functions for adding platform/origin co-signatures,
 * witness attachments, and deriving status confirmation levels.
 */

import { sign, verify, didFromPublicKey, publicKeyFromDid, verifyP256, algorithmFromDid } from "./crypto.js";
import { canonicalize } from "./marker.js";
import type { ExitMarker, DataIntegrityProof, ModuleC, WitnessAttachment } from "./types.js";
import { StatusConfirmation } from "./types.js";
import { SigningError, VerificationError } from "./errors.js";
import { proofTypeForAlgorithm, algorithmFromProofType } from "./signer.js";

const DOMAIN_PREFIX = "exit-marker-v1.2:";
const COUNTER_DOMAIN_PREFIX = "exit-counter-v1.2:";

export interface CounterSignOpts {
  /** Role label for the counter-signer (e.g. "origin", "platform"). */
  role?: string;
}

/**
 * Add a counter-signature to a marker's dispute module counterpartyAcks.
 *
 * The counter-signature signs the same canonical content as the original proof
 * (excluding proof and id fields), attesting "I agree this departure happened as described."
 *
 * The marker MUST already be signed (have a non-empty proof). If no dispute module
 * exists, one is created with just the counterpartyAcks array.
 *
 * @param marker - A signed EXIT marker.
 * @param privateKey - The counter-signer's private key.
 * @param publicKey - The counter-signer's public key.
 * @param opts - Optional configuration.
 * @returns A new marker with the counter-signature appended to dispute.counterpartyAcks.
 * @throws {SigningError} If the marker is unsigned or signing fails.
 */
export function addCounterSignature(
  marker: ExitMarker,
  privateKey: Uint8Array,
  publicKey: Uint8Array,
  opts?: CounterSignOpts
): ExitMarker {
  // Require the marker to be signed first
  if (!marker.proof?.proofValue) {
    throw new SigningError("Cannot counter-sign an unsigned marker");
  }

  try {
    const did = didFromPublicKey(publicKey);
    const now = new Date().toISOString();

    // Sign the same canonical content as the original proof
    // (excluding proof, id, AND counterpartyAcks)
    const { proof: _proof, id: _id, ...rest } = marker;
    const restWithoutAcks = { ...rest };
    if (restWithoutAcks.dispute) {
      const { counterpartyAcks: _acks, ...disputeRest } = restWithoutAcks.dispute;
      if (Object.keys(disputeRest).length === 0) {
        delete (restWithoutAcks as Record<string, unknown>).dispute;
      } else {
        restWithoutAcks.dispute = disputeRest as ModuleC;
      }
    }
    const withPrimary = { ...restWithoutAcks, primaryProofValue: marker.proof.proofValue };
    const canonical = canonicalize(withPrimary);
    const data = new TextEncoder().encode(COUNTER_DOMAIN_PREFIX + canonical);

    const signature = sign(data, privateKey);
    const proofValue = Buffer.from(signature).toString("base64");

    const ack: DataIntegrityProof = {
      type: "Ed25519Signature2020",
      created: now,
      verificationMethod: did,
      proofValue,
    };

    // Build updated dispute module
    const existingDispute: ModuleC = marker.dispute ?? {};
    const existingAcks = existingDispute.counterpartyAcks ?? [];

    const updatedDispute: ModuleC = {
      ...existingDispute,
      counterpartyAcks: [...existingAcks, ack],
    };

    return { ...marker, dispute: updatedDispute };
  } catch (e) {
    if (e instanceof SigningError) throw e;
    throw new SigningError(`Failed to add counter-signature: ${(e as Error).message}`);
  }
}

/**
 * Add a WitnessAttachment to the marker's trustEnhancers.witnesses array.
 *
 * @param marker - The EXIT marker.
 * @param witness - The witness attachment to add.
 * @returns A new marker with the witness appended.
 */
export function addWitness(marker: ExitMarker, witness: WitnessAttachment): ExitMarker {
  const existing = marker.trustEnhancers?.witnesses ?? [];
  return {
    ...marker,
    trustEnhancers: {
      ...marker.trustEnhancers,
      witnesses: [...existing, witness],
    },
  };
}

export interface CounterSignVerificationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Verify a specific counterpartyAck on the marker's dispute module.
 *
 * @param marker - The EXIT marker containing counter-signatures.
 * @param publicKey - The expected signer's public key.
 * @param ackIndex - Index into dispute.counterpartyAcks to verify (default: 0).
 * @returns Verification result with valid flag and errors.
 */
export function verifyCounterSignature(
  marker: ExitMarker,
  publicKey: Uint8Array,
  ackIndex = 0
): CounterSignVerificationResult {
  const errors: string[] = [];

  const acks = marker.dispute?.counterpartyAcks;
  if (!acks || acks.length === 0) {
    return { valid: false, errors: ["No counterpartyAcks found on marker"] };
  }
  if (ackIndex < 0 || ackIndex >= acks.length) {
    return { valid: false, errors: [`ackIndex ${ackIndex} out of range (0..${acks.length - 1})`] };
  }

  const ack = acks[ackIndex];

  if (!ack.proofValue || !ack.verificationMethod) {
    return { valid: false, errors: ["Incomplete counter-signature: missing proofValue or verificationMethod"] };
  }

  try {
    // Counter-signature signs the same content as the original proof:
    // marker without proof, id, AND without counterpartyAcks
    const { proof: _proof, id: _id, ...rest } = marker;
    const restWithoutAcks = { ...rest };
    if (restWithoutAcks.dispute) {
      const { counterpartyAcks: _acks, ...disputeRest } = restWithoutAcks.dispute;
      if (Object.keys(disputeRest).length === 0) {
        delete (restWithoutAcks as Record<string, unknown>).dispute;
      } else {
        restWithoutAcks.dispute = disputeRest as ModuleC;
      }
    }
    const primaryProofValue = marker.proof?.proofValue ?? "";
    const withPrimary = { ...restWithoutAcks, primaryProofValue };
    const canonical = canonicalize(withPrimary);
    const data = new TextEncoder().encode(COUNTER_DOMAIN_PREFIX + canonical);
    const signature = new Uint8Array(Buffer.from(ack.proofValue, "base64"));

    const alg = algorithmFromDid(ack.verificationMethod);
    let valid: boolean;
    if (alg === "P-256") {
      valid = verifyP256(data, signature, publicKey);
    } else {
      valid = verify(data, signature, publicKey);
    }

    if (!valid) {
      errors.push("Counter-signature verification failed");
    }
    return { valid: errors.length === 0, errors };
  } catch (e) {
    return { valid: false, errors: [`Verification error: ${(e as Error).message}`] };
  }
}

/**
 * Derive the StatusConfirmation level based on what signatures are present.
 *
 * - `self_only`: marker has proof but no counterpartyAcks and no witnesses
 * - `origin_only`: marker has counterpartyAcks but empty/missing proof (forced exit scenario)
 * - `mutual`: marker has both proof and at least one counterpartyAck
 * - `witnessed`: marker has witnesses in trustEnhancers
 *
 * @param marker - The EXIT marker to analyze.
 * @returns The derived StatusConfirmation level.
 */
export function deriveStatusConfirmation(marker: ExitMarker): StatusConfirmation {
  const hasProof = !!marker.proof?.proofValue;
  const hasAcks = (marker.dispute?.counterpartyAcks?.length ?? 0) > 0;
  const hasWitnesses = (marker.trustEnhancers?.witnesses?.length ?? 0) > 0;

  if (hasWitnesses) return StatusConfirmation.Witnessed;
  if (hasProof && hasAcks) return StatusConfirmation.Mutual;
  if (!hasProof && hasAcks) return StatusConfirmation.OriginOnly;
  return StatusConfirmation.SelfOnly;
}
