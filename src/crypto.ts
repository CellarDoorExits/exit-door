/**
 * cellar-door-exit — Cryptographic Operations
 *
 * Ed25519 key generation, signing, verification, and DID encoding.
 */

import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";

import { p256 } from "@noble/curves/nist.js";
import { sha256 } from "@noble/hashes/sha256";

// ed25519 requires sha512 sync
ed.etc.sha512Sync = (...m: Uint8Array[]) => {
  const h = sha512.create();
  for (const msg of m) h.update(msg);
  return h.digest();
};

/** Ed25519 multicodec prefix: varint 0xed01 → [0xed, 0x01] */
const ED25519_MULTICODEC = new Uint8Array([0xed, 0x01]);

/** P-256 multicodec prefix: 0x1200 → varint [0x80, 0x24] */
const P256_MULTICODEC = new Uint8Array([0x80, 0x24]);

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

/**
 * Generate an Ed25519 keypair.
 *
 * @returns A {@link KeyPair} containing the public and private keys as `Uint8Array`.
 *
 * @example
 * ```ts
 * const { publicKey, privateKey } = generateKeyPair();
 * ```
 */
export function generateKeyPair(): KeyPair {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = ed.getPublicKey(privateKey);
  return { publicKey, privateKey };
}

/**
 * Sign data with an Ed25519 private key.
 *
 * @param data - The data to sign.
 * @param privateKey - The Ed25519 private key (32 bytes).
 * @returns The 64-byte Ed25519 signature.
 *
 * @example
 * ```ts
 * const sig = sign(new TextEncoder().encode("hello"), privateKey);
 * ```
 */
export function sign(data: Uint8Array, privateKey: Uint8Array): Uint8Array {
  return ed.sign(data, privateKey);
}

/**
 * Verify an Ed25519 signature.
 *
 * **ZIP-215 Decision (B12):** This uses @noble/ed25519's default non-strict (ZIP-215)
 * verification intentionally. ZIP-215 accepts a wider set of valid signatures than
 * RFC 8032 strict mode, which is required for consensus compatibility — all nodes
 * in a distributed system must agree on signature validity. Strict mode can cause
 * consensus splits where some implementations accept signatures others reject.
 * This matches the behavior of libsodium and most blockchain implementations.
 */
export function verify(
  data: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array
): boolean {
  try {
    return ed.verify(signature, data, publicKey);
  } catch {
    return false;
  }
}

/** Encode bytes to base58btc (multibase 'z' prefix). */
function base58btcEncode(bytes: Uint8Array): string {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let num = 0n;
  for (const b of bytes) num = num * 256n + BigInt(b);

  let encoded = "";
  while (num > 0n) {
    encoded = ALPHABET[Number(num % 58n)] + encoded;
    num /= 58n;
  }

  // Leading zeros
  for (const b of bytes) {
    if (b === 0) encoded = "1" + encoded;
    else break;
  }

  return encoded || "1";
}

/** Decode base58btc string to bytes. */
function base58btcDecode(str: string): Uint8Array {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let num = 0n;
  for (const c of str) {
    const idx = ALPHABET.indexOf(c);
    if (idx === -1) throw new Error(`Invalid base58 character: ${c}`);
    num = num * 58n + BigInt(idx);
  }

  // Convert bigint to bytes
  const hex = num.toString(16).padStart(2, "0");
  const paddedHex = hex.length % 2 ? "0" + hex : hex;
  const bytes: number[] = [];
  for (let i = 0; i < paddedHex.length; i += 2) {
    bytes.push(parseInt(paddedHex.slice(i, i + 2), 16));
  }

  // Leading zeros
  let leadingZeros = 0;
  for (const c of str) {
    if (c === "1") leadingZeros++;
    else break;
  }

  const result = new Uint8Array(leadingZeros + bytes.length);
  result.set(new Uint8Array(bytes), leadingZeros);
  return result;
}

/**
 * Convert an Ed25519 public key to a did:key string (z6Mk...).
 *
 * @param publicKey - The Ed25519 public key (32 bytes).
 * @returns A `did:key:z...` string encoding the public key with multicodec prefix.
 *
 * @example
 * ```ts
 * const did = didFromPublicKey(publicKey);
 * console.log(did); // "did:key:z6Mk..."
 * ```
 */
