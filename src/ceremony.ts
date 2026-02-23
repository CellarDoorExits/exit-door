/**
 * cellar-door-exit — Ceremony State Machine
 *
 * Paths (from types.ts):
 *   Full cooperative:  ALIVE → INTENT → SNAPSHOT → OPEN → FINAL → DEPARTED
 *   Unilateral:        ALIVE → INTENT → SNAPSHOT → FINAL → DEPARTED
 *   Emergency:         ALIVE → FINAL → DEPARTED
 */

import { CeremonyState, ExitType } from "./types.js";
import type { ExitMarker, ExitIntent, DataIntegrityProof } from "./types.js";
import { sign, didFromPublicKey } from "./crypto.js";
import { canonicalize } from "./marker.js";
import { signMarker } from "./proof.js";
import { CeremonyError } from "./errors.js";

const TRANSITIONS: Record<CeremonyState, CeremonyState[]> = {
  [CeremonyState.Alive]: [CeremonyState.Intent, CeremonyState.Final], // Final for emergency
  [CeremonyState.Intent]: [CeremonyState.Snapshot],
  [CeremonyState.Snapshot]: [CeremonyState.Open, CeremonyState.Final], // Final for unilateral
  [CeremonyState.Open]: [CeremonyState.Contested, CeremonyState.Final],
  [CeremonyState.Contested]: [CeremonyState.Final],
  [CeremonyState.Final]: [CeremonyState.Departed],
  [CeremonyState.Departed]: [],
};

/**
 * Get valid transitions from a given ceremony state.
 *
 * @param state - The current ceremony state.
 * @returns An array of valid next states.
 *
 * @example
 * ```ts
 * const next = getValidTransitions(CeremonyState.Alive);
 * // [CeremonyState.Intent, CeremonyState.Final]
 * ```
 */
export function getValidTransitions(state: CeremonyState): CeremonyState[] {
  return [...(TRANSITIONS[state] ?? [])];
}

/**
 * State machine managing the EXIT ceremony lifecycle.
 *
 * Supports three paths:
 * - **Full cooperative:** ALIVE → INTENT → SNAPSHOT → OPEN → FINAL → DEPARTED
 * - **Unilateral:** ALIVE → INTENT → SNAPSHOT → FINAL → DEPARTED
 * - **Emergency:** ALIVE → FINAL → DEPARTED
 *
 * @example
 * ```ts
 * const ceremony = new CeremonyStateMachine();
 * ceremony.declareIntent(subject, origin, ExitType.Voluntary, privKey, pubKey);
 * ceremony.snapshot();
 * const signed = ceremony.signMarker(marker, privKey, pubKey);
 * const final = ceremony.depart();
 * ```
 */
export class CeremonyStateMachine {
  state: CeremonyState = CeremonyState.Alive;
  intent?: ExitIntent;
  marker?: ExitMarker;
  exitType?: ExitType;

  private transition(to: CeremonyState): void {
    if (!TRANSITIONS[this.state].includes(to)) {
      throw new CeremonyError(
        this.state,
        to,
        TRANSITIONS[this.state].map(s => s as string),
      );
    }
    this.state = to;
  }

  /**
   * Declare intent to exit. Moves ALIVE → INTENT (or stays ALIVE for emergency path).
   *
   * @param subject - The DID of the departing entity.
   * @param origin - The URI of the system being exited.
   * @param exitType - The type of exit.
   * @param privateKey - The subject's Ed25519 private key for signing the intent.
   * @param publicKey - The subject's Ed25519 public key.
   * @returns A signed {@link ExitIntent}.
   * @throws {CeremonyError} If the transition is invalid.
   */
  declareIntent(
    subject: string,
    origin: string,
    exitType: ExitType,
    privateKey: Uint8Array,
    publicKey: Uint8Array
  ): ExitIntent {
    this.exitType = exitType;

    // Emergency path goes straight to FINAL
    if (exitType === ExitType.Emergency) {
      // Don't transition yet — will go ALIVE → FINAL on sign
      this.intent = this.buildIntent(subject, origin, exitType, privateKey, publicKey);
      return this.intent;
    }

    this.transition(CeremonyState.Intent);
    this.intent = this.buildIntent(subject, origin, exitType, privateKey, publicKey);
    return this.intent;
  }

