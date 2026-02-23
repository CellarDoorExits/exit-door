/**
 * Tests for the Trust Signals module — mechanism design fixes for the lemons problem.
 */
import { describe, it, expect } from "vitest";
import {
  generateKeyPair,
  didFromPublicKey,
  createMarker,
  signMarker,
  ExitType,
  ExitStatus,
  StatusConfirmation,
  type ExitMarker,
  type ExitIntent,
} from "../index.js";
import {
  computeStatusConfirmation,
  createTenureAttestation,
  verifyTenureAttestation,
  parseDurationToDays,
  createCommitment,
  verifyCommitment,
  isRevealWindowOpen,
  extractConfidenceFactors,
  computeConfidence,
} from "../modules/trust.js";
import { signAttestation } from "../modules/origin-attestation.js";

function makeSignedMarker(overrides?: Partial<Parameters<typeof createMarker>[0]>): {
  marker: ExitMarker;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
} {
  const { publicKey, privateKey } = generateKeyPair();
  const did = didFromPublicKey(publicKey);
  let marker = createMarker({
    subject: did,
    origin: "did:web:platform.example",
    exitType: ExitType.Voluntary,
    ...overrides,
  });
  marker = signMarker(marker, privateKey, publicKey);
  return { marker, publicKey, privateKey };
}

describe("Status Confirmation", () => {
  it("returns self_only for basic self-attested marker", () => {
    const { marker } = makeSignedMarker();
    expect(computeStatusConfirmation(marker)).toBe(StatusConfirmation.SelfOnly);
  });

  it("returns mutual when origin agrees with subject status", () => {
    const { marker, publicKey, privateKey } = makeSignedMarker();
    const originKp = generateKeyPair();
    const attestation = signAttestation(
      marker,
      originKp.privateKey,
      originKp.publicKey,
      ExitStatus.GoodStanding,
      "Clean departure"
    );
    const markerWithDispute: ExitMarker = {
      ...marker,
      dispute: {
        originStatus: ExitStatus.GoodStanding,
        counterpartyAcks: [],
      },
    };
    expect(computeStatusConfirmation(markerWithDispute)).toBe(StatusConfirmation.Mutual);
  });

  it("returns disputed_by_origin when origin disagrees", () => {
    const { marker } = makeSignedMarker();
    const markerWithDispute: ExitMarker = {
      ...marker,
      dispute: {
        originStatus: ExitStatus.Disputed,
      },
    };
    expect(computeStatusConfirmation(markerWithDispute)).toBe(StatusConfirmation.DisputedByOrigin);
  });

  it("returns witnessed when counterparty acks present", () => {
    const { marker } = makeSignedMarker();
    const markerWithWitness: ExitMarker = {
      ...marker,
      dispute: {
        originStatus: ExitStatus.GoodStanding,
        counterpartyAcks: [
          {
            type: "Ed25519Signature2020",
            created: new Date().toISOString(),
            verificationMethod: "did:key:z6Mkwitness",
            proofValue: "dummyproof",
          },
        ],
      },
    };
    expect(computeStatusConfirmation(markerWithWitness)).toBe(StatusConfirmation.Witnessed);
  });
});

describe("Tenure Attestation", () => {
  it("creates and verifies a tenure attestation", () => {
    const { publicKey, privateKey } = generateKeyPair();
    const attestation = createTenureAttestation(
      "P365D",
      "2025-01-01T00:00:00.000Z",
      privateKey,
      publicKey,
      "subject"
    );
    expect(attestation.duration).toBe("P365D");
    expect(attestation.attestedBy).toBe("subject");
    expect(verifyTenureAttestation(attestation)).toBe(true);
  });

  it("rejects tampered tenure attestation", () => {
    const { publicKey, privateKey } = generateKeyPair();
    const attestation = createTenureAttestation(
      "P365D",
      "2025-01-01T00:00:00.000Z",
      privateKey,
      publicKey
    );
    attestation.duration = "P3650D"; // tamper
    expect(verifyTenureAttestation(attestation)).toBe(false);
  });

  it("creates origin-attested tenure", () => {
    const { publicKey, privateKey } = generateKeyPair();
    const attestation = createTenureAttestation(
      "P2Y",
      "2024-01-01T00:00:00.000Z",
      privateKey,
      publicKey,
      "origin"
    );
    expect(attestation.attestedBy).toBe("origin");
    expect(verifyTenureAttestation(attestation)).toBe(true);
  });
});

