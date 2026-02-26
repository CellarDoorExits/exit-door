/**
 * Trust Enhancers — Conduit-only optional fields
 *
 * Tests that trust enhancers are validated for well-formedness
 * but carry no opinion on truth/authenticity.
 */

import { describe, it, expect } from "vitest";
import { validateMarker } from "../validate.js";
import { signMarker, verifyMarker, verifyTrustEnhancers } from "../proof.js";
import { generateKeyPair, didFromPublicKey } from "../crypto.js";
import type { ExitMarker, TrustEnhancers, TimestampAttachment, WitnessAttachment, IdentityClaimAttachment } from "../types.js";

function makeBaseMarker(): ExitMarker {
  const { publicKey, privateKey } = generateKeyPair();
  const did = didFromPublicKey(publicKey);
  const marker: ExitMarker = {
    "@context": "https://cellar-door.dev/exit/v1",
    specVersion: "1.1",
    id: `urn:exit:test-${Date.now()}`,
    subject: did,
    origin: "https://platform.example.com",
    timestamp: new Date().toISOString(),
    exitType: "voluntary" as any,
    status: "good_standing" as any,
    selfAttested: true,
    proof: { type: "Ed25519Signature2020", created: new Date().toISOString(), verificationMethod: did, proofValue: "" },
  };
  return signMarker(marker, privateKey, publicKey);
}

