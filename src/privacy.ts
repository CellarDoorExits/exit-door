/**
 * cellar-door-exit — Privacy Utilities
 *
 * Encryption, redaction, and minimal disclosure for GDPR compliance.
 * Uses @noble/ciphers (xchacha20-poly1305) + ECDH key agreement via x25519.
 */

import { sha256 } from "@noble/hashes/sha256";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { randomBytes } from "@noble/ciphers/utils.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { canonicalize } from "./marker.js";
import type { ExitMarker } from "./types.js";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return bytes;
}

// ─── Encrypted Marker Blob ───────────────────────────────────────────────────

export interface EncryptedMarkerBlob {
  /** Ephemeral x25519 public key (hex) used for ECDH. */
  ephemeralPublicKey: string;
  /** XChaCha20-Poly1305 nonce (hex). */
  nonce: string;
  /** Encrypted ciphertext (hex). */
  ciphertext: string;
}

/**
 * Encrypt a marker so only the holder of the private key can decrypt it.
 *
 * Uses ECDH (x25519) key agreement with an ephemeral keypair, derives a symmetric
 * key via SHA-256, and encrypts with XChaCha20-Poly1305.
 *
 * @param marker - The EXIT marker to encrypt.
 * @param recipientPublicKey - The recipient's x25519 public key (32 bytes).
 * @returns An {@link EncryptedMarkerBlob} containing the ephemeral public key, nonce, and ciphertext.
 *
 * @example
 * ```ts
 * const blob = encryptMarker(marker, recipientX25519PubKey);
 * // blob can be safely stored or transmitted
 * ```
 */
export function encryptMarker(marker: ExitMarker, recipientPublicKey: Uint8Array): EncryptedMarkerBlob {
  // Generate ephemeral x25519 keypair
  const ephemeralPrivate = randomBytes(32);
  const ephemeralPublic = x25519.getPublicKey(ephemeralPrivate);

  // ECDH shared secret → SHA-256 → symmetric key
  const shared = x25519.getSharedSecret(ephemeralPrivate, recipientPublicKey);
  const key = sha256(shared);

  // Encrypt
  const nonce = randomBytes(24);
  const plaintext = new TextEncoder().encode(JSON.stringify(marker));
  const cipher = xchacha20poly1305(key, nonce);
  const ciphertext = cipher.encrypt(plaintext);

  return {
    ephemeralPublicKey: toHex(ephemeralPublic),
    nonce: toHex(nonce),
    ciphertext: toHex(ciphertext),
  };
}

/**
 * Decrypt an encrypted marker blob using the recipient's x25519 private key.
 *
 * @param blob - The encrypted marker blob produced by {@link encryptMarker}.
 * @param privateKey - The recipient's x25519 private key (32 bytes).
 * @returns The decrypted EXIT marker.
 * @throws {Error} If decryption fails (wrong key, tampered ciphertext, etc.).
 */
export function decryptMarker(blob: EncryptedMarkerBlob, privateKey: Uint8Array): ExitMarker {
  const ephemeralPublic = fromHex(blob.ephemeralPublicKey);
  const shared = x25519.getSharedSecret(privateKey, ephemeralPublic);
  const key = sha256(shared);

  const nonce = fromHex(blob.nonce);
  const ciphertext = fromHex(blob.ciphertext);
  const cipher = xchacha20poly1305(key, nonce);
  const plaintext = cipher.decrypt(ciphertext);

  return JSON.parse(new TextDecoder().decode(plaintext)) as ExitMarker;
}

// ─── Redaction ───────────────────────────────────────────────────────────────

/** Hash a field value for redaction. */
function hashField(value: unknown): string {
  const canonical = canonicalize(value);
  const hash = sha256(new TextEncoder().encode(canonical));
  return `redacted:sha256:${toHex(hash)}`;
}

/**
 * Create a redacted marker with specified fields replaced by their SHA-256 hashes.
 * ZK-lite: proves fields existed without revealing content.
 *
 * @param marker - The EXIT marker to redact.
 * @param fields - Array of field names to replace with `"redacted:sha256:..."` hashes.
 * @returns A new object with specified fields hashed and all other fields intact.
 *
 * @example
 * ```ts
 * const redacted = redactMarker(marker, ["subject", "metadata"]);
 * // redacted.subject === "redacted:sha256:abc123..."
 * ```
 */
export function redactMarker(marker: ExitMarker, fields: string[]): Record<string, unknown> {
  const result = { ...marker } as Record<string, unknown>;
  for (const field of fields) {
    if (field in result) {
      result[field] = hashField(result[field]);
    }
  }
  return result;
}

/**
 * Create a minimal disclosure: only reveal specified fields, hash everything else.
 *
 * @param marker - The EXIT marker to create a minimal disclosure from.
 * @param revealFields - Array of field names to keep in plaintext.
 * @returns A new object with only the specified fields visible; all others are SHA-256 hashed.
 *
 * @example
 * ```ts
 * const disclosure = createMinimalDisclosure(marker, ["id", "exitType", "timestamp"]);
 * // Only id, exitType, timestamp are readable; everything else is hashed
 * ```
 */
export function createMinimalDisclosure(
  marker: ExitMarker,
  revealFields: string[]
): Record<string, unknown> {
  const full = marker as unknown as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(full)) {
    if (revealFields.includes(key)) {
      result[key] = full[key];
    } else {
      result[key] = hashField(full[key]);
    }
  }
  return result;
}
