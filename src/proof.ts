/**
 * cellar-door-exit — Signing and Verification
 */

import { sign, verify, didFromPublicKey, publicKeyFromDid, verifyP256, algorithmFromDid } from "./crypto.js";
import { canonicalize } from "./marker.js";
import { validateMarker } from "./validate.js";
import type { ExitMarker, DataIntegrityProof } from "./types.js";
import { SigningError, VerificationError } from "./errors.js";
import type { Signer } from "./signer.js";
import { proofTypeForAlgorithm, algorithmFromProofType } from "./signer.js";

const DOMAIN_PREFIX = "exit-marker-v1.1:";

/**
 * @deprecated Use {@link signMarkerWithSigner} instead. This function hardcodes Ed25519.
 *
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

    // Create the data to sign: canonical form of marker without proof or id
    const { proof: _proof, id: _id, ...rest } = marker;
    const canonical = canonicalize(rest);
    const data = new TextEncoder().encode(DOMAIN_PREFIX + canonical);

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
export function verifyMarker(marker: ExitMarker, options?: { verbose?: boolean }): VerificationResult {
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

  const alg = algorithmFromProofType(marker.proof.type);
  if (!alg) {
    errors.push(`Unsupported proof type: ${marker.proof.type}`);
    return { valid: false, errors };
  }

  if (!marker.proof.verificationMethod || !marker.proof.proofValue) {
    errors.push("Incomplete proof: missing verificationMethod or proofValue");
    return { valid: false, errors };
  }

  // SPEC-004: Validate proof.created is valid ISO 8601
  if (!marker.proof.created || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/.test(marker.proof.created) || isNaN(Date.parse(marker.proof.created))) {
    errors.push("Proof missing or invalid created timestamp (must be ISO 8601)");
  }

  // Subject-key binding: verificationMethod must match subject DID
  if (marker.subject && marker.proof.verificationMethod !== marker.subject) {
    errors.push("Proof verificationMethod does not match marker subject — possible attribution forgery");
    return { valid: false, errors };
  }

  // Algorithm cross-check: proof.type must match DID multicodec
  const didAlg = algorithmFromDid(marker.proof.verificationMethod);
  if (didAlg !== alg) {
    errors.push(`Algorithm mismatch: proof type indicates ${alg} but DID uses ${didAlg}`);
    return { valid: false, errors };
  }

  // Signature verification
  try {
    const publicKey = publicKeyFromDid(marker.proof.verificationMethod);
    const { proof: _proof, id: _id, ...rest } = marker;
    const canonical = canonicalize(rest);
    const data = new TextEncoder().encode(DOMAIN_PREFIX + canonical);
    const signature = new Uint8Array(Buffer.from(marker.proof.proofValue, "base64"));

    let valid: boolean;
    if (alg === "P-256") {
      valid = verifyP256(data, signature, publicKey);
    } else {
      valid = verify(data, signature, publicKey);
    }

    if (!valid) {
      errors.push("Signature verification failed");
    }
  } catch (e) {
    errors.push(
      options?.verbose
        ? `Signature verification error: ${(e as Error).message}`
        : "Verification failed"
    );
  }

  // B11: When not verbose, replace detailed crypto errors with generic message
  if (!options?.verbose) {
    const genericErrors: string[] = [];
    for (const err of errors) {
      if (
        err === "Signature verification failed" ||
        err.startsWith("Signature verification error:")
      ) {
        if (!genericErrors.includes("Verification failed")) {
          genericErrors.push("Verification failed");
        }
      } else {
        genericErrors.push(err);
      }
    }
    return { valid: genericErrors.length === 0, errors: genericErrors };
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Sign a marker using the Signer abstraction.
 */
