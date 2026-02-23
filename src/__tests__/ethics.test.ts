import { describe, it, expect } from "vitest";
import {
  ExitType,
  ExitStatus,
  ExitMarker,
  EXIT_CONTEXT_V1,
  CoercionLabel,
} from "../types.js";
import {
  detectCoercion,
  detectWeaponization,
  detectReputationLaundering,
  generateEthicsReport,
} from "../ethics.js";
import {
  addCoercionLabel,
  addRightOfReply,
  validateEthicalCompliance,
  applySunset,
  isExpired,
  ANTI_WEAPONIZATION_CLAUSE,
} from "../guardrails.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMarker(overrides: Partial<ExitMarker> & { subject?: string; origin?: string } = {}): ExitMarker {
  return {
    "@context": EXIT_CONTEXT_V1,
    id: overrides.id || `urn:exit:test-${Math.random().toString(36).slice(2)}`,
    subject: overrides.subject || "did:key:zSubject1",
    origin: overrides.origin || "https://platform.example",
    timestamp: overrides.timestamp || "2026-01-15T10:00:00.000Z",
    exitType: overrides.exitType || ExitType.Voluntary,
    status: overrides.status || ExitStatus.GoodStanding,
    selfAttested: overrides.selfAttested ?? true,
    proof: overrides.proof || {
      type: "Ed25519Signature2020",
      created: "2026-01-15T10:00:00.000Z",
      verificationMethod: "did:key:zSubject1",
      proofValue: "fakeSig",
    },
    ...overrides,
  };
}

// ─── Coercion Detection ──────────────────────────────────────────────────────

describe("detectCoercion", () => {
  it("detects forced exit with conflicting status signals", () => {
    const marker = makeMarker({
      exitType: ExitType.Forced,
      status: ExitStatus.GoodStanding,
      dispute: { originStatus: ExitStatus.Disputed },
    });
    const result = detectCoercion(marker);
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.signals[0]).toContain("conflicting status");
    expect(result.riskLevel).not.toBe("none");
  });

  it("detects short tenure + forced exit as retaliation signal", () => {
    const marker = makeMarker({
      exitType: ExitType.Forced,
      metadata: { tags: ["tenure:P15D"] },
    });
    const result = detectCoercion(marker);
    expect(result.signals.some((s) => s.includes("short tenure") || s.includes("retaliation"))).toBe(true);
    expect(result.riskLevel).not.toBe("none");
  });

  it("returns no signals for clean voluntary exit", () => {
    const marker = makeMarker({
      exitType: ExitType.Voluntary,
      status: ExitStatus.GoodStanding,
    });
    const result = detectCoercion(marker);
    expect(result.signals).toHaveLength(0);
    expect(result.riskLevel).toBe("none");
    expect(result.recommendation).toContain("No coercion");
  });
});

// ─── Weaponization Detection ─────────────────────────────────────────────────

describe("detectWeaponization", () => {
  it("detects many forced exits from same origin", () => {
    const markers = Array.from({ length: 5 }, (_, i) =>
      makeMarker({
        id: `urn:exit:w${i}`,
        subject: `did:key:zVictim${i}`,
        origin: "https://bad-platform.example",
        exitType: ExitType.Forced,
        timestamp: "2026-01-15T10:00:00.000Z",
      })
    );
    const result = detectWeaponization(markers);
    expect(result.patterns.length).toBeGreaterThan(0);
    expect(result.severity).not.toBe("none");
    expect(result.affectedSubjects.length).toBe(5);
  });

  it("returns no patterns for diverse voluntary exits", () => {
    const markers = Array.from({ length: 3 }, (_, i) =>
      makeMarker({
        id: `urn:exit:v${i}`,
        subject: `did:key:zAgent${i}`,
        origin: `https://platform${i}.example`,
        exitType: ExitType.Voluntary,
      })
    );
    const result = detectWeaponization(markers);
    expect(result.patterns).toHaveLength(0);
    expect(result.severity).toBe("none");
  });
});

// ─── Reputation Laundering ───────────────────────────────────────────────────

describe("detectReputationLaundering", () => {
  it("detects multiple short-tenure self-attested exits", () => {
    const markers = Array.from({ length: 3 }, (_, i) =>
      makeMarker({
        id: `urn:exit:l${i}`,
        subject: "did:key:zSuspect",
        origin: `https://sybil${i}.example`,
        timestamp: `2026-01-${15 + i}T10:00:00.000Z`,
        selfAttested: true,
        status: ExitStatus.GoodStanding,
        metadata: { tags: ["tenure:P10D"] },
      })
    );
    const result = detectReputationLaundering(markers, "did:key:zSuspect");
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.probability).not.toBe("low");
  });

  it("returns low probability for single exit", () => {
    const markers = [makeMarker({ subject: "did:key:zClean" })];
    const result = detectReputationLaundering(markers, "did:key:zClean");
    expect(result.signals).toHaveLength(0);
    expect(result.probability).toBe("low");
  });
});

// ─── Right of Reply ──────────────────────────────────────────────────────────

