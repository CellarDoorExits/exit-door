/**
 * Module C: Origin Attestation — Origin's perspective on the exit
 */

import type { ExitMarker, ExitStatus } from "../types.js";
import { sign, didFromPublicKey } from "../crypto.js";
import { canonicalize } from "../marker.js";

export interface OriginAttestationModule {
  moduleType: "originAttestation";
  originStatus: ExitStatus;
  originStatement: string;
  originSignature: string;
  originDid: string;
  timestamp: string;
}

export interface CreateOriginAttestationOpts {
  originStatus: ExitStatus;
  originStatement: string;
  originSignature?: string;
  originDid?: string;
  timestamp?: string;
}

/**
 * Create an origin attestation module.
 *
 * @param opts - Options including the origin's status assessment, statement, and optional signature/DID.
 * @returns An {@link OriginAttestationModule} representing the origin's perspective on the exit.
 */
export function createOriginAttestation(opts: CreateOriginAttestationOpts): OriginAttestationModule {
  return {
    moduleType: "originAttestation",
    originStatus: opts.originStatus,
    originStatement: opts.originStatement,
    originSignature: opts.originSignature ?? "",
    originDid: opts.originDid ?? "",
    timestamp: opts.timestamp ?? new Date().toISOString(),
  };
}

/**
 * Sign an attestation: origin co-signs the marker with their assessment.
 *
 * @param marker - The EXIT marker being attested.
 * @param originPrivateKey - The origin's Ed25519 private key.
 * @param originPublicKey - The origin's Ed25519 public key.
 * @param status - The origin's assessment of the subject's standing.
 * @param statement - The origin's statement about the exit.
 * @returns A signed {@link OriginAttestationModule}.
 */
export function signAttestation(
  marker: ExitMarker,
  originPrivateKey: Uint8Array,
  originPublicKey: Uint8Array,
  status: ExitStatus,
  statement: string
): OriginAttestationModule {
  const timestamp = new Date().toISOString();
  const data = canonicalize({
    markerId: marker.id,
    subject: marker.subject,
    originStatus: status,
    originStatement: statement,
    timestamp,
  });
  const sig = sign(new TextEncoder().encode(data), originPrivateKey);

  return {
    moduleType: "originAttestation",
    originStatus: status,
    originStatement: statement,
    originSignature: Buffer.from(sig).toString("base64"),
    originDid: didFromPublicKey(originPublicKey),
    timestamp,
  };
}