export function didFromPublicKey(publicKey: Uint8Array): string {
  const multicodec = new Uint8Array(ED25519_MULTICODEC.length + publicKey.length);
  multicodec.set(ED25519_MULTICODEC);
  multicodec.set(publicKey, ED25519_MULTICODEC.length);
  return `did:key:z${base58btcEncode(multicodec)}`;
}

/**
 * Extract an Ed25519 public key from a did:key string.
 *
 * @param did - A `did:key:z...` string containing an Ed25519 public key.
 * @returns The extracted 32-byte Ed25519 public key.
 * @throws {Error} If the DID format is invalid or the multicodec prefix is not Ed25519.
 *
 * @example
 * ```ts
 * const pubKey = publicKeyFromDid("did:key:z6Mk...");
 * ```
 */
export function publicKeyFromDid(did: string): Uint8Array {
  if (!did.startsWith("did:key:z")) {
    throw new Error("Invalid did:key format: must start with 'did:key:z'");
  }
  const encoded = did.slice("did:key:z".length);
  const decoded = base58btcDecode(encoded);

  if (decoded[0] === 0xed && decoded[1] === 0x01) {
    const key = decoded.slice(2);
    if (key.length !== 32) {
      throw new Error(`Invalid Ed25519 public key length: expected 32 bytes, got ${key.length}`);
    }
    return key;
  }
  if (decoded[0] === 0x80 && decoded[1] === 0x24) {
    const key = decoded.slice(2);
    if (key.length !== 33) {
      throw new Error(`Invalid P-256 public key length: expected 33 bytes, got ${key.length}`);
    }
    return key;
  }
  throw new Error("Invalid multicodec prefix: expected Ed25519 (0xed01) or P-256 (0x8024)");
}

// ─── P-256 (ECDSA) ──────────────────────────────────────────────────────────

/**
 * Generate a P-256 (ECDSA) keypair.
 */
export function generateP256KeyPair(): KeyPair {
  const privateKey = p256.utils.randomSecretKey();
  const publicKey = p256.getPublicKey(privateKey, true); // compressed
  return { publicKey, privateKey };
}

/**
 * Sign data with a P-256 private key (SHA-256 hash then ECDSA sign).
 * Returns 64-byte compact signature (r||s, 32 bytes each).
 * This is the canonical format — NOT DER-encoded.
 */
export function signP256(data: Uint8Array, privateKey: Uint8Array): Uint8Array {
  const hash = sha256(data);
  return p256.sign(hash, privateKey);
}

/**
 * Verify a P-256 ECDSA signature.
 * Expects 64-byte compact signature (r||s), not DER.
 */
export function verifyP256(data: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean {
  try {
    const hash = sha256(data);
    return p256.verify(signature, hash, publicKey);
  } catch {
    return false;
  }
}

/**
 * Convert a P-256 compressed public key to a did:key string.
 */
export function didFromP256PublicKey(publicKey: Uint8Array): string {
  const multicodec = new Uint8Array(P256_MULTICODEC.length + publicKey.length);
  multicodec.set(P256_MULTICODEC);
  multicodec.set(publicKey, P256_MULTICODEC.length);
  return `did:key:z${base58btcEncode(multicodec)}`;
}

/**
 * Extract a P-256 public key from a did:key string.
 */
export function publicKeyFromP256Did(did: string): Uint8Array {
  if (!did.startsWith("did:key:z")) {
    throw new Error("Invalid did:key format: must start with 'did:key:z'");
  }
  const encoded = did.slice("did:key:z".length);
  const decoded = base58btcDecode(encoded);

  if (decoded[0] !== 0x80 || decoded[1] !== 0x24) {
    throw new Error("Invalid multicodec prefix: expected P-256 (0x8024)");
  }

  return decoded.slice(2);
}

/**
 * Detect algorithm from a did:key string based on multicodec prefix.
 */
export function algorithmFromDid(did: string): "Ed25519" | "P-256" {
  if (!did.startsWith("did:key:z")) {
    throw new Error("Invalid did:key format");
  }
  const encoded = did.slice("did:key:z".length);
  const decoded = base58btcDecode(encoded);
  if (decoded[0] === 0xed && decoded[1] === 0x01) return "Ed25519";
  if (decoded[0] === 0x80 && decoded[1] === 0x24) return "P-256";
  throw new Error("Unknown multicodec prefix");
}
