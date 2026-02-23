import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  generateKeyPair,
  didFromPublicKey,
  createMarker,
  signMarker,
  verifyMarker,
  validateMarker,
  ExitType,
  ExitStatus,
  wrapAsVC,
  unwrapVC,
  isVC,
  computeAnchorHash,
  saveMarker,
  loadMarker,
  MarkerRegistry,
  createBatchExit,
  verifyBatchMembership,
  computeMerkleProof,
  ExitEventEmitter,
  serializeForTransport,
  deserializeFromTransport,
  resolveDid,
  isDid,
  didMethod,
  createDidDocument,
} from "../index.js";
import { encryptMarker, decryptMarker } from "../privacy.js";
import { MockChainAdapter } from "../chain.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { randomBytes } from "@noble/ciphers/utils.js";

describe("Integration: Full End-to-End", () => {
  it("generate keys → create → sign → anchor → store → load → verify → VC → encrypt → decrypt", async () => {
    // 1. Generate keys
    const kp = generateKeyPair();
    const did = didFromPublicKey(kp.publicKey);
    expect(isDid(did)).toBe(true);
    expect(didMethod(did)).toBe("key");

    // 2. Create marker
    const marker = createMarker({
      subject: did,
      origin: "https://platform.example.com",
      exitType: ExitType.Voluntary,
      status: ExitStatus.GoodStanding,
    });
    // validateMarker checks schema structure (proof exists with fields), not signature
    // verifyMarker checks actual signature validity
    expect(verifyMarker(marker).valid).toBe(false); // unsigned proof has no real signature

    // 3. Sign
    const signed = signMarker(marker, kp.privateKey, kp.publicKey);
    const verification = verifyMarker(signed);
    expect(verification.valid).toBe(true);

    // 4. Anchor
    const chain = new MockChainAdapter();
    const hash = computeAnchorHash(signed);
    const anchorResult = await chain.anchor(hash, { exitType: signed.exitType });
    expect(await chain.verify(hash)).toBe(true);

    // 5. Store & Load
    const tmpDir = mkdtempSync(join(tmpdir(), "exit-test-"));
    try {
      saveMarker(signed, tmpDir);
      const loaded = loadMarker(signed.id, tmpDir);
      expect(loaded.id).toBe(signed.id);
      expect(loaded.subject).toBe(signed.subject);

      // 6. Verify loaded
      expect(verifyMarker(loaded).valid).toBe(true);

      // 7. Wrap as VC
      const vc = wrapAsVC(loaded);
      expect(isVC(vc)).toBe(true);
      const unwrapped = unwrapVC(vc);
      expect(unwrapped.id).toBe(signed.id);

      // 8. Encrypt & Decrypt
      const recipientPrivate = randomBytes(32);
      const recipientPublic = x25519.getPublicKey(recipientPrivate);
      const encrypted = encryptMarker(loaded, recipientPublic);
      const decrypted = decryptMarker(encrypted, recipientPrivate);
      expect(decrypted.id).toBe(signed.id);
      expect(decrypted.subject).toBe(signed.subject);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // 9. DID Resolution
  it("resolves did:key and creates DID document", () => {
    const kp = generateKeyPair();
    const did = didFromPublicKey(kp.publicKey);
    const resolved = resolveDid(did);
    expect(resolved.method).toBe("key");
    expect(resolved.publicKey).toEqual(kp.publicKey);
    expect(resolved.multicodecPrefix).toEqual(new Uint8Array([0xed, 0x01]));

    const doc = createDidDocument(did);
    expect(doc.id).toBe(did);
    expect(doc.verificationMethod.length).toBe(1);
    expect(doc.authentication.length).toBe(1);
  });
});

describe("Integration: Event Emitter Lifecycle", () => {
  it("fires all events in correct order", () => {
    const emitter = new ExitEventEmitter();
    const events: string[] = [];
    const kp = generateKeyPair();
    const marker = createMarker({
      subject: didFromPublicKey(kp.publicKey),
      origin: "https://example.com",
      exitType: ExitType.Voluntary,
    });

    emitter.on("intent", () => events.push("intent"));
    emitter.on("negotiating", () => events.push("negotiating"));
    emitter.on("signing", () => events.push("signing"));
    emitter.on("departed", () => events.push("departed"));

    emitter.emitIntent(marker);
    emitter.emitNegotiating(marker);
    emitter.emitSigning(marker);
    emitter.emitDeparted(marker);

    expect(events).toEqual(["intent", "negotiating", "signing", "departed"]);
  });
});

describe("Integration: Transport Serialization", () => {
  it("round-trips marker through transport format", () => {
    const { marker } = makeSigned();
    const buf = serializeForTransport(marker);
    expect(buf.length).toBeGreaterThan(4);
    const restored = deserializeFromTransport(buf);
    expect(restored.id).toBe(marker.id);
    expect(restored.subject).toBe(marker.subject);
  });
});

describe("Integration: Batch Exit", () => {
  it("creates batch and verifies membership for each marker", () => {
    const markers = Array.from({ length: 10 }, (_, i) => {
      const kp = generateKeyPair();
      return createMarker({
        subject: didFromPublicKey(kp.publicKey),
        origin: `https://example.com/org-${i}`,
        exitType: ExitType.Voluntary,
        id: `urn:exit:batch-int-${i}`,
      });
    });

    const batch = createBatchExit(markers);
    expect(batch.count).toBe(10);

    for (let i = 0; i < markers.length; i++) {
      const proof = computeMerkleProof(batch.leaves, i);
      expect(verifyBatchMembership(markers[i], batch.merkleRoot, proof)).toBe(true);
    }
  });
});

describe("Integration: Registry", () => {
  it("registers multiple markers and queries by all indexes", () => {
    const registry = new MarkerRegistry();
    const kp1 = generateKeyPair();
    const kp2 = generateKeyPair();
    const did1 = didFromPublicKey(kp1.publicKey);
    const did2 = didFromPublicKey(kp2.publicKey);

    const m1 = createMarker({
      subject: did1,
      origin: "https://alpha.com",
      exitType: ExitType.Voluntary,
      timestamp: "2026-01-15T00:00:00Z",
    });
    const m2 = createMarker({
      subject: did1,
      origin: "https://beta.com",
      exitType: ExitType.Forced,
      timestamp: "2026-02-15T00:00:00Z",
    });
    const m3 = createMarker({
      subject: did2,
      origin: "https://alpha.com",
      exitType: ExitType.Emergency,
      emergencyJustification: "test",
      timestamp: "2026-03-15T00:00:00Z",
    });

    registry.register(m1);
    registry.register(m2);
    registry.register(m3);

    expect(registry.count()).toBe(3);

    // By subject
    expect(registry.findBySubject(did1).length).toBe(2);
    expect(registry.findBySubject(did2).length).toBe(1);

    // By origin
    expect(registry.findByOrigin("https://alpha.com").length).toBe(2);
    expect(registry.findByOrigin("https://beta.com").length).toBe(1);

    // By time range
    const jan = registry.findByTimeRange(new Date("2026-01-01"), new Date("2026-01-31"));
    expect(jan.length).toBe(1);
    const allTime = registry.findByTimeRange(new Date("2026-01-01"), new Date("2026-12-31"));
    expect(allTime.length).toBe(3);

    // Lookup
    expect(registry.lookup(m1.id)?.id).toBe(m1.id);
    expect(registry.lookup("nonexistent")).toBeNull();

    // Export
    expect(registry.export().length).toBe(3);
  });
});

// Helper
function makeSigned() {
  const kp = generateKeyPair();
  const did = didFromPublicKey(kp.publicKey);
  const marker = createMarker({
    subject: did,
    origin: "https://example.com",
    exitType: ExitType.Voluntary,
  });
  return { marker: signMarker(marker, kp.privateKey, kp.publicKey), kp };
}
