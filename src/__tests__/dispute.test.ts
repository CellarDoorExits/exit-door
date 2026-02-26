import { describe, it, expect } from "vitest";
import {
  createDispute,
  resolveDispute,
  verifyDisputeResolution,
  isDisputed,
  getDisputeStatus,
} from "../dispute.js";
import { generateKeyPair, didFromPublicKey } from "../crypto.js";
import { ExitType, ExitStatus, EXIT_CONTEXT_V1, EXIT_SPEC_VERSION } from "../types.js";
import type { ExitMarker } from "../types.js";

function makeMarker(overrides: Partial<ExitMarker> = {}): ExitMarker {
  return {
    "@context": EXIT_CONTEXT_V1,
    specVersion: EXIT_SPEC_VERSION,
    id: "exit:test:1",
    subject: "did:key:z6MkTest",
    origin: "https://example.com",
    timestamp: new Date().toISOString(),
    exitType: ExitType.Voluntary,
    status: ExitStatus.GoodStanding,
    selfAttested: true,
    proof: {
      type: "Ed25519Signature2020",
      created: new Date().toISOString(),
      verificationMethod: "did:key:z6MkTest",
      proofValue: "dGVzdA==",
    },
    ...overrides,
  };
}

describe("dispute resolution", () => {
  const arbiterKeys = generateKeyPair();
  const arbiterDid = didFromPublicKey(arbiterKeys.publicKey);
  const filerDid = "did:key:z6MkFiler1234567890abcdef";

  describe("createDispute", () => {
    it("creates a dispute record with required fields", () => {
      const d = createDispute("exit:test:1", "Incorrect status claim", arbiterDid, filerDid);
      expect(d.markerId).toBe("exit:test:1");
      expect(d.reason).toBe("Incorrect status claim");
      expect(d.arbiterDid).toBe(arbiterDid);
      expect(d.filerDid).toBe(filerDid);
      expect(d.id).toMatch(/^dispute:/);
      expect(d.filedAt).toBeTruthy();
      expect(d.evidenceRefs).toEqual([]);
      expect(d.resolution).toBeUndefined();
    });

    it("accepts optional evidence refs and expiry", () => {
      const d = createDispute("exit:test:1", "reason", arbiterDid, filerDid, ["hash:abc"], "2030-01-01T00:00:00Z");
      expect(d.evidenceRefs).toEqual(["hash:abc"]);
      expect(d.expiresAt).toBe("2030-01-01T00:00:00Z");
    });

    it("throws on invalid inputs", () => {
      expect(() => createDispute("", "reason", arbiterDid, filerDid)).toThrow("markerId");
      expect(() => createDispute("id", "", arbiterDid, filerDid)).toThrow("reason");
      expect(() => createDispute("id", "reason", "bad", filerDid)).toThrow("arbiterDid");
      expect(() => createDispute("id", "reason", arbiterDid, "bad")).toThrow("filerDid");
    });
  });

  describe("resolveDispute / verifyDisputeResolution", () => {
    it("resolves a dispute and verifies the arbiter signature", () => {
      const d = createDispute("exit:test:1", "reason", arbiterDid, filerDid);
      const resolved = resolveDispute(d, "dismissed", "No merit", arbiterKeys.privateKey);

      expect(resolved.resolution).toBeDefined();
      expect(resolved.resolution!.outcome).toBe("dismissed");
      expect(resolved.resolution!.summary).toBe("No merit");
      expect(resolved.resolution!.proof.verificationMethod).toBe(arbiterDid);

      expect(verifyDisputeResolution(resolved)).toBe(true);
    });

    it("fails verification with tampered data", () => {
      const d = createDispute("exit:test:1", "reason", arbiterDid, filerDid);
      const resolved = resolveDispute(d, "upheld", "Valid claim", arbiterKeys.privateKey);

      // Tamper with the summary
      const tampered = {
        ...resolved,
        resolution: { ...resolved.resolution!, summary: "TAMPERED" },
      };
      expect(verifyDisputeResolution(tampered)).toBe(false);
    });

    it("throws if dispute already resolved", () => {
      const d = createDispute("exit:test:1", "reason", arbiterDid, filerDid);
      const resolved = resolveDispute(d, "settled", "Agreed", arbiterKeys.privateKey);
      expect(() => resolveDispute(resolved, "dismissed", "No", arbiterKeys.privateKey)).toThrow("already resolved");
    });

    it("returns false for unresolved dispute", () => {
      const d = createDispute("exit:test:1", "reason", arbiterDid, filerDid);
      expect(verifyDisputeResolution(d)).toBe(false);
    });
  });

  describe("isDisputed / getDisputeStatus", () => {
    it("returns 'none' for marker with no disputes", () => {
      const marker = makeMarker();
      expect(getDisputeStatus(marker)).toBe("none");
      expect(isDisputed(marker)).toBe(false);
    });

    it("returns 'active' for marker with core disputed status", () => {
      const marker = makeMarker({ status: ExitStatus.Disputed });
      expect(getDisputeStatus(marker)).toBe("active");
      expect(isDisputed(marker)).toBe(true);
    });

    it("returns 'active' for marker with unresolved Module C dispute", () => {
      const marker = makeMarker({
        dispute: {
          disputes: [
            { id: "d1", challenger: filerDid, claim: "bad", filedAt: new Date().toISOString() },
          ],
        },
      });
      expect(getDisputeStatus(marker)).toBe("active");
      expect(isDisputed(marker)).toBe(true);
    });

    it("returns 'resolved' when all disputes are resolved", () => {
      const marker = makeMarker({
        dispute: {
          disputes: [
            { id: "d1", challenger: filerDid, claim: "bad", filedAt: new Date().toISOString(), resolution: "settled" },
          ],
        },
      });
      expect(getDisputeStatus(marker)).toBe("resolved");
      expect(isDisputed(marker)).toBe(false);
    });

    it("returns 'expired' when disputes have expired", () => {
      const marker = makeMarker({
        dispute: {
          disputes: [
            { id: "d1", challenger: filerDid, claim: "bad", filedAt: "2020-01-01T00:00:00Z", disputeExpiry: "2020-02-01T00:00:00Z" },
          ],
        },
      });
      expect(getDisputeStatus(marker)).toBe("expired");
      expect(isDisputed(marker)).toBe(false);
    });
  });
});