describe("Trust Enhancers (Conduit-Only)", () => {
  describe("Timestamps", () => {
    const validTimestamp: TimestampAttachment = {
      tsaUrl: "https://freetsa.org/tsr",
      hash: "a".repeat(64),
      timestamp: "2026-02-25T12:00:00Z",
      receipt: Buffer.from("fake-receipt").toString("base64"),
    };

    it("accepts valid timestamp attachment", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = { timestamps: [validTimestamp] };
      const result = validateMarker(marker);
      // Filter out proof-related errors since we're testing trustEnhancers
      const teErrors = result.errors.filter(e => e.includes("trustEnhancers"));
      expect(teErrors).toEqual([]);
    });

    it("rejects timestamp with invalid hash", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = { timestamps: [{ ...validTimestamp, hash: "not-hex" }] };
      const result = validateMarker(marker);
      expect(result.errors.some(e => e.includes("timestamps[0].hash"))).toBe(true);
    });

    it("rejects timestamp with missing tsaUrl", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = { timestamps: [{ ...validTimestamp, tsaUrl: "" }] };
      const result = validateMarker(marker);
      expect(result.errors.some(e => e.includes("timestamps[0].tsaUrl"))).toBe(true);
    });

    it("rejects timestamp with invalid ISO date", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = { timestamps: [{ ...validTimestamp, timestamp: "not-a-date" }] };
      const result = validateMarker(marker);
      expect(result.errors.some(e => e.includes("timestamps[0].timestamp"))).toBe(true);
    });

    it("accepts multiple timestamps", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = { timestamps: [validTimestamp, { ...validTimestamp, tsaUrl: "https://other-tsa.example.com" }] };
      const result = validateMarker(marker);
      const teErrors = result.errors.filter(e => e.includes("trustEnhancers"));
      expect(teErrors).toEqual([]);
    });

    it("accepts timestamp with optional nonce", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = { timestamps: [{ ...validTimestamp, nonce: "deadbeef01234567" }] };
      const result = validateMarker(marker);
      const teErrors = result.errors.filter(e => e.includes("trustEnhancers"));
      expect(teErrors).toEqual([]);
    });
  });

  describe("Witnesses", () => {
    const validWitness: WitnessAttachment = {
      witnessDid: "did:key:z6MkTestWitness",
      attestation: "observed departure ceremony",
      timestamp: "2026-02-25T12:00:00Z",
      signature: Buffer.from("fake-sig").toString("base64"),
      signatureType: "Ed25519Signature2020",
    };

    it("accepts valid witness attachment", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = { witnesses: [validWitness] };
      const result = validateMarker(marker);
      const teErrors = result.errors.filter(e => e.includes("trustEnhancers"));
      expect(teErrors).toEqual([]);
    });

    it("rejects witness with empty witnessDid", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = { witnesses: [{ ...validWitness, witnessDid: "" }] };
      const result = validateMarker(marker);
      expect(result.errors.some(e => e.includes("witnesses[0].witnessDid"))).toBe(true);
    });

    it("rejects witness with empty attestation", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = { witnesses: [{ ...validWitness, attestation: "" }] };
      const result = validateMarker(marker);
      expect(result.errors.some(e => e.includes("witnesses[0].attestation"))).toBe(true);
    });

    it("rejects witness with missing signature", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = { witnesses: [{ ...validWitness, signature: "" }] };
      const result = validateMarker(marker);
      expect(result.errors.some(e => e.includes("witnesses[0].signature"))).toBe(true);
    });

    it("rejects witness with missing signatureType", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = { witnesses: [{ ...validWitness, signatureType: "" }] };
      const result = validateMarker(marker);
      expect(result.errors.some(e => e.includes("witnesses[0].signatureType"))).toBe(true);
    });
  });

  describe("Identity Claims", () => {
    const validClaim: IdentityClaimAttachment = {
      scheme: "did:web",
      value: "did:web:example.com",
      issuedAt: "2026-02-25T12:00:00Z",
    };

    it("accepts valid identity claim", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = { identityClaims: [validClaim] };
      const result = validateMarker(marker);
      const teErrors = result.errors.filter(e => e.includes("trustEnhancers"));
      expect(teErrors).toEqual([]);
    });

    it("rejects claim with missing scheme", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = { identityClaims: [{ ...validClaim, scheme: "" }] };
      const result = validateMarker(marker);
      expect(result.errors.some(e => e.includes("identityClaims[0].scheme"))).toBe(true);
    });

    it("rejects claim with missing value", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = { identityClaims: [{ ...validClaim, value: "" }] };
      const result = validateMarker(marker);
      expect(result.errors.some(e => e.includes("identityClaims[0].value"))).toBe(true);
    });

    it("rejects claim with invalid issuedAt", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = { identityClaims: [{ ...validClaim, issuedAt: "bad" }] };
      const result = validateMarker(marker);
      expect(result.errors.some(e => e.includes("identityClaims[0].issuedAt"))).toBe(true);
    });

    it("accepts claim with optional expiresAt", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = { identityClaims: [{ ...validClaim, expiresAt: "2027-01-01T00:00:00Z" }] };
      const result = validateMarker(marker);
      const teErrors = result.errors.filter(e => e.includes("trustEnhancers"));
      expect(teErrors).toEqual([]);
    });

    it("rejects claim with invalid expiresAt", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = { identityClaims: [{ ...validClaim, expiresAt: "not-a-date" }] };
      const result = validateMarker(marker);
      expect(result.errors.some(e => e.includes("identityClaims[0].expiresAt"))).toBe(true);
    });

    it("accepts claim with optional issuer and proof", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = {
        identityClaims: [{
          ...validClaim,
          issuer: "did:web:issuer.example.com",
          proof: Buffer.from("issuer-proof").toString("base64"),
        }],
      };
      const result = validateMarker(marker);
      const teErrors = result.errors.filter(e => e.includes("trustEnhancers"));
      expect(teErrors).toEqual([]);
    });

    it("accepts opaque scheme types", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = {
        identityClaims: [
          { scheme: "opaque", value: "some-opaque-token-12345", issuedAt: "2026-02-25T12:00:00Z" },
          { scheme: "x509", value: "SHA256:aa:bb:cc:dd", issuedAt: "2026-02-25T12:00:00Z" },
          { scheme: "oauth2", value: "bearer-token-ref", issuedAt: "2026-02-25T12:00:00Z" },
        ],
      };
      const result = validateMarker(marker);
      const teErrors = result.errors.filter(e => e.includes("trustEnhancers"));
      expect(teErrors).toEqual([]);
    });
  });

  describe("Combined", () => {
    it("accepts all three enhancer types together", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = {
        timestamps: [{
          tsaUrl: "https://freetsa.org/tsr",
          hash: "b".repeat(64),
          timestamp: "2026-02-25T12:00:00Z",
          receipt: Buffer.from("tsr").toString("base64"),
        }],
        witnesses: [{
          witnessDid: "did:key:z6MkWitness",
          attestation: "observed",
          timestamp: "2026-02-25T12:00:00Z",
          signature: Buffer.from("sig").toString("base64"),
          signatureType: "Ed25519Signature2020",
        }],
        identityClaims: [{
          scheme: "did:web",
          value: "did:web:agent.example.com",
          issuedAt: "2026-02-25T12:00:00Z",
        }],
      };
      const result = validateMarker(marker);
      const teErrors = result.errors.filter(e => e.includes("trustEnhancers"));
      expect(teErrors).toEqual([]);
    });

    it("accepts empty trustEnhancers object", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = {};
      const result = validateMarker(marker);
      const teErrors = result.errors.filter(e => e.includes("trustEnhancers"));
      expect(teErrors).toEqual([]);
    });

    it("rejects non-object trustEnhancers", () => {
      const marker = makeBaseMarker();
      (marker as any).trustEnhancers = "not-an-object";
      const result = validateMarker(marker);
      expect(result.errors.some(e => e.includes("trustEnhancers must be an object"))).toBe(true);
    });

    it("rejects non-array timestamps", () => {
      const marker = makeBaseMarker();
      (marker as any).trustEnhancers = { timestamps: "not-an-array" };
      const result = validateMarker(marker);
      expect(result.errors.some(e => e.includes("timestamps must be an array"))).toBe(true);
    });

    it("marker with trust enhancers signs and verifies correctly", () => {
      const { publicKey, privateKey } = generateKeyPair();
      const did = didFromPublicKey(publicKey);
      const marker: ExitMarker = {
        "@context": "https://cellar-door.dev/exit/v1",
        specVersion: "1.1",
        id: `urn:exit:enhanced-${Date.now()}`,
        subject: did,
        origin: "https://platform.example.com",
        timestamp: new Date().toISOString(),
        exitType: "voluntary" as any,
        status: "good_standing" as any,
        selfAttested: true,
        proof: { type: "Ed25519Signature2020", created: "", verificationMethod: "", proofValue: "" },
        trustEnhancers: {
          timestamps: [{
            tsaUrl: "https://freetsa.org/tsr",
            hash: "c".repeat(64),
            timestamp: "2026-02-25T12:00:00Z",
            receipt: Buffer.from("tsr-data").toString("base64"),
          }],
          witnesses: [{
            witnessDid: "did:key:z6MkWitnessKey",
            attestation: "I observed this departure",
            timestamp: "2026-02-25T12:00:01Z",
            signature: Buffer.from("witness-sig").toString("base64"),
            signatureType: "Ed25519Signature2020",
          }],
        },
      };

      const signed = signMarker(marker, privateKey, publicKey);
      const result = verifyMarker(signed);
      expect(result.valid).toBe(true);
    });
  });

  describe("verifyTrustEnhancers()", () => {
    it("returns valid for marker without trust enhancers", () => {
      const marker = makeBaseMarker();
      delete (marker as any).trustEnhancers;
      const result = verifyTrustEnhancers(marker);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("returns valid for well-formed trust enhancers", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = {
        timestamps: [{
          tsaUrl: "https://freetsa.org/tsr",
          hash: "a".repeat(64),
          timestamp: "2026-02-25T12:00:00Z",
          receipt: Buffer.from("receipt").toString("base64"),
        }],
        witnesses: [{
          witnessDid: "did:key:z6MkWitness",
          attestation: "observed",
          timestamp: "2026-02-25T12:00:00Z",
          signature: Buffer.from("sig").toString("base64"),
          signatureType: "Ed25519Signature2020",
        }],
        identityClaims: [{
          scheme: "did:web",
          value: "did:web:example.com",
          issuedAt: "2026-02-25T12:00:00Z",
        }],
      };
      const result = verifyTrustEnhancers(marker);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("reports missing timestamp fields", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = {
        timestamps: [{ tsaUrl: "", hash: "", timestamp: "", receipt: "" } as any],
      };
      const result = verifyTrustEnhancers(marker);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });

    it("reports missing witness fields", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = {
        witnesses: [{ witnessDid: "", attestation: "", timestamp: "", signature: "", signatureType: "" } as any],
      };
      const result = verifyTrustEnhancers(marker);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(5);
    });

    it("reports invalid identity claim dates", () => {
      const marker = makeBaseMarker();
      marker.trustEnhancers = {
        identityClaims: [{
          scheme: "did:web",
          value: "did:web:example.com",
          issuedAt: "not-a-date",
          expiresAt: "also-bad",
        }],
      };
      const result = verifyTrustEnhancers(marker);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("invalid issuedAt"))).toBe(true);
      expect(result.errors.some(e => e.includes("invalid expiresAt"))).toBe(true);
    });
  });
});
