/**
 * cellar-door-exit — Ethics Guardrail Module
 *
 * Heuristic analysis for detecting coercion, weaponization, and reputation
 * laundering in EXIT markers. These are signals, not verdicts.
 */

import type {
  ExitMarker,
  CoercionSignals,
  WeaponizationSignals,
  LaunderingSignals,
  EthicsReport,
} from "./types.js";
import { ExitType, ExitStatus } from "./types.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse ISO 8601 duration to approximate days (P[n]Y[n]M[n]D). */
function durationToDays(dur: string): number {
  const m = dur.match(/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?$/);
  if (!m) return -1;
  return parseInt(m[1] || "0") * 365 + parseInt(m[2] || "0") * 30 + parseInt(m[3] || "0");
}

/** Compute tenure in days between two ISO dates. */
function tenureDays(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

// ─── Coercion Detection ──────────────────────────────────────────────────────

/**
 * Detect coercion signals in a single EXIT marker.
 *
 * Analyzes forced exits with conflicting statuses, emergency exits without
 * infrastructure failure indicators, and short-tenure forced departures.
 *
 * @param marker - The EXIT marker to analyze for coercion signals.
 * @returns A {@link CoercionSignals} object with detected signals, risk level, and recommendation.
 *
 * @example
 * ```ts
 * const signals = detectCoercion(marker);
 * if (signals.riskLevel !== "none") {
 *   console.log("Coercion risk:", signals.recommendation);
 * }
 * ```
 */
export function detectCoercion(marker: ExitMarker): CoercionSignals {
  const signals: string[] = [];

  // Forced exit + good_standing from subject + disputed from origin = possible coercion
  if (
    marker.exitType === ExitType.Forced &&
    marker.status === ExitStatus.GoodStanding &&
    marker.dispute?.originStatus === ExitStatus.Disputed
  ) {
    signals.push("Forced exit with conflicting status: subject claims good_standing but origin disputes");
  }

  // Emergency exit from a platform that's clearly operational (no emergencyJustification mentioning shutdown)
  if (
    marker.exitType === ExitType.Emergency &&
    marker.emergencyJustification &&
    !/shutdown|unresponsive|offline|failing|down|unavailable/i.test(marker.emergencyJustification)
  ) {
    signals.push("Emergency exit without infrastructure failure indicators — possible coerced departure");
  }

  // Very short tenure + forced exit = possible retaliation
  // Check Module E tags or metadata for tenure hints, or lineage timestamps
  if (marker.exitType === ExitType.Forced && marker.lineage?.lineageChain) {
    const chain = marker.lineage.lineageChain;
    if (chain.length <= 1) {
      signals.push("Forced exit with minimal lineage — possible retaliation against new participant");
    }
  }

  // Short tenure via timestamp heuristic: if marker has metadata with start info
  // We approximate: if the marker is forced and has a very recent origin join (embedded in tags)
  if (marker.exitType === ExitType.Forced && marker.metadata?.tags) {
    const tenureTag = marker.metadata.tags.find((t) => t.startsWith("tenure:"));
    if (tenureTag) {
      const days = durationToDays(tenureTag.replace("tenure:", ""));
      if (days >= 0 && days < 30) {
        signals.push("Forced exit after very short tenure (<30 days) — possible retaliation");
      }
    }
  }

  // Determine risk level
  let riskLevel: CoercionSignals["riskLevel"] = "none";
  if (signals.length === 1) riskLevel = "low";
  else if (signals.length === 2) riskLevel = "medium";
  else if (signals.length >= 3) riskLevel = "high";

  const recommendation =
    riskLevel === "none"
      ? "No coercion indicators detected."
      : riskLevel === "low"
        ? "Minor coercion signal detected. Consider requesting additional context."
        : riskLevel === "medium"
          ? "Multiple coercion indicators. Recommend independent verification before relying on this marker."
          : "Strong coercion indicators. This marker should be treated with significant skepticism and independently investigated.";

  return { signals, riskLevel, recommendation };
}

// ─── Weaponization Detection ─────────────────────────────────────────────────

/**
 * Detect weaponization patterns across a set of EXIT markers.
 *
 * Analyzes origins for mass forced exits, systematic dispute of departing subjects,
 * and purge-like patterns (many exits in a short timeframe).
 *
 * @param markers - An array of EXIT markers to analyze for weaponization patterns.
 * @returns A {@link WeaponizationSignals} object with patterns, severity, and affected subjects.
 *
 * @example
 * ```ts
 * const signals = detectWeaponization(allMarkers);
 * if (signals.severity === "severe") {
 *   console.log("Affected subjects:", signals.affectedSubjects);
 * }
 * ```
 */
export function detectWeaponization(markers: ExitMarker[]): WeaponizationSignals {
  const patterns: string[] = [];
  const affectedSubjects: string[] = [];

  // Group by origin
  const byOrigin = new Map<string, ExitMarker[]>();
  for (const m of markers) {
    const list = byOrigin.get(m.origin) || [];
    list.push(m);
    byOrigin.set(m.origin, list);
  }

  for (const [origin, originMarkers] of byOrigin) {
    const forcedExits = originMarkers.filter((m) => m.exitType === ExitType.Forced);
    const disputedOrigin = originMarkers.filter(
      (m) => m.dispute?.originStatus === ExitStatus.Disputed
    );

    // Single origin producing many forced exits
    if (forcedExits.length >= 3) {
      patterns.push(
        `Origin "${origin}" has ${forcedExits.length} forced exits — potential weaponization`
      );
      for (const m of forcedExits) {
        if (!affectedSubjects.includes(m.subject)) affectedSubjects.push(m.subject);
      }
    }

    // Origin always attesting disputed = blacklisting
    if (disputedOrigin.length >= 3 && disputedOrigin.length === originMarkers.filter((m) => m.dispute?.originStatus !== undefined).length) {
      patterns.push(
        `Origin "${origin}" disputes all departing subjects (${disputedOrigin.length}) — potential blacklisting behavior`
      );
      for (const m of disputedOrigin) {
        if (!affectedSubjects.includes(m.subject)) affectedSubjects.push(m.subject);
      }
    }

    // Mass exits in short timeframe = potential purge
    if (originMarkers.length >= 5) {
      const timestamps = originMarkers.map((m) => new Date(m.timestamp).getTime()).sort();
      const span = timestamps[timestamps.length - 1] - timestamps[0];
      const spanDays = span / (1000 * 60 * 60 * 24);
      if (spanDays <= 7) {
        patterns.push(
          `Origin "${origin}" had ${originMarkers.length} exits within ${Math.ceil(spanDays)} days — potential purge`
        );
        for (const m of originMarkers) {
          if (!affectedSubjects.includes(m.subject)) affectedSubjects.push(m.subject);
        }
      }
    }
  }

  let severity: WeaponizationSignals["severity"] = "none";
  if (patterns.length === 1) severity = "concerning";
  else if (patterns.length >= 2) severity = "severe";

  return { patterns, severity, affectedSubjects };
}

// ─── Reputation Laundering Detection ─────────────────────────────────────────

/**
 * Detect reputation laundering signals for a specific subject.
 *
 * Checks for identity cycling (multiple short-tenure exits), high churn rates,
 * and self-attested good standing without origin corroboration.
 *
 * @param markers - The full set of EXIT markers to search through.
 * @param subjectDid - The DID of the subject to analyze.
 * @returns A {@link LaunderingSignals} object with detected signals and probability assessment.
 *
 * @example
 * ```ts
 * const signals = detectReputationLaundering(allMarkers, "did:key:z6Mk...");
 * if (signals.probability === "high") {
 *   console.log("Laundering signals:", signals.signals);
 * }
 * ```
 */
export function detectReputationLaundering(
  markers: ExitMarker[],
  subjectDid: string
): LaunderingSignals {
  const signals: string[] = [];
  const subjectMarkers = markers.filter((m) => m.subject === subjectDid);

  if (subjectMarkers.length < 2) {
    return { signals: [], probability: "low" };
  }

  // Multiple short-tenure exits = identity cycling
  const shortTenure = subjectMarkers.filter((m) => {
    if (m.metadata?.tags) {
      const tag = m.metadata.tags.find((t) => t.startsWith("tenure:"));
      if (tag) {
        const days = durationToDays(tag.replace("tenure:", ""));
        return days >= 0 && days < 30;
      }
    }
    return false;
  });
  if (shortTenure.length >= 2) {
    signals.push(
      `Subject has ${shortTenure.length} exits with tenure under 30 days — possible identity cycling`
    );
  }

  // Multiple exits total in a short period
  if (subjectMarkers.length >= 3) {
    const timestamps = subjectMarkers.map((m) => new Date(m.timestamp).getTime()).sort();
    const spanDays = (timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60 * 60 * 24);
    if (spanDays <= 90) {
      signals.push(
        `Subject has ${subjectMarkers.length} exits within ${Math.ceil(spanDays)} days — high churn rate`
      );
    }
  }

  // Self-attested good_standing with no origin corroboration across multiple exits
  const selfAttestedGood = subjectMarkers.filter(
    (m) =>
      m.selfAttested &&
      m.status === ExitStatus.GoodStanding &&
      m.dispute?.originStatus === undefined
  );
  if (selfAttestedGood.length >= 2) {
    signals.push(
      `Subject has ${selfAttestedGood.length} self-attested good_standing exits with no origin corroboration — suspicious pattern`
    );
  }

  let probability: LaunderingSignals["probability"] = "low";
  if (signals.length === 1) probability = "medium";
  else if (signals.length >= 2) probability = "high";

  return { signals, probability };
}

// ─── Retaliation Detection ────────────────────────────────────────────────────

/** A reported protected activity (whistleblowing, complaint, etc.). */
export interface ReportedActivity {
  type: string;
  timestamp: string;
}

/** Result of retaliation window analysis. */
export interface RetaliationResult {
  detected: boolean;
  indicators: string[];
}

const RETALIATION_WINDOW_MS = 72 * 60 * 60 * 1000; // 72 hours

/**
 * Detect whether a forced exit occurred within 72 hours of a reported
 * protected activity (e.g. whistleblowing, filing a complaint, reporting
 * misconduct). Temporal proximity alone is a signal, not proof.
 *
 * @param marker - The EXIT marker to analyze.
 * @param reportedActivities - Optional list of protected activities with timestamps.
 * @returns A {@link RetaliationResult} with detection status and indicators.
 *
 * @example
 * ```ts
 * const result = detectRetaliationWindow(marker, [
 *   { type: "whistleblower_report", timestamp: "2026-03-01T10:00:00Z" },
 * ]);
 * if (result.detected) {
 *   console.log("Retaliation indicators:", result.indicators);
 * }
 * ```
 */
export function detectRetaliationWindow(
  marker: ExitMarker,
  reportedActivities?: ReportedActivity[],
): RetaliationResult {
  const indicators: string[] = [];

  // Only relevant for forced/directed/constructive exits
  if (
    marker.exitType !== ExitType.Forced &&
    marker.exitType !== ExitType.Directed &&
    marker.exitType !== ExitType.Constructive
  ) {
    return { detected: false, indicators };
  }

  if (!reportedActivities || reportedActivities.length === 0) {
    return { detected: false, indicators };
  }

  const exitTime = new Date(marker.timestamp).getTime();

  for (const activity of reportedActivities) {
    const activityTime = new Date(activity.timestamp).getTime();
    const delta = exitTime - activityTime;

    // Exit must come after the activity and within 72 hours
    if (delta >= 0 && delta <= RETALIATION_WINDOW_MS) {
      const hours = Math.round(delta / (1000 * 60 * 60));
      indicators.push(
        `Forced exit occurred ${hours}h after "${activity.type}" — within 72h retaliation window`
      );
    }
  }

  // Also flag if exit has coercion signals compounding the retaliation concern
  const coercion = detectCoercion(marker);
  if (coercion.riskLevel !== "none" && indicators.length > 0) {
    indicators.push(
      `Coercion signals (${coercion.riskLevel}) compound retaliation concern`
    );
  }

  return {
    detected: indicators.length > 0,
    indicators,
  };
}

// ─── Ethics Report ───────────────────────────────────────────────────────────

/**
 * Generate a comprehensive ethics audit report for a set of markers.
 *
 * Runs coercion detection on each marker, weaponization detection across all markers,
 * and laundering detection per unique subject. Produces aggregated recommendations and
 * an overall risk assessment.
 *
 * @param markers - An array of EXIT markers to audit.
 * @returns A comprehensive {@link EthicsReport} with findings, recommendations, and overall risk.
 *
 * @example
 * ```ts
 * const report = generateEthicsReport(markers);
 * console.log(`Overall risk: ${report.overallRisk}`);
 * console.log(`Recommendations: ${report.recommendations.join("; ")}`);
 * ```
 */
export function generateEthicsReport(markers: ExitMarker[]): EthicsReport {
  const coercionFindings = markers.map((m) => ({
    markerId: m.id,
    signals: detectCoercion(m),
  }));

  const weaponization = detectWeaponization(markers);

  // Unique subjects
  const subjects = [...new Set(markers.map((m) => m.subject))];
  const launderingFindings = subjects.map((s) => ({
    subjectDid: s,
    signals: detectReputationLaundering(markers, s),
  }));

  // Aggregate recommendations
  const recommendations: string[] = [];
  const hasCoercion = coercionFindings.some((f) => f.signals.riskLevel !== "none");
  const hasWeaponization = weaponization.severity !== "none";
  const hasLaundering = launderingFindings.some((f) => f.signals.probability !== "low");

  if (hasCoercion) {
    recommendations.push("Coercion signals detected. Investigate flagged markers for possible forced departures under duress.");
  }
  if (hasWeaponization) {
    recommendations.push("Weaponization patterns detected. Review flagged origins for systemic abuse of forced exit mechanisms.");
  }
  if (hasLaundering) {
    recommendations.push("Reputation laundering signals detected. Apply additional verification for flagged subjects.");
  }
  if (!hasCoercion && !hasWeaponization && !hasLaundering) {
    recommendations.push("No ethical concerns detected in this marker set.");
  }

  // Overall risk
  let overallRisk: EthicsReport["overallRisk"] = "low";
  const highCoercion = coercionFindings.some((f) => f.signals.riskLevel === "high");
  if (weaponization.severity === "severe" || (highCoercion && hasLaundering)) {
    overallRisk = "critical";
  } else if (hasWeaponization || highCoercion) {
    overallRisk = "high";
  } else if (hasCoercion || hasLaundering) {
    overallRisk = "medium";
  }

  return {
    generatedAt: new Date().toISOString(),
    markerCount: markers.length,
    coercionFindings,
    weaponization,
    launderingFindings,
    recommendations,
    overallRisk,
  };
}
