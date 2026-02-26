import { describe, it, expect } from "vitest";
import {
  buildTimestampRequest,
  extractTimestampFromTSR,
  checkTSRStatus,
  requestTimestamp,
  anchorWithTSA,
  verifyTSAReceipt,
  type TSAReceipt,
} from "../tsa.js";
import {
  generateKeyPair,
  createMarker,
  signMarker,
  computeAnchorHash,
  ExitType,
} from "../index.js";
import { createHash, randomBytes } from "node:crypto";

describe("TSA — RFC 3161 Timestamp Authority Adapter", () => {
  // ─── Unit Tests (no network) ─────────────────────────────────────────────

  describe("buildTimestampRequest", () => {
    it("builds a valid DER-encoded timestamp request", () => {
      const hash = createHash("sha256").update("test data").digest("hex");
      const nonce = Buffer.from("0102030405060708", "hex");
      const req = buildTimestampRequest(hash, nonce);

      // Must be a SEQUENCE (tag 0x30)
      expect(req[0]).toBe(0x30);
      // Must contain the hash bytes
      expect(req.includes(Buffer.from(hash, "hex"))).toBe(true);
      // Must contain the nonce bytes
      expect(req.includes(nonce)).toBe(true);
    });

    it("rejects non-32-byte hashes", () => {
      expect(() => buildTimestampRequest("abcd")).toThrow("32-byte");
    });

    it("generates a random nonce if none provided", () => {
      const hash = createHash("sha256").update("x").digest("hex");
      const req1 = buildTimestampRequest(hash);
      const req2 = buildTimestampRequest(hash);
      // Two requests with random nonces should differ
      expect(req1.equals(req2)).toBe(false);
    });
  });

  describe("extractTimestampFromTSR", () => {
    it("extracts GeneralizedTime from a buffer", () => {
      // Craft a buffer with a GeneralizedTime tag
      const timeStr = "20260223213000Z";
      const timeBytes = Buffer.from(timeStr, "ascii");
      const genTime = Buffer.concat([
        Buffer.from([0x30, 0x40]), // outer SEQUENCE (dummy)
        Buffer.from([0x18, timeBytes.length]),
        timeBytes,
      ]);

      const result = extractTimestampFromTSR(genTime);
      expect(result).toBe("2026-02-23T21:30:00Z");
    });

    it("returns null for buffer without GeneralizedTime", () => {
      const buf = Buffer.from([0x30, 0x03, 0x02, 0x01, 0x00]);
      expect(extractTimestampFromTSR(buf)).toBeNull();
    });

    it("handles fractional seconds", () => {
      const timeStr = "20260223213000.123Z";
      const timeBytes = Buffer.from(timeStr, "ascii");
      const genTime = Buffer.concat([
        Buffer.from([0x30, 0x40]),
        Buffer.from([0x18, timeBytes.length]),
        timeBytes,
      ]);

      const result = extractTimestampFromTSR(genTime);
      expect(result).toBe("2026-02-23T21:30:00.123Z");
    });
  });

  describe("checkTSRStatus", () => {
    it("returns ok for status 0 (granted)", () => {
      // Minimal TSR structure: SEQUENCE { SEQUENCE { INTEGER 0 } }
      const tsr = Buffer.from([
        0x30, 0x05,       // outer SEQUENCE
        0x30, 0x03,       // PKIStatusInfo SEQUENCE
        0x02, 0x01, 0x00, // INTEGER 0
      ]);
      const { ok, status } = checkTSRStatus(tsr);
      expect(ok).toBe(true);
      expect(status).toBe(0);
    });

    it("returns ok for status 1 (grantedWithMods)", () => {
      const tsr = Buffer.from([
        0x30, 0x05,
        0x30, 0x03,
        0x02, 0x01, 0x01,
      ]);
      expect(checkTSRStatus(tsr).ok).toBe(true);
    });

    it("returns not ok for status 2 (rejection)", () => {
      const tsr = Buffer.from([
        0x30, 0x05,
        0x30, 0x03,
        0x02, 0x01, 0x02,
      ]);
      const { ok, status } = checkTSRStatus(tsr);
      expect(ok).toBe(false);
      expect(status).toBe(2);
    });

    it("handles malformed input", () => {
      expect(checkTSRStatus(Buffer.from([0x01]))).toEqual({ ok: false, status: -1 });
    });
  });

  describe("verifyTSAReceipt", () => {
    it("rejects receipt with mismatched hash", async () => {
      const receipt: TSAReceipt = {
        tsaUrl: "http://example.com",
        hash: "aa".repeat(32),
        timestamp: "2026-01-01T00:00:00Z",
        receipt: Buffer.from([0x30, 0x03, 0x30, 0x01, 0x00]).toString("base64"),
      };
      expect(await verifyTSAReceipt(receipt, "bb".repeat(32))).toBe(false);
    });

    it("rejects receipt with invalid base64", async () => {
      const receipt: TSAReceipt = {
        tsaUrl: "http://example.com",
        hash: "aa".repeat(32),
        timestamp: "2026-01-01T00:00:00Z",
        receipt: "not-valid!!!",
      };
      // Even though hash matches, the structural check should fail
      expect(await verifyTSAReceipt(receipt, "aa".repeat(32))).toBe(false);
    });

    it("validates a well-formed synthetic receipt", async () => {
      const hash = createHash("sha256").update("test").digest("hex");
      const hashBytes = Buffer.from(hash, "hex");
      const timeStr = "20260223213000Z";
      const timeBytes = Buffer.from(timeStr, "ascii");

      // Build a synthetic TSR with status=0, the hash, and a GeneralizedTime
      const statusInfo = Buffer.from([0x30, 0x03, 0x02, 0x01, 0x00]);
      const body = Buffer.concat([
        statusInfo,
        Buffer.from([0x30, 0x80]), // content wrapper (dummy)
        hashBytes,
        Buffer.from([0x18, timeBytes.length]),
        timeBytes,
        Buffer.from([0x00, 0x00]), // EOC for indefinite length
      ]);
      const tsr = Buffer.concat([
        Buffer.from([0x30]),
        Buffer.from([body.length]),
        body,
      ]);

      const receipt: TSAReceipt = {
        tsaUrl: "http://example.com",
        hash,
        timestamp: "2026-02-23T21:30:00Z",
        receipt: tsr.toString("base64"),
      };

      expect(await verifyTSAReceipt(receipt, hash)).toBe(true);
    });
  });

  // ─── Integration Tests (network — skip in CI) ─────────────────────────────

  describe("integration (network)", () => {
    // These tests hit FreeTSA.org — skip if TSA_SKIP_NETWORK is set
    const skipNetwork = !!process.env.TSA_SKIP_NETWORK;

    it.skipIf(skipNetwork)("requestTimestamp gets a valid receipt from FreeTSA", async () => {
      const hash = createHash("sha256").update("cellar-door-exit-test").digest("hex");
      const receipt = await requestTimestamp(hash);

      expect(receipt.tsaUrl).toBe("https://freetsa.org/tsr");
      expect(receipt.hash).toBe(hash);
      expect(receipt.receipt.length).toBeGreaterThan(0);
      expect(receipt.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(receipt.requestNonce).toBeTruthy();
    }, 30_000);

    it.skipIf(skipNetwork)("anchorWithTSA timestamps an ExitMarker", async () => {
      const { publicKey, privateKey } = generateKeyPair();
      const marker = createMarker({
        subject: "did:key:zTSATest",
        origin: "https://example.com",
        exitType: ExitType.Voluntary,
      });
      const signed = signMarker(marker, privateKey, publicKey);

      const receipt = await anchorWithTSA(signed);
      const expectedHash = computeAnchorHash(signed);

      expect(receipt.hash).toBe(expectedHash);
      expect(receipt.timestamp).toBeTruthy();
    }, 30_000);

    it.skipIf(skipNetwork)("verifyTSAReceipt validates a real receipt", async () => {
      const hash = createHash("sha256").update("verify-test").digest("hex");
      const receipt = await requestTimestamp(hash);

      expect(await verifyTSAReceipt(receipt, hash)).toBe(true);
      expect(await verifyTSAReceipt(receipt, "00".repeat(32))).toBe(false);
    }, 30_000);
  });
});
