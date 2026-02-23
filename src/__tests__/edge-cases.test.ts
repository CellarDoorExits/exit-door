import { describe, it, expect } from "vitest";
import {
  createMarker,
  addModule,
  signMarker,
  verifyMarker,
  validateMarker,
  generateKeyPair,
  didFromPublicKey,
  ExitType,
  ExitStatus,
  EXIT_CONTEXT_V1,
  computeAnchorHash,
  MarkerRegistry,
  createBatchExit,
  verifyBatchMembership,
  computeMerkleProof,
} from "../index.js";
import { MockChainAdapter } from "../chain.js";
import type { ExitMarker, LegalHold, ModuleA, ModuleB, ModuleC, ModuleD, ModuleE, ModuleF } from "../types.js";

function makeSignedMarker(overrides?: Partial<Parameters<typeof createMarker>[0]>) {
  const kp = generateKeyPair();
  const did = didFromPublicKey(kp.publicKey);
  const marker = createMarker({
    subject: did,
    origin: "https://example.com",
    exitType: ExitType.Voluntary,
    ...overrides,
  });
  return { marker: signMarker(marker, kp.privateKey, kp.publicKey), kp };
}

describe("Edge Cases", () => {
  // ─── Empty string fields ────────────────────────────────────────────
  it("rejects marker with empty subject", () => {
    expect(() => createMarker({
      subject: "",
      origin: "https://example.com",
      exitType: ExitType.Voluntary,
    })).toThrow("subject");
  });

  it("rejects marker with empty origin", () => {
    const kp = generateKeyPair();
    expect(() => createMarker({
      subject: didFromPublicKey(kp.publicKey),
      origin: "",
      exitType: ExitType.Voluntary,
    })).toThrow("origin");
  });

  // ─── Extremely long reason text ────────────────────────────────────
  it("handles extremely long reason text", () => {
    const { marker } = makeSignedMarker();
    const longReason = "x".repeat(100_000);
    const withMeta = addModule(marker, "metadata", { reason: longReason } as ModuleE);
    const result = validateMarker(withMeta);
    expect(result.valid).toBe(true);
  });

  // ─── Unicode in all string fields ──────────────────────────────────
  it("handles unicode in string fields", () => {
    const kp = generateKeyPair();
    const did = didFromPublicKey(kp.publicKey);
    const marker = createMarker({
      subject: did,
      origin: "https://例え.jp/出口",
      exitType: ExitType.Voluntary,
    });
    const withMeta = addModule(marker, "metadata", {
      reason: "さようなら 🚪",
      narrative: "退出の儀式 — 扉を閉める",
      tags: ["日本語", "émigré", "über"],
      locale: "ja-JP",
    } as ModuleE);
    const signed = signMarker(withMeta, kp.privateKey, kp.publicKey);
    const result = verifyMarker(signed);
    expect(result.valid).toBe(true);
  });

  // ─── Future timestamps ─────────────────────────────────────────────
  it("validates marker with future timestamp (no error, just allowed)", () => {
    const kp = generateKeyPair();
    const did = didFromPublicKey(kp.publicKey);
    const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const marker = createMarker({
      subject: did,
      origin: "https://example.com",
      exitType: ExitType.Voluntary,
      timestamp: future,
    });
    const signed = signMarker(marker, kp.privateKey, kp.publicKey);
    const result = verifyMarker(signed);
    expect(result.valid).toBe(true);
  });

  // ─── All optional modules simultaneously ───────────────────────────
  it("supports all optional modules attached simultaneously", () => {
    const kp = generateKeyPair();
    const did = didFromPublicKey(kp.publicKey);
    let marker = createMarker({
      subject: did,
      origin: "https://example.com",
      exitType: ExitType.Voluntary,
    });

    marker = addModule(marker, "lineage", {
      predecessor: "did:key:zOLD",
      successor: "did:key:zNEW",
      lineageChain: ["did:key:zOLD"],
    } as ModuleA);
    marker = addModule(marker, "stateSnapshot", {
      stateHash: "abc123",
      stateLocation: "ipfs://Qm...",
    } as ModuleB);
    marker = addModule(marker, "dispute", {
      disputes: [{ id: "d1", challenger: "did:key:zX", claim: "test", filedAt: new Date().toISOString() }],
    } as ModuleC);
    marker = addModule(marker, "economic", {
      assetManifest: [{ type: "data", amount: "1", destination: "did:key:zY" }],
    } as ModuleD);
    marker = addModule(marker, "metadata", {
      reason: "testing all modules",
      tags: ["test"],
    } as ModuleE);
    marker = addModule(marker, "crossDomain", {
      anchors: [{ chain: "ethereum", txHash: "0xabc" }],
    } as ModuleF);

    const signed = signMarker(marker, kp.privateKey, kp.publicKey);
    const result = verifyMarker(signed);
    expect(result.valid).toBe(true);
    expect(signed.lineage).toBeDefined();
    expect(signed.stateSnapshot).toBeDefined();
    expect(signed.dispute).toBeDefined();
    expect(signed.economic).toBeDefined();
    expect(signed.metadata).toBeDefined();
    expect(signed.crossDomain).toBeDefined();
  });

  // ─── Duplicate module attachment (replaces) ────────────────────────
  it("replaces module on duplicate attachment", () => {
    const { marker } = makeSignedMarker();
    const m1 = addModule(marker, "metadata", { reason: "first" } as ModuleE);
    const m2 = addModule(m1, "metadata", { reason: "second" } as ModuleE);
    expect((m2.metadata as ModuleE).reason).toBe("second");
  });

  // ─── Signing an already-signed marker ──────────────────────────────
  it("re-signing replaces the proof (new signature)", () => {
    const kp = generateKeyPair();
    const did = didFromPublicKey(kp.publicKey);
    const marker = createMarker({
      subject: did,
      origin: "https://example.com",
      exitType: ExitType.Voluntary,
    });
    const signed1 = signMarker(marker, kp.privateKey, kp.publicKey);
    const signed2 = signMarker(signed1, kp.privateKey, kp.publicKey);
    // Both should verify (proof is replaced, not stacked)
    expect(verifyMarker(signed1).valid).toBe(true);
    expect(verifyMarker(signed2).valid).toBe(true);
    // Proofs should differ (different timestamp)
    expect(signed1.proof.created).not.toBe(signed2.proof.created);
  });

  // ─── Verifying an unsigned marker ──────────────────────────────────
  it("reports unsigned marker as incomplete proof, not invalid schema", () => {
    const kp = generateKeyPair();
    const did = didFromPublicKey(kp.publicKey);
    const marker = createMarker({
      subject: did,
      origin: "https://example.com",
      exitType: ExitType.Voluntary,
    });
    // Marker has empty proof
    const result = verifyMarker(marker);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Incomplete proof") || e.includes("verificationMethod"))).toBe(true);
  });

  // ─── LegalHold + emergency type ───────────────────────────────────
  it("supports legalHold on emergency exit", () => {
    const kp = generateKeyPair();
    const did = didFromPublicKey(kp.publicKey);
    const marker = createMarker({
      subject: did,
      origin: "https://example.com",
      exitType: ExitType.Emergency,
      emergencyJustification: "Server shutdown imminent",
    });
    (marker as any).legalHold = {
      holdType: "litigation_hold",
      authority: "Court of Arbitration",
      reference: "CASE-2026-001",
      dateIssued: new Date().toISOString(),
      acknowledged: true,
    } satisfies LegalHold;
    const signed = signMarker(marker, kp.privateKey, kp.publicKey);
    const result = verifyMarker(signed);
    expect(result.valid).toBe(true);
    expect(signed.legalHold?.holdType).toBe("litigation_hold");
  });

  // ─── Key compromise referencing specific marker ────────────────────
  it("keyCompromise marker can reference compromised marker", () => {
    const { marker: original } = makeSignedMarker();
    const kp2 = generateKeyPair();
    const did2 = didFromPublicKey(kp2.publicKey);
    const compromise = createMarker({
      subject: did2,
      origin: "https://example.com",
      exitType: ExitType.KeyCompromise,
    });
    const withMeta = addModule(compromise, "metadata", {
      reason: `Key compromised. Invalidates marker: ${original.id}`,
      tags: ["key_compromise", original.id],
    } as ModuleE);
    const signed = signMarker(withMeta, kp2.privateKey, kp2.publicKey);
    expect(verifyMarker(signed).valid).toBe(true);
  });

  // ─── Batch with 1000 markers ───────────────────────────────────────
  it("handles batch of 1000 markers efficiently", () => {
    const markers: ExitMarker[] = [];
    for (let i = 0; i < 1000; i++) {
      const kp = generateKeyPair();
      markers.push(
        createMarker({
          subject: didFromPublicKey(kp.publicKey),
          origin: `https://example.com/org-${i}`,
          exitType: ExitType.Voluntary,
          id: `urn:exit:batch-${i}`,
        })
      );
    }
    const start = performance.now();
    const batch = createBatchExit(markers);
    const elapsed = performance.now() - start;

    expect(batch.count).toBe(1000);
    expect(batch.merkleRoot).toBeTruthy();
    expect(elapsed).toBeLessThan(5000); // Should be well under 5s

    // Verify membership for a random marker
    const idx = 500;
    const proof = computeMerkleProof(batch.leaves, idx);
    expect(verifyBatchMembership(markers[idx], batch.merkleRoot, proof)).toBe(true);
  });

  // ─── Registry with duplicate registrations ─────────────────────────
  it("registry rejects duplicate registration", () => {
    const registry = new MarkerRegistry();
    const { marker } = makeSignedMarker();
    registry.register(marker);
    expect(() => registry.register(marker)).toThrow(/already registered/);
  });

  // ─── Chain adapter with same hash anchored twice ───────────────────
  it("chain adapter handles same hash anchored twice", async () => {
    const chain = new MockChainAdapter();
    const { marker } = makeSignedMarker();
    const hash = computeAnchorHash(marker);

    const r1 = await chain.anchor(hash);
    const r2 = await chain.anchor(hash);

    expect(r1.hash).toBe(hash);
    expect(r2.hash).toBe(hash);
    // Both succeed (mock overwrites, which is fine)
    expect(await chain.verify(hash)).toBe(true);
  });

  // ─── Invalid timestamp format ──────────────────────────────────────
  it("rejects invalid timestamp format", () => {
    const kp = generateKeyPair();
    const marker = createMarker({
      subject: didFromPublicKey(kp.publicKey),
      origin: "https://example.com",
      exitType: ExitType.Voluntary,
    });
    (marker as any).timestamp = "not-a-date";
    const result = validateMarker(marker);
    expect(result.valid).toBe(false);
  });

  // ─── Emergency without justification ───────────────────────────────
  it("rejects emergency exit without justification", () => {
    const kp = generateKeyPair();
    // createMarker now validates eagerly — throws on missing emergencyJustification
    expect(() => createMarker({
      subject: didFromPublicKey(kp.publicKey),
      origin: "https://example.com",
      exitType: ExitType.Emergency,
    })).toThrow("emergencyJustification");
  });
});
