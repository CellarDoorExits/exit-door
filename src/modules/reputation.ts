/**
 * Module B: Reputation Receipt — Portable reputation at exit
 */

import { sign, didFromPublicKey } from "../crypto.js";
import { canonicalize } from "../marker.js";

export interface Endorsement {
  text: string;
  signer: string;
  signature: string;
  timestamp: string;
}

export interface ReputationModule {
  moduleType: "reputation";
  metrics: Record<string, number>;
  endorsements: Endorsement[];
  tenure?: string; // ISO 8601 duration
}

export interface CreateReputationOpts {
  metrics: Record<string, number>;
  endorsements?: Endorsement[];
  tenure?: string;
}

/**
 * Create a reputation module for portable reputation at exit.
 *
 * @param opts - Options including metrics (key-value pairs), optional endorsements, and tenure duration.
 * @returns A {@link ReputationModule} with the specified reputation data.
 */
export function createReputationModule(opts: CreateReputationOpts): ReputationModule {
  return {
    moduleType: "reputation",
    metrics: opts.metrics,
    endorsements: opts.endorsements ?? [],
    tenure: opts.tenure,
  };
}

/**
 * Sign an endorsement with a signer's key.
 *
 * @param text - The endorsement text.
 * @param privateKey - The signer's Ed25519 private key.
 * @param publicKey - The signer's Ed25519 public key.
 * @returns A signed {@link Endorsement} with timestamp and signer DID.
 */
export function signEndorsement(
  text: string,
  privateKey: Uint8Array,
  publicKey: Uint8Array
): Endorsement {
  const timestamp = new Date().toISOString();
  const data = canonicalize({ text, timestamp });
  const sig = sign(new TextEncoder().encode(data), privateKey);
  return {
    text,
    signer: didFromPublicKey(publicKey),
    signature: Buffer.from(sig).toString("base64"),
    timestamp,
  };
}
