import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SqliteClaimStore } from "../sqlite-store.js";
import { ClaimType, type StoredClaim } from "../claim-store.js";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function makeClaim(overrides: Partial<StoredClaim> = {}): StoredClaim {
  return {
    id: "claim:test:001",
    subject: "did:key:alice",
    type: ClaimType.ExitMarker,
    payload: { foo: "bar" },
    issuer: "did:key:alice",
    issuedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("SqliteClaimStore", () => {
  let store: SqliteClaimStore;

  beforeEach(() => {
    store = new SqliteClaimStore(); // in-memory
  });

  afterEach(() => {
    store.close();
  });

  it("stores and retrieves a claim", () => {
    const claim = makeClaim();
    store.put(claim);
    const got = store.get("claim:test:001");
    expect(got).toEqual(claim);
  });

  it("returns null for missing id", () => {
    expect(store.get("nonexistent")).toBeNull();
  });

  it("queries by subject", () => {
    store.put(makeClaim({ id: "c1", subject: "did:key:alice" }));
    store.put(makeClaim({ id: "c2", subject: "did:key:bob" }));
    const results = store.query({ subject: "did:key:alice" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("c1");
  });

  it("queries by type", () => {
    store.put(makeClaim({ id: "c1", type: ClaimType.ExitMarker }));
    store.put(makeClaim({ id: "c2", type: ClaimType.WitnessAttestation }));
    const results = store.query({ type: ClaimType.ExitMarker });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("c1");
  });

  it("queries by issuer", () => {
    store.put(makeClaim({ id: "c1", issuer: "did:key:alice" }));
    store.put(makeClaim({ id: "c2", issuer: "did:key:bob" }));
    const results = store.query({ issuer: "did:key:bob" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("c2");
  });

  it("deletes a claim", () => {
    store.put(makeClaim());
    expect(store.delete("claim:test:001")).toBe(true);
    expect(store.get("claim:test:001")).toBeNull();
    expect(store.delete("claim:test:001")).toBe(false);
  });

  it("deleteBySubject removes all claims for subject", () => {
    store.put(makeClaim({ id: "c1", subject: "did:key:alice" }));
    store.put(makeClaim({ id: "c2", subject: "did:key:alice" }));
    store.put(makeClaim({ id: "c3", subject: "did:key:bob" }));
    expect(store.deleteBySubject("did:key:alice")).toBe(2);
    expect(store.stats().totalClaims).toBe(1);
  });

  it("returns correct stats", () => {
    store.put(makeClaim({ id: "c1", type: ClaimType.ExitMarker, subject: "did:key:alice", issuer: "did:key:alice" }));
    store.put(makeClaim({ id: "c2", type: ClaimType.WitnessAttestation, subject: "did:key:bob", issuer: "did:key:carol" }));
    const stats = store.stats();
    expect(stats.totalClaims).toBe(2);
    expect(stats.uniqueSubjects).toBe(2);
    expect(stats.uniqueIssuers).toBe(2);
    expect(stats.claimsByType[ClaimType.ExitMarker]).toBe(1);
  });

  it("handles duplicate IDs gracefully (upsert)", () => {
    store.put(makeClaim({ id: "c1", payload: { v: 1 } }));
    store.put(makeClaim({ id: "c1", payload: { v: 2 } }));
    const got = store.get("c1");
    expect(got?.payload).toEqual({ v: 2 });
    expect(store.stats().totalClaims).toBe(1);
  });

  it("excludes expired claims by default", () => {
    store.put(makeClaim({ id: "c1", expiresAt: "2020-01-01T00:00:00Z" }));
    store.put(makeClaim({ id: "c2" }));
    expect(store.query({})).toHaveLength(1);
    expect(store.query({ excludeExpired: false })).toHaveLength(2);
  });

  it("sorts by newest/oldest", () => {
    store.put(makeClaim({ id: "c1", issuedAt: "2025-01-01T00:00:00Z" }));
    store.put(makeClaim({ id: "c2", issuedAt: "2025-06-01T00:00:00Z" }));
    const newest = store.query({ sort: "newest" });
    expect(newest[0].id).toBe("c2");
    const oldest = store.query({ sort: "oldest", excludeExpired: false });
    expect(oldest[0].id).toBe("c1");
  });

  it("persists across re-opens (file-based)", () => {
    const dbPath = join(tmpdir(), `exit-test-${Date.now()}.db`);
    try {
      const store1 = new SqliteClaimStore(dbPath);
      store1.put(makeClaim({ id: "persist-1" }));
      store1.close();

      const store2 = new SqliteClaimStore(dbPath);
      expect(store2.get("persist-1")).not.toBeNull();
      expect(store2.get("persist-1")?.id).toBe("persist-1");
      store2.close();
    } finally {
      if (existsSync(dbPath)) unlinkSync(dbPath);
      // Clean up WAL/SHM files
      for (const suffix of ["-wal", "-shm"]) {
        const f = dbPath + suffix;
        if (existsSync(f)) unlinkSync(f);
      }
    }
  });
});
