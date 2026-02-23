/**
 * cellar-door-exit — Signing and Verification
 */

import { sign, verify, didFromPublicKey, publicKeyFromDid } from "./crypto.js";
import { canonicalize } from "./marker.js";
import { validateMarker } from "./validate.js";
import type { ExitMarker, DataIntegrityProof } from "./types.js";
import { SigningError, VerificationError } from "./errors.js";

/**
 * Sign a marker with an Ed25519 private key. Returns a new marker with proof attached.
 *
 * @param marker - The EXIT marker to sign.
 * @param privateKey - The Ed25519 private key (32 bytes).
 * @param publicKey - The corresponding Ed25519 public key (32 bytes).
 * @returns A new EXIT marker with the `proof` field populated.
 * @throws {SigningError} If signing fails for any reason.
 *
 * @example
 * ```ts
 * const signed = signMarker(marker, privateKey, publicKey);
 * console.log(signed.proof.proofValue); // base64 signature
 * ```
 */
export function signMarker(marker: ExitMarker, privateKey: Uint8Array, publicKey: Uint8Array): ExitMarker {
  try {
    const did = didFromPublicKey(publicKey);
    const now = new Date().toISOString();

    // Create the data to sign: canonical form of marker without proof
    const { proof: _proof, ...rest } = marker;
    const canonical = canonicalize(rest);
    const data = new TextEncoder().encode(canonical);

    const signature = sign(data, privateKey);
    const proofValue = Buffer.from(signature).toString("base64");

    const proof: DataIntegrityProof = {
      type: "Ed25519Signature2020",
      created: now,
      verificationMethod: did,
      proofValue,
    };

    return { ...marker, proof };
  } catch (e) {
    if (e instanceof SigningError) throw e;
    throw new SigningError(`Failed to sign marker: ${(e as Error).message}`);
  }
}

export interface VerificationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Verify a signed marker: schema validation + signature check.
 *
 * Runs full schema validation via {@link validateMarker}, then verifies the
 * Ed25519 signature against the canonical marker content (excluding proof).
 *
 * @param marker - The signed EXIT marker to verify.
 * @returns A {@link VerificationResult} with `valid` boolean and array of `errors`.
 *
 * @example
 * ```ts
 * const result = verifyMarker(signedMarker);
 * if (result.valid) console.log("Marker is authentic!");
 * ```
 */
export function verifyMarker(marker: ExitMarker): VerificationResult {
  const errors: string[] = [];

  // Schema validation
  const schema = validateMarker(marker);
  if (!schema.valid) {
    errors.push(...schema.errors);
  }

  // Proof structure check
  if (!marker.proof) {
    errors.push("Missing proof");
    return { valid: false, errors };
  }

  if (marker.proof.type !== "Ed25519Signature2020") {
    errors.push(`Unsupported proof type: ${marker.proof.type}`);
    return { valid: false, errors };
  }

  if (!marker.proof.verificationMethod || !marker.proof.proofValue) {
    errors.push("Incomplete proof: missing verificationMethod or proofValue");
    return { valid: false, errors };
  }

  // Signature verification
  try {
    const publicKey = publicKeyFromDid(marker.proof.verificationMethod);
    const { proof: _proof, ...rest } = marker;
    const canonical = canonicalize(rest);
    const data = new TextEncoder().encode(canonical);
    const signature = new Uint8Array(Buffer.from(marker.proof.proofValue, "base64"));

    if (!verify(data, signature, publicKey)) {
      errors.push("Signature verification failed");
    }
  } catch (e) {
    errors.push(`Signature verification error: ${(e as Error).message}`);
  }

  return { valid: errors.length === 0, errors };
}
