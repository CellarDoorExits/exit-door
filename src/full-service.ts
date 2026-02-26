/**
 * cellar-door-exit — Full Service Convenience Wrapper
 *
 * Combines identity generation, marker creation, signing, anchoring,
 * and optional TSA timestamping / git ledger / visual output into
 * a single async call. Optional modules (tsa, git-ledger, visual)
 * are loaded dynamically so the core flow works without them.
 */

import { quickExit, quickVerify, fromJSON, type Identity, type QuickExitOpts, generateIdentity } from "./convenience.js";
import { computeAnchorHash, verifyAnchorRecord } from "./anchor.js";
import { verifyMarker } from "./proof.js";
import type { ExitMarker } from "./types.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AnchorConfig {
  /** RFC 3161 timestamp authority config. */
  tsa?: { url?: string };
  /** Git-based ledger config. */
  git?: { repoPath: string; branch?: string; autoPush?: boolean };
  // Future: ipfs, ethereum, arweave
}

/** Public-only identity (private key redacted). */
export interface PublicIdentity {
  did: string;
  publicKey: Uint8Array;
}

export interface FullExitResult {
  marker: ExitMarker;
  /** Public identity by default. Use `includePrivateKey` option to get full identity. */
  identity: PublicIdentity | Identity;
  anchorHash: string;
  tsaReceipt?: any;
  ledgerEntry?: any;
  visual?: string;
}

export type FullExitOpts = QuickExitOpts & {
  anchor?: AnchorConfig;
  visual?: boolean;
  /**
   * If true, the returned identity includes the Ed25519 private key.
   * **Security warning:** Only enable when the caller needs to sign
   * additional data. The private key will appear in any serialization
   * (logging, JSON, network transfer) of the result object.
   * @default false
   */
  includePrivateKey?: boolean;
};

/** Trust levels for verification assessment. */
export type TrustLevel = "high" | "medium" | "low" | "none";

export interface VerifyResult {
  valid: boolean;
  trustLevel: TrustLevel;
  anchorHash: string;
  signatureValid: boolean;
  /** Structural plausibility check only — does NOT verify TSA cryptographic signature. Do not use for trust decisions. */
  tsaStructuralMatch?: boolean;
  ledgerVerified?: boolean;
  reasons: string[];
}

// ─── Dynamic Loaders ─────────────────────────────────────────────────────────

async function tryTsaTimestamp(
  anchorHash: string,
  url?: string,
): Promise<any | undefined> {
  try {
    const tsa = await import("./tsa.js");
    if (typeof tsa.requestTimestamp === "function") {
      return await tsa.requestTimestamp(anchorHash, url);
    }
  } catch {
    // tsa module not available yet — that's fine
  }
  return undefined;
}

async function tryGitLedger(
  marker: ExitMarker,
  anchorHash: string,
  config: NonNullable<AnchorConfig["git"]>,
): Promise<any | undefined> {
  try {
    const ledger = await import("./git-ledger.js");
    if (typeof ledger.appendEntry === "function") {
      return await ledger.appendEntry(marker, anchorHash, config);
    }
  } catch {
    // git-ledger module not available yet — that's fine
  }
  return undefined;
}

async function tryVisual(marker: ExitMarker): Promise<string | undefined> {
  try {
    const vis = await import("./visual.js");
    if (typeof vis.renderDoor === "function") {
      return vis.renderDoor(marker);
    }
  } catch {
    // visual module not available yet — that's fine
  }
  return undefined;
}

