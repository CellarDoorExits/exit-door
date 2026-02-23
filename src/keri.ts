/**
 * cellar-door-exit — KERI-Compatible Key Management Stubs
 *
 * Scaffolding for did:keri support. Implements key event log concepts
 * (inception, rotation, pre-rotation) without full KERI protocol compliance.
 */

import { sha256 } from "@noble/hashes/sha256";
import { sign as edSign, verify as edVerify, publicKeyFromDid } from "./crypto.js";
import type {
  KeyState,
  KeyRotationEvent,
  InceptionEvent,
  KeyEvent,
  ExitMarker,
} from "./types.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function signPayload(data: string, privateKey: Uint8Array): string {
  const sig = edSign(new TextEncoder().encode(data), privateKey);
  return Buffer.from(sig).toString("base64");
}

function verifyPayload(
  data: string,
  signature: string,
  publicKey: Uint8Array
): boolean {
  const sig = new Uint8Array(Buffer.from(signature, "base64"));
  return edVerify(new TextEncoder().encode(data), sig, publicKey);
}

function eventPayload(event: KeyEvent): string {
  if (event.type === "inception") {
    return JSON.stringify({
      type: event.type,
      identifier: event.identifier,
      keys: event.keys.map(toHex),
      nextKeyDigests: event.nextKeyDigests,
      witnesses: event.witnesses,
      timestamp: event.timestamp,
    });
  }
  return JSON.stringify({
    type: event.type,
    prior: event.prior,
    current: event.current.map(toHex),
    next: event.next,
    sequenceNumber: event.sequenceNumber,
    timestamp: event.timestamp,
  });
}

/**
 * Compute SHA-256 hex digest of a public key.
 *
 * @param publicKey - The public key to digest.
 * @returns Hex-encoded SHA-256 hash of the public key.
 */
export function digestKey(publicKey: Uint8Array): string {
  return toHex(sha256(publicKey));
}

// ─── Inception ───────────────────────────────────────────────────────────────

export interface InceptionOpts {
  keys: Uint8Array[];
  nextKeyDigests: string[];
  witnesses?: string[];
  signingKey: Uint8Array;
}

/**
 * Create an inception event — the genesis of a key event log.
 *
 * @param opts - Inception options including initial keys, next key digests, optional witnesses, and signing key.
 * @returns A signed {@link InceptionEvent} with a derived `did:keri` identifier.
 *
 * @example
 * ```ts
 * const inception = createInception({
 *   keys: [publicKey],
 *   nextKeyDigests: [digestKey(nextPublicKey)],
 *   signingKey: privateKey,
 * });
 * console.log(inception.identifier); // "did:keri:..."
 * ```
 */
export function createInception(opts: InceptionOpts): InceptionEvent {
  const identifier = `did:keri:${toHex(sha256(opts.keys[0])).slice(0, 32)}`;
  const timestamp = new Date().toISOString();

  const event: InceptionEvent = {
    type: "inception",
    identifier,
    keys: opts.keys,
    nextKeyDigests: opts.nextKeyDigests,
    witnesses: opts.witnesses,
    timestamp,
    signature: "",
  };

  event.signature = signPayload(eventPayload(event), opts.signingKey);
  return event;
}

// ─── Rotation ────────────────────────────────────────────────────────────────

/**
 * Create a rotation event — replaces current keys with new ones.
 *
 * @param currentState - The current key state to rotate from.
 * @param newKeys - The new public keys replacing the current ones.
 * @param nextKeyDigests - SHA-256 digests of the keys that will replace these new keys in the next rotation.
 * @param signingKey - The current private key used to sign the rotation event.
 * @returns A signed {@link KeyRotationEvent}.
 *
 * @example
 * ```ts
 * const rotation = createRotation(state, [newPubKey], [digestKey(futureKey)], currentPrivKey);
 * ```
 */
export function createRotation(
  currentState: KeyState,
  newKeys: Uint8Array[],
  nextKeyDigests: string[],
  signingKey: Uint8Array
): KeyRotationEvent {
  const timestamp = new Date().toISOString();
  const prior = toHex(sha256(new TextEncoder().encode(JSON.stringify({
    keys: currentState.currentKeys.map(toHex),
    seq: currentState.sequenceNumber,
  }))));

  const event: KeyRotationEvent = {
    type: "rotation",
    prior,
    current: newKeys,
    next: nextKeyDigests,
    sequenceNumber: currentState.sequenceNumber + 1,
    timestamp,
    signature: "",
  };

  event.signature = signPayload(eventPayload(event), signingKey);
  return event;
}

// ─── Verification ────────────────────────────────────────────────────────────

