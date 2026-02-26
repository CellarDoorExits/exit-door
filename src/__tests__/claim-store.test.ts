/**
 * Claim Store tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MemoryClaimStore,
  ClaimType,
  claimFromMarker,
  claimsFromTrustEnhancers,
  ingestMarker,
} from "../claim-store.js";
import type { StoredClaim } from "../claim-store.js";
import { generateKeyPair, didFromPublicKey } from "../crypto.js";
import { signMarker } from "../proof.js";
import type { ExitMarker } from "../types.js";

function makeSignedMarker(opts?: Partial<ExitMarker>): ExitMarker {
  const { publicKey, privateKey } = generateKeyPair();
  const did = didFromPublicKey(publicKey);
  const base: ExitMarker = {
    "@context": "https://cellar-door.dev/exit/v1",
    specVersion: "1.1",
    id: `urn:exit:claim-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    subject: did,
    origin: "https://platform.example.com",
    timestamp: new Date().toISOString(),
    exitType: "voluntary" as any,
    status: "good_standing" as any,
    selfAttested: true,
    proof: { type: "Ed25519Signature2020", created: "", verificationMethod: "", proofValue: "" },
    ...opts,
  };
  return signMarker(base, privateKey, publicKey);
}

function makeClaim(overrides?: Partial<StoredClaim>): StoredClaim {
  return {
    id: `claim:test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    subject: "did:key:z6MkTestSubject",
    type: ClaimType.Custom,
    payload: { test: true },
    issuer: "did:key:z6MkTestIssuer",
    issuedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("MemoryClaimStore", () => {
  let store: MemoryClaimStore;

  beforeEach(() => {
    store = new MemoryClaimStore();
  });

  describe("Basic CRUD", () => {
    it("put and get a claim", () => {
      const claim = makeClaim();
      store.put(claim);
      const retrieved = store.get(claim.id);
      expect(retrieved).toEqual(claim);
    });

    it("get returns null for missing claim", () => {
      expect(store.get("nonexistent")).toBeNull();
    });

    it("auto-generates ID if empty", () => {
      const claim = makeClaim({ id: "" });
      store.put(claim);
      // Should be stored with a generated ID
      const stats = store.stats();
      expect(stats.totalClaims).toBe(1);
    });

    it("delete removes a claim", () => {
      const claim = makeClaim();
      store.put(claim);
      expect(store.delete(claim.id)).toBe(true);
      expect(store.get(claim.id)).toBeNull();
    });

    it("delete returns false for missing claim", () => {
      expect(store.delete("nonexistent")).toBe(false);
    });

    it("clear removes all claims", () => {
      store.put(makeClaim());
      store.put(makeClaim());
      store.clear();
      expect(store.stats().totalClaims).toBe(0);
    });
  });

  describe("Validation", () => {
    it("rejects claim without subject", () => {
      expect(() => store.put(makeClaim({ subject: "" }))).toThrow("subject");
    });

    it("rejects claim without type", () => {
      expect(() => store.put(makeClaim({ type: "" }))).toThrow("type");
    });

    it("rejects claim without issuer", () => {
      expect(() => store.put(makeClaim({ issuer: "" }))).toThrow("issuer");
    });

    it("rejects claim without issuedAt", () => {
      expect(() => store.put(makeClaim({ issuedAt: "" }))).toThrow("issuedAt");
    });

    it("rejects claim with non-object payload", () => {
      expect(() => store.put(makeClaim({ payload: null as any }))).toThrow("payload");
    });
  });

  describe("Query", () => {
    it("filters by subject", () => {
      store.put(makeClaim({ subject: "did:a" }));
      store.put(makeClaim({ subject: "did:b" }));
      const results = store.query({ subject: "did:a" });
      expect(results).toHaveLength(1);
      expect(results[0].subject).toBe("did:a");
    });

    it("filters by type", () => {
      store.put(makeClaim({ type: ClaimType.ExitMarker }));
      store.put(makeClaim({ type: ClaimType.Identity }));
      const results = store.query({ type: ClaimType.ExitMarker });
      expect(results).toHaveLength(1);
    });

    it("filters by issuer", () => {
      store.put(makeClaim({ issuer: "did:issuer1" }));
      store.put(makeClaim({ issuer: "did:issuer2" }));
      const results = store.query({ issuer: "did:issuer1" });
      expect(results).toHaveLength(1);
    });

    it("filters by tags", () => {
      store.put(makeClaim({ tags: ["urgent", "security"] }));
      store.put(makeClaim({ tags: ["routine"] }));
      const results = store.query({ tags: ["urgent"] });
      expect(results).toHaveLength(1);
    });

    it("filters by markerRef", () => {
      store.put(makeClaim({ markerRef: "urn:exit:123" }));
      store.put(makeClaim({ markerRef: "urn:exit:456" }));
      const results = store.query({ markerRef: "urn:exit:123" });
      expect(results).toHaveLength(1);
    });

    it("excludes expired claims by default", () => {
      store.put(makeClaim({ expiresAt: "2020-01-01T00:00:00Z" }));
      store.put(makeClaim());
      const results = store.query({});
      expect(results).toHaveLength(1);
    });

    it("includes expired claims when requested", () => {
      store.put(makeClaim({ expiresAt: "2020-01-01T00:00:00Z" }));
      store.put(makeClaim());
      const results = store.query({ excludeExpired: false });
      expect(results).toHaveLength(2);
    });

    it("limits results", () => {
      for (let i = 0; i < 10; i++) store.put(makeClaim());
      const results = store.query({ limit: 3 });
      expect(results).toHaveLength(3);
    });

    it("sorts newest first by default", () => {
      store.put(makeClaim({ issuedAt: "2026-01-01T00:00:00Z" }));
      store.put(makeClaim({ issuedAt: "2026-06-01T00:00:00Z" }));
      const results = store.query({});
      expect(results[0].issuedAt).toBe("2026-06-01T00:00:00Z");
    });

    it("sorts oldest first when requested", () => {
      store.put(makeClaim({ issuedAt: "2026-01-01T00:00:00Z" }));
      store.put(makeClaim({ issuedAt: "2026-06-01T00:00:00Z" }));
      const results = store.query({ sort: "oldest" });
      expect(results[0].issuedAt).toBe("2026-01-01T00:00:00Z");
    });
  });

  describe("GDPR deleteBySubject", () => {
    it("deletes all claims for a subject", () => {
      store.put(makeClaim({ subject: "did:target" }));
      store.put(makeClaim({ subject: "did:target" }));
      store.put(makeClaim({ subject: "did:other" }));
      const count = store.deleteBySubject("did:target");
      expect(count).toBe(2);
      expect(store.stats().totalClaims).toBe(1);
    });

    it("returns 0 for unknown subject", () => {
      expect(store.deleteBySubject("did:nobody")).toBe(0);
    });
  });

  describe("Stats", () => {
    it("returns accurate statistics", () => {
      store.put(makeClaim({ subject: "did:a", type: ClaimType.ExitMarker, issuer: "did:i1" }));
      store.put(makeClaim({ subject: "did:a", type: ClaimType.Identity, issuer: "did:i2" }));
      store.put(makeClaim({ subject: "did:b", type: ClaimType.ExitMarker, issuer: "did:i1", expiresAt: "2020-01-01T00:00:00Z" }));

      const stats = store.stats();
      expect(stats.totalClaims).toBe(3);
      expect(stats.uniqueSubjects).toBe(2);
      expect(stats.uniqueIssuers).toBe(2);
      expect(stats.claimsByType[ClaimType.ExitMarker]).toBe(2);
      expect(stats.claimsByType[ClaimType.Identity]).toBe(1);
      expect(stats.expiredClaims).toBe(1);
    });
  });
});

describe("Claim Factories", () => {
  it("claimFromMarker creates correct claim", () => {
    const marker = makeSignedMarker();
    const claim = claimFromMarker(marker);

    expect(claim.subject).toBe(marker.subject);
    expect(claim.type).toBe(ClaimType.ExitMarker);
    expect(claim.issuer).toBe(marker.subject);
    expect(claim.markerRef).toBe(marker.id);
    expect((claim.payload as any).origin).toBe(marker.origin);
    expect((claim.payload as any).exitType).toBe(marker.exitType);
  });

  it("claimsFromTrustEnhancers extracts all enhancers", () => {
    const marker = makeSignedMarker({
      trustEnhancers: {
        timestamps: [{
          tsaUrl: "https://tsa.example.com",
          hash: "a".repeat(64),
          timestamp: "2026-02-25T12:00:00Z",
          receipt: "abc",
        }],
        witnesses: [{
          witnessDid: "did:key:z6MkWitness",
          attestation: "I saw it",
          timestamp: "2026-02-25T12:00:01Z",
          signature: "sig",
          signatureType: "Ed25519Signature2020",
        }],
        identityClaims: [{
          scheme: "did:web",
          value: "did:web:agent.example.com",
          issuedAt: "2026-02-25T12:00:02Z",
          expiresAt: "2027-01-01T00:00:00Z",
          issuer: "did:web:issuer.example.com",
        }],
      },
    });

    const claims = claimsFromTrustEnhancers(marker);
    expect(claims).toHaveLength(3);

    const tsClaim = claims.find(c => c.type === ClaimType.Timestamp);
    expect(tsClaim?.issuer).toBe("https://tsa.example.com");

    const witnessClaim = claims.find(c => c.type === ClaimType.WitnessAttestation);
    expect(witnessClaim?.issuer).toBe("did:key:z6MkWitness");

    const idClaim = claims.find(c => c.type === ClaimType.Identity);
    expect(idClaim?.expiresAt).toBe("2027-01-01T00:00:00Z");
    expect(idClaim?.issuer).toBe("did:web:issuer.example.com");
  });

  it("claimsFromTrustEnhancers returns empty for no enhancers", () => {
    const marker = makeSignedMarker();
    expect(claimsFromTrustEnhancers(marker)).toEqual([]);
  });
});

describe("ingestMarker", () => {
  it("ingests marker + all trust enhancers into store", () => {
    const store = new MemoryClaimStore();
    const marker = makeSignedMarker({
      trustEnhancers: {
        timestamps: [{
          tsaUrl: "https://tsa.example.com",
          hash: "b".repeat(64),
          timestamp: "2026-02-25T12:00:00Z",
          receipt: "receipt",
        }],
      },
    });

    ingestMarker(store, marker);

    const stats = store.stats();
    expect(stats.totalClaims).toBe(2); // marker + timestamp
    expect(stats.claimsByType[ClaimType.ExitMarker]).toBe(1);
    expect(stats.claimsByType[ClaimType.Timestamp]).toBe(1);
  });
});
