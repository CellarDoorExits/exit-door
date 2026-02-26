/**
 * cellar-door-exit — Spec-Level Guardrails
 *
 * Structural protections against misuse of EXIT markers.
 */

import type { ExitMarker, RightOfReply, SunsetPolicy } from "./types.js";
import { ExitType, ExitStatus, CoercionLabel } from "./types.js";

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Anti-weaponization clause — normative spec language prohibiting use of
 * EXIT markers as blacklists.
 */
export const ANTI_WEAPONIZATION_CLAUSE = `EXIT markers MUST NOT be used as blacklists, ban lists, or exclusion databases. ` +
  `An EXIT marker records a departure event; it does not constitute a judgment of character, ` +
  `competence, or trustworthiness. Any system that aggregates EXIT markers to systematically ` +
  `exclude subjects based on exitType or originStatus is in violation of this specification. ` +
  `Origins that consistently issue 'disputed' status without substantive basis may be flagged ` +
  `for weaponization by ethics auditors.`;

/**
 * Re-export CoercionLabel enum for convenience.
 */
export { CoercionLabel as COERCION_LABELS } from "./types.js";

// ─── Coercion Labeling ───────────────────────────────────────────────────────

/**
 * Attach a coercion label to a marker with evidence.
 * Returns a new marker (does not mutate the original).
 *
 * @param marker - The EXIT marker to label.
 * @param label - The coercion label to apply.
 * @param _evidence - A description or reference to the evidence supporting the label.
 * @returns A new EXIT marker with the coercion label and evidence tags attached.
 *
 * @example
 * ```ts
 * const labeled = addCoercionLabel(marker, CoercionLabel.PossibleRetaliation, "Short tenure + forced exit");
 * console.log(labeled.coercionLabel); // "possible_retaliation"
 * ```
 */
export function addCoercionLabel(
  marker: ExitMarker,
  label: CoercionLabel,
  _evidence: string
): ExitMarker {
  return {
    ...marker,
    coercionLabel: label,
    metadata: {
      ...marker.metadata,
      tags: [
        ...(marker.metadata?.tags || []),
        `coercion:${label}`,
        `coercion-evidence:${_evidence}`,
      ],
    },
  };
}

// ─── Right of Reply ──────────────────────────────────────────────────────────

/**
 * Attach a signed right-of-reply counter-narrative to a marker's Module C.
 * This allows the subject to respond to an origin's attestation.
 * Returns a new marker (does not mutate the original).
 *
 * @param marker - The EXIT marker to attach the reply to.
 * @param replyText - The subject's counter-narrative text.
 * @param signerKey - The DID or key URI of the replying party.
 * @returns A new EXIT marker with the right-of-reply attached in the dispute module.
 *
 * @example
 * ```ts
 * const withReply = addRightOfReply(marker, "I left voluntarily, not forced.", "did:key:z6Mk...");
 * console.log(withReply.dispute?.rightOfReply?.replyText);
 * ```
 */
export function addRightOfReply(
  marker: ExitMarker,
  replyText: string,
  signerKey: string
): ExitMarker {
  const reply: RightOfReply = {
    replyText,
    signerKey,
    timestamp: new Date().toISOString(),
    // In production this would be a real signature; placeholder for structural purposes
    signature: `sig:${signerKey}:${Buffer.from(replyText).toString("base64")}`,
  };

  return {
    ...marker,
    dispute: {
      ...marker.dispute,
      rightOfReply: reply,
    },
  };
}

// ─── Ethical Compliance Validation ───────────────────────────────────────────

export interface EthicalComplianceResult {
  compliant: boolean;
  violations: string[];
}

/**
 * Validate a marker against ethical guardrails.
 *
 * Checks for: forced exits without reasons, missing right-of-reply on disputed markers,
 * emergency exits without justification, and expired sunset dates.
 *
 * @param marker - The EXIT marker to validate.
 * @returns An object with `compliant` boolean and an array of `violations` strings.
 *
 * @example
 * ```ts
 * const result = validateEthicalCompliance(marker);
 * if (!result.compliant) {
 *   console.log("Violations:", result.violations);
 * }
 * ```
 */
export function validateEthicalCompliance(marker: ExitMarker): EthicalComplianceResult {
  const violations: string[] = [];

  // Forced exit must have a reason
  if (marker.exitType === ExitType.Forced) {
    const hasReason = marker.metadata?.reason || marker.metadata?.narrative;
    if (!hasReason) {
      violations.push("Forced exit must include a reason or narrative (Module E) explaining the expulsion.");
    }
  }

  // Dispute records with origin attestation must allow right of reply
  if (
    marker.dispute?.originStatus &&
    marker.dispute.originStatus !== marker.status &&
    !marker.dispute.rightOfReply
  ) {
    violations.push(
      "Origin attestation conflicts with subject status but no right of reply is attached. " +
      "Subjects must be given the opportunity to attach a counter-narrative."
    );
  }

  // Emergency exits must have justification (this is also in validate.ts but we re-check ethically)
  if (marker.exitType === ExitType.Emergency && !marker.emergencyJustification) {
    violations.push("Emergency exit without justification violates ethical transparency requirements.");
  }

  // Sunset: markers with sunset/expires dates in the past should be flagged
  const expiryDate = marker.expires || marker.sunsetDate;
  if (expiryDate && new Date(expiryDate) < new Date()) {
    violations.push("Marker has passed its sunset date and should no longer be relied upon.");
  }

  return { compliant: violations.length === 0, violations };
}

// ─── Sunset Policy ───────────────────────────────────────────────────────────

/**
 * Apply a sunset policy to a marker — sets a sunsetDate based on the policy.
 * Returns a new marker (does not mutate the original).
 *
 * @param marker - The EXIT marker to apply the sunset policy to.
 * @param policy - The sunset policy specifying duration and expiry action.
 * @returns A new EXIT marker with `sunsetDate` set.
 *
 * @example
 * ```ts
 * const withSunset = applySunset(marker, { durationDays: 365, action: "flag" });
 * console.log(withSunset.sunsetDate); // ISO 8601 date ~1 year after marker timestamp
 * ```
 */
export function applySunset(marker: ExitMarker, policy: SunsetPolicy): ExitMarker {
  const exitDate = new Date(marker.timestamp);
  const sunsetDate = new Date(exitDate.getTime() + policy.durationDays * 24 * 60 * 60 * 1000);

  return {
    ...marker,
    sunsetDate: sunsetDate.toISOString(),
  };
}

/**
 * Check if a marker has expired according to its sunset date.
 *
 * @param marker - The EXIT marker to check.
 * @returns `true` if the marker has a sunset date that is in the past; `false` otherwise.
 *
 * @example
 * ```ts
 * if (isExpired(marker)) {
 *   console.log("This marker should no longer be relied upon.");
 * }
 * ```
 */
export function isExpired(marker: ExitMarker): boolean {
  const expiryDate = marker.expires || marker.sunsetDate;
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
}
