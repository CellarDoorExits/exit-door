/**
 * Trust Signals Module — Mechanism design fixes for the Akerlof lemons problem.
 *
 * Addresses three critical incentive failures:
 * 1. Self-attested status is cheap talk (lemons problem)
 * 2. Origins can weaponize exits without accountability (front-running)
 * 3. Fresh DIDs are indistinguishable from established ones (reputation laundering)
 *
 * Solutions implemented:
 * - StatusConfirmation: graduated trust levels based on attestation source
 * - TenureAttestation: time-weighted trust signals
 * - ConfidenceScore: aggregated trust metric for verifiers
 */

import type {
  ExitMarker,
  ExitStatus,
  DataIntegrityProof,
  StatusConfirmation,
  TenureAttestation,
  ConfidenceFactors,
  ConfidenceScore,
  ExitCommitment,
  ExitIntent,
} from "../types.js";
import { StatusConfirmation as SC } from "../types.js";
import { sign, verify, didFromPublicKey, publicKeyFromDid } from "../crypto.js";
import { canonicalize } from "../marker.js";
import { sha256 } from "@noble/hashes/sha256";

// ─── Status Confirmation ─────────────────────────────────────────────────────

/**
 * Derive the StatusConfirmation level from a marker and its attestations.
 *
 * Logic:
 * - If origin co-signed (Module C) and statuses agree → mutual
 * - If origin co-signed but statuses disagree → disputed_by_origin or disputed_by_subject
 * - If only self-attested → self_only
 * - If Module C has counterpartyAcks from witnesses → witnessed
 *
 * @param marker - The EXIT marker to analyze.
 * @returns The {@link StatusConfirmation} level.
 */
export function computeStatusConfirmation(marker: ExitMarker): StatusConfirmation {
  const hasOriginAttestation = marker.dispute?.originStatus !== undefined;
  const hasWitness =
    marker.dispute?.counterpartyAcks !== undefined &&
    marker.dispute.counterpartyAcks.length > 0;

  if (hasWitness) {
    return SC.Witnessed;
  }

  if (hasOriginAttestation) {
    const originStatus = marker.dispute!.originStatus!;
    if (originStatus === marker.status) {
      return SC.Mutual;
    }
    // Statuses disagree
    if (marker.selfAttested) {
      // Subject claimed one thing, origin says another
      return SC.DisputedByOrigin;
    }
    return SC.DisputedBySubject;
  }

  if (marker.selfAttested) {
    return SC.SelfOnly;
  }

  return SC.OriginOnly;
}

// ─── Tenure Attestation ──────────────────────────────────────────────────────

/**
 * Create a signed tenure attestation.
 *
 * @param duration - ISO 8601 duration string (e.g., `"P365D"`).
 * @param startDate - ISO 8601 start date of tenure.
 * @param privateKey - The attester's Ed25519 private key.
 * @param publicKey - The attester's Ed25519 public key.
 * @param attestedBy - Whether the subject or origin is attesting (default: `"subject"`).
 * @returns A signed {@link TenureAttestation}.
 */
export function createTenureAttestation(
  duration: string,
  startDate: string,
  privateKey: Uint8Array,
  publicKey: Uint8Array,
  attestedBy: "subject" | "origin" = "subject"
): TenureAttestation {
  const did = didFromPublicKey(publicKey);
  const data = canonicalize({ duration, startDate, attestedBy, attesterDid: did });
  const sig = sign(new TextEncoder().encode(data), privateKey);

  return {
    duration,
    startDate,
    attestedBy,
    signature: Buffer.from(sig).toString("base64"),
    attesterDid: did,
  };
}

/**
 * Verify a tenure attestation signature.
 *
 * @param attestation - The tenure attestation to verify.
 * @returns `true` if the signature is valid; `false` otherwise.
 */
export function verifyTenureAttestation(attestation: TenureAttestation): boolean {
  try {
    const publicKey = publicKeyFromDid(attestation.attesterDid);
    const data = canonicalize({
      duration: attestation.duration,
      startDate: attestation.startDate,
      attestedBy: attestation.attestedBy,
      attesterDid: attestation.attesterDid,
    });
    const sig = new Uint8Array(Buffer.from(attestation.signature, "base64"));
    return verify(new TextEncoder().encode(data), sig, publicKey);
  } catch {
    return false;
  }
}