async function tryVerifyTsa(receipt: any): Promise<boolean | undefined> {
  try {
    const tsa = await import("./tsa.js");
    if (typeof tsa.verifyTimestamp === "function") {
      return await tsa.verifyTimestamp(receipt);
    }
  } catch {
    // tsa module not available yet
  }
  return undefined;
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Full-service EXIT: generate identity, create & sign marker, compute anchor
 * hash, and optionally timestamp via TSA, record in git ledger, and render
 * ASCII visual — all in one async call.
 *
 * Core flow (identity + marker + sign + anchor hash) works immediately.
 * TSA, git ledger, and visual are progressive enhancements that gracefully
 * degrade if their modules aren't available yet.
 *
 * @param origin - The platform/system being exited
 * @param opts - Quick exit options plus anchor config and visual flag
 * @returns Full result with marker, identity, anchor hash, and optional extras
 *
 * @example
 * ```ts
 * const result = await departAndAnchor("twitter.com", {
 *   reason: "Moving to Bluesky",
 *   anchor: { tsa: {} },
 *   visual: true,
 * });
 * console.log(result.anchorHash);
 * ```
 */
export async function departAndAnchor(
  origin: string,
  opts?: FullExitOpts,
): Promise<FullExitResult> {
  // Core flow — always works
  const { marker, identity } = quickExit(origin, opts);
  const anchorHash = computeAnchorHash(marker);

  // M5: Redact private key unless explicitly requested
  const safeIdentity: PublicIdentity | Identity = opts?.includePrivateKey
    ? identity
    : { did: identity.did, publicKey: identity.publicKey };

  const result: FullExitResult = { marker, identity: safeIdentity, anchorHash };

  // Progressive enhancements — run in parallel
  const promises: Promise<void>[] = [];

  if (opts?.anchor?.tsa) {
    promises.push(
      tryTsaTimestamp(anchorHash, opts.anchor.tsa.url).then((receipt) => {
        if (receipt) result.tsaReceipt = receipt;
      }),
    );
  }

  if (opts?.anchor?.git) {
    promises.push(
      tryGitLedger(marker, anchorHash, opts.anchor.git).then((entry) => {
        if (entry) result.ledgerEntry = entry;
      }),
    );
  }

  if (opts?.visual) {
    promises.push(
      tryVisual(marker).then((art) => {
        if (art) result.visual = art;
      }),
    );
  }

  await Promise.all(promises);

  return result;
}

/**
 * Entry-side counterpart: take a marker (as JSON string or object), verify
 * its signature, check optional TSA receipt, and return a trust assessment.
 *
 * @param markerInput - JSON string or ExitMarker object
 * @param tsaReceipt - Optional TSA receipt to verify
 * @returns Trust assessment with verification details
 *
 * @example
 * ```ts
 * const result = await departAndVerify(markerJson);
 * if (result.valid && result.trustLevel === "high") {
 *   // accept the identity
 * }
 * ```
 */
export async function departAndVerify(
  markerInput: string | ExitMarker,
  tsaReceipt?: any,
): Promise<VerifyResult> {
  const reasons: string[] = [];
  let marker: ExitMarker;

  // Parse if string
  if (typeof markerInput === "string") {
    try {
      marker = fromJSON(markerInput);
    } catch (e) {
      return {
        valid: false,
        trustLevel: "none",
        anchorHash: "",
        signatureValid: false,
        reasons: [`Invalid marker: ${(e as Error).message}`],
      };
    }
  } else {
    marker = markerInput;
  }

  // Verify signature
  const verification = verifyMarker(marker);
  const signatureValid = verification.valid;

  if (signatureValid) {
    reasons.push("Signature valid");
  } else {
    reasons.push(`Signature invalid: ${verification.errors.join(", ")}`);
  }

  // Compute anchor hash
  const anchorHash = computeAnchorHash(marker);
  reasons.push(`Anchor hash: ${anchorHash.slice(0, 16)}…`);

  // Check TSA receipt if provided
  let tsaStructuralMatch: boolean | undefined;
  if (tsaReceipt) {
    tsaStructuralMatch = await tryVerifyTsa(tsaReceipt);
    if (tsaStructuralMatch === true) {
      reasons.push("TSA receipt structurally plausible (cryptographic verification requires external tooling)");
    } else if (tsaStructuralMatch === false) {
      reasons.push("TSA receipt structural check failed");
    } else {
      reasons.push("TSA module not available — receipt not checked");
    }
  }

  // Compute trust level
  // NOTE: TSA structural match alone does NOT elevate trust to "high" —
  // structural checks can be trivially forged. Full cryptographic TSA
  // verification (via openssl ts -verify or ASN.1/PKCS library) is required
  // for "high" trust. Until crypto verification is implemented, TSA presence
  // contributes to "medium" trust at most.
  let trustLevel: TrustLevel;
  if (!signatureValid) {
    trustLevel = "none";
  } else if (tsaReceipt && tsaStructuralMatch === false) {
    trustLevel = "low";
  } else {
    // Valid signature, with or without TSA (structural match doesn't elevate beyond medium)
    trustLevel = "medium";
  }

  return {
    valid: signatureValid,
    trustLevel,
    anchorHash,
    signatureValid,
    tsaStructuralMatch,
    reasons,
  };
}
