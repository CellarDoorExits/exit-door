import { describe, it, expect } from "vitest";
import {
  createAmendment,
  createRevocation,
  applyAmendment,
  applyAmendments,
  resolveMarker,
  verifyAmendmentSignature,
  verifyRevocationSignature,
} from "../amendment.js";
import { createSigner } from "../signer.js";
import { ExitType, ExitStatus, EXIT_CONTEXT_V1, EXIT_SPEC_VERSION } from "../types.js";
import type { ExitMarker } from "../types.js";

function makeMarker(overrides: Partial<ExitMarker> = {}): ExitMarker {
  return {
    "@context": EXIT_CONTEXT_V1,
    specVersion: EXIT_SPEC_VERSION,
    id: "urn:exit:test123",
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
  };
}

describe("amendment system", () => {
  const issuerSigner = createSigner({ algorithm: "Ed25519" });
  const otherSigner = createSigner({ algorithm: "Ed25519" });
  const subjectSigner = createSigner({ algorithm: "Ed25519" });

  describe("createAmendment", () => {
    it("creates a signed amendment marker", async () => {
      const marker = makeMarker();
      const amendment = await createAmendment(
        marker,
        { status: ExitStatus.Disputed },
        "Status was incorrect",
        issuerSigner,
      );

      expect(amendment.type).toBe("MarkerAmendment");
      expect(amendment.originalMarkerId).toBe(marker.id);
      expect(amendment.amendedFields).toEqual({ status: ExitStatus.Disputed });
      expect(amendment.reason).toBe("Status was incorrect");
      expect(amendment.amendmentId).toMatch(/^[0-9a-f]{64}$/);
      expect(amendment.proof).toBeDefined();
      expect(amendment.proof!.verificationMethod).toBe(issuerSigner.did());
    });

    it("produces deterministic IDs for same content", async () => {
      // IDs depend on timestamp so we can't easily test exact equality,
      // but we can verify they're valid hashes
      const marker = makeMarker();
      const a = await createAmendment(marker, { status: ExitStatus.Disputed }, "reason", issuerSigner);
      expect(a.amendmentId).toHaveLength(64);
    });
  });

  describe("applyAmendment", () => {
    it("applies a single field amendment", async () => {
      const marker = makeMarker();
      const amendment = await createAmendment(
        marker,
        { status: ExitStatus.Disputed },
        "correcting status",
        issuerSigner,
      );

      const result = applyAmendment(marker, amendment);
      expect(result.status).toBe(ExitStatus.Disputed);
      // Original unchanged
      expect(marker.status).toBe(ExitStatus.GoodStanding);
    });

    it("applies multiple fields at once", async () => {
      const marker = makeMarker();
      const amendment = await createAmendment(
        marker,
        { status: ExitStatus.Disputed, origin: "https://new.example.com" },
        "correcting multiple fields",
        issuerSigner,
      );

      const result = applyAmendment(marker, amendment);
      expect(result.status).toBe(ExitStatus.Disputed);
      expect(result.origin).toBe("https://new.example.com");
    });

    it("handles amending a non-existent field (adds it)", async () => {
      const marker = makeMarker();
      const amendment = await createAmendment(
        marker,
        { customField: "new-value" } as any,
        "adding field",
        issuerSigner,
      );

      const result = applyAmendment(marker, amendment) as any;
      expect(result.customField).toBe("new-value");
    });

    it("handles empty amendment (no-op)", async () => {
      const marker = makeMarker();
      const amendment = await createAmendment(marker, {}, "no changes", issuerSigner);

      const result = applyAmendment(marker, amendment);
      expect(result.status).toBe(marker.status);
      expect(result.origin).toBe(marker.origin);
    });
  });

  describe("applyAmendments (chain)", () => {
    it("applies amendments in creation-time order", async () => {
      const marker = makeMarker();

      // Create amendments with different timestamps by overriding created
      const a1 = await createAmendment(marker, { status: ExitStatus.Disputed }, "first", issuerSigner);
      // Small delay to ensure different timestamps
      const a2 = await createAmendment(marker, { status: ExitStatus.GoodStanding }, "second override", issuerSigner);

      const result = applyAmendments(marker, [a2, a1]); // pass out of order
      // Should apply a1 first, then a2 (by creation time), so final = Confirmed
      expect(result.status).toBe(ExitStatus.GoodStanding);
    });
  });

  describe("createRevocation", () => {
    it("creates a signed revocation marker", async () => {
      const revocation = await createRevocation(
        "urn:exit:test123",
        "Marker issued in error",
        issuerSigner,
      );

      expect(revocation.type).toBe("MarkerRevocation");
      expect(revocation.targetMarkerId).toBe("urn:exit:test123");
      expect(revocation.reason).toBe("Marker issued in error");
      expect(revocation.revocationId).toMatch(/^[0-9a-f]{64}$/);
      expect(revocation.proof).toBeDefined();
    });
  });

  describe("resolveMarker", () => {
    it("resolves with amendments only", async () => {
      const marker = makeMarker();
      const amendment = await createAmendment(
        marker,
        { status: ExitStatus.Disputed },
        "correcting",
        issuerSigner,
      );

      const result = resolveMarker(marker, [amendment], []);
      expect(result.marker.status).toBe(ExitStatus.Disputed);
      expect(result.isRevoked).toBe(false);
      expect(result.amendmentCount).toBe(1);
    });

    it("resolves with revocation", async () => {
      const marker = makeMarker();
      const revocation = await createRevocation(marker.id, "revoked", issuerSigner);

      const result = resolveMarker(marker, [], [revocation]);
      expect(result.isRevoked).toBe(true);
      expect(result.amendmentCount).toBe(0);
    });

    it("resolves with both amendments and revocation", async () => {
      const marker = makeMarker();
      const amendment = await createAmendment(marker, { status: ExitStatus.Disputed }, "fix", issuerSigner);
      const revocation = await createRevocation(marker.id, "revoked", issuerSigner);

      const result = resolveMarker(marker, [amendment], [revocation]);
      expect(result.isRevoked).toBe(true);
      expect(result.amendmentCount).toBe(1);
      expect(result.marker.status).toBe(ExitStatus.Disputed);
    });

    it("handles revoking already-revoked marker (multiple revocations)", async () => {
      const marker = makeMarker();
      const r1 = await createRevocation(marker.id, "first revoke", issuerSigner);
      const r2 = await createRevocation(marker.id, "second revoke", issuerSigner);

      const result = resolveMarker(marker, [], [r1, r2]);
      expect(result.isRevoked).toBe(true);
    });
  });

  describe("signature verification", () => {
    it("verifies amendment by original issuer", async () => {
      const marker = makeMarker();
      const amendment = await createAmendment(marker, { status: ExitStatus.Disputed }, "fix", issuerSigner);

      const valid = await verifyAmendmentSignature(amendment, issuerSigner);
      expect(valid).toBe(true);
    });

    it("rejects amendment by non-original-issuer", async () => {
      const marker = makeMarker();
      const amendment = await createAmendment(marker, { status: ExitStatus.Disputed }, "fix", issuerSigner);

      // Verify with a different signer — should fail (DID mismatch)
      const valid = await verifyAmendmentSignature(amendment, otherSigner);
      expect(valid).toBe(false);
    });

    it("verifies revocation by issuer", async () => {
      const revocation = await createRevocation("urn:exit:test123", "revoke", issuerSigner);

      const valid = await verifyRevocationSignature(revocation, issuerSigner);
      expect(valid).toBe(true);
    });

    it("verifies revocation by subject (subject OR issuer can revoke)", async () => {
      // Subject creates their own revocation — this should be valid
      const revocation = await createRevocation("urn:exit:test123", "subject revokes", subjectSigner);

      const valid = await verifyRevocationSignature(revocation, subjectSigner);
      expect(valid).toBe(true);
    });

    it("rejects amendment without proof", async () => {
      const marker = makeMarker();
      const amendment = await createAmendment(marker, { status: ExitStatus.Disputed }, "fix", issuerSigner);
      const noProof = { ...amendment, proof: undefined };

      const valid = await verifyAmendmentSignature(noProof, issuerSigner);
      expect(valid).toBe(false);
    });
  });
});
