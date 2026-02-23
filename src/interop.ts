/**
 * cellar-door-exit — Integration Helpers for Agent Frameworks
 *
 * Express-style middleware, lifecycle hooks, event emitter, and transport serialization.
 */

import { EventEmitter } from "node:events";
import type { ExitMarker } from "./types.js";
import { validateMarker } from "./validate.js";
import { verifyMarker } from "./proof.js";
import { canonicalize } from "./marker.js";

// ─── Express-style Middleware ────────────────────────────────────────────────

export interface MiddlewareRequest {
  method: string;
  path: string;
  params: Record<string, string>;
  body: unknown;
}

export interface MiddlewareResponse {
  status(code: number): MiddlewareResponse;
  json(data: unknown): void;
}

export type NextFunction = (err?: Error) => void;
export type Middleware = (req: MiddlewareRequest, res: MiddlewareResponse, next: NextFunction) => void;

export interface ExitMiddlewareOpts {
  /** Called when a new EXIT marker is posted. Return stored marker or throw. */
  onPost: (marker: ExitMarker) => Promise<ExitMarker>;
  /** Called to look up a marker by ID. */
  onGet: (id: string) => Promise<ExitMarker | null>;
  /** Base path prefix (default: "/exit"). */
  basePath?: string;
}

/**
 * Create express-style middleware that handles EXIT marker endpoints:
 * - `POST /exit` — submit a new marker (validates before storing)
 * - `GET /exit/:id` — retrieve a marker by ID
 * - `POST /exit/:id/verify` — verify a marker's signature and schema
 *
 * @param opts - Middleware configuration with `onPost`, `onGet` callbacks and optional `basePath`.
 * @returns An express-compatible middleware function.
 *
 * @example
 * ```ts
 * app.use(createExitMiddleware({
 *   onPost: async (marker) => { store.save(marker); return marker; },
 *   onGet: async (id) => store.load(id),
 *   basePath: "/api/exit",
 * }));
 * ```
 */
export function createExitMiddleware(opts: ExitMiddlewareOpts): Middleware {
  const base = opts.basePath ?? "/exit";

  return (req: MiddlewareRequest, res: MiddlewareResponse, next: NextFunction) => {
    // POST /exit
    if (req.method === "POST" && req.path === base) {
      const validation = validateMarker(req.body);
      if (!validation.valid) {
        res.status(400).json({ errors: validation.errors });
        return;
      }
      opts.onPost(req.body as ExitMarker)
        .then((m) => res.status(201).json(m))
        .catch((e: Error) => res.status(500).json({ error: e.message }));
      return;
    }

    // GET /exit/:id
    if (req.method === "GET" && req.path.startsWith(base + "/") && !req.path.endsWith("/verify")) {
      const id = req.params.id ?? req.path.slice(base.length + 1);
      opts.onGet(id)
        .then((m) => {
          if (!m) { res.status(404).json({ error: "Not found" }); return; }
          res.status(200).json(m);
        })
        .catch((e: Error) => res.status(500).json({ error: e.message }));
      return;
    }

    // POST /exit/:id/verify
    if (req.method === "POST" && req.path.endsWith("/verify")) {
      const id = req.params.id ?? req.path.slice(base.length + 1, -"/verify".length);
      opts.onGet(id)
        .then((m) => {
          if (!m) { res.status(404).json({ error: "Not found" }); return; }
          const result = verifyMarker(m);
          res.status(200).json(result);
        })
        .catch((e: Error) => res.status(500).json({ error: e.message }));
      return;
    }

    next();
  };
}

// ─── Lifecycle Hooks ─────────────────────────────────────────────────────────

export interface ExitHookCallbacks {
  beforeExit?: (marker: ExitMarker) => Promise<void> | void;
  onExit?: (marker: ExitMarker) => Promise<void> | void;
  afterExit?: (marker: ExitMarker) => Promise<void> | void;
}

