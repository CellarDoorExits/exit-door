import { describe, it, expect } from "vitest";
import {
  generateKeyPair,
  didFromPublicKey,
  createMarker,
  computeId,
  canonicalize,
  signMarker,
  verifyMarker,
  validateMarker,
  addModule,
  CeremonyStateMachine,
  ExitType,
  ExitStatus,
  EXIT_CONTEXT_V1,
  EXIT_SPEC_VERSION,
  type ModuleA,
} from "../index.js";

describe("ExitMarker", () => {
  it("creates a voluntary exit marker, signs it, and verifies it", () => {
    const { publicKey, privateKey } = generateKeyPair();
    const marker = createMarker({
      subject: didFromPublicKey(publicKey),
      origin: "https://example.com",
      exitType: ExitType.Voluntary,
    });

    expect(marker["@context"]).toBe(EXIT_CONTEXT_V1);
    expect(marker.exitType).toBe(ExitType.Voluntary);
    expect(marker.status).toBe(ExitStatus.GoodStanding);

    const signed = signMarker(marker, privateKey, publicKey);
    expect(signed.proof.proofValue).toBeTruthy();
    expect(signed.proof.type).toBe("Ed25519Signature2020");

    const result = verifyMarker(signed);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("creates an emergency exit marker with justification", () => {
    const { publicKey, privateKey } = generateKeyPair();
    const marker = createMarker({
      subject: didFromPublicKey(publicKey),
      origin: "https://failing-system.org",
      exitType: ExitType.Emergency,
      emergencyJustification: "Platform unresponsive for 72+ hours",
    });

    expect(marker.status).toBe(ExitStatus.Unverified);
    expect(marker.exitType).toBe(ExitType.Emergency);
    expect(marker.emergencyJustification).toBe("Platform unresponsive for 72+ hours");
    expect(marker.selfAttested).toBe(true);

    const signed = signMarker(marker, privateKey, publicKey);
    const result = verifyMarker(signed);
    expect(result.valid).toBe(true);
  });

  it("detects tampering with a signed marker", () => {
    const { publicKey, privateKey } = generateKeyPair();
    const marker = createMarker({
      subject: didFromPublicKey(publicKey),
      origin: "https://example.com",
      exitType: ExitType.Voluntary,
    });

    const signed = signMarker(marker, privateKey, publicKey);
    const tampered = { ...signed, origin: "https://evil.com" };

    const result = verifyMarker(tampered);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("validates schema — missing required field produces error", () => {
    const incomplete = {
      "@context": EXIT_CONTEXT_V1,
      specVersion: EXIT_SPEC_VERSION,
      id: "test",
      subject: "did:key:z123",
      // missing origin, timestamp, exitType, status, proof
    };

    const result = validateMarker(incomplete);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("computes deterministic content-addressed IDs", () => {
    const opts = {
      subject: "did:key:zDeterministic",
      origin: "https://example.com",
      exitType: ExitType.Voluntary,
      timestamp: "2026-01-01T00:00:00.000Z",
      status: ExitStatus.GoodStanding,
    };

    const m1 = createMarker(opts);
    const m2 = createMarker(opts);

    expect(computeId(m1)).toBe(computeId(m2));
    expect(m1.id).toBe(m2.id);
  });
});

describe("CeremonyStateMachine", () => {
  it("completes the full voluntary path", async () => {
    const { publicKey, privateKey } = generateKeyPair();
    const sm = new CeremonyStateMachine();

    expect(sm.state).toBe("alive");

    const did = didFromPublicKey(publicKey);
    await sm.declareIntent(did, "https://origin.com", ExitType.Voluntary, privateKey, publicKey);
    expect(sm.state).toBe("intent");

    sm.snapshot();
    expect(sm.state).toBe("snapshot");

    const marker = createMarker({
      subject: did,
      origin: "https://origin.com",
      exitType: ExitType.Voluntary,
    });

    await sm.signMarker(marker, privateKey, publicKey);
    expect(sm.state).toBe("final");

    const { publicKey: wPub, privateKey: wPriv } = generateKeyPair();
    const witnessProof = await sm.witness(wPriv, wPub);
    expect(witnessProof.type).toBe("Ed25519Signature2020");
    expect(sm.state).toBe("final");

    const departed = sm.depart();
    expect(sm.state).toBe("departed");
    expect(departed).toBeTruthy();
  });

  it("supports emergency shortcut: ALIVE → FINAL → DEPARTED", async () => {
    const { publicKey, privateKey } = generateKeyPair();
    const sm = new CeremonyStateMachine();

    const did = didFromPublicKey(publicKey);
    await sm.declareIntent(did, "https://dying.org", ExitType.Emergency, privateKey, publicKey);
    // Emergency stays in ALIVE, goes to FINAL on sign
    expect(sm.state).toBe("alive");

    const marker = createMarker({
      subject: did,
      origin: "https://dying.org",
      exitType: ExitType.Emergency,
      emergencyJustification: "Platform is dying",
    });

    await sm.signMarker(marker, privateKey, publicKey);
    expect(sm.state).toBe("final");

    sm.depart();
    expect(sm.state).toBe("departed");
  });

  it("rejects invalid transitions", () => {
    const sm = new CeremonyStateMachine();
    expect(() => sm.snapshot()).toThrow("Invalid ceremony transition");
  });
});

describe("Compliance Validation", () => {
  it("requires emergencyJustification for emergency exits", () => {
    const marker = {
      "@context": EXIT_CONTEXT_V1,
      specVersion: EXIT_SPEC_VERSION,
      id: "urn:exit:test",
      subject: "did:key:z123",
      origin: "https://example.com",
      timestamp: "2026-01-01T00:00:00.000Z",
      exitType: ExitType.Emergency,
      status: ExitStatus.Unverified,
      selfAttested: true,
      proof: {
        type: "Ed25519Signature2020",
        created: "2026-01-01T00:00:00.000Z",
        verificationMethod: "did:key:z123",
        proofValue: "abc",
      },
    };

    const result = validateMarker(marker);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("emergencyJustification is required when exitType is 'emergency'");
  });

  it("passes validation when emergency exit has justification", () => {
    const marker = {
      "@context": EXIT_CONTEXT_V1,
      specVersion: EXIT_SPEC_VERSION,
      id: "urn:exit:test",
      subject: "did:key:z123",
      origin: "https://example.com",
      timestamp: "2026-01-01T00:00:00.000Z",
      exitType: ExitType.Emergency,
      status: ExitStatus.Unverified,
      selfAttested: true,
      emergencyJustification: "Platform is shutting down",
      proof: {
        type: "Ed25519Signature2020",
        created: "2026-01-01T00:00:00.000Z",
        verificationMethod: "did:key:z123",
        proofValue: "abc",
      },
    };

    const result = validateMarker(marker);
    expect(result.valid).toBe(true);
  });

  it("validates legalHold structure when present", () => {
    const marker = {
      "@context": EXIT_CONTEXT_V1,
      specVersion: EXIT_SPEC_VERSION,
      id: "urn:exit:test",
      subject: "did:key:z123",
      origin: "https://example.com",
      timestamp: "2026-01-01T00:00:00.000Z",
      exitType: ExitType.Voluntary,
      status: ExitStatus.GoodStanding,
      selfAttested: true,
      legalHold: {
        holdType: "litigation_hold",
        authority: "US District Court",
        reference: "Case 3:26-cv-00123",
        dateIssued: "2026-01-28T00:00:00.000Z",
        acknowledged: true,
      },
      proof: {
        type: "Ed25519Signature2020",
        created: "2026-01-01T00:00:00.000Z",
        verificationMethod: "did:key:z123",
        proofValue: "abc",
      },
    };

    const result = validateMarker(marker);
    expect(result.valid).toBe(true);
  });

  it("rejects invalid legalHold structure", () => {
    const marker = {
      "@context": EXIT_CONTEXT_V1,
      specVersion: EXIT_SPEC_VERSION,
      id: "urn:exit:test",
      subject: "did:key:z123",
      origin: "https://example.com",
      timestamp: "2026-01-01T00:00:00.000Z",
      exitType: ExitType.Voluntary,
      status: ExitStatus.GoodStanding,
      selfAttested: true,
      legalHold: {
        holdType: "",
        // missing authority, reference, dateIssued, acknowledged
      },
      proof: {
        type: "Ed25519Signature2020",
        created: "2026-01-01T00:00:00.000Z",
        verificationMethod: "did:key:z123",
        proofValue: "abc",
      },
    };

    const result = validateMarker(marker);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("legalHold.holdType is required");
    expect(result.errors).toContain("legalHold.authority is required");
    expect(result.errors).toContain("legalHold.reference is required");
    expect(result.errors).toContain("legalHold.dateIssued is required");
    expect(result.errors).toContain("legalHold.acknowledged must be a boolean");
  });

  it("accepts keyCompromise exit type", () => {
    const marker = {
      "@context": EXIT_CONTEXT_V1,
      specVersion: EXIT_SPEC_VERSION,
      id: "urn:exit:test",
      subject: "did:key:z123",
      origin: "https://example.com",
      timestamp: "2026-01-01T00:00:00.000Z",
      exitType: ExitType.KeyCompromise,
      status: ExitStatus.Unverified,
      selfAttested: true,
      proof: {
        type: "Ed25519Signature2020",
        created: "2026-01-01T00:00:00.000Z",
        verificationMethod: "did:key:z123",
        proofValue: "abc",
      },
    };

    const result = validateMarker(marker);
    expect(result.valid).toBe(true);
  });

  it("voluntary marker has selfAttested true by default", () => {
    const marker = createMarker({
      subject: "did:key:zTest",
      origin: "https://example.com",
      exitType: ExitType.Voluntary,
    });

    expect(marker.selfAttested).toBe(true);
  });
});

describe("Modules", () => {
  it("adds Module A (lineage) to a marker", () => {
    const marker = createMarker({
      subject: "did:key:zLineageTest",
      origin: "https://example.com",
      exitType: ExitType.Voluntary,
    });

    const lineage: ModuleA = {
      predecessor: "did:key:zOldEntity",
      successor: "did:key:zNewEntity",
      lineageChain: ["did:key:zGenesis", "did:key:zOldEntity", "did:key:zNewEntity"],
    };

    const withLineage = addModule(marker, "lineage", lineage);
    expect(withLineage.lineage).toBeDefined();
    expect(withLineage.lineage!.predecessor).toBe("did:key:zOldEntity");
    expect(withLineage.lineage!.lineageChain).toHaveLength(3);
    // Original unchanged
    expect(marker.lineage).toBeUndefined();
  });
});

describe("New ExitType values (v1.1)", () => {
  const newTypes = [
    { type: ExitType.PlatformShutdown, label: "PlatformShutdown" },
    { type: ExitType.Directed, label: "Directed" },
    { type: ExitType.Constructive, label: "Constructive" },
    { type: ExitType.Acquisition, label: "Acquisition" },
  ];

  for (const { type, label } of newTypes) {
    it(`creates, validates, signs, and verifies a ${label} marker`, () => {
      const { publicKey, privateKey } = generateKeyPair();
      const marker = createMarker({
        subject: didFromPublicKey(publicKey),
        origin: "https://example.com",
        exitType: type,
      });

      expect(marker.exitType).toBe(type);

      // Validate
      const validation = validateMarker(marker);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Sign and verify
      const signed = signMarker(marker, privateKey, publicKey);
      expect(signed.proof.proofValue).toBeTruthy();

      const result = verifyMarker(signed);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  }

  describe("NFC normalization", () => {
    it("produces identical canonical output for NFC and NFD forms", () => {
      // é as single codepoint (NFC) vs e + combining acute (NFD)
      const nfc = "caf\u00E9";
      const nfd = "cafe\u0301";
      expect(nfc).not.toBe(nfd); // different byte representations
      expect(nfc.normalize("NFC")).toBe(nfd.normalize("NFC")); // same after NFC

      const marker1 = createMarker({
        subject: "did:key:z6MkTest",
        origin: `https://${nfc}.example.com`,
        exitType: ExitType.Voluntary,
      });
      const marker2 = createMarker({
        subject: "did:key:z6MkTest",
        origin: `https://${nfd}.example.com`,
        exitType: ExitType.Voluntary,
        timestamp: marker1.timestamp,
      });

      const { proof: _p1, id: _id1, ...rest1 } = marker1;
      const { proof: _p2, id: _id2, ...rest2 } = marker2;
      expect(canonicalize(rest1)).toBe(canonicalize(rest2));
    });
  });
});
