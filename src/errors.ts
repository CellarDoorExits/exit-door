/**
 * cellar-door-exit — Custom Error Classes
 *
 * Structured errors for programmatic error handling.
 * Every error has a `code` field for catch-and-switch patterns.
 */

export type ExitErrorCode =
  | "VALIDATION_FAILED"
  | "SIGNING_FAILED"
  | "VERIFICATION_FAILED"
  | "INVALID_TRANSITION"
  | "STORAGE_FAILED";

/**
 * Base error class for all EXIT operations.
 * Every error has a `code` field for programmatic catch-and-switch patterns.
 */
export class ExitError extends Error {
  readonly code: ExitErrorCode;

  /**
   * @param code - The structured error code.
   * @param message - Human-readable error message.
   */
  constructor(code: ExitErrorCode, message: string) {
    super(message);
    this.name = "ExitError";
    this.code = code;
    // Fix prototype chain for instanceof
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when marker validation fails. Includes all validation errors.
 */
export class ValidationError extends ExitError {
  readonly errors: string[];

  /**
   * @param errors - Array of validation error messages.
   * @param message - Optional custom message (defaults to a summary of errors).
   */
  constructor(errors: string[], message?: string) {
    const msg = message ?? `Marker validation failed: ${errors.join("; ")}`;
    super("VALIDATION_FAILED", msg);
    this.name = "ValidationError";
    this.errors = errors;
  }
}

/** Thrown when signing a marker fails. */
export class SigningError extends ExitError {
  constructor(message: string) {
    super("SIGNING_FAILED", message);
    this.name = "SigningError";
  }
}

/** Thrown when signature or marker verification fails. */
export class VerificationError extends ExitError {
  constructor(message: string) {
    super("VERIFICATION_FAILED", message);
    this.name = "VerificationError";
  }
}

/**
 * Thrown on invalid ceremony state transitions.
 */
export class CeremonyError extends ExitError {
  readonly currentState: string;
  readonly attemptedState: string;
  readonly validTransitions: string[];

  /**
   * @param currentState - The current ceremony state.
   * @param attemptedState - The state that was attempted.
   * @param validTransitions - Array of valid target states from the current state.
   */
  constructor(currentState: string, attemptedState: string, validTransitions: string[]) {
    const validStr = validTransitions.length > 0
      ? validTransitions.join(", ")
      : "none (terminal state)";
    super(
      "INVALID_TRANSITION",
      `Invalid ceremony transition: ${currentState} → ${attemptedState}. Valid transitions from '${currentState}': ${validStr}`
    );
    this.name = "CeremonyError";
    this.currentState = currentState;
    this.attemptedState = attemptedState;
    this.validTransitions = validTransitions;
  }
}

/** Thrown when marker storage operations fail. */
export class StorageError extends ExitError {
  constructor(message: string) {
    super("STORAGE_FAILED", message);
    this.name = "StorageError";
  }
}