export interface ExitHook {
  execute(marker: ExitMarker): Promise<void>;
}

/**
 * Create a lifecycle hook for EXIT processing.
 *
 * @param callbacks - An object with optional `beforeExit`, `onExit`, and `afterExit` callbacks.
 * @returns An {@link ExitHook} whose `execute` method runs callbacks in order.
 *
 * @example
 * ```ts
 * const hook = createExitHook({
 *   beforeExit: (m) => console.log("About to exit:", m.subject),
 *   afterExit: (m) => notifyPeers(m),
 * });
 * await hook.execute(marker);
 * ```
 */
export function createExitHook(callbacks: ExitHookCallbacks): ExitHook {
  return {
    async execute(marker: ExitMarker): Promise<void> {
      if (callbacks.beforeExit) await callbacks.beforeExit(marker);
      if (callbacks.onExit) await callbacks.onExit(marker);
      if (callbacks.afterExit) await callbacks.afterExit(marker);
    },
  };
}

// ─── Event Emitter ───────────────────────────────────────────────────────────

export type ExitEvent = "intent" | "negotiating" | "signing" | "departed";

/**
 * Event emitter for EXIT lifecycle events.
 * Emits: `'intent'`, `'negotiating'`, `'signing'`, `'departed'`
 *
 * @example
 * ```ts
 * const emitter = new ExitEventEmitter();
 * emitter.on("departed", (marker) => console.log("Departed:", marker.subject));
 * emitter.emitDeparted(signedMarker);
 * ```
 */
export class ExitEventEmitter extends EventEmitter {
  /**
   * Emit an intent event.
   * @param marker - The EXIT marker associated with the intent.
   */
  emitIntent(marker: ExitMarker): void {
    this.emit("intent", marker);
  }

  /**
   * Emit a negotiating event.
   * @param marker - The EXIT marker being negotiated.
   */
  emitNegotiating(marker: ExitMarker): void {
    this.emit("negotiating", marker);
  }

  /**
   * Emit a signing event.
   * @param marker - The EXIT marker being signed.
   */
  emitSigning(marker: ExitMarker): void {
    this.emit("signing", marker);
  }

  /**
   * Emit a departed event.
   * @param marker - The finalized EXIT marker.
   */
  emitDeparted(marker: ExitMarker): void {
    this.emit("departed", marker);
  }
}

// ─── Transport Serialization (compact binary) ───────────────────────────────

/**
 * Serialize a marker to a compact binary format for bandwidth-constrained environments.
 * Format: 4-byte length prefix (big-endian) + canonical JSON as UTF-8.
 * (A real implementation would use CBOR; this is a lightweight approximation.)
 *
 * @param marker - The EXIT marker to serialize.
 * @returns A `Buffer` with a 4-byte length header followed by the canonical JSON payload.
 *
 * @example
 * ```ts
 * const buf = serializeForTransport(marker);
 * // Send buf over the wire, then deserialize on the other end
 * ```
 */
export function serializeForTransport(marker: ExitMarker): Buffer {
  const json = canonicalize(marker);
  const payload = Buffer.from(json, "utf-8");
  const header = Buffer.alloc(4);
  header.writeUInt32BE(payload.length, 0);
  return Buffer.concat([header, payload]);
}

/**
 * Deserialize a marker from compact transport format.
 *
 * @param buffer - A `Buffer` in the format produced by {@link serializeForTransport}.
 * @returns The deserialized EXIT marker.
 * @throws {Error} If the buffer is too short or truncated.
 */
export function deserializeFromTransport(buffer: Buffer): ExitMarker {
  if (buffer.length < 4) throw new Error("Transport buffer too short");
  const length = buffer.readUInt32BE(0);
  if (buffer.length < 4 + length) throw new Error("Transport buffer truncated");
  const json = buffer.slice(4, 4 + length).toString("utf-8");
  return JSON.parse(json) as ExitMarker;
}
