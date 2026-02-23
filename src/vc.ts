/**
 * cellar-door-exit — W3C Verifiable Credential Wrapper
 *
 * Decision D-001: EXIT markers can be wrapped as W3C VCs for interoperability.
 * Self-issued credentials: issuer = subject.
 */

import type { ExitMarker, DataIntegrityProof } from "./types.js";
import { EXIT_CONTEXT_V1 } from "./types.js";

export const VC_CONTEXT = "https://www.w3.org/ns/credentials/v2";

export interface ExitVerifiableCredential {
  "@context": [typeof VC_CONTEXT, typeof EXIT_CONTEXT_V1];
  type: ["VerifiableCredential", "ExitCredential"];
  id: string;
  issuer: string;
  issuanceDate: string;
  credentialSubject: ExitMarker;
  proof?: DataIntegrityProof;
}

/**
 * Wrap an ExitMarker as a W3C Verifiable Credential.
 *
 * Self-issued: the issuer is the marker's subject. If the marker is signed,
 * the proof is transferred to the VC envelope.
 *
 * @param marker - The EXIT marker to wrap.
 * @returns An {@link ExitVerifiableCredential} containing the marker as `credentialSubject`.
 *
 * @example
 * ```ts
 * const vc = wrapAsVC(signedMarker);
 * console.log(vc.type); // ["VerifiableCredential", "ExitCredential"]
 * ```
 */
export function wrapAsVC(marker: ExitMarker): ExitVerifiableCredential {
  const vc: ExitVerifiableCredential = {
    "@context": [VC_CONTEXT, EXIT_CONTEXT_V1],
    type: ["VerifiableCredential", "ExitCredential"],
    id: `urn:vc:exit:${marker.id}`,
    issuer: marker.subject,
    issuanceDate: marker.timestamp,
    credentialSubject: marker,
  };

  // Transfer proof from marker to VC envelope if signed
  if (marker.proof && marker.proof.proofValue) {
    vc.proof = marker.proof;
  }

  return vc;
}

/**
 * Extract the ExitMarker from a Verifiable Credential.
 *
 * @param vc - The Verifiable Credential to unwrap.
 * @returns The EXIT marker from `credentialSubject`.
 * @throws {Error} If the object is not a valid ExitVerifiableCredential.
 */
export function unwrapVC(vc: ExitVerifiableCredential): ExitMarker {
  if (!isVC(vc)) {
    throw new Error("Not a valid ExitVerifiableCredential");
  }
  return vc.credentialSubject;
}

/**
 * Type guard: is this object an EXIT Verifiable Credential?
 *
 * @param obj - The object to check.
 * @returns `true` if the object has the correct `@context`, `type`, and `credentialSubject`.
 */
export function isVC(obj: unknown): obj is ExitVerifiableCredential {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;

  if (!Array.isArray(o["@context"])) return false;
  const ctx = o["@context"] as unknown[];
  if (ctx[0] !== VC_CONTEXT) return false;

  if (!Array.isArray(o.type)) return false;
  const types = o.type as unknown[];
  if (!types.includes("VerifiableCredential") || !types.includes("ExitCredential")) return false;

  if (!o.credentialSubject || typeof o.credentialSubject !== "object") return false;

  return true;
}
