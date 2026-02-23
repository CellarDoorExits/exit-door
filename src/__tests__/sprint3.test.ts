import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createMarker,
  signMarker,
  generateKeyPair,
  ExitType,
  ExitStatus,
  // Anchor
  computeAnchorHash,
  createAnchorRecord,
  verifyAnchorRecord,
  createMinimalAnchor,
  // Storage
  saveMarker,
  loadMarker,
  listMarkers,
  exportMarker,
  importMarker,
  // Chain
  MockChainAdapter,
  FileChainAdapter,
  // Privacy
  encryptMarker,
  decryptMarker,
  redactMarker,
  createMinimalDisclosure,
} from "../index.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { randomBytes } from "@noble/ciphers/utils.js";

function makeSignedMarker() {
  const { publicKey, privateKey } = generateKeyPair();
  const marker = createMarker({
    subject: "did:key:zTest",
    origin: "https://example.com",
    exitType: ExitType.Voluntary,
    timestamp: "2026-01-15T12:00:00.000Z",
  });
  return signMarker(marker, privateKey, publicKey);
}

// ─── Anchor Tests ────────────────────────────────────────────────────────────

describe("Anchor", () => {
  it("computes deterministic hashes (same marker → same hash)", () => {
    const marker = makeSignedMarker();
    expect(computeAnchorHash(marker)).toBe(computeAnchorHash(marker));
  });

  it("different markers produce different hashes", () => {
    const m1 = makeSignedMarker();
    const { publicKey, privateKey } = generateKeyPair();
    const m2 = signMarker(
      createMarker({
        subject: "did:key:zOther",
        origin: "https://other.com",
        exitType: ExitType.Forced,
        timestamp: "2026-02-01T00:00:00.000Z",
      }),
      privateKey,
      publicKey,
    );
    expect(computeAnchorHash(m1)).not.toBe(computeAnchorHash(m2));
  });

  it("createAnchorRecord includes hash, timestamp, exitType, subjectDid", () => {
    const marker = makeSignedMarker();
    const record = createAnchorRecord(marker);
    expect(record.hash).toBeTruthy();
    expect(record.timestamp).toBe(marker.timestamp);
    expect(record.exitType).toBe(marker.exitType);
    expect(record.subjectDid).toBe(marker.subject);
  });

  it("verifyAnchorRecord returns true for matching marker", () => {
    const marker = makeSignedMarker();
    const record = createAnchorRecord(marker);
    expect(verifyAnchorRecord(record, marker)).toBe(true);
  });

  it("verifyAnchorRecord returns false for wrong marker", () => {
    const m1 = makeSignedMarker();
    const record = createAnchorRecord(m1);
    const { publicKey, privateKey } = generateKeyPair();
    const m2 = signMarker(
      createMarker({
        subject: "did:key:zWrong",
        origin: "https://wrong.com",
        exitType: ExitType.Voluntary,
        timestamp: "2026-03-01T00:00:00.000Z",
      }),
      privateKey,
      publicKey,
    );
    expect(verifyAnchorRecord(record, m2)).toBe(false);
  });

  it("createMinimalAnchor contains only hash + timestamp", () => {
    const marker = makeSignedMarker();
    const minimal = createMinimalAnchor(marker);
    expect(Object.keys(minimal).sort()).toEqual(["hash", "timestamp"]);
    expect(minimal.hash).toBeTruthy();
    expect(minimal.timestamp).toBe(marker.timestamp);
  });
});

// ─── Storage Tests ───────────────────────────────────────────────────────────

