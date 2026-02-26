/**
 * cellar-door-exit — Passage API (v0.2.0)
 *
 * ## Vocabulary: Exit vs Passage
 *
 * - **Exit** = one-way departure only. The subject leaves an origin.
 *   Functions that handle only the departure side use Exit/Departure naming.
 *
 * - **Passage** = the full journey: EXIT from one platform + ENTRY to another.
 *   Functions that handle the complete transfer between platforms use Passage naming.
 *   "Transfer" is NOT used — always say "Passage" for the full journey.
 *
 * Examples:
 *   createDepartureMarker  → Exit only (creates an unsigned departure marker)
 *   signDepartureMarker    → Exit only (signs a departure marker)
 *   verifyDeparture        → Exit only (verifies a departure marker)
 *   createPassage          → Passage (full-service: depart + anchor for receiving platform)
 *   verifyPassage          → Passage (full-service: verify anchored departure)
 *
 * The old names (createMarker, signMarker, etc.) remain as deprecated aliases.
 *
 * EXIT + ENTRY = PASSAGE. Two ceremonies, one protocol.
 *
 * @example
 * ```ts
 * import { createDepartureMarker, verifyPassage } from "cellar-door-exit/passage";
 * // or
 * import { createDepartureMarker, verifyPassage } from "cellar-door-exit";
 * ```
 */

import { createMarker } from "./marker.js";
import { signMarker, verifyMarker } from "./proof.js";
import { generateKeyPair, didFromPublicKey } from "./crypto.js";
import { quickExit, quickVerify, generateIdentity } from "./convenience.js";
import { departAndAnchor, departAndVerify } from "./full-service.js";
import type {
  ExitMarker,
  DataIntegrityProof,
  ExitType,
  ExitStatus,
  ModuleA,
  ModuleB,
  ModuleC,
  ModuleD,
  ModuleE,
  ModuleF,
  TrustEnhancers,
} from "./types.js";
import type { VerificationResult } from "./proof.js";
import type { QuickExitOpts, QuickExitResult, Identity } from "./convenience.js";
import type { FullExitOpts, FullExitResult, VerifyResult } from "./full-service.js";
import { signMarkerWithSigner, verifyMarkerMultiAlg } from "./proof.js";
import type { Signer } from "./signer.js";

// ─── Renamed Types (Passage Terminology) ─────────────────────────────────────

/**
 * A Departure Marker — the authenticated declaration of departure.
 * Alias for ExitMarker with Passage terminology.
 */
export type DepartureMarker = ExitMarker;

/**
 * Passage proof — the cryptographic signature authenticating a departure.
 */
export type PassageProof = DataIntegrityProof;

/**
 * Result of verifying a passage (departure or arrival).
 */
export type PassageVerificationResult = VerificationResult;

// ─── Renamed Functions ───────────────────────────────────────────────────────

/**
 * Create a departure marker (unsigned).
 * @see createMarker
 */
export const createDepartureMarker = createMarker;

/**
 * Sign a departure marker.
 * @see signMarker
 */
export const signDepartureMarker = signMarker;

/**
 * Sign a departure marker with a Signer interface (algorithm-agnostic).
 * @see signMarkerWithSigner
 */
export const signDepartureWithSigner = signMarkerWithSigner;

/**
 * Verify a departure marker signature and schema.
 * @see verifyMarker
 */
export const verifyDeparture = verifyMarker;

/**
 * Verify a departure marker with multi-algorithm support.
 * @see verifyMarkerMultiAlg
 */
export const verifyDepartureMultiAlg = verifyMarkerMultiAlg;

/**
 * Quick departure — one-liner for creating a signed departure marker.
 * @see quickExit
 */
export const quickDeparture = quickExit;

/**
 * Quick verification of a departure marker.
 * @see quickVerify
 */
export const quickPassageVerify = quickVerify;

/**
 * Generate a new passage identity (keypair + DID).
 * @see generateIdentity
 */
export const generatePassageIdentity = generateIdentity;

/**
 * Full-service departure: create, sign, and anchor a departure marker.
 * @see departAndAnchor
 */
export const createPassage = departAndAnchor;

/**
 * Full-service verification of an anchored departure.
 * @see departAndVerify
 */
export const verifyPassage = departAndVerify;

// ─── Re-export everything for convenience ────────────────────────────────────

export {
  // Keep original names available as deprecated aliases
  createMarker,
  signMarker,
  verifyMarker,
  quickExit,
  quickVerify,
  generateIdentity,
  departAndAnchor,
  departAndVerify,
  signMarkerWithSigner,
  verifyMarkerMultiAlg,
};

// Re-export types
export type {
  ExitMarker,
  ExitType,
  ExitStatus,
  ModuleA,
  ModuleB,
  ModuleC,
  ModuleD,
  ModuleE,
  ModuleF,
  TrustEnhancers,
  QuickExitOpts,
  QuickExitResult,
  Identity,
  FullExitOpts,
  FullExitResult,
  VerifyResult,
  Signer,
};
