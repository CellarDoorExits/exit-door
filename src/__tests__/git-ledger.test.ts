import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createMarker,
  generateKeyPair,
  didFromPublicKey,
  ExitType,
} from "../index.js";
import {
  initLedger,
  anchorToGit,
  verifyLedgerEntry,
  listLedgerEntries,
  type GitLedgerConfig,
} from "../git-ledger.js";

function makeMarker() {
  const kp = generateKeyPair();
  const did = didFromPublicKey(kp.publicKey);
  return createMarker({
    subject: did,
    origin: "https://example.com",
    exitType: ExitType.Voluntary,
  });
}

describe("git-ledger", () => {
  let tmpDir: string;
  let config: GitLedgerConfig;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "exit-ledger-test-"));
    config = { repoPath: tmpDir };
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("initLedger creates repo with orphan branch", async () => {
    await initLedger(config);
    // Should be idempotent.
    await initLedger(config);
  });

  it("anchorToGit stores and returns a ledger entry", async () => {
    await initLedger(config);
    const marker = makeMarker();
    const entry = await anchorToGit(marker, config);

    expect(entry.hash).toBeTruthy();
    expect(entry.commitHash).toBeTruthy();
    expect(entry.filePath).toContain("ledger/");
    expect(entry.timestamp).toBeTruthy();
  });

  it("verifyLedgerEntry returns true for existing entry", async () => {
    await initLedger(config);
    const marker = makeMarker();
    const entry = await anchorToGit(marker, config);

    expect(await verifyLedgerEntry(entry.hash, config)).toBe(true);
  });

  it("verifyLedgerEntry returns false for nonexistent hash", async () => {
    await initLedger(config);
    expect(await verifyLedgerEntry("nonexistent", config)).toBe(false);
  });

  it("listLedgerEntries returns all anchored entries", async () => {
    await initLedger(config);
    const m1 = makeMarker();
    const m2 = makeMarker();
    await anchorToGit(m1, config);
    await anchorToGit(m2, config);

    const entries = await listLedgerEntries(config);
    expect(entries).toHaveLength(2);
  });

  it("listLedgerEntries returns empty for fresh ledger", async () => {
    await initLedger(config);
    const entries = await listLedgerEntries(config);
    expect(entries).toHaveLength(0);
  });

  it("supports custom branch name", async () => {
    const customConfig = { ...config, branch: "my-ledger" };
    await initLedger(customConfig);
    const marker = makeMarker();
    const entry = await anchorToGit(marker, customConfig);
    expect(entry.commitHash).toBeTruthy();
  });
});