  private buildIntent(
    subject: string,
    origin: string,
    exitType: ExitType,
    privateKey: Uint8Array,
    publicKey: Uint8Array
  ): ExitIntent {
    const timestamp = new Date().toISOString();
    const intentData = { subject, origin, timestamp, exitType };
    const data = new TextEncoder().encode(canonicalize(intentData));
    const sig = sign(data, privateKey);

    return {
      subject,
      origin,
      timestamp,
      exitType,
      proof: {
        type: "Ed25519Signature2020",
        created: timestamp,
        verificationMethod: didFromPublicKey(publicKey),
        proofValue: Buffer.from(sig).toString("base64"),
      },
    };
  }

  /**
   * Advance through snapshot. Moves INTENT → SNAPSHOT.
   *
   * @throws {CeremonyError} If the current state is not INTENT.
   */
  snapshot(): void {
    this.transition(CeremonyState.Snapshot);
  }

  /**
   * Open challenge window. Moves SNAPSHOT → OPEN.
   *
   * @throws {CeremonyError} If the current state is not SNAPSHOT.
   */
  openChallenge(): void {
    this.transition(CeremonyState.Open);
  }

  /**
   * Mark as contested. Moves OPEN → CONTESTED.
   *
   * @throws {CeremonyError} If the current state is not OPEN.
   */
  contest(): void {
    this.transition(CeremonyState.Contested);
  }

  /**
   * Sign the marker and finalize. Moves to FINAL.
   *
   * @param marker - The EXIT marker to sign.
   * @param privateKey - The subject's Ed25519 private key.
   * @param publicKey - The subject's Ed25519 public key.
   * @returns The signed EXIT marker.
   * @throws {CeremonyError} If the transition to FINAL is invalid.
   */
  signMarker(marker: ExitMarker, privateKey: Uint8Array, publicKey: Uint8Array): ExitMarker {
    if (this.exitType === ExitType.Emergency && this.state === CeremonyState.Alive) {
      this.transition(CeremonyState.Final);
    } else {
      this.transition(CeremonyState.Final);
    }
    this.marker = signMarker(marker, privateKey, publicKey);
    return this.marker;
  }

  /**
   * Add a witness co-signature. Stays in FINAL.
   *
   * @param witnessKey - The witness's Ed25519 private key.
   * @param witnessPublicKey - The witness's Ed25519 public key.
   * @returns A {@link DataIntegrityProof} containing the witness's co-signature.
   * @throws {CeremonyError} If the current state is not FINAL or no marker has been signed.
   */
  witness(witnessKey: Uint8Array, witnessPublicKey: Uint8Array): DataIntegrityProof {
    if (this.state !== CeremonyState.Final) {
      throw new CeremonyError(this.state, "witness (requires final)", getValidTransitions(this.state).map(s => s as string));
    }
    if (!this.marker) throw new CeremonyError(this.state, "witness", ["sign a marker first"]);

    const { proof: _proof, ...rest } = this.marker;
    const data = new TextEncoder().encode(canonicalize(rest));
    const sig = sign(data, witnessKey);

    return {
      type: "Ed25519Signature2020",
      created: new Date().toISOString(),
      verificationMethod: didFromPublicKey(witnessPublicKey),
      proofValue: Buffer.from(sig).toString("base64"),
    };
  }

  /**
   * Depart. Moves FINAL → DEPARTED. Terminal — no further transitions possible.
   *
   * @returns The finalized EXIT marker.
   * @throws {CeremonyError} If the current state is not FINAL or no marker has been signed.
   */
  depart(): ExitMarker {
    this.transition(CeremonyState.Departed);
    if (!this.marker) throw new CeremonyError(this.state, "depart", ["sign a marker first"]);
    return this.marker;
  }
}
