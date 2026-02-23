import { describe, it, expect } from "vitest";
import {
  generateKeyPair,
  createMarker,
  signMarker,
  addModule,
  verifyMarker,
  ExitType,
  ExitStatus,
  type ModuleA,
} from "../index.js";
import {
  createLineageModule,
  verifyLineageChain,
  bindSuccessor,
  createReputationModule,
  signEndorsement,
  createOriginAttestation,
  signAttestation,
  createAssetManifest,
  createContinuityModule,
  createDisputeModule,
} from "../modules/index.js";

describe("Module creation", () => {
  it("creates a lineage module", () => {
    const mod = createLineageModule({
      predecessor: "did:key:zOld",
      lineageChain: ["did:key:zGenesis", "did:key:zOld"],
    });
    expect(mod.predecessor).toBe("did:key:zOld");
    expect(mod.lineageChain).toHaveLength(2);
  });

  it("creates a reputation module", () => {
    const mod = createReputationModule({
      metrics: { reliability: 0.95, responsiveness: 0.88 },
      tenure: "P2Y3M",
    });
    expect(mod.moduleType).toBe("reputation");
    expect(mod.metrics.reliability).toBe(0.95);
    expect(mod.tenure).toBe("P2Y3M");
  });

  it("creates an origin attestation module", () => {
    const mod = createOriginAttestation({
      originStatus: ExitStatus.GoodStanding,
      originStatement: "Subject departed in good standing after 2 years of service.",
    });
    expect(mod.moduleType).toBe("originAttestation");
    expect(mod.originStatus).toBe(ExitStatus.GoodStanding);
  });

  it("creates an asset manifest module", () => {
    const mod = createAssetManifest([
      { id: "asset-1", type: "data", description: "User profile export", data: "profile-data", portable: true },
      { id: "asset-2", type: "tokens", description: "Earned tokens", hash: "abc123", portable: true },
      { id: "asset-3", type: "credentials", description: "Platform credentials", hash: "def456", portable: false },
    ]);
    expect(mod.moduleType).toBe("assets");
    expect(mod.assets).toHaveLength(3);
    expect(mod.assets[0].hash).toBeTruthy(); // computed from data
    expect(mod.assets[1].hash).toBe("abc123"); // provided directly
    expect(mod.assets[2].portable).toBe(false);
  });

  it("creates a continuity module", () => {
    const mod = createContinuityModule({
      stateHash: "abc123def456",
      memoryRef: "ipfs://QmMemoryHash",
      configHash: "config789",
      continuityProofType: "merkle",
    });
    expect(mod.moduleType).toBe("continuity");
    expect(mod.stateHash).toBe("abc123def456");
    expect(mod.memoryRef).toBe("ipfs://QmMemoryHash");
  });

  it("creates a dispute module", () => {
    const mod = createDisputeModule({
      disputeType: "payment",
      filedBy: "did:key:zCounterparty",
      description: "Outstanding payment not settled",
      evidence: ["ipfs://QmEvidence1", "ipfs://QmEvidence2"],
    });
    expect(mod.moduleType).toBe("dispute");
    expect(mod.evidence).toHaveLength(2);
    expect(mod.resolutionStatus).toBe("open");
  });
});

describe("Module attachment to markers", () => {
  it("attaches lineage module and validates marker", () => {
    const { publicKey, privateKey } = generateKeyPair();
    const marker = createMarker({
      subject: "did:key:zModTest",
      origin: "https://example.com",
      exitType: ExitType.Voluntary,
    });

    const lineage = createLineageModule({ predecessor: "did:key:zOld" });
    const withMod = addModule(marker, "lineage", lineage);
    const signed = signMarker(withMod, privateKey, publicKey);
    const result = verifyMarker(signed);
    expect(result.valid).toBe(true);
  });
});