describe("addRightOfReply", () => {
  it("attaches a counter-narrative to the marker", () => {
    const marker = makeMarker({
      dispute: { originStatus: ExitStatus.Disputed },
    });
    const updated = addRightOfReply(marker, "I was wrongfully expelled.", "did:key:zSubject1");
    expect(updated.dispute?.rightOfReply).toBeDefined();
    expect(updated.dispute!.rightOfReply!.replyText).toBe("I was wrongfully expelled.");
    expect(updated.dispute!.rightOfReply!.signerKey).toBe("did:key:zSubject1");
    expect(updated.dispute!.rightOfReply!.signature).toBeTruthy();
    // Original not mutated
    expect(marker.dispute?.rightOfReply).toBeUndefined();
  });
});

// ─── Sunset Policy ───────────────────────────────────────────────────────────

describe("applySunset / isExpired", () => {
  it("sets sunset date based on policy", () => {
    const marker = makeMarker({ timestamp: "2026-01-15T10:00:00.000Z" });
    const updated = applySunset(marker, { durationDays: 365, action: "flag" });
    expect(updated.sunsetDate).toBeDefined();
    const sunset = new Date(updated.sunsetDate!);
    const expected = new Date("2027-01-15T10:00:00.000Z");
    expect(Math.abs(sunset.getTime() - expected.getTime())).toBeLessThan(1000);
  });

  it("detects expired markers", () => {
    const marker = makeMarker({ sunsetDate: "2020-01-01T00:00:00.000Z" } as any);
    expect(isExpired(marker)).toBe(true);
  });

  it("non-expired marker returns false", () => {
    const marker = makeMarker({ sunsetDate: "2030-01-01T00:00:00.000Z" } as any);
    expect(isExpired(marker)).toBe(false);
  });

  it("marker without sunset is not expired", () => {
    const marker = makeMarker();
    expect(isExpired(marker)).toBe(false);
  });
});

// ─── Ethical Compliance ──────────────────────────────────────────────────────

describe("validateEthicalCompliance", () => {
  it("flags forced exit without reason", () => {
    const marker = makeMarker({ exitType: ExitType.Forced });
    const result = validateEthicalCompliance(marker);
    expect(result.compliant).toBe(false);
    expect(result.violations.some((v) => v.includes("reason"))).toBe(true);
  });

  it("flags conflicting origin status without right of reply", () => {
    const marker = makeMarker({
      status: ExitStatus.GoodStanding,
      dispute: { originStatus: ExitStatus.Disputed },
    });
    const result = validateEthicalCompliance(marker);
    expect(result.compliant).toBe(false);
    expect(result.violations.some((v) => v.includes("right of reply"))).toBe(true);
  });

  it("passes for clean voluntary exit", () => {
    const marker = makeMarker();
    const result = validateEthicalCompliance(marker);
    expect(result.compliant).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});

// ─── Ethics Report ───────────────────────────────────────────────────────────

describe("generateEthicsReport", () => {
  it("generates comprehensive audit of mixed marker set", () => {
    const markers = [
      // Clean exit
      makeMarker({ id: "urn:exit:clean", subject: "did:key:zClean" }),
      // Coerced exit
      makeMarker({
        id: "urn:exit:coerced",
        subject: "did:key:zVictim",
        origin: "https://bad.example",
        exitType: ExitType.Forced,
        status: ExitStatus.GoodStanding,
        dispute: { originStatus: ExitStatus.Disputed },
      }),
      // More forced from same origin (weaponization)
      ...Array.from({ length: 3 }, (_, i) =>
        makeMarker({
          id: `urn:exit:forced${i}`,
          subject: `did:key:zVictim${i}`,
          origin: "https://bad.example",
          exitType: ExitType.Forced,
          timestamp: "2026-01-15T10:00:00.000Z",
        })
      ),
    ];

    const report = generateEthicsReport(markers);
    expect(report.markerCount).toBe(5);
    expect(report.coercionFindings.length).toBe(5);
    expect(report.weaponization.severity).not.toBe("none");
    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(["medium", "high", "critical"]).toContain(report.overallRisk);
  });

  it("reports low risk for all clean markers", () => {
    const markers = Array.from({ length: 3 }, (_, i) =>
      makeMarker({
        id: `urn:exit:ok${i}`,
        subject: `did:key:zOk${i}`,
        origin: `https://platform${i}.example`,
      })
    );
    const report = generateEthicsReport(markers);
    expect(report.overallRisk).toBe("low");
    expect(report.recommendations).toContain("No ethical concerns detected in this marker set.");
  });
});

// ─── Guardrails Constants ────────────────────────────────────────────────────

describe("guardrails constants", () => {
  it("ANTI_WEAPONIZATION_CLAUSE is a non-empty string", () => {
    expect(typeof ANTI_WEAPONIZATION_CLAUSE).toBe("string");
    expect(ANTI_WEAPONIZATION_CLAUSE.length).toBeGreaterThan(50);
    expect(ANTI_WEAPONIZATION_CLAUSE).toContain("blacklist");
  });

  it("addCoercionLabel attaches label without mutating original", () => {
    const marker = makeMarker();
    const labeled = addCoercionLabel(marker, CoercionLabel.PossibleRetaliation, "Short tenure before forced exit");
    expect(labeled.coercionLabel).toBe(CoercionLabel.PossibleRetaliation);
    expect(labeled.metadata?.tags).toContain(`coercion:${CoercionLabel.PossibleRetaliation}`);
    expect(marker.coercionLabel).toBeUndefined();
  });
});
