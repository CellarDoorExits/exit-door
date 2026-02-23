/**
 * cellar-door-exit — Chain Anchoring Utilities
 *
 * Prepares data for on-chain anchoring. No actual chain interaction —
 * just the minimal hash marks a ledger needs.
 */

import { sha256 } from "@noble/hashes/sha256";
import { canonicalize } from "./marker.js";
import type { ExitMarker } from "./types.js";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Minimal anchor: just a hash and timestamp. The absolute bare minimum for a ledger. */
export interface MinimalAnchorRecord {
  hash: string;
  timestamp: string;
}

/** Standard anchor: hash + minimal public metadata. */
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
 * Create a standard anchor record with minimal public metadata.
 *
 * @param marker - The EXIT marker to create an anchor record for.
 * @returns An anchor record containing the hash, timestamp, exit type, and subject DID.
 *
 * @example
 * ```ts
 * const record = createAnchorRecord(marker);
 * // record.hash, record.timestamp, record.exitType, record.subjectDid
 * ```
 */
export function createAnchorRecord(marker: ExitMarker): AnchorRecord {
  return {
    hash: computeAnchorHash(marker),
    timestamp: marker.timestamp,
    exitType: marker.exitType,
    subjectDid: marker.subject,
  };
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
  };
}