describe("Lineage chain verification", () => {
  it("verifies a valid 3-marker lineage chain", () => {
    const keys1 = generateKeyPair();
    const keys2 = generateKeyPair();
    const keys3 = generateKeyPair();

    const m1 = signMarker(
      createMarker({
        subject: "did:key:zAgent1",
        origin: "https://platform-a.com",
        exitType: ExitType.Voluntary,
      }),
      keys1.privateKey,
      keys1.publicKey
    );

    const m2base = createMarker({
      subject: "did:key:zAgent2",
      origin: "https://platform-b.com",
      exitType: ExitType.Voluntary,
    });
    const m2 = signMarker(
      addModule(m2base, "lineage", createLineageModule({
        predecessor: "did:key:zAgent1",
        lineageChain: ["did:key:zAgent1", "did:key:zAgent2"],
      })),
      keys2.privateKey,
      keys2.publicKey
    );

    const m3base = createMarker({
      subject: "did:key:zAgent3",
      origin: "https://platform-c.com",
      exitType: ExitType.Voluntary,
    });
    const m3 = signMarker(
      addModule(m3base, "lineage", createLineageModule({
        predecessor: "did:key:zAgent2",
        lineageChain: ["did:key:zAgent1", "did:key:zAgent2", "did:key:zAgent3"],
      })),
      keys3.privateKey,
      keys3.publicKey
    );

    const result = verifyLineageChain([m1, m2, m3]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects broken lineage chain", () => {
    const keys1 = generateKeyPair();
    const keys2 = generateKeyPair();

    const m1 = signMarker(
      createMarker({
        subject: "did:key:zAgent1",
        origin: "https://example.com",
        exitType: ExitType.Voluntary,
      }),
      keys1.privateKey,
      keys1.publicKey
    );

    const m2 = signMarker(
      addModule(
        createMarker({
          subject: "did:key:zAgent2",
          origin: "https://example.com",
          exitType: ExitType.Voluntary,
        }),
        "lineage",
        createLineageModule({ predecessor: "did:key:zWrongAgent" })
      ),
      keys2.privateKey,
      keys2.publicKey
    );

    const result = verifyLineageChain([m1, m2]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("predecessor mismatch");
  });
});

describe("Reputation endorsement", () => {
  it("signs and produces a valid endorsement", () => {
    const { publicKey, privateKey } = generateKeyPair();
    const endorsement = signEndorsement("Great collaborator, highly reliable.", privateKey, publicKey);

    expect(endorsement.text).toBe("Great collaborator, highly reliable.");
    expect(endorsement.signer).toMatch(/^did:key:z/);
    expect(endorsement.signature).toBeTruthy();
    expect(endorsement.timestamp).toBeTruthy();
  });

  it("adds endorsements to reputation module", () => {
    const { publicKey, privateKey } = generateKeyPair();
    const e1 = signEndorsement("Trustworthy agent", privateKey, publicKey);
    const e2 = signEndorsement("Good work ethic", privateKey, publicKey);

    const mod = createReputationModule({
      metrics: { trust: 0.9 },
      endorsements: [e1, e2],
      tenure: "P1Y",
    });

    expect(mod.endorsements).toHaveLength(2);
    expect(mod.endorsements[0].text).toBe("Trustworthy agent");
  });
});

describe("Origin attestation signing", () => {
  it("origin co-signs a marker attestation", () => {
    const subjectKeys = generateKeyPair();
    const originKeys = generateKeyPair();

    const marker = signMarker(
      createMarker({
        subject: "did:key:zSubject",
        origin: "https://origin.com",
        exitType: ExitType.Voluntary,
      }),
      subjectKeys.privateKey,
      subjectKeys.publicKey
    );

    const attestation = signAttestation(
      marker,
      originKeys.privateKey,
      originKeys.publicKey,
      ExitStatus.GoodStanding,
      "Subject departed honorably."
    );

    expect(attestation.originStatus).toBe(ExitStatus.GoodStanding);
    expect(attestation.originSignature).toBeTruthy();
    expect(attestation.originDid).toMatch(/^did:key:z/);
  });
});

describe("Successor binding", () => {
  it("binds a successor with key rotation proof", () => {
    const { publicKey, privateKey } = generateKeyPair();
    const marker = signMarker(
      createMarker({
        subject: "did:key:zOriginal",
        origin: "https://example.com",
        exitType: ExitType.Voluntary,
      }),
      privateKey,
      publicKey
    );

    const bound = bindSuccessor(marker, "did:key:zSuccessor", privateKey, publicKey);
    expect(bound.lineage).toBeDefined();
    expect(bound.lineage!.successor).toBe("did:key:zSuccessor");
    expect(bound.lineage!.continuityProof).toBeDefined();
    expect(bound.lineage!.continuityProof!.type).toBe("key_rotation_binding");
    expect(bound.lineage!.continuityProof!.value).toBeTruthy();
  });
});
