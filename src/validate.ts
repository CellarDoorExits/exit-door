/**
 * cellar-door-exit — Schema Validation
 */

import { ExitType, ExitStatus, EXIT_CONTEXT_V1 } from "./types.js";
import type { ExitMarker } from "./types.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const ISO_8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/;
const DID_KEY_RE = /^did:key:z[1-9A-HJ-NP-Za-km-z]+$/;

function isValidISO8601(s: string): boolean {
  return ISO_8601_RE.test(s) && !isNaN(Date.parse(s));
}

function isValidDid(s: string): boolean {
  return DID_KEY_RE.test(s) || s.startsWith("did:");
}

/**
 * Validate an ExitMarker against the schema.
 *
 * Checks all 7 required fields, proof structure, DID formats, emergency justification
 * requirements, legal hold structure, and optional module structures.
 *
 * @param marker - The object to validate (typically parsed from JSON).
 * @returns A {@link ValidationResult} with `valid` boolean and array of `errors`.
 *
 * @example
 * ```ts
 * const result = validateMarker(parsedJson);
 * if (!result.valid) {
 *   console.error("Validation errors:", result.errors);
 * }
 * ```
 */
export function validateMarker(marker: unknown): ValidationResult {
  const errors: string[] = [];
  const m = marker as Record<string, unknown>;

  if (!m || typeof m !== "object") {
    return { valid: false, errors: ["Marker must be an object"] };
  }

  // @context
  if (m["@context"] !== EXIT_CONTEXT_V1) {
    errors.push(`Invalid @context: expected "${EXIT_CONTEXT_V1}"`);
  }

  // 7 required fields
  if (typeof m.id !== "string" || !m.id) {
    errors.push("Missing or invalid required field: id");
  }

  if (typeof m.subject !== "string" || !m.subject) {
    errors.push("Missing or invalid required field: subject");
  }

  if (typeof m.origin !== "string" || !m.origin) {
    errors.push("Missing or invalid required field: origin");
  }

  if (typeof m.timestamp !== "string" || !m.timestamp) {
    errors.push("Missing or invalid required field: timestamp");
  } else if (!isValidISO8601(m.timestamp as string)) {
    errors.push("Invalid timestamp: must be ISO-8601 format");
  }

  if (!Object.values(ExitType).includes(m.exitType as ExitType)) {
    errors.push(`Invalid exitType: must be one of ${Object.values(ExitType).join(", ")}`);
  }

  if (!Object.values(ExitStatus).includes(m.status as ExitStatus)) {
    errors.push(`Invalid status: must be one of ${Object.values(ExitStatus).join(", ")}`);
  }

  // proof
  if (!m.proof || typeof m.proof !== "object") {
    errors.push("Missing or invalid required field: proof");
  } else {
    const p = m.proof as Record<string, unknown>;
    if (typeof p.type !== "string" || !p.type) errors.push("Proof missing type");
    if (typeof p.proofValue !== "string") errors.push("Proof missing proofValue");
    if (typeof p.verificationMethod !== "string") errors.push("Proof missing verificationMethod");
  }

  // Validate DID formats where applicable
  if (typeof m.subject === "string" && m.subject.startsWith("did:") && !isValidDid(m.subject)) {
    errors.push("Invalid subject DID format");
  }

  // emergencyJustification required for emergency exits
  if (m.exitType === ExitType.Emergency) {
    if (typeof m.emergencyJustification !== "string" || !m.emergencyJustification) {
      errors.push("emergencyJustification is required when exitType is 'emergency'");
    }
  }

  // Validate legalHold structure if present
  if (m.legalHold !== undefined) {
    if (typeof m.legalHold !== "object" || m.legalHold === null) {
      errors.push("legalHold must be an object");
    } else {
      const lh = m.legalHold as Record<string, unknown>;
      if (typeof lh.holdType !== "string" || !lh.holdType) errors.push("legalHold.holdType is required");
      if (typeof lh.authority !== "string" || !lh.authority) errors.push("legalHold.authority is required");
      if (typeof lh.reference !== "string" || !lh.reference) errors.push("legalHold.reference is required");
      if (typeof lh.dateIssued !== "string" || !lh.dateIssued) {
        errors.push("legalHold.dateIssued is required");
      } else if (!isValidISO8601(lh.dateIssued as string)) {
        errors.push("legalHold.dateIssued must be ISO-8601 format");
      }
      if (typeof lh.acknowledged !== "boolean") errors.push("legalHold.acknowledged must be a boolean");
    }
  }

  // Validate optional modules if present
  if (m.lineage !== undefined && (typeof m.lineage !== "object" || m.lineage === null)) {
    errors.push("Module A (lineage) must be an object");
  }
  if (m.stateSnapshot !== undefined) {
    const ss = m.stateSnapshot as Record<string, unknown>;
    if (typeof ss !== "object" || ss === null) {
      errors.push("Module B (stateSnapshot) must be an object");
    } else if (typeof ss.stateHash !== "string" || !ss.stateHash) {
      errors.push("Module B (stateSnapshot) requires stateHash");
    }
  }

  return { valid: errors.length === 0, errors };
}