/**
 * Parse an ISO 8601 duration to approximate days.
 * Handles `P[n]Y[n]M[n]D` format.
 *
 * @param duration - An ISO 8601 duration string (e.g., `"P2Y3M10D"`).
 * @returns Approximate number of days (years=365, months=30). Returns 0 if unparseable.
 */
export function parseDurationToDays(duration: string): number {
  const match = duration.match(/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?$/);
  if (!match) return 0;
  const years = parseInt(match[1] || "0", 10);
  const months = parseInt(match[2] || "0", 10);
  const days = parseInt(match[3] || "0", 10);
  return years * 365 + months * 30 + days;
}

// ─── Commit-Reveal ───────────────────────────────────────────────────────────

/**
 * Create a commitment hash for an exit intent (commit-reveal scheme).
 * The commitment is `SHA-256(canonicalize(intent fields))`.
 *
 * @param intent - The exit intent to commit to.
 * @param revealDelayMs - Minimum delay in milliseconds before the intent can be revealed.
 * @param privateKey - The committer's Ed25519 private key.
 * @param publicKey - The committer's Ed25519 public key.
 * @returns A signed {@link ExitCommitment} with the hash, timestamps, and proof.
 */
export function createCommitment(
  intent: ExitIntent,
  revealDelayMs: number,
  privateKey: Uint8Array,
  publicKey: Uint8Array
): ExitCommitment {
  const did = didFromPublicKey(publicKey);
  const now = new Date();
  const revealAfter = new Date(now.getTime() + revealDelayMs);

  // Hash the intent
  const intentCanonical = canonicalize(intent);
  const hash = sha256(new TextEncoder().encode(intentCanonical));
  const commitmentHash = Array.from(hash)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const committedAt = now.toISOString();
  const revealAfterStr = revealAfter.toISOString();

  // Sign the commitment
  const commitData = canonicalize({
    commitmentHash,
    committedAt,
    revealAfter: revealAfterStr,
    committerDid: did,
  });
  const sig = sign(new TextEncoder().encode(commitData), privateKey);

  return {
    commitmentHash,
    committedAt,
    revealAfter: revealAfterStr,
    committerDid: did,
    proof: {
      type: "Ed25519Signature2020",
      created: committedAt,
      verificationMethod: did,
      proofValue: Buffer.from(sig).toString("base64"),
    },
  };
}

/**
 * Verify that a commitment matches the revealed intent.
 *
 * @param commitment - The previously published commitment.
 * @param revealedIntent - The revealed exit intent to verify against.
 * @returns An object with `valid` boolean and array of `errors`.
 */
