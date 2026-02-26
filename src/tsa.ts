/**
 * cellar-door-exit — RFC 3161 Timestamp Authority Adapter
 *
 * Provides timestamping of EXIT markers via RFC 3161 TSA services.
 * Unlike the rest of the library, these functions are async (network I/O).
 *
 * @see https://www.rfc-editor.org/rfc/rfc3161
 */

import { randomBytes, createHash } from "node:crypto";
import { computeAnchorHash } from "./anchor.js";
import type { ExitMarker } from "./types.js";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Default TSA endpoint. */
const DEFAULT_TSA_URL = "https://freetsa.org/tsr";

/** Maximum TSA response size in bytes (1 MB). */
const MAX_TSR_SIZE = 1_048_576;

/** Default fetch timeout in milliseconds (30 seconds). */
const DEFAULT_TIMEOUT_MS = 30_000;

// ─── Types ───────────────────────────────────────────────────────────────────

/** A verifiable timestamp receipt from an RFC 3161 TSA. */
export interface TSAReceipt {
  /** The TSA URL that issued the timestamp. */
  tsaUrl: string;
  /** The hex-encoded SHA-256 hash that was timestamped. */
  hash: string;
  /** ISO 8601 timestamp extracted from the TSA response. */
  timestamp: string;
  /** Base64-encoded raw Timestamp Response (TSR). */
  receipt: string;
  /** Hex-encoded nonce used in the request (if any). */
  requestNonce?: string;
}

// ─── ASN.1 DER Helpers ──────────────────────────────────────────────────────

/** OID for SHA-256: 2.16.840.1.101.3.4.2.1 */
const SHA256_OID = Buffer.from([
  0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01,
]);

/**
 * Encode a DER length field.
 */
function derLength(len: number): Buffer {
  if (len < 0x80) return Buffer.from([len]);
  if (len < 0x100) return Buffer.from([0x81, len]);
  return Buffer.from([0x82, (len >> 8) & 0xff, len & 0xff]);
}

/**
 * Wrap content in a DER tag.
 */
function derWrap(tag: number, content: Buffer): Buffer {
  return Buffer.concat([Buffer.from([tag]), derLength(content.length), content]);
}

/**
 * Build an RFC 3161 TimeStampReq (ASN.1 DER) for a SHA-256 hash.
 *
 * Structure (simplified):
 *   SEQUENCE {
 *     INTEGER 1                          -- version
 *     SEQUENCE {                         -- messageImprint
 *       SEQUENCE {                       -- hashAlgorithm (AlgorithmIdentifier)
 *         OID sha256
 *         NULL
 *       }
 *       OCTET STRING hashValue
 *     }
 *     INTEGER nonce                      -- optional nonce
 *     BOOLEAN TRUE                       -- certReq
 *   }
 */
export function buildTimestampRequest(hashHex: string, nonce?: Buffer): Buffer {
  const hashBytes = Buffer.from(hashHex, "hex");
  if (hashBytes.length !== 32) {
    throw new Error(`Expected 32-byte SHA-256 hash, got ${hashBytes.length} bytes`);
  }

  // version INTEGER 1
  const version = derWrap(0x02, Buffer.from([0x01]));

  // AlgorithmIdentifier: SEQUENCE { OID, NULL }
  const oid = derWrap(0x06, SHA256_OID);
  const nullVal = Buffer.from([0x05, 0x00]);
  const algorithmId = derWrap(0x30, Buffer.concat([oid, nullVal]));

  // hashedMessage OCTET STRING
  const hashedMessage = derWrap(0x04, hashBytes);

  // messageImprint SEQUENCE
  const messageImprint = derWrap(0x30, Buffer.concat([algorithmId, hashedMessage]));

  // nonce INTEGER (optional but recommended)
  const nonceBytes = nonce ?? randomBytes(8);
  // Prepend 0x00 if high bit set to keep it positive
  const noncePayload = nonceBytes[0] & 0x80
    ? Buffer.concat([Buffer.from([0x00]), nonceBytes])
    : nonceBytes;
  const nonceField = derWrap(0x02, noncePayload);

  // certReq BOOLEAN TRUE
  const certReq = derWrap(0x01, Buffer.from([0xff]));

  // Top-level SEQUENCE
  return derWrap(0x30, Buffer.concat([version, messageImprint, nonceField, certReq]));
}

