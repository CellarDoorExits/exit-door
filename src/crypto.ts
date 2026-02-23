/**
 * cellar-door-exit — Cryptographic Operations
 *
 * Ed25519 key generation, signing, verification, and DID encoding.
 */

import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";

// ed25519 requires sha512 sync
ed.etc.sha512Sync = (...m: Uint8Array[]) => {
  const h = sha512.create();
  for (const msg of m) h.update(msg);
  return h.digest();
};

/** Ed25519 multicodec prefix: varint 0xed01 → [0xed, 0x01] */
const ED25519_MULTICODEC = new Uint8Array([0xed, 0x01]);

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
 * @param data - The original signed data.
 * @param signature - The 64-byte Ed25519 signature.
 * @param publicKey - The Ed25519 public key (32 bytes).
 * @returns `true` if the signature is valid; `false` otherwise.
 *
 * @example
 * ```ts
 * const valid = verify(data, signature, publicKey);
 * ```
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

  if (decoded[0] !== 0xed || decoded[1] !== 0x01) {
    throw new Error("Invalid multicodec prefix: expected Ed25519 (0xed01)");
  }

  return decoded.slice(2);
}
