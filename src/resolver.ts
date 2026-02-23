/**
 * cellar-door-exit — DID Resolution Utilities
 *
 * Currently supports did:key (Ed25519). Extensible to did:keri, did:web.
 */

import { publicKeyFromDid, didFromPublicKey } from "./crypto.js";
import type { KeyEventLog } from "./keri.js";
import type { InceptionEvent, KeyState } from "./types.js";

export type DidMethod = "key" | "keri" | "web" | "unknown";

export interface ResolvedDid {
  publicKey: Uint8Array;
  method: DidMethod;
  multicodecPrefix: Uint8Array;
}

export interface DidDocument {
  "@context": string[];
  id: string;
  verificationMethod: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyMultibase?: string;
  }>;
  authentication: string[];
  assertionMethod: string[];
}

/**
 * Check if a string is a DID.
 *
 * @param str - The string to check.
 * @returns `true` if the string matches the `did:<method>:<id>` pattern.
 */
export function isDid(str: string): str is `did:${string}` {
  return /^did:[a-z]+:.+$/.test(str);
}

/**
 * Extract the DID method from a DID string.
 *
 * @param did - The DID string to extract the method from.
 * @returns The method name (`"key"`, `"keri"`, `"web"`) or `"unknown"`.
 */
export function didMethod(did: string): DidMethod {
  if (!isDid(did)) return "unknown";
  const method = did.split(":")[1];
  if (method === "key") return "key";
  if (method === "keri") return "keri";
  if (method === "web") return "web";
  return "unknown";
}

/**
 * Resolve a DID to its public key and method information. Currently only did:key.
 *
 * @param did - The DID to resolve.
 * @returns A {@link ResolvedDid} with the public key, method, and multicodec prefix.
 * @throws {Error} If the DID method is unsupported or the format is invalid.
 */
export function resolveDid(did: string): ResolvedDid {
  const method = didMethod(did);

  switch (method) {
    case "key": {
      const publicKey = publicKeyFromDid(did);
      return {
        publicKey,
        method: "key",
        multicodecPrefix: new Uint8Array([0xed, 0x01]),
      };
    }
    case "keri":
      throw new Error("did:keri resolution requires a KeyEventLog — use resolveDidKeri() instead");
    case "web":
      throw new Error("did:web resolution not yet implemented");
    default:
      throw new Error(`Unknown DID method: ${did}`);
  }
}

/**
 * Create a minimal DID Document (JSON-LD) for a did:key.
 *
 * @param did - A `did:key` string.
 * @returns A {@link DidDocument} with verification method, authentication, and assertion method.
 * @throws {Error} If the DID is not a `did:key`.
 */
export function createDidDocument(did: string): DidDocument {
  const method = didMethod(did);

  if (method !== "key") {
    throw new Error(
      `createDidDocument currently only supports did:key, got did:${method}`
    );
  }

  // Extract the multibase key identifier (everything after did:key:)
  const multibaseKey = did.slice("did:key:".length);

  return {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/multikey/v1",
    ],
    id: did,
    verificationMethod: [
      {
        id: `${did}#${multibaseKey}`,
        type: "Multikey",
        controller: did,
        publicKeyMultibase: multibaseKey,
      },
    ],
    authentication: [`${did}#${multibaseKey}`],
    assertionMethod: [`${did}#${multibaseKey}`],
  };
}

/**
 * Resolve a did:keri by walking the key event log. Returns the current key state.
 *
 * @param did - A `did:keri` string to resolve.
 * @param keyEventLog - The key event log containing inception and rotation events.
 * @returns A {@link ResolvedDid} with the current public key.
 * @throws {Error} If the DID is not `did:keri` or the log DID doesn't match.
 */
export function resolveDidKeri(did: string, keyEventLog: KeyEventLog): ResolvedDid {
  if (didMethod(did) !== "keri") {
    throw new Error(`Expected did:keri, got: ${did}`);
  }

  const state = keyEventLog.getCurrentState();

  if (state.did !== did) {
    throw new Error(`Key event log DID mismatch: expected ${did}, got ${state.did}`);
  }

  return {
    publicKey: state.currentKeys[0],
    method: "keri",
    multicodecPrefix: new Uint8Array([0xed, 0x01]),
  };
}

/**
 * Create a did:keri identifier from an inception event.
 *
 * @param inceptionEvent - The inception event containing the identifier.
 * @returns The `did:keri:...` string from the inception event.
 */
export function createDidKeri(inceptionEvent: InceptionEvent): string {
  return inceptionEvent.identifier;
}