export function verifyCommitment(
  commitment: ExitCommitment,
  revealedIntent: ExitIntent
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 1. Verify commitment hash matches intent
  const intentCanonical = canonicalize(revealedIntent);
  const hash = sha256(new TextEncoder().encode(intentCanonical));
  const expectedHash = Array.from(hash)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (commitment.commitmentHash !== expectedHash) {
    errors.push("Commitment hash does not match revealed intent");
  }

  // 2. Verify committer matches intent subject
  if (commitment.committerDid !== revealedIntent.subject) {
    errors.push("Commitment committer does not match intent subject");
  }

  // 3. Verify commitment signature
  try {
    const publicKey = publicKeyFromDid(commitment.proof.verificationMethod);
    const commitData = canonicalize({
      commitmentHash: commitment.commitmentHash,
      committedAt: commitment.committedAt,
      revealAfter: commitment.revealAfter,
      committerDid: commitment.committerDid,
    });
    const sig = new Uint8Array(Buffer.from(commitment.proof.proofValue, "base64"));

    if (!verify(new TextEncoder().encode(commitData), sig, publicKey)) {
      errors.push("Commitment signature verification failed");
    }
  } catch (e) {
    errors.push(`Commitment signature error: ${(e as Error).message}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if the reveal window has opened (current time >= revealAfter).
 *
 * @param commitment - The exit commitment to check.
 * @returns `true` if the current time is at or past the `revealAfter` timestamp.
 */
export function isRevealWindowOpen(commitment: ExitCommitment): boolean {
  return new Date() >= new Date(commitment.revealAfter);
}

// ─── Confidence Scoring ──────────────────────────────────────────────────────

/**
 * Extract confidence factors from a marker and optional attestations.
 *
 * @param marker - The EXIT marker to extract factors from.
 * @param tenure - Optional subject tenure attestation.
 * @param originTenure - Optional origin tenure attestation (enables mutual attestation scoring).
 * @param hasCommitReveal - Whether a valid commit-reveal was present (default: `false`).
 * @returns A {@link ConfidenceFactors} object with all extracted factors.
 */
export function extractConfidenceFactors(
  marker: ExitMarker,
  tenure?: TenureAttestation,
  originTenure?: TenureAttestation,
  hasCommitReveal: boolean = false
): ConfidenceFactors {
  const statusConfirmation = computeStatusConfirmation(marker);
  const tenureDays = tenure ? parseDurationToDays(tenure.duration) : 0;
  const tenureMutuallyAttested =
    tenure !== undefined &&
    originTenure !== undefined &&
    tenure.attestedBy === "subject" &&
    originTenure.attestedBy === "origin";
  const lineageDepth = marker.lineage?.lineageChain?.length ?? 0;

  return {
    statusConfirmation,
    tenureDays,
    tenureMutuallyAttested,
    lineageDepth,
    hasCommitReveal,
  };
}

/**
 * Compute a confidence score from factors.
 *
 * Scoring model:
 * - Status confirmation: 0.0 (self_only) to 0.4 (mutual/witnessed)
 * - Tenure: 0.0 to 0.3 (log scale, capped at ~2 years)
 * - Lineage: 0.0 to 0.15 (log scale, capped at depth ~10)
 * - Commit-reveal: 0.0 or 0.15 (binary)
 *
 * Disputed statuses cap the score.
 *
 * @param factors - The {@link ConfidenceFactors} to score.
 * @returns A {@link ConfidenceScore} with the overall score (0.0–1.0), level, and factor breakdown.
 */
export function computeConfidence(factors: ConfidenceFactors): ConfidenceScore {
  // Status confirmation weight
  const statusWeights: Record<StatusConfirmation, number> = {
    [SC.SelfOnly]: 0.05,
    [SC.OriginOnly]: 0.2,
    [SC.Mutual]: 0.4,
    [SC.Witnessed]: 0.4,
    [SC.DisputedByOrigin]: 0.0,
    [SC.DisputedBySubject]: 0.1,
  };
  let statusScore = statusWeights[factors.statusConfirmation] ?? 0;

  // Tenure weight: log2(days + 1) / log2(730 + 1) * 0.3, capped at 0.3
  let tenureScore = 0;
  if (factors.tenureDays > 0) {
    tenureScore = Math.min(0.3, (Math.log2(factors.tenureDays + 1) / Math.log2(731)) * 0.3);
    if (factors.tenureMutuallyAttested) {
      tenureScore *= 1.0; // full value
    } else {
      tenureScore *= 0.5; // half value if only self-attested
    }
  }

  // Lineage depth: log2(depth + 1) / log2(11) * 0.15
  let lineageScore = 0;
  if (factors.lineageDepth > 0) {
    lineageScore = Math.min(0.15, (Math.log2(factors.lineageDepth + 1) / Math.log2(11)) * 0.15);
  }

  // Commit-reveal bonus
  const commitRevealScore = factors.hasCommitReveal ? 0.15 : 0;

  let score = statusScore + tenureScore + lineageScore + commitRevealScore;

  // Cap at 1.0
  score = Math.min(1.0, Math.max(0.0, score));
  // Round to 3 decimal places
  score = Math.round(score * 1000) / 1000;

  // Level thresholds
  let level: ConfidenceScore["level"];
  if (score < 0.1) level = "none";
  else if (score < 0.3) level = "low";
  else if (score < 0.5) level = "moderate";
  else if (score < 0.75) level = "high";
  else level = "very_high";

  return { score, level, factors };
}
