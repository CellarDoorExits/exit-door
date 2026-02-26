/**
 * Telemetry tests — verifies spans are emitted correctly
 * and no-op mode has zero overhead.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  initTelemetry,
  resetTelemetry,
  withSpan,
  withSpanAsync,
  startExitSpan,
  instrumentedSignMarker,
  instrumentedVerifyMarker,
  startCeremonySpan,
} from "../telemetry.js";
import type { Tracer, Span, SpanOptions } from "../telemetry.js";
import { generateKeyPair, didFromPublicKey } from "../crypto.js";
import { signMarker } from "../proof.js";
import type { ExitMarker } from "../types.js";

// ─── Mock Tracer ─────────────────────────────────────────────────────────────

interface SpanRecord {
  name: string;
  attributes: Record<string, string | number | boolean>;
  status?: { code: number; message?: string };
  ended: boolean;
}

function createMockTracer(): { tracer: Tracer; spans: SpanRecord[] } {
  const spans: SpanRecord[] = [];

  const tracer: Tracer = {
    startSpan(name: string, options?: SpanOptions): Span {
      const record: SpanRecord = {
        name,
        attributes: { ...(options?.attributes ?? {}) },
        ended: false,
      };
      spans.push(record);

      return {
        setAttribute(key: string, value: string | number | boolean) {
          record.attributes[key] = value;
        },
        setStatus(status: { code: number; message?: string }) {
          record.status = status;
        },
        end() {
          record.ended = true;
        },
      };
    },
  };

  return { tracer, spans };
}

function makeTestMarker(): { marker: ExitMarker; privateKey: Uint8Array; publicKey: Uint8Array } {
  const { publicKey, privateKey } = generateKeyPair();
  const did = didFromPublicKey(publicKey);
  const marker: ExitMarker = {
    "@context": "https://cellar-door.dev/exit/v1",
    specVersion: "1.1",
    id: `urn:exit:tel-test-${Date.now()}`,
    subject: did,
    origin: "https://platform.example.com",
    timestamp: new Date().toISOString(),
    exitType: "voluntary" as any,
    status: "good_standing" as any,
    selfAttested: true,
    proof: { type: "Ed25519Signature2020", created: "", verificationMethod: "", proofValue: "" },
  };
  return { marker, privateKey, publicKey };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Telemetry", () => {
  beforeEach(() => {
    resetTelemetry();
  });

  describe("No-op mode", () => {
    it("works without initialization", () => {
      const span = startExitSpan("test");
      span.setAttribute("key", "value");
      span.setStatus({ code: 1 });
      span.end();
      // No errors = success
    });

    it("withSpan works in no-op mode", () => {
      const result = withSpan("test", { x: 1 }, () => 42);
      expect(result).toBe(42);
    });

    it("withSpanAsync works in no-op mode", async () => {
      const result = await withSpanAsync("test", { x: 1 }, async () => 42);
      expect(result).toBe(42);
    });
  });

  describe("With mock tracer", () => {
    it("records spans with correct names and attributes", () => {
      const { tracer, spans } = createMockTracer();
      initTelemetry({ tracer });

      const span = startExitSpan("test.op", { custom: "value" });
      span.end();

      expect(spans).toHaveLength(1);
      expect(spans[0].name).toBe("cellar-door.test.op");
      expect(spans[0].attributes.custom).toBe("value");
      expect(spans[0].attributes["cellar_door.version"]).toBe("0.2.0");
      expect(spans[0].ended).toBe(true);
    });

    it("withSpan records success status", () => {
      const { tracer, spans } = createMockTracer();
      initTelemetry({ tracer });

      withSpan("op", {}, () => "ok");

      expect(spans[0].status?.code).toBe(1); // OK
    });

    it("withSpan records error status on throw", () => {
      const { tracer, spans } = createMockTracer();
      initTelemetry({ tracer });

      expect(() => withSpan("op", {}, () => { throw new Error("boom"); })).toThrow("boom");
      expect(spans[0].status?.code).toBe(2); // ERROR
      expect(spans[0].status?.message).toBe("boom");
      expect(spans[0].ended).toBe(true);
    });

    it("withSpanAsync records success", async () => {
      const { tracer, spans } = createMockTracer();
      initTelemetry({ tracer });

      await withSpanAsync("async.op", { mode: "async" }, async () => "done");

      expect(spans[0].status?.code).toBe(1);
      expect(spans[0].attributes.mode).toBe("async");
    });

    it("withSpanAsync records error on rejection", async () => {
      const { tracer, spans } = createMockTracer();
      initTelemetry({ tracer });

      await expect(
        withSpanAsync("async.op", {}, async () => { throw new Error("async boom"); })
      ).rejects.toThrow("async boom");

      expect(spans[0].status?.code).toBe(2);
    });
  });

  describe("Instrumented operations", () => {
    it("instrumentedSignMarker emits sign span", () => {
      const { tracer, spans } = createMockTracer();
      initTelemetry({ tracer });

      const { marker, privateKey, publicKey } = makeTestMarker();
      const signed = instrumentedSignMarker(marker, privateKey, publicKey);

      expect(signed.proof.proofValue).toBeTruthy();
      const signSpan = spans.find(s => s.name === "cellar-door.sign");
      expect(signSpan).toBeDefined();
      expect(signSpan!.attributes["cellar_door.operation"]).toBe("sign");
      expect(signSpan!.attributes["cellar_door.algorithm"]).toBe("Ed25519Signature2020");
      expect(signSpan!.ended).toBe(true);
    });

    it("instrumentedVerifyMarker emits verify span", () => {
      const { tracer, spans } = createMockTracer();
      initTelemetry({ tracer });

      const { marker, privateKey, publicKey } = makeTestMarker();
      const signed = signMarker(marker, privateKey, publicKey);
      const result = instrumentedVerifyMarker(signed);

      expect(result.valid).toBe(true);
      const verifySpan = spans.find(s => s.name === "cellar-door.verify");
      expect(verifySpan).toBeDefined();
      expect(verifySpan!.attributes["cellar_door.operation"]).toBe("verify");
    });

    it("respects includeMarkerIds config", () => {
      const { tracer, spans } = createMockTracer();
      initTelemetry({ tracer, includeMarkerIds: true });

      const { marker, privateKey, publicKey } = makeTestMarker();
      instrumentedSignMarker(marker, privateKey, publicKey);

      const signSpan = spans.find(s => s.name === "cellar-door.sign");
      expect(signSpan!.attributes["cellar_door.marker_id"]).toBe(marker.id);
    });

    it("excludes marker IDs by default", () => {
      const { tracer, spans } = createMockTracer();
      initTelemetry({ tracer });

      const { marker, privateKey, publicKey } = makeTestMarker();
      instrumentedSignMarker(marker, privateKey, publicKey);

      const signSpan = spans.find(s => s.name === "cellar-door.sign");
      expect(signSpan!.attributes["cellar_door.marker_id"]).toBeUndefined();
    });

    it("startCeremonySpan records ceremony attributes", () => {
      const { tracer, spans } = createMockTracer();
      initTelemetry({ tracer, includeSubjects: true });

      const span = startCeremonySpan("did:key:z6Mk...", "https://origin.com", "voluntary");
      span.end();

      expect(spans[0].attributes["cellar_door.operation"]).toBe("ceremony");
      expect(spans[0].attributes["cellar_door.exit_type"]).toBe("voluntary");
      expect(spans[0].attributes["cellar_door.subject"]).toBe("did:key:z6Mk...");
    });
  });

  describe("Reset", () => {
    it("resetTelemetry returns to no-op", () => {
      const { tracer, spans } = createMockTracer();
      initTelemetry({ tracer });

      startExitSpan("before").end();
      expect(spans).toHaveLength(1);

      resetTelemetry();

      startExitSpan("after").end();
      // No new spans recorded after reset
      expect(spans).toHaveLength(1);
    });
  });
});