export async function signMarkerWithSigner(marker: ExitMarker, signer: Signer): Promise<ExitMarker> {
  try {
    const did = signer.did();
    const now = new Date().toISOString();

    const { proof: _proof, id: _id, ...rest } = marker;
    const canonical = canonicalize(rest);
    const data = new TextEncoder().encode(DOMAIN_PREFIX + canonical);

    const signature = await signer.sign(data);
    const proofValue = Buffer.from(signature).toString("base64");

    const proof: DataIntegrityProof = {
      type: proofTypeForAlgorithm(signer.algorithm),
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

/**
 * Verify a marker, auto-detecting algorithm from proof type.
 */
export async function verifyMarkerMultiAlg(marker: ExitMarker): Promise<VerificationResult> {
  return verifyMarker(marker);
}

/**
 * Verify well-formedness of trust enhancers (conduit-only validation).
 * Does NOT verify truth of claims — only structural validity.
 */
export function verifyTrustEnhancers(marker: ExitMarker): VerificationResult {
  const errors: string[] = [];
  if (!marker.trustEnhancers) return { valid: true, errors };

  const te = marker.trustEnhancers;
  const MAX_TRUST_ENHANCER_ITEMS = 100;

  // INPUT-017: Cap trust enhancer array lengths
  for (const arrayName of ["timestamps", "witnesses", "identityClaims"] as const) {
    const arr = te[arrayName];
    if (Array.isArray(arr) && arr.length > MAX_TRUST_ENHANCER_ITEMS) {
      errors.push(`Trust enhancer ${arrayName} exceeds maximum of ${MAX_TRUST_ENHANCER_ITEMS} items (got ${arr.length})`);
      return { valid: false, errors };
    }
  }

  // Timestamps (TimestampAttachment: tsaUrl, hash, timestamp, receipt, nonce?)
  if (te.timestamps) {
    for (let i = 0; i < te.timestamps.length; i++) {
      const ts = te.timestamps[i];
      if (!ts.tsaUrl) errors.push(`Trust enhancer timestamps[${i}] missing tsaUrl`);
      if (!ts.hash) errors.push(`Trust enhancer timestamps[${i}] missing hash`);
      if (!ts.timestamp) errors.push(`Trust enhancer timestamps[${i}] missing timestamp`);
      if (ts.timestamp && isNaN(Date.parse(ts.timestamp))) errors.push(`Trust enhancer timestamps[${i}] invalid timestamp: ${ts.timestamp}`);
      if (!ts.receipt) errors.push(`Trust enhancer timestamps[${i}] missing receipt`);
    }
  }

  // Witnesses (WitnessAttachment: witnessDid, attestation, timestamp, signature, signatureType)
  if (te.witnesses) {
    for (let i = 0; i < te.witnesses.length; i++) {
      const w = te.witnesses[i];
      if (!w.witnessDid) errors.push(`Trust enhancer witnesses[${i}] missing witnessDid`);
      if (!w.attestation) errors.push(`Trust enhancer witnesses[${i}] missing attestation`);
      if (!w.signature) errors.push(`Trust enhancer witnesses[${i}] missing signature`);
      if (!w.signatureType) errors.push(`Trust enhancer witnesses[${i}] missing signatureType`);
      if (!w.timestamp) errors.push(`Trust enhancer witnesses[${i}] missing timestamp`);
      if (w.timestamp && isNaN(Date.parse(w.timestamp))) errors.push(`Trust enhancer witnesses[${i}] invalid timestamp: ${w.timestamp}`);
    }
  }

  // Identity claims (IdentityClaimAttachment: scheme, value, issuedAt, expiresAt?, issuer?, proof?)
  if (te.identityClaims) {
    for (let i = 0; i < te.identityClaims.length; i++) {
      const c = te.identityClaims[i];
      if (!c.scheme) errors.push(`Trust enhancer identityClaims[${i}] missing scheme`);
      if (!c.value) errors.push(`Trust enhancer identityClaims[${i}] missing value`);
      if (!c.issuedAt) errors.push(`Trust enhancer identityClaims[${i}] missing issuedAt`);
      if (c.issuedAt && isNaN(Date.parse(c.issuedAt))) errors.push(`Trust enhancer identityClaims[${i}] invalid issuedAt: ${c.issuedAt}`);
      if (c.expiresAt && isNaN(Date.parse(c.expiresAt))) errors.push(`Trust enhancer identityClaims[${i}] invalid expiresAt: ${c.expiresAt}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
