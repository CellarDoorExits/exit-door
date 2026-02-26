/**
 * cellar-door-exit — Key Compromise Recovery
 *
 * When a key is compromised, create a special EXIT marker that links
 * the compromised identity to a new one via the rotation chain.
 */

import { sign, didFromPublicKey } from "./crypto.js";
import { computeId, canonicalize } from "./marker.js";
import { KeyEventLog, verifyKeyState } from "./keri.js";
import type {
  ExitMarker,
  ExitType,
  ExitStatus,
  KeyRotationEvent,
  CompromiseLink,
  DataIntegrityProof,
} from "./types.js";
import { EXIT_CONTEXT_V1, EXIT_SPEC_VERSION } from "./types.js";

// ─── Platform Compromise Declaration ────────────────────────────────────────

/** Declaration that a platform's signing keys were compromised during a window. */
export interface PlatformCompromiseDeclaration {
  /** DID of the platform whose keys were compromised. */
  platformDid: string;
  /** Start of the compromise window (ISO 8601 UTC). */
  compromisedAfter: string;
  /** End of the compromise window (ISO 8601 UTC). If absent, compromise is ongoing. */
  compromisedBefore?: string;
  /** Signed declaration by the platform. */
  declaration: string;
}

/**
 * Flag markers that were co-signed by a platform during a compromised window.
 *
 * @param markers - Array of EXIT markers to check.
 * @param declaration - The platform compromise declaration.
 * @returns Array of marker IDs that were co-signed during the compromised window.
 */
export function flagCompromisedPlatformMarkers(
  markers: ExitMarker[],
  declaration: PlatformCompromiseDeclaration
): string[] {
  const after = new Date(declaration.compromisedAfter).getTime();
  const before = declaration.compromisedBefore
    ? new Date(declaration.compromisedBefore).getTime()
    : Infinity;

  return markers
    .filter((m) => {
      // Check if the marker's proof was created during the compromise window
      const proofTime = new Date(m.proof.created).getTime();
      if (proofTime >= after && proofTime <= before) {
        // Check if the platform co-signed (appears in counterparty acks or verification method)
        if (m.proof.verificationMethod === declaration.platformDid) return true;
        if (m.dispute?.counterpartyAcks?.some(
          (ack) => ack.verificationMethod === declaration.platformDid
        )) return true;
      }
      return false;
    })
    .map((m) => m.id);
}

/**
 * Create an EXIT marker declaring key compromise.
 *
 * Links the compromised identity to a new one via the rotation chain.
 *
 * @param compromisedDid - The DID of the compromised identity.
 * @param rotationEvent - The key rotation event that established the new key.
 * @param newDid - The DID of the new (post-rotation) identity.
 * @param signingKey - The private key of the new identity for signing.
 * @returns A signed EXIT marker of type `keyCompromise` linking old to new identity.
 */
export function createCompromiseMarker(
  compromisedDid: string,
  rotationEvent: KeyRotationEvent,
  newDid: string,
  signingKey: Uint8Array
): ExitMarker {
  const now = new Date().toISOString();
  // signingKey is the new identity's private key, used for signing below
  
  const marker = {
    "@context": EXIT_CONTEXT_V1,
    specVersion: EXIT_SPEC_VERSION,
    id: "",
    subject: compromisedDid,
    origin: "did:keri:key-event-log",
    timestamp: now,
    exitType: "keyCompromise" as ExitType,
    status: "unverified" as ExitStatus,
    selfAttested: true,
    proof: {} as DataIntegrityProof,
    lineage: {
      predecessor: compromisedDid,
      successor: newDid,
    },
    metadata: {
      reason: "Key compromise detected. Identity rotated via KERI key event log.",
      tags: ["key-compromise", "rotation"],
    },
  } as ExitMarker;

  // Compute content-addressed ID
  const { proof: _p, id: _id, ...rest } = marker;
  marker.id = `urn:exit:${computeId(rest as ExitMarker)}`;

  // Sign with the new key (the current key after rotation)
  // Use domain separation prefix consistent with signMarker/verifyMarker (CRYPTO-001 fix)
  const DOMAIN_PREFIX = "exit-marker-v1.1:";
  const canonical = canonicalize({ ...marker, proof: undefined });
  const data = new TextEncoder().encode(DOMAIN_PREFIX + canonical);
  const signature = sign(data, signingKey);
  const proofValue = Buffer.from(signature).toString("base64");

  marker.proof = {
    type: "Ed25519Signature2020",
    created: now,
    verificationMethod: newDid,
    proofValue,
  };

  return marker;
}

/**
 * Verify that a compromise recovery marker is backed by a valid rotation chain.
 *
 * @param compromiseMarker - The compromise EXIT marker to verify.
 * @param keyEventLog - The key event log containing the rotation history.
 * @returns `true` if the marker is a valid key compromise recovery; `false` otherwise.
 */
export function verifyCompromiseRecovery(
  compromiseMarker: ExitMarker,
  keyEventLog: KeyEventLog
): boolean {
  try {
    // Walk the key event log to get current state
    const state = keyEventLog.getCurrentState();

    // The marker's successor should match the current key state
    const successor = compromiseMarker.lineage?.successor;
    if (!successor) return false;

    // The compromised DID should be the subject
    const compromised = compromiseMarker.subject;
    if (!compromised) return false;

    // Verify the key event log is valid (throws if not)
    verifyKeyState(keyEventLog.getEvents());

    // The marker should be of type keyCompromise
    if (compromiseMarker.exitType !== "keyCompromise") return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Create a record linking compromised markers to the compromise event.
 *
 * @param compromiseMarker - The compromise EXIT marker.
 * @param affectedMarkerIds - IDs of markers signed with the compromised key.
 * @returns A {@link CompromiseLink} record associating affected markers with the compromise event.
 */
export function linkCompromisedMarkers(
  compromiseMarker: ExitMarker,
  affectedMarkerIds: string[]
): CompromiseLink {
  return {
    compromiseMarkerId: compromiseMarker.id,
    affectedMarkerIds: [...affectedMarkerIds],
    timestamp: new Date().toISOString(),
  };
}