describe("Storage", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "exit-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("save → load round-trip preserves marker", () => {
    const marker = makeSignedMarker();
    saveMarker(marker, tmpDir);
    const loaded = loadMarker(marker.id, tmpDir);
    expect(loaded).toEqual(marker);
  });

  it("listMarkers returns saved marker IDs", () => {
    const marker = makeSignedMarker();
    saveMarker(marker, tmpDir);
    const ids = listMarkers(tmpDir);
    expect(ids.length).toBe(1);
  });

  it("listMarkers returns empty for empty dir", () => {
    expect(listMarkers(tmpDir)).toEqual([]);
  });

  it("export → import round-trip", () => {
    const marker = makeSignedMarker();
    const json = exportMarker(marker);
    const imported = importMarker(json);
    expect(imported).toEqual(marker);
  });

  it("importMarker rejects invalid JSON", () => {
    expect(() => importMarker("{}")).toThrow();
  });
});

// ─── Chain Adapter Tests ─────────────────────────────────────────────────────

describe("MockChainAdapter", () => {
  it("anchor → verify → getTimestamp", async () => {
    const adapter = new MockChainAdapter();
    const hash = "abc123";
    const result = await adapter.anchor(hash, { note: "test" });
    expect(result.hash).toBe(hash);
    expect(result.timestamp).toBeTruthy();
    expect(result.txId).toBeTruthy();

    expect(await adapter.verify(hash)).toBe(true);
    expect(await adapter.verify("nonexistent")).toBe(false);

    const ts = await adapter.getTimestamp(hash);
    expect(ts).toBeTruthy();
    expect(await adapter.getTimestamp("nonexistent")).toBeNull();
  });
});

describe("FileChainAdapter", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "exit-chain-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("anchor → verify → getTimestamp", async () => {
    const adapter = new FileChainAdapter(join(tmpDir, "chain.jsonl"));
    const hash = "deadbeef";

    expect(await adapter.verify(hash)).toBe(false);

    await adapter.anchor(hash);
    expect(await adapter.verify(hash)).toBe(true);

    const ts = await adapter.getTimestamp(hash);
    expect(ts).toBeTruthy();
  });
});

// ─── Privacy Tests ───────────────────────────────────────────────────────────

describe("Privacy", () => {
  it("encrypt → decrypt round-trip", () => {
    const marker = makeSignedMarker();
    const recipientPrivate = randomBytes(32);
    const recipientPublic = x25519.getPublicKey(recipientPrivate);

    const blob = encryptMarker(marker, recipientPublic);
    expect(blob.ephemeralPublicKey).toBeTruthy();
    expect(blob.nonce).toBeTruthy();
    expect(blob.ciphertext).toBeTruthy();

    const decrypted = decryptMarker(blob, recipientPrivate);
    expect(decrypted).toEqual(marker);
  });

  it("decrypt with wrong key fails", () => {
    const marker = makeSignedMarker();
    const recipientPrivate = randomBytes(32);
    const recipientPublic = x25519.getPublicKey(recipientPrivate);
    const wrongKey = randomBytes(32);

    const blob = encryptMarker(marker, recipientPublic);
    expect(() => decryptMarker(blob, wrongKey)).toThrow();
  });

  it("redactMarker replaces specified fields with hashes", () => {
    const marker = makeSignedMarker();
    const redacted = redactMarker(marker, ["subject", "origin"]);

    expect(typeof redacted.subject).toBe("string");
    expect((redacted.subject as string).startsWith("redacted:sha256:")).toBe(true);
    expect((redacted.origin as string).startsWith("redacted:sha256:")).toBe(true);
    // Non-redacted fields intact
    expect(redacted.exitType).toBe(marker.exitType);
    expect(redacted.timestamp).toBe(marker.timestamp);
  });

  it("createMinimalDisclosure reveals only requested fields", () => {
    const marker = makeSignedMarker();
    const disclosure = createMinimalDisclosure(marker, ["exitType", "timestamp"]);

    // Revealed fields are original values
    expect(disclosure.exitType).toBe(marker.exitType);
    expect(disclosure.timestamp).toBe(marker.timestamp);

    // Everything else is hashed
    expect((disclosure.subject as string).startsWith("redacted:sha256:")).toBe(true);
    expect((disclosure.origin as string).startsWith("redacted:sha256:")).toBe(true);
    expect((disclosure.id as string).startsWith("redacted:sha256:")).toBe(true);
  });
});
