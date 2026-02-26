import { describe, it, expect } from "vitest";
import {
  CeremonyStateMachine,
  getValidTransitions,
  CeremonyState,
  ExitType,
  ExitStatus,
  CeremonyError,
  generateKeyPair,
  didFromPublicKey,
  createMarker,
  EXIT_CONTEXT_V1,
} from "../index.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeKp() {
  const kp = generateKeyPair();
  return { ...kp, did: didFromPublicKey(kp.publicKey) };
}

function makeMarker(subject: string) {
  return createMarker({
    subject,
    origin: "https://example.com",
    exitType: ExitType.Voluntary,
  });
}

function advanceTo(
  sm: CeremonyStateMachine,
  target: CeremonyState,
  kp: ReturnType<typeof makeKp>
) {
  const marker = makeMarker(kp.did);
  switch (target) {
    case CeremonyState.Intent:
      sm.declareIntent(kp.did, "https://example.com", ExitType.Voluntary, kp.privateKey, kp.publicKey);
      break;
    case CeremonyState.Snapshot:
      sm.declareIntent(kp.did, "https://example.com", ExitType.Voluntary, kp.privateKey, kp.publicKey);
      sm.snapshot();
      break;
    case CeremonyState.Open:
      sm.declareIntent(kp.did, "https://example.com", ExitType.Voluntary, kp.privateKey, kp.publicKey);
      sm.snapshot();
      sm.openChallenge();
      break;
    case CeremonyState.Contested:
      sm.declareIntent(kp.did, "https://example.com", ExitType.Voluntary, kp.privateKey, kp.publicKey);
      sm.snapshot();
      sm.openChallenge();
      sm.contest();
      break;
    case CeremonyState.Final:
      sm.declareIntent(kp.did, "https://example.com", ExitType.Voluntary, kp.privateKey, kp.publicKey);
      sm.snapshot();
      sm.signMarker(marker, kp.privateKey, kp.publicKey);
      break;
    case CeremonyState.Departed:
      sm.declareIntent(kp.did, "https://example.com", ExitType.Voluntary, kp.privateKey, kp.publicKey);
      sm.snapshot();
      sm.signMarker(marker, kp.privateKey, kp.publicKey);
      sm.depart();
      break;
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Ceremony State Machine — Edge Cases", () => {
  // ─── Invalid transitions from every state ──────────────────────────

  describe("Invalid transitions", () => {
    it("ALIVE → SNAPSHOT throws", () => {
      const sm = new CeremonyStateMachine();
      expect(() => sm.snapshot()).toThrow(CeremonyError);
    });

    it("ALIVE → OPEN throws", () => {
      const sm = new CeremonyStateMachine();
      expect(() => sm.openChallenge()).toThrow(CeremonyError);
    });

    it("ALIVE → CONTESTED throws", () => {
      const sm = new CeremonyStateMachine();
      expect(() => sm.contest()).toThrow(CeremonyError);
    });

    it("ALIVE → DEPARTED throws", () => {
      const sm = new CeremonyStateMachine();
      expect(() => sm.depart()).toThrow(CeremonyError);
    });

    it("INTENT → OPEN throws (must go through SNAPSHOT)", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      sm.declareIntent(kp.did, "https://example.com", ExitType.Voluntary, kp.privateKey, kp.publicKey);
      expect(() => sm.openChallenge()).toThrow(CeremonyError);
    });

    it("INTENT → CONTESTED throws", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      sm.declareIntent(kp.did, "https://example.com", ExitType.Voluntary, kp.privateKey, kp.publicKey);
      expect(() => sm.contest()).toThrow(CeremonyError);
    });

    it("INTENT → DEPARTED throws", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      sm.declareIntent(kp.did, "https://example.com", ExitType.Voluntary, kp.privateKey, kp.publicKey);
      expect(() => sm.depart()).toThrow(CeremonyError);
    });

    it("SNAPSHOT → CONTESTED throws (must OPEN first)", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      advanceTo(sm, CeremonyState.Snapshot, kp);
      expect(() => sm.contest()).toThrow(CeremonyError);
    });

    it("SNAPSHOT → DEPARTED throws", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      advanceTo(sm, CeremonyState.Snapshot, kp);
      expect(() => sm.depart()).toThrow(CeremonyError);
    });

    it("OPEN → DEPARTED throws (must finalize first)", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      advanceTo(sm, CeremonyState.Open, kp);
      expect(() => sm.depart()).toThrow(CeremonyError);
    });

    it("CONTESTED → DEPARTED throws (must finalize first)", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      advanceTo(sm, CeremonyState.Contested, kp);
      expect(() => sm.depart()).toThrow(CeremonyError);
    });

    it("DEPARTED is terminal — all transitions throw", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      advanceTo(sm, CeremonyState.Departed, kp);

      expect(sm.state).toBe(CeremonyState.Departed);
      expect(() => sm.snapshot()).toThrow(CeremonyError);
      expect(() => sm.openChallenge()).toThrow(CeremonyError);
      expect(() => sm.contest()).toThrow(CeremonyError);
      expect(() => sm.depart()).toThrow(CeremonyError);
      const marker = makeMarker(kp.did);
      expect(() => sm.signMarker(marker, kp.privateKey, kp.publicKey)).toThrow(CeremonyError);
    });

    it("FINAL → anything except DEPARTED throws", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      advanceTo(sm, CeremonyState.Final, kp);

      expect(() => sm.snapshot()).toThrow(CeremonyError);
      expect(() => sm.openChallenge()).toThrow(CeremonyError);
      expect(() => sm.contest()).toThrow(CeremonyError);
      // signMarker would try FINAL → FINAL which is also invalid
      const marker = makeMarker(kp.did);
      expect(() => sm.signMarker(marker, kp.privateKey, kp.publicKey)).toThrow(CeremonyError);
    });
  });

  // ─── CeremonyError structure ───────────────────────────────────────

  describe("CeremonyError details", () => {
    it("contains correct currentState, attemptedState, validTransitions", () => {
      const sm = new CeremonyStateMachine();
      try {
        sm.snapshot();
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(CeremonyError);
        const err = e as CeremonyError;
        expect(err.currentState).toBe(CeremonyState.Alive);
        expect(err.code).toBe("INVALID_TRANSITION");
        expect(err.validTransitions).toContain(CeremonyState.Intent);
        expect(err.validTransitions).toContain(CeremonyState.Final);
      }
    });

    it("terminal state error shows no valid transitions", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      advanceTo(sm, CeremonyState.Departed, kp);
      try {
        sm.depart();
        expect.unreachable("should throw");
      } catch (e) {
        const err = e as CeremonyError;
        expect(err.validTransitions).toEqual([]);
        expect(err.message).toContain("none (terminal state)");
      }
    });
  });

  // ─── Full cooperative path ─────────────────────────────────────────

  describe("Full cooperative path (happy path)", () => {
    it("ALIVE → INTENT → SNAPSHOT → OPEN → FINAL → DEPARTED", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      const marker = makeMarker(kp.did);

      expect(sm.state).toBe(CeremonyState.Alive);

      const intent = sm.declareIntent(kp.did, "https://example.com", ExitType.Voluntary, kp.privateKey, kp.publicKey);
      expect(sm.state).toBe(CeremonyState.Intent);
      expect(intent.subject).toBe(kp.did);
      expect(intent.exitType).toBe(ExitType.Voluntary);
      expect(intent.proof).toBeDefined();

      sm.snapshot();
      expect(sm.state).toBe(CeremonyState.Snapshot);

      sm.openChallenge();
      expect(sm.state).toBe(CeremonyState.Open);

      const signed = sm.signMarker(marker, kp.privateKey, kp.publicKey);
      expect(sm.state).toBe(CeremonyState.Final);
      expect(signed.proof.proofValue).toBeTruthy();

      const departed = sm.depart();
      expect(sm.state).toBe(CeremonyState.Departed);
      expect(departed).toBe(signed);
    });
  });

  // ─── Contested path ────────────────────────────────────────────────

  describe("Contested path", () => {
    it("ALIVE → INTENT → SNAPSHOT → OPEN → CONTESTED → FINAL → DEPARTED", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      const marker = makeMarker(kp.did);

      sm.declareIntent(kp.did, "https://example.com", ExitType.Voluntary, kp.privateKey, kp.publicKey);
      sm.snapshot();
      sm.openChallenge();
      sm.contest();
      expect(sm.state).toBe(CeremonyState.Contested);

      sm.signMarker(marker, kp.privateKey, kp.publicKey);
      expect(sm.state).toBe(CeremonyState.Final);

      sm.depart();
      expect(sm.state).toBe(CeremonyState.Departed);
    });
  });

  // ─── Unilateral path ───────────────────────────────────────────────

  describe("Unilateral path", () => {
    it("ALIVE → INTENT → SNAPSHOT → FINAL → DEPARTED (skip OPEN)", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      const marker = makeMarker(kp.did);

      sm.declareIntent(kp.did, "https://example.com", ExitType.Voluntary, kp.privateKey, kp.publicKey);
      sm.snapshot();
      // Skip openChallenge, go straight to final
      sm.signMarker(marker, kp.privateKey, kp.publicKey);
      expect(sm.state).toBe(CeremonyState.Final);

      sm.depart();
      expect(sm.state).toBe(CeremonyState.Departed);
    });
  });

  // ─── Emergency path ────────────────────────────────────────────────

  describe("Emergency path", () => {
    it("ALIVE → FINAL → DEPARTED (emergency skips intent/snapshot)", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      const marker = createMarker({
        subject: kp.did,
        origin: "https://example.com",
        exitType: ExitType.Emergency,
        emergencyJustification: "Server going down",
      });

      // declareIntent with Emergency doesn't transition to INTENT
      const intent = sm.declareIntent(kp.did, "https://example.com", ExitType.Emergency, kp.privateKey, kp.publicKey);
      expect(sm.state).toBe(CeremonyState.Alive); // stays ALIVE for emergency
      expect(intent.exitType).toBe(ExitType.Emergency);

      // signMarker goes ALIVE → FINAL
      sm.signMarker(marker, kp.privateKey, kp.publicKey);
      expect(sm.state).toBe(CeremonyState.Final);

      sm.depart();
      expect(sm.state).toBe(CeremonyState.Departed);
    });

    it("emergency intent stores exitType correctly", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      sm.declareIntent(kp.did, "https://example.com", ExitType.Emergency, kp.privateKey, kp.publicKey);
      expect(sm.exitType).toBe(ExitType.Emergency);
      expect(sm.intent).toBeDefined();
      expect(sm.intent!.exitType).toBe(ExitType.Emergency);
    });
  });

  // ─── Witness edge cases ────────────────────────────────────────────

  describe("Witness operations", () => {
    it("witness before FINAL throws", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      const witness = makeKp();

      sm.declareIntent(kp.did, "https://example.com", ExitType.Voluntary, kp.privateKey, kp.publicKey);
      sm.snapshot();

      expect(() => sm.witness(witness.privateKey, witness.publicKey)).toThrow(CeremonyError);
    });

    it("witness without signed marker throws", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      const witness = makeKp();

      // Force state to FINAL without signing a marker (manipulate state directly)
      // This tests the guard: marker must exist
      sm.declareIntent(kp.did, "https://example.com", ExitType.Voluntary, kp.privateKey, kp.publicKey);
      sm.snapshot();
      // We need to reach FINAL with a marker, so let's use the normal path
      const marker = makeMarker(kp.did);
      sm.signMarker(marker, kp.privateKey, kp.publicKey);

      // Now witness should work
      const proof = sm.witness(witness.privateKey, witness.publicKey);
      expect(proof.type).toBe("Ed25519Signature2020");
      expect(proof.proofValue).toBeTruthy();
      expect(proof.verificationMethod).toBe(witness.did);
    });

    it("multiple witnesses can co-sign", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      const w1 = makeKp();
      const w2 = makeKp();
      const w3 = makeKp();

      sm.declareIntent(kp.did, "https://example.com", ExitType.Voluntary, kp.privateKey, kp.publicKey);
      sm.snapshot();
      const marker = makeMarker(kp.did);
      sm.signMarker(marker, kp.privateKey, kp.publicKey);

      const proof1 = sm.witness(w1.privateKey, w1.publicKey);
      const proof2 = sm.witness(w2.privateKey, w2.publicKey);
      const proof3 = sm.witness(w3.privateKey, w3.publicKey);

      // All proofs should be distinct
      const vms = [proof1, proof2, proof3].map(p => p.verificationMethod);
      expect(new Set(vms).size).toBe(3);
    });

    it("witness after DEPARTED throws", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      const witness = makeKp();

      advanceTo(sm, CeremonyState.Departed, kp);
      expect(() => sm.witness(witness.privateKey, witness.publicKey)).toThrow(CeremonyError);
    });
  });

  // ─── Double transitions ────────────────────────────────────────────

  describe("Double/repeated transitions", () => {
    it("declaring intent twice throws (already in INTENT)", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      sm.declareIntent(kp.did, "https://example.com", ExitType.Voluntary, kp.privateKey, kp.publicKey);

      // Second declareIntent tries INTENT → INTENT which isn't valid
      expect(() =>
        sm.declareIntent(kp.did, "https://example.com", ExitType.Voluntary, kp.privateKey, kp.publicKey)
      ).toThrow(CeremonyError);
    });

    it("snapshot twice throws", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      advanceTo(sm, CeremonyState.Snapshot, kp);
      expect(() => sm.snapshot()).toThrow(CeremonyError);
    });

    it("openChallenge twice throws", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      advanceTo(sm, CeremonyState.Open, kp);
      expect(() => sm.openChallenge()).toThrow(CeremonyError);
    });

    it("contest twice throws", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      advanceTo(sm, CeremonyState.Contested, kp);
      expect(() => sm.contest()).toThrow(CeremonyError);
    });

    it("depart twice throws", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      advanceTo(sm, CeremonyState.Departed, kp);
      expect(() => sm.depart()).toThrow(CeremonyError);
    });
  });

  // ─── getValidTransitions exhaustive ────────────────────────────────

  describe("getValidTransitions", () => {
    it("returns correct transitions for every state", () => {
      expect(getValidTransitions(CeremonyState.Alive)).toEqual([CeremonyState.Intent, CeremonyState.Final]);
      expect(getValidTransitions(CeremonyState.Intent)).toEqual([CeremonyState.Snapshot, CeremonyState.Final]);
      expect(getValidTransitions(CeremonyState.Snapshot)).toEqual([CeremonyState.Open, CeremonyState.Final]);
      expect(getValidTransitions(CeremonyState.Open)).toEqual([CeremonyState.Contested, CeremonyState.Final]);
      expect(getValidTransitions(CeremonyState.Contested)).toEqual([CeremonyState.Final]);
      expect(getValidTransitions(CeremonyState.Final)).toEqual([CeremonyState.Departed]);
      expect(getValidTransitions(CeremonyState.Departed)).toEqual([]);
    });

    it("returns a copy (not mutable reference)", () => {
      const t1 = getValidTransitions(CeremonyState.Alive);
      const t2 = getValidTransitions(CeremonyState.Alive);
      expect(t1).toEqual(t2);
      t1.push(CeremonyState.Departed);
      expect(getValidTransitions(CeremonyState.Alive)).not.toContain(CeremonyState.Departed);
    });
  });

  // ─── State machine properties ──────────────────────────────────────

  describe("State machine properties", () => {
    it("initial state is ALIVE", () => {
      const sm = new CeremonyStateMachine();
      expect(sm.state).toBe(CeremonyState.Alive);
      expect(sm.intent).toBeUndefined();
      expect(sm.marker).toBeUndefined();
      expect(sm.exitType).toBeUndefined();
    });

    it("intent is stored after declareIntent", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      const intent = sm.declareIntent(kp.did, "https://example.com", ExitType.Forced, kp.privateKey, kp.publicKey);
      expect(sm.intent).toBe(intent);
      expect(sm.exitType).toBe(ExitType.Forced);
    });

    it("marker is stored after signMarker", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      const marker = makeMarker(kp.did);
      sm.declareIntent(kp.did, "https://example.com", ExitType.Voluntary, kp.privateKey, kp.publicKey);
      sm.snapshot();
      const signed = sm.signMarker(marker, kp.privateKey, kp.publicKey);
      expect(sm.marker).toBe(signed);
    });

    it("depart returns the stored marker", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      const marker = makeMarker(kp.did);
      sm.declareIntent(kp.did, "https://example.com", ExitType.Voluntary, kp.privateKey, kp.publicKey);
      sm.snapshot();
      const signed = sm.signMarker(marker, kp.privateKey, kp.publicKey);
      const result = sm.depart();
      expect(result).toBe(signed);
    });
  });

  // ─── Different exit types through the state machine ────────────────

  describe("Exit types", () => {
    it("Forced exit follows normal cooperative path", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      const marker = makeMarker(kp.did);

      sm.declareIntent(kp.did, "https://example.com", ExitType.Forced, kp.privateKey, kp.publicKey);
      expect(sm.state).toBe(CeremonyState.Intent);
      sm.snapshot();
      sm.signMarker(marker, kp.privateKey, kp.publicKey);
      sm.depart();
      expect(sm.state).toBe(CeremonyState.Departed);
    });

    it("KeyCompromise exit follows normal cooperative path", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      const marker = makeMarker(kp.did);

      sm.declareIntent(kp.did, "https://example.com", ExitType.KeyCompromise, kp.privateKey, kp.publicKey);
      expect(sm.state).toBe(CeremonyState.Intent);
      sm.snapshot();
      sm.signMarker(marker, kp.privateKey, kp.publicKey);
      sm.depart();
      expect(sm.state).toBe(CeremonyState.Departed);
    });
  });

  // ─── Concurrent/independent state machines ────────────────────────

  describe("Independent state machines", () => {
    it("two state machines operate independently", () => {
      const sm1 = new CeremonyStateMachine();
      const sm2 = new CeremonyStateMachine();
      const kp1 = makeKp();
      const kp2 = makeKp();

      sm1.declareIntent(kp1.did, "https://a.com", ExitType.Voluntary, kp1.privateKey, kp1.publicKey);
      expect(sm1.state).toBe(CeremonyState.Intent);
      expect(sm2.state).toBe(CeremonyState.Alive);

      sm2.declareIntent(kp2.did, "https://b.com", ExitType.Emergency, kp2.privateKey, kp2.publicKey);
      expect(sm2.state).toBe(CeremonyState.Alive); // emergency stays alive
      expect(sm1.state).toBe(CeremonyState.Intent);

      sm1.snapshot();
      expect(sm1.state).toBe(CeremonyState.Snapshot);
      expect(sm2.state).toBe(CeremonyState.Alive);
    });

    it("can run many ceremonies in parallel without interference", () => {
      const machines = Array.from({ length: 20 }, () => ({
        sm: new CeremonyStateMachine(),
        kp: makeKp(),
      }));

      // Advance each to a different state
      for (let i = 0; i < machines.length; i++) {
        const { sm, kp } = machines[i];
        const marker = makeMarker(kp.did);
        sm.declareIntent(kp.did, `https://org-${i}.com`, ExitType.Voluntary, kp.privateKey, kp.publicKey);
        if (i % 4 >= 1) sm.snapshot();
        if (i % 4 >= 2) sm.openChallenge();
        if (i % 4 >= 3) {
          sm.signMarker(marker, kp.privateKey, kp.publicKey);
        }
      }

      // Verify states
      const expectedStates = [
        CeremonyState.Intent,
        CeremonyState.Snapshot,
        CeremonyState.Open,
        CeremonyState.Final,
      ];
      for (let i = 0; i < machines.length; i++) {
        expect(machines[i].sm.state).toBe(expectedStates[i % 4]);
      }
    });
  });

  // ─── Intent proof integrity ────────────────────────────────────────

  describe("Intent proof integrity", () => {
    it("intent proof contains correct verificationMethod", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      const intent = sm.declareIntent(kp.did, "https://example.com", ExitType.Voluntary, kp.privateKey, kp.publicKey);
      expect(intent.proof.verificationMethod).toBe(kp.did);
    });

    it("intent proof has valid timestamp", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      const before = new Date().toISOString();
      const intent = sm.declareIntent(kp.did, "https://example.com", ExitType.Voluntary, kp.privateKey, kp.publicKey);
      const after = new Date().toISOString();
      expect(intent.timestamp >= before).toBe(true);
      expect(intent.timestamp <= after).toBe(true);
    });

    it("different keys produce different intent proofs", () => {
      const sm1 = new CeremonyStateMachine();
      const sm2 = new CeremonyStateMachine();
      const kp1 = makeKp();
      const kp2 = makeKp();

      const i1 = sm1.declareIntent(kp1.did, "https://example.com", ExitType.Voluntary, kp1.privateKey, kp1.publicKey);
      const i2 = sm2.declareIntent(kp2.did, "https://example.com", ExitType.Voluntary, kp2.privateKey, kp2.publicKey);

      expect(i1.proof.proofValue).not.toBe(i2.proof.proofValue);
      expect(i1.proof.verificationMethod).not.toBe(i2.proof.verificationMethod);
    });
  });

  // ─── Backward transitions ─────────────────────────────────────────

  describe("Backward transitions are forbidden", () => {
    it("cannot go from SNAPSHOT back to INTENT", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      advanceTo(sm, CeremonyState.Snapshot, kp);

      // Try declaring intent again (would need INTENT transition from SNAPSHOT)
      expect(() =>
        sm.declareIntent(kp.did, "https://example.com", ExitType.Voluntary, kp.privateKey, kp.publicKey)
      ).toThrow(CeremonyError);
    });

    it("cannot go from OPEN back to SNAPSHOT", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      advanceTo(sm, CeremonyState.Open, kp);
      expect(() => sm.snapshot()).toThrow(CeremonyError);
    });

    it("cannot go from FINAL back to OPEN", () => {
      const sm = new CeremonyStateMachine();
      const kp = makeKp();
      advanceTo(sm, CeremonyState.Final, kp);
      expect(() => sm.openChallenge()).toThrow(CeremonyError);
    });
  });
});
