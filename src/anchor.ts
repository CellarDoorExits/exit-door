/**
 * cellar-door-exit — Chain Anchoring Utilities
 *
 * Prepares data for on-chain anchoring. No actual chain interaction —
 * just the minimal hash marks a ledger needs.
 */

import { sha256 } from "@noble/hashes/sha256";
import { canonicalize } from "./marker.js";
import { EXIT_SPEC_VERSION, type ExitMarker } from "./types.js";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Minimal anchor: hash, timestamp, and spec version. GDPR-safe — no personal data. */
export interface MinimalAnchorRecord {
  hash: string;
  timestamp: string;
  specVersion: string;
}

/**
 * Standard anchor: hash + public metadata including subject DID.
 * @deprecated Use {@link MinimalAnchorRecord} instead to avoid anchoring personal data.
 * This type will be removed in a future major version.
 */
export interface AnchorRecord extends MinimalAnchorRecord {
  exitType: string;
  subjectDid: string;
}

// ─── Functions ───────────────────────────────────────────────────────────────

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Compute a SHA-256 hash of the full marker suitable for on-chain posting.
 *
 * @param marker - The EXIT marker to hash.
 * @returns Hex-encoded SHA-256 hash of the canonicalized marker.
 *
 * @example
 * ```ts
 * const hash = computeAnchorHash(marker);
 * console.log(hash); // "a1b2c3..."
 * ```
 */
export function computeAnchorHash(marker: ExitMarker): string {
  const canonical = canonicalize(marker);
  return toHex(sha256(new TextEncoder().encode(canonical)));
}

/**
 * Create an anchor record.
 *
 * @param marker - The EXIT marker to create an anchor record for.
 * @param options - Options. Set `minimal: false` to include subject DID and exit type.
 * @returns A minimal or standard anchor record.
 *
 * @example
 * ```ts
 * const record = createAnchorRecord(marker); // MinimalAnchorRecord (default)
 * const full = createAnchorRecord(marker, { minimal: false }); // AnchorRecord
 * ```
 */
export function createAnchorRecord(marker: ExitMarker, options?: { minimal?: boolean }): MinimalAnchorRecord;
export function createAnchorRecord(marker: ExitMarker, options: { minimal: false }): AnchorRecord;
export function createAnchorRecord(marker: ExitMarker, options?: { minimal?: boolean }): MinimalAnchorRecord | AnchorRecord {
  const minimal = options?.minimal ?? true;
  const base: MinimalAnchorRecord = {
    hash: computeAnchorHash(marker),
    timestamp: marker.timestamp,
    specVersion: EXIT_SPEC_VERSION,
  };
  if (!minimal) {
    return {
      ...base,
      exitType: marker.exitType,
      subjectDid: marker.subject,
    } as AnchorRecord;
  }
  return base;
}

/**
 * Verify that an anchor record matches a given marker.
 *
 * @param record - The anchor record to verify (minimal or standard).
 * @param marker - The EXIT marker to verify against.
 * @returns `true` if the record's hash (and optional metadata) matches the marker.
 *
 * @example
 * ```ts
 * const record = createAnchorRecord(marker);
 * const valid = verifyAnchorRecord(record, marker); // true
 * ```
 */
export function verifyAnchorRecord(record: MinimalAnchorRecord | AnchorRecord, marker: ExitMarker): boolean {
  const computed = computeAnchorHash(marker);
  if (record.hash !== computed) return false;
  if ("exitType" in record && record.exitType !== marker.exitType) return false;
  if ("subjectDid" in record && record.subjectDid !== marker.subject) return false;
  return true;
}

/**
 * Create the absolute bare minimum anchor: just hash + timestamp.
 *
 * @param marker - The EXIT marker to create a minimal anchor for.
 * @returns A minimal anchor record containing only the hash and timestamp.
 *
 * @example
 * ```ts
 * const anchor = createMinimalAnchor(marker);
 * // anchor.hash, anchor.timestamp
 * ```
 */
export function createMinimalAnchor(marker: ExitMarker): MinimalAnchorRecord {
  return {
    hash: computeAnchorHash(marker),
    timestamp: marker.timestamp,
    specVersion: EXIT_SPEC_VERSION,
  };
}
