/**
 * cellar-door-exit — Convenience Methods
 *
 * High-level helpers for common EXIT operations.
 */

import { generateKeyPair, didFromPublicKey, generateP256KeyPair, didFromP256PublicKey, signP256 } from "./crypto.js";
import { createMarker, canonicalize } from "./marker.js";
import type { DataIntegrityProof } from "./types.js";
import { signMarker, verifyMarker, type VerificationResult } from "./proof.js";
import { validateMarker } from "./validate.js";
import { ExitType, ExitStatus, type ExitMarker } from "./types.js";
import { ValidationError, VerificationError } from "./errors.js";

export interface Identity {
  did: string;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

/**
 * Generate a complete EXIT identity (DID + keypair) in one call.
 *
 * @returns An {@link Identity} containing the DID string and Ed25519 key pair.
 *
 * @example
 * ```ts
 * const { did, publicKey, privateKey } = generateIdentity();
 * console.log(did); // "did:key:z6Mk..."
 * ```
 */
export function generateIdentity(): Identity {
  const { publicKey, privateKey } = generateKeyPair();
  const did = didFromPublicKey(publicKey);
  return { did, publicKey, privateKey };
}

export interface QuickExitOpts {
  exitType?: ExitType;
  status?: ExitStatus;
  reason?: string;
  emergencyJustification?: string;
  /** Signature algorithm to use. @default 'ed25519' */
  algorithm?: 'ed25519' | 'p256';
}

export interface QuickExitResult {
  marker: ExitMarker;
  identity: Identity;
}

/**
 * Create an identity, marker, and sign it — all in one call.
 *
 * @param origin - The platform/system being exited
 * @param opts - Optional overrides for exit type, status, algorithm, etc.
 * @returns The signed marker and the generated identity
 */
export function quickExit(origin: string, opts?: QuickExitOpts): QuickExitResult {
  const alg = opts?.algorithm ?? 'ed25519';

  let identity: Identity;
  if (alg === 'p256') {
    const { publicKey, privateKey } = generateP256KeyPair();
    const did = didFromP256PublicKey(publicKey);
    identity = { did, publicKey, privateKey };
  } else {
    identity = generateIdentity();
  }

  const exitType = opts?.exitType ?? ExitType.Voluntary;

  const marker = createMarker({
    subject: identity.did,
    origin,
    exitType,
    status: opts?.status,
    emergencyJustification: opts?.emergencyJustification,
  });

  let signed: ExitMarker;
  if (alg === 'p256') {
    const { proof: _proof, id: _id, ...rest } = marker;
    const canonical = canonicalize(rest);
    const data = new TextEncoder().encode("exit-marker-v1.2:" + canonical);
    const signature = signP256(data, identity.privateKey);
    const proofValue = Buffer.from(signature).toString("base64");
    const proof: DataIntegrityProof = {
      type: "EcdsaP256Signature2019",
      created: new Date().toISOString(),
      verificationMethod: identity.did,
      proofValue,
    };
    signed = { ...marker, proof };
  } else {
    signed = signMarker(marker, identity.privateKey, identity.publicKey);
  }
  return { marker: signed, identity };
}

/**
 * Convenience alias: create a P-256 EXIT marker in one call.
 *
 * @param origin - The platform/system being exited
 * @param opts - Optional overrides (algorithm is forced to 'p256')
 * @returns The signed marker and the generated P-256 identity
 */
export function quickExitP256(origin: string, opts?: Omit<QuickExitOpts, 'algorithm'>): QuickExitResult {
  return quickExit(origin, { ...opts, algorithm: 'p256' });
}

/**
 * Parse a JSON string and verify the marker in one call.
 *
 * @param markerJson - JSON string of an EXIT marker
 * @returns Verification result with valid flag and any errors
 * @throws ValidationError if the JSON is not a valid marker structure
 */
export function quickVerify(markerJson: string): VerificationResult {
  const marker = fromJSON(markerJson);
  return verifyMarker(marker);
}

/**
 * Parse and validate a marker from a JSON string.
 *
 * @throws ValidationError if JSON is invalid or marker fails validation
 */
/** Maximum JSON input size for parsing (1 MB). */
export const MAX_JSON_SIZE = 1_048_576;

export function fromJSON(json: string): ExitMarker {
  if (json.length > MAX_JSON_SIZE) {
    throw new ValidationError([`JSON input too large: ${json.length} chars (max ${MAX_JSON_SIZE})`]);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new ValidationError([`Invalid JSON: ${(e as Error).message}`]);
  }

  const result = validateMarker(parsed);
  if (!result.valid) {
    throw new ValidationError(result.errors);
  }

  return parsed as ExitMarker;
}

/**
 * Serialize a marker to pretty-printed JSON.
 *
 * @param marker - The EXIT marker to serialize.
 * @returns A pretty-printed JSON string (2-space indent).
 */
export function toJSON(marker: ExitMarker): string {
  return JSON.stringify(marker, null, 2);
}
