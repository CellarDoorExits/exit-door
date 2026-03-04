/**
 * cellar-door-exit — Privacy Utilities
 *
 * Encryption, redaction, and minimal disclosure for GDPR compliance.
 * Uses @noble/ciphers (xchacha20-poly1305) + ECDH key agreement via x25519.
 *
 * **B16: FIPS Compliance Note:** The default encryption algorithm (XChaCha20-Poly1305) is
 * not FIPS 140-2/3 approved. Deployments requiring FIPS compliance SHOULD implement
 * AES-256-GCM as an alternative. A FIPS-compliant encryption profile is planned for v1.2.
 *
 * Per EXIT_SPEC v1.1 §10.1: Implementations that store or transmit markers
 * containing personal data (GDPR Art. 4(1)) MUST encrypt those markers.
 * Encryption is MANDATORY for markers with personal data, not optional.
 */

import { sha256 } from "@noble/hashes/sha256";
import { hkdf } from "@noble/hashes/hkdf";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { gcm } from "@noble/ciphers/aes.js";
import { randomBytes } from "@noble/ciphers/utils.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { canonicalize } from "./marker.js";
import type { ExitMarker } from "./types.js";

/** Supported encryption algorithms. */
export type EncryptionAlgorithm = 'xchacha20-poly1305' | 'aes-256-gcm';

/** HKDF info string for key derivation (v1.2). */
const HKDF_INFO = "exit-encryption-v1.2";

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
  /** Nonce (hex). 24 bytes for XChaCha20, 12 bytes for AES-256-GCM. */
  nonce: string;
  /** Encrypted ciphertext (hex). */
  ciphertext: string;
  /** HKDF salt (hex). */
  salt?: string;
  /** Encryption algorithm used. @default 'xchacha20-poly1305' */
  algorithm?: EncryptionAlgorithm;
}

/**
 * Derive a symmetric key from an ECDH shared secret using HKDF-SHA-256.
 *
 * @param shared - The raw ECDH shared secret.
 * @param salt - Salt bytes (marker-specific or random).
 * @returns 32-byte derived key.
 */
function deriveKey(shared: Uint8Array, salt: Uint8Array): Uint8Array {
  return hkdf(sha256, shared, salt, HKDF_INFO, 32);
}

/**
 * Encrypt a marker so only the holder of the private key can decrypt it.
 *
 * Uses ECDH (x25519) key agreement with an ephemeral keypair, derives a symmetric
 * key via HKDF-SHA-256 (v1.2), and encrypts with XChaCha20-Poly1305 or AES-256-GCM.
 *
 * @param marker - The EXIT marker to encrypt.
 * @param recipientPublicKey - The recipient's x25519 public key (32 bytes).
 * @param algorithm - Encryption algorithm. @default 'xchacha20-poly1305'
 * @returns An {@link EncryptedMarkerBlob} containing the ephemeral public key, nonce, and ciphertext.
 *
 * @example
 * ```ts
 * const blob = encryptMarker(marker, recipientX25519PubKey);
 * const blobGcm = encryptMarker(marker, recipientX25519PubKey, 'aes-256-gcm');
 * ```
 */