describe("Duration Parsing", () => {
  it("parses days", () => {
    expect(parseDurationToDays("P30D")).toBe(30);
  });

  it("parses years and months", () => {
    expect(parseDurationToDays("P1Y6M")).toBe(365 + 180);
  });

  it("parses complex duration", () => {
    expect(parseDurationToDays("P2Y3M15D")).toBe(730 + 90 + 15);
  });

  it("returns 0 for invalid", () => {
    expect(parseDurationToDays("invalid")).toBe(0);
  });
});

describe("Commit-Reveal", () => {
  it("creates a commitment and verifies against revealed intent", () => {
    const { publicKey, privateKey } = generateKeyPair();
    const did = didFromPublicKey(publicKey);

    const intent: ExitIntent = {
      subject: did,
      origin: "did:web:platform.example",
      timestamp: new Date().toISOString(),
      exitType: ExitType.Voluntary,
      proof: {
        type: "Ed25519Signature2020",
        created: new Date().toISOString(),
        verificationMethod: did,
        proofValue: "placeholder",
      },
    };

    const commitment = createCommitment(intent, 0, privateKey, publicKey); // 0ms delay for testing
    const result = verifyCommitment(commitment, intent);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails verification when intent is modified after commitment", () => {
    const { publicKey, privateKey } = generateKeyPair();
    const did = didFromPublicKey(publicKey);

    const intent: ExitIntent = {
      subject: did,
      origin: "did:web:platform.example",
      timestamp: new Date().toISOString(),
      exitType: ExitType.Voluntary,
      proof: {
        type: "Ed25519Signature2020",
        created: new Date().toISOString(),
        verificationMethod: did,
        proofValue: "placeholder",
      },
    };

    const commitment = createCommitment(intent, 0, privateKey, publicKey);

    // Tamper with the intent
    const tamperedIntent = { ...intent, origin: "did:web:evil.example" };
    const result = verifyCommitment(commitment, tamperedIntent);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("hash does not match"))).toBe(true);
  });

  it("fails when committer doesn't match intent subject", () => {
    const kp1 = generateKeyPair();
    const kp2 = generateKeyPair();
    const did1 = didFromPublicKey(kp1.publicKey);
    const did2 = didFromPublicKey(kp2.publicKey);

    const intent: ExitIntent = {
      subject: did1,
      origin: "did:web:platform.example",
      timestamp: new Date().toISOString(),
      exitType: ExitType.Voluntary,
      proof: {
        type: "Ed25519Signature2020",
        created: new Date().toISOString(),
        verificationMethod: did1,
        proofValue: "placeholder",
      },
    };

    // Different key creates the commitment
    const commitment = createCommitment(intent, 0, kp2.privateKey, kp2.publicKey);
    const result = verifyCommitment(commitment, intent);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("committer does not match"))).toBe(true);
  });

  it("isRevealWindowOpen works correctly", () => {
    const { publicKey, privateKey } = generateKeyPair();
    const did = didFromPublicKey(publicKey);
    const intent: ExitIntent = {
      subject: did,
      origin: "did:web:platform.example",
      timestamp: new Date().toISOString(),
      exitType: ExitType.Voluntary,
      proof: {
        type: "Ed25519Signature2020",
        created: new Date().toISOString(),
        verificationMethod: did,
        proofValue: "placeholder",
      },
    };

    // 0ms delay → window should be open
    const immediate = createCommitment(intent, 0, privateKey, publicKey);
    expect(isRevealWindowOpen(immediate)).toBe(true);

    // 1 hour delay → window should NOT be open
    const delayed = createCommitment(intent, 3600000, privateKey, publicKey);
    expect(isRevealWindowOpen(delayed)).toBe(false);
  });
});

