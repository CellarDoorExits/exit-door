/**
 * End-to-End Passage Test
 *
 * Tests the full flow: EXIT ceremony → transit → ENTRY → verification.
 * This is the test version of demo/scenario4-end-to-end.ts.
 */

import { describe, it, expect } from "vitest";
import {
  generateKeyPair,
  didFromPublicKey,
  createMarker,
  signMarker,
  verifyMarker,
  ExitType,
  ExitStatus,
  CeremonyStateMachine,
  addModule,
  createSigner,
  signMarkerWithSigner,
  verifyMarkerMultiAlg,
  MemoryClaimStore,
  ingestMarker,
  type ExitMarker,
  type ModuleA,
  type ModuleE,
  type TrustEnhancers,
} from "../index.js";

describe("End-to-End Passage", () => {
  it("full flow: EXIT → transit → ENTRY → verification", async () => {
    // === Step 1: Identities ===
    const agentKeys = generateKeyPair();
    const agentDid = didFromPublicKey(agentKeys.publicKey);

    const platformBSigner = createSigner({ algorithm: "P-256" });
    const witnessKeys = generateKeyPair();
    const witnessDid = didFromPublicKey(witnessKeys.publicKey);

    // === Step 2: EXIT Ceremony ===
    const ceremony = new CeremonyStateMachine();
    expect(ceremony.state).toBe("alive");

    ceremony.transition("intent");
    ceremony.transition("snapshot");
    ceremony.transition("open");
    ceremony.transition("final");

    const exitMarker = createMarker({
      subject: agentDid,
      origin: "https://platform-a.example.com",
      exitType: ExitType.Voluntary,
      status: ExitStatus.GoodStanding,
    });

    // Add modules
    const withLineage = addModule(exitMarker, "lineage", {
      predecessor: "did:key:z6MkPrev...",
    } as ModuleA);

    const withMetadata = addModule(withLineage, "metadata", {
      reason: "Migrating to Platform B",
      tags: ["voluntary"],
    } as ModuleE);

    // Add trust enhancers
    const enhanced: ExitMarker = {
      ...withMetadata,
      trustEnhancers: {
        timestamps: [{
          tsaUrl: "https://freetsa.org/tsr",
          hash: "a".repeat(64),
          timestamp: new Date().toISOString(),
          receipt: Buffer.from("test-tsr").toString("base64"),
        }],
        witnesses: [{
          witnessDid,
          attestation: "Observed departure",
          timestamp: new Date().toISOString(),
          signature: Buffer.from("test-sig").toString("base64"),
          signatureType: "Ed25519Signature2020",
        }],
      },
    };

    const signedExit = signMarker(enhanced, agentKeys.privateKey, agentKeys.publicKey);

    ceremony.transition("departed");
    expect(ceremony.state).toBe("departed");

    // Verify EXIT
    const exitResult = verifyMarker(signedExit);
    expect(exitResult.valid).toBe(true);
    expect(exitResult.errors).toEqual([]);

    // === Step 3: Transit (marker is self-contained) ===
    const markerBytes = Buffer.from(JSON.stringify(signedExit)).length;
    expect(markerBytes).toBeGreaterThan(0);
    expect(markerBytes).toBeLessThan(5000); // reasonable size

    // === Step 4: ENTRY at Platform B ===
    // Platform B verifies the EXIT marker
    expect(verifyMarker(signedExit).valid).toBe(true);

    // Platform B creates arrival marker
    const arrivalMarker = {
      "@context": "https://cellar-door.dev/entry/v1",
      specVersion: "1.0",
      id: `urn:arrival:${Date.now()}`,
      subject: agentDid,
      destination: "https://platform-b.example.com",
      timestamp: new Date().toISOString(),
      departureRef: signedExit.id,
      admissionPolicy: "standard",
      status: "admitted",
    };

    // === Step 5: Continuity Verification ===
    expect(signedExit.subject).toBe(arrivalMarker.subject);
    expect(arrivalMarker.departureRef).toBe(signedExit.id);
    expect(new Date(arrivalMarker.timestamp).getTime())
      .toBeGreaterThanOrEqual(new Date(signedExit.timestamp).getTime());
    expect(signedExit.origin).not.toBe(arrivalMarker.destination);

    // === Step 6: Claim Store ===
    const store = new MemoryClaimStore();
    ingestMarker(store, signedExit);

    const stats = store.stats();
    expect(stats.totalClaims).toBe(3); // marker + timestamp + witness
    expect(stats.uniqueSubjects).toBe(1);
    expect(stats.claimsByType["exit_marker"]).toBe(1);
    expect(stats.claimsByType["timestamp"]).toBe(1);
    expect(stats.claimsByType["witness_attestation"]).toBe(1);
  });

  it("works with P-256 signer end-to-end", async () => {
    const signer = createSigner({ algorithm: "P-256" });

    const marker = createMarker({
      subject: signer.did(),
      origin: "https://fips-platform.gov",
      exitType: ExitType.Voluntary,
      status: ExitStatus.GoodStanding,
    });

    const signed = await signMarkerWithSigner(marker, signer);
    expect(signed.proof.type).toBe("EcdsaP256Signature2019");

    const result = await verifyMarkerMultiAlg(signed);
    expect(result.valid).toBe(true);

    // Also works with regular verifyMarker
    const result2 = verifyMarker(signed);
    expect(result2.valid).toBe(true);
  });

  it("cross-algorithm: Ed25519 exit → P-256 entry platform", async () => {
    // Agent signs with Ed25519
    const agentKeys = generateKeyPair();
    const agentDid = didFromPublicKey(agentKeys.publicKey);

    const exitMarker = createMarker({
      subject: agentDid,
      origin: "https://ed25519-platform.com",
      exitType: ExitType.Voluntary,
      status: ExitStatus.GoodStanding,
    });
    const signedExit = signMarker(exitMarker, agentKeys.privateKey, agentKeys.publicKey);
    expect(signedExit.proof.type).toBe("Ed25519Signature2020");

    // Platform B uses P-256
    const platformSigner = createSigner({ algorithm: "P-256" });

    // Both can be verified
    expect(verifyMarker(signedExit).valid).toBe(true);

    // Simulate platform B signing an arrival with P-256
    const arrivalData = new TextEncoder().encode(`arrival:${signedExit.id}`);
    const arrivalSig = platformSigner.sign(arrivalData);
    expect(platformSigner.verify(arrivalData, arrivalSig as Uint8Array)).toBe(true);
  });

  it("emergency exit bypasses ceremony", () => {
    const agentKeys = generateKeyPair();
    const agentDid = didFromPublicKey(agentKeys.publicKey);

    const ceremony = new CeremonyStateMachine();
    // Emergency path: alive → final → departed
    ceremony.transition("final");
    ceremony.transition("departed");
    expect(ceremony.state).toBe("departed");

    const marker = createMarker({
      subject: agentDid,
      origin: "https://dying-platform.com",
      exitType: ExitType.Emergency,
      status: ExitStatus.Unverified,
      emergencyJustification: "Platform shutting down in 30 seconds",
    });

    const signed = signMarker(marker, agentKeys.privateKey, agentKeys.publicKey);
    expect(verifyMarker(signed).valid).toBe(true);
    expect(signed.exitType).toBe("emergency");
  });
});
