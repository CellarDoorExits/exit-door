/**
 * cellar-door-exit — Marker Creation and Manipulation
 */

import { sha256 } from "@noble/hashes/sha256";
import {
  type ExitMarker,
  type DataIntegrityProof,
  type ModuleA,
  type ModuleB,
  type ModuleC,
  type ModuleD,
  type ModuleE,
  type ModuleF,
  ExitType,
  ExitStatus,
  EXIT_CONTEXT_V1,
  EXIT_SPEC_VERSION,
} from "./types.js";
import { ValidationError } from "./errors.js";

export interface CreateMarkerOpts {
  subject: string;
  origin: string;
  exitType: ExitType;
  status?: ExitStatus;
  timestamp?: string;
  id?: string;
  proof?: DataIntegrityProof;
  selfAttested?: boolean;
  emergencyJustification?: string;
}

const EMPTY_PROOF: DataIntegrityProof = {
  type: "Ed25519Signature2020",
  created: "",
  verificationMethod: "",
  proofValue: "",
};

/**
 * Create an ExitMarker with sensible defaults. Validates inputs eagerly.
 *
 * @param opts - Options for creating the marker including subject, origin, exitType, and optional overrides.
 * @returns A new unsigned EXIT marker with a content-addressed ID.
 * @throws {ValidationError} If required fields are missing or invalid.
 *
 * @example
 * ```ts
 * const marker = createMarker({
 *   subject: "did:key:z6Mk...",
 *   origin: "https://platform.example.com",
 *   exitType: ExitType.Voluntary,
 * });
 * ```
 */
export function createMarker(opts: CreateMarkerOpts): ExitMarker {
  // Input validation — fail fast
  const errors: string[] = [];
  if (!opts.subject || typeof opts.subject !== "string") errors.push("subject is required and must be a non-empty string");
  if (!opts.origin || typeof opts.origin !== "string") errors.push("origin is required and must be a non-empty string");
  if (!Object.values(ExitType).includes(opts.exitType)) errors.push(`exitType must be one of: ${Object.values(ExitType).join(", ")}`);
  if (opts.exitType === ExitType.Emergency && (!opts.emergencyJustification || typeof opts.emergencyJustification !== "string")) {
    errors.push("emergencyJustification is required when exitType is 'emergency'");
  }
  if (errors.length > 0) throw new ValidationError(errors);

  const timestamp = opts.timestamp ?? new Date().toISOString();
  const marker: ExitMarker = {
    "@context": EXIT_CONTEXT_V1,
    specVersion: EXIT_SPEC_VERSION,
    id: opts.id ?? "",
    subject: opts.subject,
    origin: opts.origin,
    timestamp,
    exitType: opts.exitType,
    status: opts.status ?? defaultStatus(opts.exitType),
    proof: opts.proof ?? { ...EMPTY_PROOF, created: timestamp },
    selfAttested: opts.selfAttested ?? true,
  };

  if (opts.emergencyJustification) {
    marker.emergencyJustification = opts.emergencyJustification;
  }

  // Auto-populate expires if not provided (§8.5 mandatory sunset)
  if (!marker.expires) {
    const defaultDays = opts.exitType === ExitType.Voluntary ? 730 : 365;
    const expiresDate = new Date(new Date(timestamp).getTime() + defaultDays * 86_400_000);
    marker.expires = expiresDate.toISOString();
  }

  // Compute content-addressed ID if not provided
  if (!marker.id) {
    marker.id = `urn:exit:${computeId(marker)}`;
  }

  return marker;
}

function defaultStatus(exitType: ExitType): ExitStatus {
  switch (exitType) {
    case ExitType.Voluntary:
      return ExitStatus.GoodStanding;
    case ExitType.Forced:
    case ExitType.Directed:
    case ExitType.Constructive:
      return ExitStatus.Disputed;
    case ExitType.Emergency:
    case ExitType.KeyCompromise:
    case ExitType.PlatformShutdown:
    case ExitType.Acquisition:
      return ExitStatus.Unverified;
    default:
      return ExitStatus.Unverified;
  }
}

/**
 * Deterministic JSON string with sorted keys (recursive).
 *
 * @param obj - The value to canonicalize.
 * @returns A deterministic JSON string with lexicographically sorted keys at every level.
 */
export function canonicalize(obj: unknown): string {
  if (obj === null || obj === undefined) return JSON.stringify(obj);
  if (typeof obj === "string") return JSON.stringify(obj.normalize("NFC"));
  if (typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return "[" + obj.map((v) => canonicalize(v)).join(",") + "]";
  }
  const sorted = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = sorted.map(
    (k) => `${JSON.stringify(k)}:${canonicalize((obj as Record<string, unknown>)[k])}`
  );
  return "{" + pairs.join(",") + "}";
}

/**
 * Compute a content-addressed SHA-256 hex hash of a marker (excluding proof and id).
 *
 * @param marker - The EXIT marker to hash.
 * @returns Hex-encoded SHA-256 hash suitable for use as a content-addressed ID.
 */
export function computeId(marker: ExitMarker): string {
  // Hash everything except proof and id for content-addressing
  const { proof: _proof, id: _id, ...rest } = marker;
  const canonical = canonicalize(rest);
  const hash = sha256(new TextEncoder().encode(canonical));
  return Array.from(hash)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type ModuleKey = "lineage" | "stateSnapshot" | "dispute" | "economic" | "metadata" | "crossDomain";
type ModuleType = ModuleA | ModuleB | ModuleC | ModuleD | ModuleE | ModuleF;

/**
 * Return a new marker with a module attached. Does not mutate the original.
 *
 * @param marker - The EXIT marker to attach the module to.
 * @param key - The module slot name (`"lineage"`, `"stateSnapshot"`, `"dispute"`, `"economic"`, `"metadata"`, or `"crossDomain"`).
 * @param module - The module data to attach.
 * @returns A new EXIT marker with the module set.
 *
 * @example
 * ```ts
 * const withMeta = addModule(marker, "metadata", { reason: "Moving on" });
 * ```
 */
export function addModule(
  marker: ExitMarker,
  key: ModuleKey,
  module: ModuleType
): ExitMarker {
  return { ...marker, [key]: module };
}