describe("Confidence Scoring", () => {
  it("gives low score for self-attested-only marker", () => {
    const { marker } = makeSignedMarker();
    const factors = extractConfidenceFactors(marker);
    const score = computeConfidence(factors);
    expect(score.score).toBeLessThan(0.1);
    expect(score.level).toBe("none");
  });

  it("gives higher score for mutual attestation", () => {
    const { marker } = makeSignedMarker();
    const mutualMarker: ExitMarker = {
      ...marker,
      dispute: { originStatus: ExitStatus.GoodStanding },
    };
    const factors = extractConfidenceFactors(mutualMarker);
    const score = computeConfidence(factors);
    expect(score.score).toBeGreaterThan(0.3);
    expect(score.level).toBe("moderate");
  });

  it("tenure increases confidence", () => {
    const { marker } = makeSignedMarker();
    const kp = generateKeyPair();
    const subjectTenure = createTenureAttestation("P365D", "2025-01-01T00:00:00.000Z", kp.privateKey, kp.publicKey, "subject");
    const originTenure = createTenureAttestation("P365D", "2025-01-01T00:00:00.000Z", kp.privateKey, kp.publicKey, "origin");

    const mutualMarker: ExitMarker = {
      ...marker,
      dispute: { originStatus: ExitStatus.GoodStanding },
    };

    const withoutTenure = computeConfidence(extractConfidenceFactors(mutualMarker));
    const withTenure = computeConfidence(extractConfidenceFactors(mutualMarker, subjectTenure, originTenure));
    expect(withTenure.score).toBeGreaterThan(withoutTenure.score);
  });

  it("commit-reveal increases confidence", () => {
    const { marker } = makeSignedMarker();
    const without = computeConfidence(extractConfidenceFactors(marker, undefined, undefined, false));
    const withCR = computeConfidence(extractConfidenceFactors(marker, undefined, undefined, true));
    expect(withCR.score).toBeGreaterThan(without.score);
  });

  it("lineage depth increases confidence", () => {
    const { marker } = makeSignedMarker();
    const withLineage: ExitMarker = {
      ...marker,
      lineage: {
        lineageChain: ["did:key:z1", "did:key:z2", "did:key:z3", "did:key:z4", "did:key:z5"],
      },
    };
    const without = computeConfidence(extractConfidenceFactors(marker));
    const withL = computeConfidence(extractConfidenceFactors(withLineage));
    expect(withL.score).toBeGreaterThan(without.score);
  });

  it("disputed status gives zero or near-zero score", () => {
    const { marker } = makeSignedMarker();
    const disputed: ExitMarker = {
      ...marker,
      dispute: { originStatus: ExitStatus.Disputed },
    };
    const score = computeConfidence(extractConfidenceFactors(disputed));
    expect(score.score).toBe(0);
    expect(score.level).toBe("none");
  });

  it("score is capped at 1.0", () => {
    const { marker } = makeSignedMarker();
    const maxMarker: ExitMarker = {
      ...marker,
      dispute: {
        originStatus: ExitStatus.GoodStanding,
        counterpartyAcks: [
          {
            type: "Ed25519Signature2020",
            created: new Date().toISOString(),
            verificationMethod: "did:key:z6Mkwitness",
            proofValue: "dummy",
          },
        ],
      },
      lineage: {
        lineageChain: Array.from({ length: 20 }, (_, i) => `did:key:z${i}`),
      },
    };
    const kp = generateKeyPair();
    const tenure = createTenureAttestation("P10Y", "2016-01-01T00:00:00.000Z", kp.privateKey, kp.publicKey, "subject");
    const originTenure = createTenureAttestation("P10Y", "2016-01-01T00:00:00.000Z", kp.privateKey, kp.publicKey, "origin");
    const score = computeConfidence(extractConfidenceFactors(maxMarker, tenure, originTenure, true));
    expect(score.score).toBeLessThanOrEqual(1.0);
  });
});