/**
 * Walk the event chain, verify each signature, return current KeyState.
 *
 * @param events - An ordered array of key events starting with an inception event.
 * @returns The current {@link KeyState} after replaying all events.
 * @throws {Error} If the event log is empty, the first event is not inception,
 *   signatures are invalid, sequence numbers are out of order, or new keys
 *   don't match pre-committed digests.
 *
 * @example
 * ```ts
 * const state = verifyKeyState([inceptionEvent, rotationEvent]);
 * console.log(state.sequenceNumber); // 1
 * ```
 */
export function verifyKeyState(events: KeyEvent[]): KeyState {
  if (events.length === 0) {
    throw new Error("Empty event log");
  }

  const first = events[0];
  if (first.type !== "inception") {
    throw new Error("First event must be inception");
  }

  // Verify inception signature
  if (!verifyPayload(eventPayload(first), first.signature, first.keys[0])) {
    throw new Error("Invalid inception signature");
  }

  let state: KeyState = {
    did: first.identifier,
    currentKeys: [...first.keys],
    nextKeyDigests: [...first.nextKeyDigests],
    sequenceNumber: 0,
    witnesses: first.witnesses ? [...first.witnesses] : undefined,
  };

  for (let i = 1; i < events.length; i++) {
    const event = events[i];
    if (event.type !== "rotation") {
      throw new Error(`Expected rotation event at index ${i}`);
    }

    if (event.sequenceNumber !== state.sequenceNumber + 1) {
      throw new Error(
        `Sequence gap: expected ${state.sequenceNumber + 1}, got ${event.sequenceNumber}`
      );
    }

    // Verify the rotation is signed by a current key
    let sigValid = false;
    for (const key of state.currentKeys) {
      if (verifyPayload(eventPayload(event), event.signature, key)) {
        sigValid = true;
        break;
      }
    }
    if (!sigValid) {
      throw new Error(`Invalid rotation signature at sequence ${event.sequenceNumber}`);
    }

    // Verify the new keys match the pre-committed next key digests
    for (const newKey of event.current) {
      const digest = digestKey(newKey);
      if (!state.nextKeyDigests.includes(digest)) {
        throw new Error(
          `New key not in pre-committed next key digests at sequence ${event.sequenceNumber}`
        );
      }
    }

    state = {
      ...state,
      currentKeys: [...event.current],
      nextKeyDigests: [...event.next],
      sequenceNumber: event.sequenceNumber,
    };
  }

  return state;
}

/**
 * Check if the key used in a marker has been rotated out (potentially compromised).
 *
 * @param keyState - The current key state from the key event log.
 * @param marker - The EXIT marker whose signing key to check.
 * @returns `true` if the marker's verification key is no longer in the current key set.
 */
export function isKeyCompromised(keyState: KeyState, marker: ExitMarker): boolean {
  // Extract the key from the marker's proof verificationMethod
  const vm = marker.proof?.verificationMethod;
  if (!vm) return false;

  // If the verification method DID doesn't match the key state DID
  // and it's not a current key, it may have been rotated out
  // For did:key, extract the key and check if it's in currentKeys
  if (vm.startsWith("did:key:")) {
    try {
      const pubKey = publicKeyFromDid(vm);
      const pubKeyHex = toHex(pubKey);
      const currentHexes = keyState.currentKeys.map(toHex);
      return !currentHexes.includes(pubKeyHex);
    } catch {
      return false;
    }
  }

  return false;
}

// ─── Key Event Log ───────────────────────────────────────────────────────────

/**
 * Append-only log of key events with verification.
 *
 * Each appended event is verified against the full chain. Invalid events are rejected.
 *
 * @example
 * ```ts
 * const log = new KeyEventLog();
 * log.append(inceptionEvent);
 * log.append(rotationEvent);
 * const state = log.getCurrentState();
 * ```
 */
export class KeyEventLog {
  private events: KeyEvent[] = [];

  /**
   * Append an event to the log. Verifies the full chain after append.
   *
   * @param event - The key event (inception or rotation) to append.
   * @throws {Error} If the event makes the chain invalid (bad signature, sequence gap, etc.).
   */
  append(event: KeyEvent): void {
    this.events.push(event);
    // Verify the whole chain on each append
    try {
      verifyKeyState(this.events);
    } catch (e) {
      this.events.pop();
      throw e;
    }
  }

  /**
   * Get all events in the log.
   *
   * @returns A shallow copy of the event array.
   */
  getEvents(): KeyEvent[] {
    return [...this.events];
  }

  /**
   * Get the current key state by walking the log.
   *
   * @returns The current {@link KeyState} derived from replaying all events.
   * @throws {Error} If the log is empty or verification fails.
   */
  getCurrentState(): KeyState {
    return verifyKeyState(this.events);
  }

  /** Get the number of events. */
  get length(): number {
    return this.events.length;
  }
}
