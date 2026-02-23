/**
 * cellar-door-exit — Pre-Rotation Key Management
 *
 * The core KERI innovation: commit to your next key before you need it.
 * "I'm exiting with key A, and I've pre-committed to key B for my next identity."
 */

import { sha256 } from "@noble/hashes/sha256";
import { generateKeyPair, type KeyPair } from "./crypto.js";
import { createRotation, digestKey } from "./keri.js";
import type { KeyState, KeyRotationEvent } from "./types.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Pre-Rotation ────────────────────────────────────────────────────────────

export interface PreRotatedKeys {
  currentKeyPair: KeyPair;
  nextKeyPair: KeyPair;
  nextKeyDigest: string;
}

/**
 * Generate current keys and commit to the next ones.
 *
 * @returns A {@link PreRotatedKeys} object with the current keypair, the next keypair, and the next key's digest commitment.
 *
 * @example
 * ```ts
 * const { currentKeyPair, nextKeyPair, nextKeyDigest } = generatePreRotatedKeys();
 * ```
 */
export function generatePreRotatedKeys(): PreRotatedKeys {
  const currentKeyPair = generateKeyPair();
  const nextKeyPair = generateKeyPair();
  const nextKeyDigest = commitNextKey(nextKeyPair.publicKey);
  return { currentKeyPair, nextKeyPair, nextKeyDigest };
}

/**
 * SHA-256 digest of the next public key (the commitment).
 *
 * @param publicKey - The public key to commit to.
 * @returns Hex-encoded SHA-256 hash of the public key.
 */
export function commitNextKey(publicKey: Uint8Array): string {
  return digestKey(publicKey);
}

/**
 * Verify that a public key matches a pre-rotation commitment.
 *
 * @param publicKey - The public key to verify.
 * @param commitment - The hex-encoded SHA-256 digest to check against.
 * @returns `true` if the key's digest matches the commitment.
 */
export function verifyNextKeyCommitment(
  publicKey: Uint8Array,
  commitment: string
): boolean {
  return digestKey(publicKey) === commitment;
}

export interface RotationResult {
  newState: KeyState;
  rotationEvent: KeyRotationEvent;
}

/**
 * Rotate keys: transition to pre-committed next key and commit to a new next.
 *
 * @param currentState - The current key state.
 * @param nextKeyPair - The pre-committed next keypair to rotate to.
 * @param newNextKeyDigest - SHA-256 digest of the key that will follow the next key.
 * @param signingKey - The current private key for signing the rotation event.
 * @returns A {@link RotationResult} with the new key state and the rotation event.
 */
export function rotateKeys(
  currentState: KeyState,
  nextKeyPair: KeyPair,
  newNextKeyDigest: string,
  signingKey: Uint8Array
): RotationResult {
  const rotationEvent = createRotation(
    currentState,
    [nextKeyPair.publicKey],
    [newNextKeyDigest],
    signingKey
  );

  const newState: KeyState = {
    ...currentState,
    currentKeys: [nextKeyPair.publicKey],
    nextKeyDigests: [newNextKeyDigest],
    sequenceNumber: currentState.sequenceNumber + 1,
  };

  return { newState, rotationEvent };
}
