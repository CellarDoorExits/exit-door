/**
 * Tests for amendment/revocation discovery (Section 6.3.1)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  InMemoryAmendmentStore,
  discoverAmendments,
  createWellKnownMetadata,
  createAmendmentQueryHandler,
} from "../discovery.js";
import { createAmendment, createRevocation } from "../amendment.js";
import { createSigner } from "../signer.js";
import type { ExitMarker } from "../types.js";
import { EXIT_CONTEXT_V1, EXIT_SPEC_VERSION, ExitType, ExitStatus } from "../types.js";

function makeMarker(overrides: Partial<ExitMarker> = {}): ExitMarker {
  return {
    "@context": EXIT_CONTEXT_V1,
    specVersion: EXIT_SPEC_VERSION,
    id: "urn:exit:test-" + Math.random().toString(36).slice(2, 8),
    subject: "did:key:z6MkSubject",
    origin: "https://example.com",
    timestamp: "2025-01-01T00:00:00.000Z",
    exitType: ExitType.Voluntary,
    status: ExitStatus.GoodStanding,
    selfAttested: true,
    proof: {
      type: "Ed25519Signature2020",
      created: "2025-01-01T00:00:00.000Z",
      verificationMethod: "did:key:z6MkSubject",
      proofValue: "dGVzdA==",
    },
    ...overrides,
  } as ExitMarker;
}

describe("InMemoryAmendmentStore", () => {
  let store: InMemoryAmendmentStore;
  let signer: ReturnType<typeof createSigner>;

  beforeEach(() => {
    store = new InMemoryAmendmentStore();
    signer = createSigner({ algorithm: "Ed25519" });
  });

  it("stores and retrieves amendments", async () => {
    const marker = makeMarker();
    const amendment = await createAmendment(marker, { status: "confirmed" }, "Status update", signer);
    await store.putAmendment(amendment);

    const amendments = await store.getAmendments(marker.id);
    expect(amendments).toHaveLength(1);
    expect(amendments[0].amendmentId).toBe(amendment.amendmentId);
  });

  it("stores and retrieves revocations", async () => {
    const marker = makeMarker();
    const revocation = await createRevocation(marker.id, "Issued in error", signer);
    await store.putRevocation(revocation);

    const revocations = await store.getRevocations(marker.id);
    expect(revocations).toHaveLength(1);
    expect(revocations[0].revocationId).toBe(revocation.revocationId);
  });

  it("returns empty arrays for unknown markers", async () => {
    const amendments = await store.getAmendments("nonexistent");
    const revocations = await store.getRevocations("nonexistent");
    expect(amendments).toEqual([]);
    expect(revocations).toEqual([]);
  });

  it("deduplicates by ID (idempotent put)", async () => {
    const marker = makeMarker();
    const amendment = await createAmendment(marker, { status: "confirmed" }, "Update", signer);
    await store.putAmendment(amendment);
    await store.putAmendment(amendment);

    const amendments = await store.getAmendments(marker.id);
    expect(amendments).toHaveLength(1);
  });

  it("filters amendments by since timestamp", async () => {
    const marker = makeMarker();
    const early = await createAmendment(marker, { status: "confirmed" }, "Early", signer);
    (early as any).timestamp = "2020-01-01T00:00:00.000Z";
    const late = await createAmendment(marker, { status: "disputed" }, "Late", signer);

    await store.putAmendment(early);
    await store.putAmendment(late);

    const filtered = await store.getAmendments(marker.id, "2024-01-01T00:00:00.000Z");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].amendmentId).toBe(late.amendmentId);
  });

  it("query returns complete response", async () => {
    const marker = makeMarker();
    const amendment = await createAmendment(marker, { status: "confirmed" }, "Update", signer);
    const revocation = await createRevocation(marker.id, "Retracted", signer);

    await store.putAmendment(amendment);
    await store.putRevocation(revocation);

    const response = await store.query(marker.id);
    expect(response.markerId).toBe(marker.id);
    expect(response.amendments).toHaveLength(1);
    expect(response.revocations).toHaveLength(1);
    expect(response.complete).toBe(true);
    expect(response.queriedAt).toBeTruthy();
  });

  it("sorts amendments by timestamp ascending", async () => {
    const marker = makeMarker();
    const a1 = await createAmendment(marker, { status: "confirmed" }, "First", signer);
    (a1 as any).timestamp = "2025-01-01T00:00:00.000Z";
    (a1 as any).amendmentId = "aaa";
    const a2 = await createAmendment(marker, { status: "disputed" }, "Second", signer);
    (a2 as any).timestamp = "2025-06-01T00:00:00.000Z";
    (a2 as any).amendmentId = "bbb";

    await store.putAmendment(a2);
    await store.putAmendment(a1);

    const amendments = await store.getAmendments(marker.id);
    expect(amendments[0].amendmentId).toBe("aaa");
    expect(amendments[1].amendmentId).toBe("bbb");
  });
});

describe("discoverAmendments", () => {
  it("falls back to local store when no URLs provided", async () => {
    const store = new InMemoryAmendmentStore();
    const signer = createSigner({ algorithm: "Ed25519" });
    const marker = makeMarker();
    const amendment = await createAmendment(marker, { status: "confirmed" }, "Update", signer);
    await store.putAmendment(amendment);

    const result = await discoverAmendments(marker.id, { localStore: store });
    expect(result.amendments).toHaveLength(1);
    expect(result.complete).toBe(true);
  });

  it("returns incomplete response when all methods fail", async () => {
    const result = await discoverAmendments("nonexistent");
    expect(result.amendments).toEqual([]);
    expect(result.revocations).toEqual([]);
    expect(result.complete).toBe(false);
  });

  it("handles invalid well-known URL gracefully", async () => {
    const result = await discoverAmendments("test-id", {
      wellKnownUrl: "http://localhost:99999/nonexistent",
      timeoutMs: 500,
    });
    expect(result.complete).toBe(false);
  });
});

describe("createWellKnownMetadata", () => {
  it("creates valid metadata with defaults", () => {
    const meta = createWellKnownMetadata("https://example.com/api/amendments");
    expect(meta.version).toBe("1.2");
    expect(meta.endpoint).toBe("https://example.com/api/amendments");
    expect(meta.capabilities.byMarkerId).toBe(true);
    expect(meta.capabilities.bySubject).toBe(false);
    expect(meta.capabilities.since).toBe(true);
    expect(meta.lastUpdated).toBeTruthy();
  });

  it("accepts capability overrides", () => {
    const meta = createWellKnownMetadata("https://example.com/api", { bySubject: true });
    expect(meta.capabilities.bySubject).toBe(true);
  });
});

describe("createAmendmentQueryHandler", () => {
  it("returns a working query function", async () => {
    const store = new InMemoryAmendmentStore();
    const signer = createSigner({ algorithm: "Ed25519" });
    const marker = makeMarker();
    const amendment = await createAmendment(marker, { status: "confirmed" }, "Update", signer);
    await store.putAmendment(amendment);

    const handler = createAmendmentQueryHandler(store);
    const result = await handler(marker.id);
    expect(result.amendments).toHaveLength(1);
    expect(result.markerId).toBe(marker.id);
  });
});