// ─── TSR Parsing Helpers ─────────────────────────────────────────────────────

/**
 * Extract a UTC timestamp from a raw TSR by scanning for GeneralizedTime (tag 0x18).
 * This is a lightweight heuristic — not a full ASN.1 parser.
 */
export function extractTimestampFromTSR(tsr: Buffer): string | null {
  // Look for GeneralizedTime tag (0x18) — the genTime field in TSTInfo
  for (let i = 0; i < tsr.length - 2; i++) {
    if (tsr[i] === 0x18) {
      const len = tsr[i + 1];
      if (len >= 13 && len <= 19 && i + 2 + len <= tsr.length) {
        const timeStr = tsr.subarray(i + 2, i + 2 + len).toString("ascii");
        // GeneralizedTime: YYYYMMDDHHmmSS[.fff]Z
        const match = timeStr.match(
          /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\.(\d+))?Z$/
        );
        if (match) {
          const [, y, mo, d, h, mi, s, frac] = match;
          const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}${frac ? "." + frac : ""}Z`;
          return iso;
        }
      }
    }
  }
  return null;
}

/**
 * Check the PKIStatus in a TSR (first INTEGER in the outer SEQUENCE).
 * Status 0 = granted, 1 = grantedWithMods — both OK.
 */
export function checkTSRStatus(tsr: Buffer): { ok: boolean; status: number } {
  // TSR is SEQUENCE { status PKIStatusInfo, timeStampToken ... }
  // PKIStatusInfo is SEQUENCE { status PKIStatus INTEGER, ... }
  // Walk: outer SEQUENCE -> inner SEQUENCE -> INTEGER
  try {
    let pos = 0;
    // Outer SEQUENCE
    if (tsr[pos] !== 0x30) return { ok: false, status: -1 };
    pos++; // skip tag
    if (tsr[pos] & 0x80) pos += (tsr[pos] & 0x7f) + 1; else pos++; // skip length

    // PKIStatusInfo SEQUENCE
    if (tsr[pos] !== 0x30) return { ok: false, status: -1 };
    pos++;
    if (tsr[pos] & 0x80) pos += (tsr[pos] & 0x7f) + 1; else pos++;

    // PKIStatus INTEGER
    if (tsr[pos] !== 0x02) return { ok: false, status: -1 };
    pos++;
    const intLen = tsr[pos]; pos++;
    let status = 0;
    for (let j = 0; j < intLen; j++) {
      status = (status << 8) | tsr[pos + j];
    }
    return { ok: status <= 1, status };
  } catch {
    return { ok: false, status: -1 };
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Request an RFC 3161 timestamp for a hex-encoded SHA-256 hash.
 *
 * This function makes a network call to a TSA server.
 *
 * @param hash - Hex-encoded SHA-256 hash to timestamp.
 * @param tsaUrl - TSA endpoint URL (defaults to FreeTSA.org).
 * @returns A TSAReceipt containing the verifiable timestamp.
 *
 * @example
 * ```ts
 * const receipt = await requestTimestamp("a1b2c3...");
 * console.log(receipt.timestamp); // "2026-02-23T21:30:00Z"
 * ```
 */
export async function requestTimestamp(
  hash: string,
  tsaUrl: string = DEFAULT_TSA_URL
): Promise<TSAReceipt> {
  const nonce = randomBytes(8);
  const reqDer = buildTimestampRequest(hash, nonce);

  const response = await fetch(tsaUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/timestamp-query",
    },
    body: reqDer,
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`TSA request failed: HTTP ${response.status} ${response.statusText}`);
  }

  // H4: Guard against oversized responses
  const contentLength = response.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_TSR_SIZE) {
    throw new Error(`TSA response too large: ${contentLength} bytes (max ${MAX_TSR_SIZE})`);
  }

  const arrayBuf = await response.arrayBuffer();
  if (arrayBuf.byteLength > MAX_TSR_SIZE) {
    throw new Error(`TSA response too large: ${arrayBuf.byteLength} bytes (max ${MAX_TSR_SIZE})`);
  }
  const tsrBuffer = Buffer.from(arrayBuf);

  // Validate status
  const { ok, status } = checkTSRStatus(tsrBuffer);
  if (!ok) {
    throw new Error(`TSA returned error status: ${status}`);
  }

  // Extract timestamp
  const timestamp = extractTimestampFromTSR(tsrBuffer) ?? new Date().toISOString();

  return {
    tsaUrl,
    hash,
    timestamp,
    receipt: tsrBuffer.toString("base64"),
    requestNonce: nonce.toString("hex"),
  };
}

/**
 * Anchor an ExitMarker with an RFC 3161 timestamp.
 *
 * Computes the anchor hash of the marker, then requests a timestamp from the TSA.
 *
 * @param marker - The EXIT marker to timestamp.
 * @param tsaUrl - TSA endpoint URL (defaults to FreeTSA.org).
 * @returns A TSAReceipt for the marker's anchor hash.
 *
 * @example
 * ```ts
 * const receipt = await anchorWithTSA(marker);
 * console.log(receipt.hash); // SHA-256 of the marker
 * ```
 */
export async function anchorWithTSA(
  marker: ExitMarker,
  tsaUrl?: string
): Promise<TSAReceipt> {
  const hash = computeAnchorHash(marker);
  return requestTimestamp(hash, tsaUrl);
}

/**
 * **⚠️ STRUCTURAL CHECK ONLY — NOT CRYPTOGRAPHIC VERIFICATION.**
 *
 * Checks that a TSA receipt structurally contains the expected hash,
 * has valid ASN.1 framing, and a parseable timestamp. This function
 * does **NOT** verify the TSA's cryptographic signature. A forged or
 * tampered TSR that embeds the correct hash bytes will pass this check.
 *
 * **Do NOT rely on this for trust or security decisions.** For real
 * cryptographic verification, use `openssl ts -verify` with the TSA's
 * certificate chain, or a proper ASN.1/PKCS library.
 *
 * @param receipt - The TSAReceipt to check.
 * @param hash - The expected hex-encoded SHA-256 hash.
 * @returns `true` if the receipt structurally matches the hash.
 *
 * @example
 * ```ts
 * // Structural plausibility check only — not proof of authenticity
 * const plausible = await verifyTSAReceipt(receipt, expectedHash);
 * ```
 */
export async function verifyTSAReceipt(
  receipt: TSAReceipt,
  hash: string
): Promise<boolean> {
  // 1. Hash must match
  if (receipt.hash !== hash) return false;

  // 2. Receipt must be valid base64
  let tsrBuffer: Buffer;
  try {
    tsrBuffer = Buffer.from(receipt.receipt, "base64");
  } catch {
    return false;
  }

  // 3. Must be a valid ASN.1 SEQUENCE
  if (tsrBuffer.length < 4 || tsrBuffer[0] !== 0x30) return false;

  // 4. Status must be OK
  const { ok } = checkTSRStatus(tsrBuffer);
  if (!ok) return false;

  // 5. The hash should appear in the TSR body (messageImprint echo)
  const hashBytes = Buffer.from(hash, "hex");
  const hashPresent = tsrBuffer.includes(hashBytes);
  if (!hashPresent) return false;

  // 6. Timestamp should be parseable
  const ts = extractTimestampFromTSR(tsrBuffer);
  if (!ts) return false;

  return true;
}
