/**
 * cellar-door-exit — Signer Abstraction
 *
 * Algorithm-agnostic signing interface supporting Ed25519 and ECDSA P-256.
 */

import {
  generateKeyPair,
  sign,
  verify,
  didFromPublicKey,
  generateP256KeyPair,
  signP256,
  verifyP256,
  didFromP256PublicKey,
  algorithmFromDid,
  publicKeyFromDid,
  publicKeyFromP256Did,
} from "./crypto.js";

/** Algorithm identifiers */
export type SignatureAlgorithm = "Ed25519" | "P-256";

/** Abstract signer interface — the highest-leverage abstraction in the codebase */
export interface Signer {
  /** The algorithm this signer uses */
  readonly algorithm: SignatureAlgorithm;
  /** Sign data, return signature bytes */
  sign(data: Uint8Array): Promise<Uint8Array> | Uint8Array;
  /** Verify signature against data */
  verify(data: Uint8Array, signature: Uint8Array): Promise<boolean> | boolean;
  /** Get the DID for this signer's public key */
  did(): string;
  /** Get the public key bytes */
  publicKey(): Uint8Array;
  /**
   * Zero private key material (best-effort). Optional — not all signers hold key material
   * (e.g., HSM-backed signers). Callers SHOULD call destroy() when done signing.
   * @see Ed25519Signer.destroy for JS-specific caveats.
   */
  destroy?(): void;
}

/** Options for creating built-in signers */
export interface SignerOptions {
  algorithm?: SignatureAlgorithm;
  privateKey?: Uint8Array;
  publicKey?: Uint8Array;
}

/** Ed25519 signer implementation */
export class Ed25519Signer implements Signer {
  readonly algorithm: SignatureAlgorithm = "Ed25519";
  #privateKey: Uint8Array;
  #publicKey: Uint8Array;

  constructor(privateKey: Uint8Array, publicKey: Uint8Array) {
    this.#privateKey = privateKey;
    this.#publicKey = publicKey;
  }

  sign(data: Uint8Array): Uint8Array {
    return sign(data, this.#privateKey);
  }

  verify(data: Uint8Array, signature: Uint8Array): boolean {
    return verify(data, signature, this.#publicKey);
  }

  did(): string {
    return didFromPublicKey(this.#publicKey);
  }

  publicKey(): Uint8Array {
    return this.#publicKey;
  }

  /**
   * Zero the private key material (best-effort).
   *
   * **B2/B3:** In JavaScript, memory is managed by the GC and copies may exist
   * in optimized JIT code or V8 internals. This zeroing is best-effort — it
   * overwrites the backing ArrayBuffer but cannot guarantee all copies are erased.
   * For high-security contexts, consider hardware-backed signing (HSM/TPM).
   */
  destroy(): void {
    this.#privateKey.fill(0);
  }
}

/** P-256 (ECDSA) signer implementation */
export class P256Signer implements Signer {
  readonly algorithm: SignatureAlgorithm = "P-256";
  #privateKey: Uint8Array;
  #publicKey: Uint8Array;

  constructor(privateKey: Uint8Array, publicKey: Uint8Array) {
    this.#privateKey = privateKey;
    this.#publicKey = publicKey;
  }

  sign(data: Uint8Array): Uint8Array {
    const sig: Uint8Array = signP256(data, this.#privateKey);
    return new Uint8Array(sig);
  }

  verify(data: Uint8Array, signature: Uint8Array): boolean {
    return verifyP256(data, signature, this.#publicKey);
  }

  did(): string {
    return didFromP256PublicKey(this.#publicKey);
  }

  publicKey(): Uint8Array {
    return this.#publicKey;
  }

  /**
   * Zero the private key material (best-effort).
   * @see Ed25519Signer.destroy for caveats.
   */
  destroy(): void {
    this.#privateKey.fill(0);
  }
}

/**
 * Generate a keypair for the given algorithm.
 */
export function generateKeyPairForAlgorithm(
  algorithm: SignatureAlgorithm = "Ed25519"
): { publicKey: Uint8Array; privateKey: Uint8Array } {
  if (algorithm === "P-256") return generateP256KeyPair();
  return generateKeyPair();
}

/**
 * Factory function to create a signer.
 */
export function createSigner(options?: SignerOptions): Signer {
  const alg = options?.algorithm ?? "Ed25519";
  let privateKey = options?.privateKey;
  let publicKey = options?.publicKey;

  if (!privateKey) {
    const kp = generateKeyPairForAlgorithm(alg);
    privateKey = kp.privateKey;
    publicKey = kp.publicKey;
  }

  if (!publicKey) {
    throw new Error("publicKey is required when privateKey is provided");
  }

  if (alg === "P-256") return new P256Signer(privateKey, publicKey);
  return new Ed25519Signer(privateKey, publicKey);
}

/**
 * Create a verify-only object from a DID and public key.
 */
export function createVerifier(
  didStr: string,
  pubKey: Uint8Array
): Pick<Signer, "verify" | "did" | "publicKey" | "algorithm"> {
  const alg = algorithmFromDid(didStr);
  return {
    algorithm: alg,
    verify(data: Uint8Array, signature: Uint8Array): boolean {
      if (alg === "P-256") return verifyP256(data, signature, pubKey);
      return verify(data, signature, pubKey);
    },
    did(): string {
      return didStr;
    },
    publicKey(): Uint8Array {
      return pubKey;
    },
  };
}

/**
 * Get the proof type string for an algorithm.
 */
export function proofTypeForAlgorithm(alg: SignatureAlgorithm): string {
  if (alg === "P-256") return "EcdsaP256Signature2019";
  return "Ed25519Signature2020";
}

/**
 * Detect algorithm from proof type string.
 */
export function algorithmFromProofType(proofType: string): SignatureAlgorithm | null {
  if (proofType === "Ed25519Signature2020") return "Ed25519";
  if (proofType === "EcdsaP256Signature2019") return "P-256";
  return null;
}
