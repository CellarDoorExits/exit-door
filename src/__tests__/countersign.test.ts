import { describe, it, expect } from "vitest";
import {
  createMarker,
  signMarker,
  ExitType,
  StatusConfirmation,
} from "../index.js";
import { generateKeyPair, didFromPublicKey } from "../crypto.js";
import {
  addCounterSignature,
  addWitness,
  verifyCounterSignature,
  deriveStatusConfirmation,
} from "../countersign.js";
import type { WitnessAttachment } from "../types.js";

function makeSignedMarker() {
  const subjectKeys = generateKeyPair();
  const did = didFromPublicKey(subjectKeys.publicKey);
  const marker = createMarker({
    subject: did,
    origin: "https://example.com",
    exitType: ExitType.Voluntary,
  });
  return { marker: signMarker(marker, subjectKeys.privateKey, subjectKeys.publicKey), subjectKeys };
}

describe("Counter-Signature Functions", () => {
  describe("addCounterSignature", () => {
    it("adds a counter-signature to a signed marker", () => {
      const { marker } = makeSignedMarker();
      const platformKeys = generateKeyPair();

      const countersigned = addCounterSignature(marker, platformKeys.privateKey, platformKeys.publicKey);

      expect(countersigned.dispute).toBeDefined();
      expect(countersigned.dispute!.counterpartyAcks).toHaveLength(1);
      expect(countersigned.dispute!.counterpartyAcks![0].type).toBe("Ed25519Signature2020");
      expect(countersigned.dispute!.counterpartyAcks![0].proofValue).toBeTruthy();
    });

    it("appends to existing counterpartyAcks", () => {
      const { marker } = makeSignedMarker();
      const k1 = generateKeyPair();
      const k2 = generateKeyPair();

      const once = addCounterSignature(marker, k1.privateKey, k1.publicKey);
      const twice = addCounterSignature(once, k2.privateKey, k2.publicKey);

      expect(twice.dispute!.counterpartyAcks).toHaveLength(2);
    });

    it("throws on unsigned marker", () => {
      const marker = createMarker({
        subject: "did:key:z6MkTest",
        origin: "https://example.com",
        exitType: ExitType.Voluntary,
      });
      const keys = generateKeyPair();

      expect(() => addCounterSignature(marker, keys.privateKey, keys.publicKey)).toThrow(
        "Cannot counter-sign an unsigned marker"
      );
    });
  });

  describe("verifyCounterSignature", () => {
    it("verifies a valid counter-signature", () => {
      const { marker } = makeSignedMarker();
      const platformKeys = generateKeyPair();

      const countersigned = addCounterSignature(marker, platformKeys.privateKey, platformKeys.publicKey);
      const result = verifyCounterSignature(countersigned, platformKeys.publicKey, 0);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects wrong public key", () => {
      const { marker } = makeSignedMarker();
      const platformKeys = generateKeyPair();
      const wrongKeys = generateKeyPair();

      const countersigned = addCounterSignature(marker, platformKeys.privateKey, platformKeys.publicKey);
      const result = verifyCounterSignature(countersigned, wrongKeys.publicKey, 0);

      expect(result.valid).toBe(false);
    });

    it("returns error for missing counterpartyAcks", () => {
      const { marker } = makeSignedMarker();
      const keys = generateKeyPair();
      const result = verifyCounterSignature(marker, keys.publicKey, 0);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("No counterpartyAcks");
    });
  });

  describe("addWitness", () => {
    it("adds a witness attachment to trustEnhancers", () => {
      const { marker } = makeSignedMarker();
      const witness: WitnessAttachment = {
        witnessDid: "did:key:z6MkWitness",
        attestation: "observed departure ceremony",
        timestamp: new Date().toISOString(),
        signature: "dGVzdA==",
        signatureType: "Ed25519Signature2020",
      };

      const witnessed = addWitness(marker, witness);

      expect(witnessed.trustEnhancers).toBeDefined();
      expect(witnessed.trustEnhancers!.witnesses).toHaveLength(1);
      expect(witnessed.trustEnhancers!.witnesses![0].witnessDid).toBe("did:key:z6MkWitness");
    });

    it("appends to existing witnesses", () => {
      const { marker } = makeSignedMarker();
      const w1: WitnessAttachment = {
        witnessDid: "did:key:z6MkW1",
        attestation: "saw it",
        timestamp: new Date().toISOString(),
        signature: "dGVzdA==",
        signatureType: "Ed25519Signature2020",
      };
      const w2: WitnessAttachment = {
        witnessDid: "did:key:z6MkW2",
        attestation: "also saw it",
        timestamp: new Date().toISOString(),
        signature: "dGVzdA==",
        signatureType: "Ed25519Signature2020",
      };

      const result = addWitness(addWitness(marker, w1), w2);
      expect(result.trustEnhancers!.witnesses).toHaveLength(2);
    });
  });

  describe("deriveStatusConfirmation", () => {
    it("returns self_only for basic signed marker", () => {
      const { marker } = makeSignedMarker();
      expect(deriveStatusConfirmation(marker)).toBe(StatusConfirmation.SelfOnly);
    });

    it("returns mutual when counter-signed", () => {
      const { marker } = makeSignedMarker();
      const keys = generateKeyPair();
      const countersigned = addCounterSignature(marker, keys.privateKey, keys.publicKey);
      expect(deriveStatusConfirmation(countersigned)).toBe(StatusConfirmation.Mutual);
    });

    it("returns witnessed when witnesses present", () => {
      const { marker } = makeSignedMarker();
      const keys = generateKeyPair();
      const countersigned = addCounterSignature(marker, keys.privateKey, keys.publicKey);
      const witnessed = addWitness(countersigned, {
        witnessDid: "did:key:z6MkW",
        attestation: "saw it",
        timestamp: new Date().toISOString(),
        signature: "dGVzdA==",
        signatureType: "Ed25519Signature2020",
      });
      expect(deriveStatusConfirmation(witnessed)).toBe(StatusConfirmation.Witnessed);
    });

    it("returns origin_only when acks exist but no subject proof", () => {
      const { marker } = makeSignedMarker();
      const keys = generateKeyPair();
      const countersigned = addCounterSignature(marker, keys.privateKey, keys.publicKey);
      // Remove the subject proof
      const noProof = { ...countersigned, proof: { ...countersigned.proof, proofValue: "" } };
      expect(deriveStatusConfirmation(noProof)).toBe(StatusConfirmation.OriginOnly);
    });
  });
});
