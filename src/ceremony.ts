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
import type { Signer } from "./signer.js";
import { proofTypeForAlgorithm } from "./signer.js";

const TRANSITIONS: Record<CeremonyState, CeremonyState[]> = {
  [CeremonyState.Alive]: [CeremonyState.Intent, CeremonyState.Final], // Final for emergency
  [CeremonyState.Intent]: [CeremonyState.Snapshot, CeremonyState.Final], // Final for emergency escape from INTENT
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
  private _state: CeremonyState = CeremonyState.Alive;
  intent?: ExitIntent;
  marker?: ExitMarker;
  exitType?: ExitType;

  /** Current ceremony state (read-only). */
  get state(): CeremonyState {
    return this._state;
  }

  private transition(to: CeremonyState): void {
    if (!TRANSITIONS[this._state].includes(to)) {
      throw new CeremonyError(
        this._state,
        to,
        TRANSITIONS[this._state].map(s => s as string),
      );
    }
    this._state = to;
  }

  /**
   * Declare intent to exit. Moves ALIVE → INTENT (or stays ALIVE for emergency path).
   *
   * Accepts either a {@link Signer} (preferred) or raw Ed25519 key pair (deprecated).
   *
   * @param subject - The DID of the departing entity.
   * @param origin - The URI of the system being exited.
   * @param exitType - The type of exit.
   * @param signerOrPrivateKey - A Signer instance, or Ed25519 private key (deprecated).
   * @param publicKey - The Ed25519 public key (only when using raw keys).
   * @returns A signed {@link ExitIntent}.
   * @throws {CeremonyError} If the transition is invalid.
   */
  async declareIntent(
    subject: string,
    origin: string,
    exitType: ExitType,
    signerOrPrivateKey: Signer | Uint8Array,
    publicKey?: Uint8Array
  ): Promise<ExitIntent> {
    this.exitType = exitType;

    // Emergency path goes straight to FINAL
    if (exitType === ExitType.Emergency) {
      // Don't transition yet — will go ALIVE → FINAL on sign
      this.intent = await this.buildIntent(subject, origin, exitType, signerOrPrivateKey, publicKey);
      return this.intent;
    }

    this.transition(CeremonyState.Intent);
    this.intent = await this.buildIntent(subject, origin, exitType, signerOrPrivateKey, publicKey);
    return this.intent;
  }

  private async buildIntent(
    subject: string,
    origin: string,
    exitType: ExitType,
    signerOrPrivateKey: Signer | Uint8Array,
    publicKey?: Uint8Array
  ): Promise<ExitIntent> {
    const timestamp = new Date().toISOString();
    const intentData = { subject, origin, timestamp, exitType };
    const data = new TextEncoder().encode("exit-intent-v1:" + canonicalize(intentData));

    let sig: Uint8Array;
    let did: string;
    let proofType: string;

    if (signerOrPrivateKey instanceof Uint8Array) {
      // Legacy raw key path (Ed25519)
      sig = sign(data, signerOrPrivateKey);
      did = didFromPublicKey(publicKey!);
      proofType = "Ed25519Signature2020";
    } else {
      // Signer abstraction path — await to support async signers (HSM/KMS)
      sig = await signerOrPrivateKey.sign(data);
      did = signerOrPrivateKey.did();
      proofType = proofTypeForAlgorithm(signerOrPrivateKey.algorithm);
    }

    return {
      subject,
      origin,
      timestamp,
      exitType,
      proof: {
        type: proofType,
        created: timestamp,
        verificationMethod: did,
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
   * Accepts either a {@link Signer} (preferred) or raw Ed25519 key pair (deprecated).
   *
   * @param marker - The EXIT marker to sign.
   * @param signerOrPrivateKey - A Signer instance, or Ed25519 private key (deprecated).
   * @param publicKey - The Ed25519 public key (only when using raw keys).
   * @returns The signed EXIT marker.
   * @throws {CeremonyError} If the transition to FINAL is invalid.
   */
  async signMarker(marker: ExitMarker, signerOrPrivateKey: Signer | Uint8Array, publicKey?: Uint8Array): Promise<ExitMarker> {
    this.transition(CeremonyState.Final);
    if (signerOrPrivateKey instanceof Uint8Array) {
      this.marker = signMarker(marker, signerOrPrivateKey, publicKey!);
    } else {
      const signer = signerOrPrivateKey;
      const { proof: _proof, id: _id, ...rest } = marker;
      const canonical = canonicalize(rest);
      const data = new TextEncoder().encode("exit-marker-v1.1:" + canonical);
      const sig = await signer.sign(data);
      this.marker = {
        ...marker,
        proof: {
          type: proofTypeForAlgorithm(signer.algorithm),
          created: new Date().toISOString(),
          verificationMethod: signer.did(),
          proofValue: Buffer.from(sig).toString("base64"),
        },
      };
    }
    return this.marker;
  }

  /**
   * Add a witness co-signature. Stays in FINAL.
   *
   * Accepts either a {@link Signer} (preferred) or raw Ed25519 key pair (deprecated).
   *
   * @param signerOrWitnessKey - A Signer instance, or witness Ed25519 private key (deprecated).
   * @param witnessPublicKey - The witness's Ed25519 public key (only when using raw keys).
   * @returns A {@link DataIntegrityProof} containing the witness's co-signature.
   * @throws {CeremonyError} If the current state is not FINAL or no marker has been signed.
   */
  async witness(signerOrWitnessKey: Signer | Uint8Array, witnessPublicKey?: Uint8Array): Promise<DataIntegrityProof> {
    if (this.state !== CeremonyState.Final) {
      throw new CeremonyError(this.state, "witness (requires final)", getValidTransitions(this.state).map(s => s as string));
    }
    if (!this.marker) throw new CeremonyError(this.state, "witness", ["sign a marker first"]);

    const { proof: _proof, ...rest } = this.marker;
    const data = new TextEncoder().encode("exit-witness-v1:" + canonicalize(rest));

    if (signerOrWitnessKey instanceof Uint8Array) {
      const sig = sign(data, signerOrWitnessKey);
      return {
        type: "Ed25519Signature2020",
        created: new Date().toISOString(),
        verificationMethod: didFromPublicKey(witnessPublicKey!),
        proofValue: Buffer.from(sig).toString("base64"),
      };
    } else {
      const signer = signerOrWitnessKey;
      const sig = await signer.sign(data);
      return {
        type: proofTypeForAlgorithm(signer.algorithm),
        created: new Date().toISOString(),
        verificationMethod: signer.did(),
        proofValue: Buffer.from(sig).toString("base64"),
      };
    }
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
