import { describe, it, expect } from "vitest";
import {
  // Errors
  ExitError,
  ValidationError,
  SigningError,
  VerificationError,
  CeremonyError,
  StorageError,

  // Convenience
  generateIdentity,
  quickExit,
  quickVerify,
  fromJSON,
  toJSON,

  // Existing
  createMarker,
  verifyMarker,
  CeremonyStateMachine,
  getValidTransitions,
  ExitType,
  ExitStatus,
  CeremonyState,
} from "../index.js";

// ─── Custom Error Classes ────────────────────────────────────────────────────

describe("Custom Error Classes", () => {
  it("ExitError has correct code and is instanceof Error", () => {
    const err = new ExitError("VALIDATION_FAILED", "test");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ExitError);
    expect(err.code).toBe("VALIDATION_FAILED");
    expect(err.message).toBe("test");
    expect(err.name).toBe("ExitError");
  });

  it("ValidationError includes errors array and correct code", () => {
    const err = new ValidationError(["field missing", "bad format"]);
    expect(err).toBeInstanceOf(ExitError);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.code).toBe("VALIDATION_FAILED");
    expect(err.errors).toEqual(["field missing", "bad format"]);
    expect(err.message).toContain("field missing");
    expect(err.message).toContain("bad format");
  });

  it("SigningError has correct code", () => {
    const err = new SigningError("bad key");
    expect(err.code).toBe("SIGNING_FAILED");
    expect(err.name).toBe("SigningError");
  });

  it("VerificationError has correct code", () => {
    const err = new VerificationError("sig invalid");
    expect(err.code).toBe("VERIFICATION_FAILED");
    expect(err.name).toBe("VerificationError");
  });

  it("CeremonyError includes state info and valid transitions", () => {
    const err = new CeremonyError("alive", "departed", ["intent", "final"]);
    expect(err.code).toBe("INVALID_TRANSITION");
    expect(err.currentState).toBe("alive");
    expect(err.attemptedState).toBe("departed");
    expect(err.validTransitions).toEqual(["intent", "final"]);
    expect(err.message).toContain("alive");
    expect(err.message).toContain("departed");
    expect(err.message).toContain("intent, final");
  });

  it("StorageError has correct code", () => {
    const err = new StorageError("disk full");
    expect(err.code).toBe("STORAGE_FAILED");
    expect(err.name).toBe("StorageError");
  });

  it("createMarker throws ValidationError on missing subject", () => {
    expect(() => createMarker({
      subject: "",
      origin: "https://example.com",
      exitType: ExitType.Voluntary,
    })).toThrow(ValidationError);
  });

  it("createMarker throws ValidationError for emergency without justification", () => {
    expect(() => createMarker({
      subject: "did:key:z123",
      origin: "https://example.com",
      exitType: ExitType.Emergency,
    })).toThrow(ValidationError);

    try {
      createMarker({
        subject: "did:key:z123",
        origin: "https://example.com",
        exitType: ExitType.Emergency,
      });
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).errors).toContain("emergencyJustification is required when exitType is 'emergency'");
    }
  });
});

// ─── Convenience Methods ─────────────────────────────────────────────────────

describe("generateIdentity", () => {
  it("produces a valid DID and keypair", () => {
    const id = generateIdentity();
    expect(id.did).toMatch(/^did:key:z/);
    expect(id.publicKey).toBeInstanceOf(Uint8Array);
    expect(id.privateKey).toBeInstanceOf(Uint8Array);
    expect(id.publicKey.length).toBe(32);
  });
});

describe("quickExit", () => {
  it("produces a signed valid marker", () => {
    const { marker, identity } = quickExit("did:web:platform.example");
    expect(marker.origin).toBe("did:web:platform.example");
    expect(marker.subject).toBe(identity.did);
    expect(marker.exitType).toBe(ExitType.Voluntary);
    expect(marker.proof.proofValue).toBeTruthy();

    const result = verifyMarker(marker);
    expect(result.valid).toBe(true);
  });

  it("accepts options overrides", () => {
    const { marker } = quickExit("did:web:example.com", {
      exitType: ExitType.Emergency,
      emergencyJustification: "System dying",
    });
    expect(marker.exitType).toBe(ExitType.Emergency);
    expect(marker.emergencyJustification).toBe("System dying");
  });
});

describe("quickVerify", () => {
  it("verifies valid marker JSON", () => {
    const { marker } = quickExit("did:web:test.example");
    const json = toJSON(marker);
    const result = quickVerify(json);
    expect(result.valid).toBe(true);
  });

  it("rejects invalid JSON", () => {
    expect(() => quickVerify("not json")).toThrow(ValidationError);
  });

  it("rejects invalid marker structure", () => {
    expect(() => quickVerify('{"foo":"bar"}')).toThrow(ValidationError);
  });
});

describe("fromJSON / toJSON", () => {
  it("round-trips a marker", () => {
    const { marker } = quickExit("did:web:roundtrip.example");
    const json = toJSON(marker);
    const parsed = fromJSON(json);

    expect(parsed.id).toBe(marker.id);
    expect(parsed.subject).toBe(marker.subject);
    expect(parsed.origin).toBe(marker.origin);
    expect(parsed.exitType).toBe(marker.exitType);
    expect(parsed.status).toBe(marker.status);
    expect(parsed.proof.proofValue).toBe(marker.proof.proofValue);
  });

  it("toJSON produces pretty-printed output", () => {
    const { marker } = quickExit("did:web:pretty.example");
    const json = toJSON(marker);
    expect(json).toContain("\n");
    expect(json).toContain("  ");
  });

  it("fromJSON throws ValidationError on bad JSON", () => {
    expect(() => fromJSON("{invalid")).toThrow(ValidationError);
  });

  it("fromJSON throws ValidationError on invalid marker", () => {
    expect(() => fromJSON('{"valid":"json","but":"not a marker"}')).toThrow(ValidationError);
  });
});

// ─── Ceremony Transition Errors ──────────────────────────────────────────────

describe("Ceremony transition errors", () => {
  it("throws CeremonyError with valid alternatives", () => {
    const sm = new CeremonyStateMachine();
    try {
      sm.snapshot(); // invalid from alive
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(CeremonyError);
      const ce = e as CeremonyError;
      expect(ce.currentState).toBe("alive");
      expect(ce.attemptedState).toBe("snapshot");
      expect(ce.validTransitions).toContain("intent");
      expect(ce.validTransitions).toContain("final");
      expect(ce.message).toContain("intent");
    }
  });

  it("getValidTransitions returns correct transitions", () => {
    expect(getValidTransitions(CeremonyState.Alive)).toEqual([CeremonyState.Intent, CeremonyState.Final]);
    expect(getValidTransitions(CeremonyState.Departed)).toEqual([]);
    expect(getValidTransitions(CeremonyState.Intent)).toEqual([CeremonyState.Snapshot]);
  });
});