export function encryptMarker(
  marker: ExitMarker,
  recipientPublicKey: Uint8Array,
  algorithm: EncryptionAlgorithm = 'xchacha20-poly1305',
): EncryptedMarkerBlob {
  // Generate ephemeral x25519 keypair
  const ephemeralPrivate = randomBytes(32);
  const ephemeralPublic = x25519.getPublicKey(ephemeralPrivate);

  // ECDH shared secret → HKDF-SHA-256 → symmetric key (v1.2)
  const shared = x25519.getSharedSecret(ephemeralPrivate, recipientPublicKey);

  // Use marker ID bytes as salt if available, otherwise random 32 bytes
  const markerIdBytes = marker.id
    ? new TextEncoder().encode(marker.id)
    : undefined;
  const salt = markerIdBytes && markerIdBytes.length > 0 ? markerIdBytes : randomBytes(32);
  const key = deriveKey(shared, salt);

  const plaintext = new TextEncoder().encode(JSON.stringify(marker));

  let nonce: Uint8Array;
  let ciphertext: Uint8Array;

  if (algorithm === 'aes-256-gcm') {
    nonce = randomBytes(12);
    const cipher = gcm(key, nonce);
    ciphertext = cipher.encrypt(plaintext);
  } else {
    nonce = randomBytes(24);
    const cipher = xchacha20poly1305(key, nonce);
    ciphertext = cipher.encrypt(plaintext);
  }

  return {
    ephemeralPublicKey: toHex(ephemeralPublic),
    nonce: toHex(nonce),
    ciphertext: toHex(ciphertext),
    salt: toHex(salt),
    algorithm,
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

  // Use HKDF if salt is present (v1.2), fall back to raw SHA-256 for legacy blobs
  let key: Uint8Array;
  if (blob.salt) {
    const salt = fromHex(blob.salt);
    key = deriveKey(shared, salt);
  } else {
    key = sha256(shared);
  }

  const nonce = fromHex(blob.nonce);
  const ciphertext = fromHex(blob.ciphertext);

  let plaintext: Uint8Array;
  if (blob.algorithm === 'aes-256-gcm') {
    const cipher = gcm(key, nonce);
    plaintext = cipher.decrypt(ciphertext);
  } else {
    const cipher = xchacha20poly1305(key, nonce);
    plaintext = cipher.decrypt(ciphertext);
  }

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

// ─── Crypto-Shredding Infrastructure ─────────────────────────────────────────

/** Interface for managing per-marker symmetric encryption keys. */
export interface KeyStore {
  /** Store a key by ID. */
  store(id: string, key: Uint8Array): Promise<void>;
  /** Retrieve a key by ID, or null if not found. */
  retrieve(id: string): Promise<Uint8Array | null>;
  /** Delete a key by ID (crypto-shredding). */
  delete(id: string): Promise<void>;
}

/** In-memory KeyStore implementation for testing. */
export class InMemoryKeyStore implements KeyStore {
  private keys = new Map<string, Uint8Array>();

  async store(id: string, key: Uint8Array): Promise<void> {
    this.keys.set(id, new Uint8Array(key));
  }

  async retrieve(id: string): Promise<Uint8Array | null> {
    return this.keys.get(id) ?? null;
  }

  async delete(id: string): Promise<void> {
    const key = this.keys.get(id);
    if (key) key.fill(0); // zero before deleting
    this.keys.delete(id);
  }
}

/** Encrypted blob with a reference to its managed key. */
export interface ManagedEncryptedBlob {
  /** The marker ID (also the key ID in the KeyStore). */
  markerId: string;
  /** Nonce (hex). */
  nonce: string;
  /** Encrypted ciphertext (hex). */
  ciphertext: string;
  /** Encryption algorithm used. */
  algorithm: EncryptionAlgorithm;
}

/**
 * Encrypt a marker with a managed per-marker symmetric key.
 * Generates a random 256-bit key, stores it in the KeyStore, and encrypts the marker.
 *
 * @param marker - The EXIT marker to encrypt.
 * @param keyStore - The KeyStore to persist the symmetric key.
 * @param algorithm - Encryption algorithm. @default 'xchacha20-poly1305'
 * @returns The encrypted blob (key is stored separately in the KeyStore).
 */
export async function encryptMarkerWithManagedKey(
  marker: ExitMarker,
  keyStore: KeyStore,
  algorithm: EncryptionAlgorithm = 'xchacha20-poly1305',
): Promise<ManagedEncryptedBlob> {
  const key = randomBytes(32);
  await keyStore.store(marker.id, key);

  const plaintext = new TextEncoder().encode(JSON.stringify(marker));
  let nonce: Uint8Array;
  let ciphertext: Uint8Array;

  if (algorithm === 'aes-256-gcm') {
    nonce = randomBytes(12);
    const cipher = gcm(key, nonce);
    ciphertext = cipher.encrypt(plaintext);
  } else {
    nonce = randomBytes(24);
    const cipher = xchacha20poly1305(key, nonce);
    ciphertext = cipher.encrypt(plaintext);
  }

  return {
    markerId: marker.id,
    nonce: toHex(nonce),
    ciphertext: toHex(ciphertext),
    algorithm,
  };
}

/**
 * Decrypt a marker encrypted with a managed key.
 *
 * @param blob - The managed encrypted blob.
 * @param keyStore - The KeyStore containing the symmetric key.
 * @returns The decrypted EXIT marker.
 * @throws {Error} If the key has been deleted (crypto-shredded) or decryption fails.
 */
export async function decryptManagedMarker(
  blob: ManagedEncryptedBlob,
  keyStore: KeyStore,
): Promise<ExitMarker> {
  const key = await keyStore.retrieve(blob.markerId);
  if (!key) {
    throw new Error(`Key not found for marker "${blob.markerId}" — may have been crypto-shredded`);
  }

  const nonce = fromHex(blob.nonce);
  const ciphertext = fromHex(blob.ciphertext);

  let plaintext: Uint8Array;
  if (blob.algorithm === 'aes-256-gcm') {
    const cipher = gcm(key, nonce);
    plaintext = cipher.decrypt(ciphertext);
  } else {
    const cipher = xchacha20poly1305(key, nonce);
    plaintext = cipher.decrypt(ciphertext);
  }

  return JSON.parse(new TextDecoder().decode(plaintext)) as ExitMarker;
}

/**
 * Delete the encryption key for a marker, rendering its ciphertext permanently unrecoverable.
 * This is the crypto-shredding operation for GDPR Art. 17 compliance.
 *
 * @param markerId - The marker ID whose key should be destroyed.
 * @param keyStore - The KeyStore containing the key.
 */
export async function deleteMarkerKey(markerId: string, keyStore: KeyStore): Promise<void> {
  await keyStore.delete(markerId);
}
