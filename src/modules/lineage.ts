/**
 * Module A: Lineage — Agent continuity across exits
 */

import type { ExitMarker, ModuleA, ContinuityProof } from "../types.js";
import { ContinuityProofType } from "../types.js";
import { sign, didFromPublicKey } from "../crypto.js";
import { canonicalize } from "../marker.js";

export interface CreateLineageOpts {
  predecessor?: string;
  successor?: string;
  lineageChain?: string[];
  continuityProof?: ContinuityProof;
}

/**
 * Create a lineage module for tracking agent continuity across exits.
 *
 * @param opts - Options including optional predecessor, successor, lineage chain, and continuity proof.
 * @returns A {@link ModuleA} lineage module.
 */
export function createLineageModule(opts: CreateLineageOpts): ModuleA {
  return {
    predecessor: opts.predecessor,
    successor: opts.successor,
    lineageChain: opts.lineageChain,
    continuityProof: opts.continuityProof,
  };
}

/**
 * Verify that a chain of EXIT markers forms valid lineage.
 * Each `marker[i+1]` should reference `marker[i]`'s subject as predecessor.
 *
 * @param markers - An ordered array of EXIT markers forming a lineage chain.
 * @returns An object with `valid` boolean and array of `errors`.
 */
export function verifyLineageChain(markers: ExitMarker[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (markers.length < 2) {
    return { valid: true, errors: [] };
  }

  for (let i = 1; i < markers.length; i++) {
    const prev = markers[i - 1];
    const curr = markers[i];

    if (!curr.lineage) {
      errors.push(`Marker ${i} (${curr.id}) missing lineage module`);
      continue;
    }

    if (curr.lineage.predecessor !== prev.subject) {
      errors.push(
        `Marker ${i} predecessor mismatch: expected ${prev.subject}, got ${curr.lineage.predecessor}`
      );
    }

    // If lineage chain exists, verify prev subject is in it
    if (curr.lineage.lineageChain && !curr.lineage.lineageChain.includes(prev.subject)) {
      errors.push(`Marker ${i} lineageChain does not include predecessor ${prev.subject}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Bind a successor to an existing marker by creating a key rotation proof.
 * Returns a new marker with successor info attached.
 *
 * @param marker - The EXIT marker to bind a successor to.
 * @param successorDid - The DID of the designated successor.
 * @param privateKey - The current subject's Ed25519 private key for signing the binding.
 * @param publicKey - The current subject's Ed25519 public key.
 * @returns A new EXIT marker with the lineage module updated with successor and continuity proof.
 */
export function bindSuccessor(
  marker: ExitMarker,
  successorDid: string,
  privateKey: Uint8Array,
  publicKey: Uint8Array
): ExitMarker {
  const rotationData = canonicalize({
    predecessor: marker.subject,
    successor: successorDid,
    exitMarkerId: marker.id,
  });
  const sig = sign(new TextEncoder().encode(rotationData), privateKey);
  const proofValue = btoa(String.fromCharCode(...sig));

  const lineage: ModuleA = {
    ...marker.lineage,
    successor: successorDid,
    continuityProof: {
      type: ContinuityProofType.KeyRotationBinding,
      value: proofValue,
      verificationMethod: didFromPublicKey(publicKey),
    },
  };

  return { ...marker, lineage };
}
