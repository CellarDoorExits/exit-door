/**
 * cellar-door-exit — OpenTelemetry Integration
 *
 * Optional observability for EXIT operations. Import and configure
 * to get spans for sign, verify, and ceremony operations.
 *
 * Uses the OpenTelemetry API package (peer dependency) so users
 * bring their own SDK and exporters. If no SDK is configured,
 * all operations are no-ops (zero overhead).
 *
 * @example
 * ```ts
 * import { initTelemetry } from "cellar-door-exit";
 *
 * // With OpenTelemetry SDK configured:
 * initTelemetry(); // starts emitting spans
 *
 * // Or with custom tracer:
 * import { trace } from "@opentelemetry/api";
 * initTelemetry({ tracer: trace.getTracer("my-app") });
 * ```
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** Minimal tracer interface compatible with OpenTelemetry API. */
export interface Tracer {
  startSpan(name: string, options?: SpanOptions): Span;
}

/** Package version — keep in sync with package.json */
const PACKAGE_VERSION = "0.2.0";

export interface SpanOptions {
  attributes?: Record<string, string | number | boolean>;
}

export interface Span {
  setAttribute(key: string, value: string | number | boolean): void;
  setStatus(status: { code: number; message?: string }): void;
  end(): void;
}

export interface TelemetryConfig {
  /** Custom tracer instance. If not provided, uses a no-op tracer. */
  tracer?: Tracer;
  /** Whether to include marker IDs in span attributes (may be PII). Default: false. */
  includeMarkerIds?: boolean;
  /** Whether to include subject DIDs in span attributes. Default: false. */
  includeSubjects?: boolean;
}

// ─── No-Op Defaults ──────────────────────────────────────────────────────────

const noopSpan: Span = {
  setAttribute() {},
  setStatus() {},
  end() {},
};

const noopTracer: Tracer = {
  startSpan() { return noopSpan; },
};

// ─── Global State ────────────────────────────────────────────────────────────

let _tracer: Tracer = noopTracer;
let _config: TelemetryConfig = {};

/**
 * Initialize telemetry for cellar-door-exit.
 *
 * If no tracer is provided and `@opentelemetry/api` is available,
 * attempts to create a tracer from the global provider. Otherwise
 * uses a no-op tracer (zero overhead).
 */
export function initTelemetry(config?: TelemetryConfig): void {
  _config = config ?? {};
  if (config?.tracer) {
    _tracer = config.tracer;
  } else {
    // Try to load OpenTelemetry API
    try {
      // Dynamic import to avoid hard dependency
      const otelApi = require("@opentelemetry/api");
      _tracer = otelApi.trace.getTracer("cellar-door-exit", PACKAGE_VERSION);
    } catch {
      _tracer = noopTracer;
    }
  }
}

/**
 * Reset telemetry to no-op state. Useful for testing.
 */
export function resetTelemetry(): void {
  _tracer = noopTracer;
  _config = {};
}

// ─── Span Helpers ────────────────────────────────────────────────────────────

/** Span status codes (matching OpenTelemetry). */
const SpanStatusCode = { UNSET: 0, OK: 1, ERROR: 2 } as const;

/**
 * Start a span for an EXIT operation.
 * Returns the span — caller must call .end() when done.
 */
export function startExitSpan(
  name: string,
  attrs?: Record<string, string | number | boolean>
): Span {
  return _tracer.startSpan(`cellar-door.${name}`, {
    attributes: {
      "cellar_door.version": PACKAGE_VERSION,
      ...attrs,
    },
  });
}

/**
 * Wrap a synchronous function with a telemetry span.
 */
export function withSpan<T>(
  name: string,
  attrs: Record<string, string | number | boolean>,
  fn: () => T
): T {
  const span = startExitSpan(name, attrs);
  try {
    const result = fn();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (err) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
    throw err;
  } finally {
    span.end();
  }
}

/**
 * Wrap an async function with a telemetry span.
 */
export async function withSpanAsync<T>(
  name: string,
  attrs: Record<string, string | number | boolean>,
  fn: () => Promise<T>
): Promise<T> {
  const span = startExitSpan(name, attrs);
  try {
    const result = await fn();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (err) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
    throw err;
  } finally {
    span.end();
  }
}

// ─── Pre-Built Instrumented Wrappers ─────────────────────────────────────────

import { signMarker as _signMarker, verifyMarker as _verifyMarker } from "./proof.js";
import type { ExitMarker } from "./types.js";
import type { VerificationResult } from "./proof.js";

/**
 * Instrumented signMarker — emits a `cellar-door.sign` span.
 */
export function instrumentedSignMarker(
  marker: ExitMarker,
  privateKey: Uint8Array,
  publicKey: Uint8Array
): ExitMarker {
  const attrs: Record<string, string | number | boolean> = {
    "cellar_door.operation": "sign",
    "cellar_door.exit_type": marker.exitType,
    "cellar_door.algorithm": marker.proof?.type ?? "Ed25519Signature2020",
  };
  if (_config.includeMarkerIds && marker.id) attrs["cellar_door.marker_id"] = marker.id;
  if (_config.includeSubjects && marker.subject) attrs["cellar_door.subject"] = marker.subject;

  return withSpan("sign", attrs, () => _signMarker(marker, privateKey, publicKey));
}

/**
 * Instrumented verifyMarker — emits a `cellar-door.verify` span.
 */
export function instrumentedVerifyMarker(marker: ExitMarker): VerificationResult {
  const attrs: Record<string, string | number | boolean> = {
    "cellar_door.operation": "verify",
    "cellar_door.proof_type": marker.proof?.type ?? "unknown",
  };
  if (_config.includeMarkerIds && marker.id) attrs["cellar_door.marker_id"] = marker.id;

  return withSpan("verify", attrs, () => {
    const result = _verifyMarker(marker);
    // Record validation result
    const span = startExitSpan("verify.result", {
      "cellar_door.valid": result.valid,
      "cellar_door.error_count": result.errors.length,
    });
    span.end();
    return result;
  });
}

// ─── Ceremony Span Helpers ───────────────────────────────────────────────────

/**
 * Start a ceremony span (long-running, may encompass multiple sub-operations).
 */
export function startCeremonySpan(
  subject: string,
  origin: string,
  exitType: string
): Span {
  const attrs: Record<string, string | number | boolean> = {
    "cellar_door.operation": "ceremony",
    "cellar_door.exit_type": exitType,
  };
  if (_config.includeSubjects) attrs["cellar_door.subject"] = subject;
  attrs["cellar_door.origin"] = origin;

  return startExitSpan("ceremony", attrs);
}

// ─── Passage API Aliases (v0.2.0) ────────────────────────────────────────────

/** Passage-named alias for instrumentedSignMarker */
export const instrumentedSignDepartureMarker = instrumentedSignMarker;

/** Passage-named alias for instrumentedVerifyMarker */
export const instrumentedVerifyDeparture = instrumentedVerifyMarker;
