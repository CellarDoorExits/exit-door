/**
 * Property-Based Tests for EXIT Protocol
 *
 * Uses fast-check to generate random inputs and verify invariants
 * across 100+ iterations per property.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  generateKeyPair,
  createMarker,
  computeId,
  signMarker,
  verifyMarker,
  validateMarker,
  ExitType,
  ExitStatus,
  EXIT_CONTEXT_V1,
  CeremonyState,
} from "../index.js";
import { canonicalize } from "../marker.js";
import { didFromPublicKey } from "../crypto.js";
import { encryptMarker, decryptMarker, redactMarker } from "../privacy.js";
import {
  computeAnchorHash,
  createBatchExit,
  computeMerkleProof,
  verifyBatchMembership,
} from "../index.js";
import { getValidTransitions } from "../ceremony.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { randomBytes } from "@noble/ciphers/utils.js";

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const arbExitType = fc.constantFrom(
  ExitType.Voluntary,
  ExitType.Forced,
  ExitType.Emergency,
  ExitType.KeyCompromise
);

const arbNonEmptyString = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);

function makeMarkerAndKeys(exitType: ExitType, justification: string, origin = "https://example.com") {
  const kp = generateKeyPair();
  const subject = didFromPublicKey(kp.publicKey);
  const opts: any = { subject, origin, exitType };
  if (exitType === ExitType.Emergency) {
    opts.emergencyJustification = justification;
  }
  const marker = createMarker(opts);
  return { marker, kp };
}

// ─── Properties ──────────────────────────────────────────────────────────────

describe("Property-Based Tests", () => {
  it("any signed marker always verifies", () => {
    fc.assert(
      fc.property(
        arbExitType,
        arbNonEmptyString,
        (exitType, justification) => {
          const { marker, kp } = makeMarkerAndKeys(exitType, justification);
          const signed = signMarker(marker, kp.privateKey, kp.publicKey);
          const result = verifyMarker(signed);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("canonicalization is deterministic (same marker → same canonical form → same hash)", () => {
    fc.assert(
      fc.property(
        arbExitType,
        arbNonEmptyString,
        (exitType, justification) => {
          const { marker } = makeMarkerAndKeys(exitType, justification, "https://test.com");
          const c1 = canonicalize(marker);
          const c2 = canonicalize(marker);
          const c3 = canonicalize(JSON.parse(JSON.stringify(marker)));
          expect(c1).toBe(c2);
          expect(c1).toBe(c3);

          const id1 = computeId(marker);
          const id2 = computeId(marker);
          expect(id1).toBe(id2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("tampered markers never verify (flip any byte in signed marker → verification fails)", () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 3 }),
        fc.nat({ max: 200 }),
        (exitTypeIdx, byteOffset) => {
          const exitTypes = [ExitType.Voluntary, ExitType.Forced, ExitType.Emergency, ExitType.KeyCompromise];
          const exitType = exitTypes[exitTypeIdx % exitTypes.length];
          const { marker, kp } = makeMarkerAndKeys(exitType, "Infrastructure failure detected");
          const signed = signMarker(marker, kp.privateKey, kp.publicKey);

          // Tamper with the proofValue
          const proofBytes = atob(signed.proof.proofValue);
          if (proofBytes.length === 0) return;
          const tamperIdx = byteOffset % proofBytes.length;
          const tampered = new Uint8Array(proofBytes.length);
          for (let i = 0; i < proofBytes.length; i++) {
            tampered[i] = proofBytes.charCodeAt(i);
          }
          tampered[tamperIdx] ^= 0x01;
          const tamperedProof = Buffer.from(tampered).toString("base64");

          const tamperedMarker = {
            ...signed,
            proof: { ...signed.proof, proofValue: tamperedProof },
          };

          const result = verifyMarker(tamperedMarker);
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("ceremony states only move forward (never backward, except emergency shortcut)", () => {
    const stateOrder: CeremonyState[] = [
      CeremonyState.Alive,
      CeremonyState.Intent,
      CeremonyState.Snapshot,
      CeremonyState.Open,
      CeremonyState.Contested,
      CeremonyState.Final,
      CeremonyState.Departed,
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...stateOrder),
        (state) => {
          const validNext = getValidTransitions(state);
          const currentIdx = stateOrder.indexOf(state);

          for (const next of validNext) {
            const nextIdx = stateOrder.indexOf(next);
            if (state === CeremonyState.Alive && next === CeremonyState.Final) {
              continue; // Emergency shortcut allowed
            }
            expect(nextIdx).toBeGreaterThan(currentIdx);
          }

          if (state === CeremonyState.Departed) {
            expect(validNext).toHaveLength(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("content-addressed IDs are collision-resistant (different markers → different IDs)", () => {
    fc.assert(
      fc.property(
        arbNonEmptyString,
        arbNonEmptyString,
        (origin1, origin2) => {
          const fullOrigin1 = `https://${origin1.replace(/[^a-z0-9]/gi, "x")}.com`;
          const fullOrigin2 = `https://${origin2.replace(/[^a-z0-9]/gi, "y")}.org`;
          if (fullOrigin1 === fullOrigin2) return;

          const kp = generateKeyPair();
          const subject = didFromPublicKey(kp.publicKey);

          const m1 = createMarker({ subject, origin: fullOrigin1, exitType: ExitType.Voluntary });
          const m2 = createMarker({ subject, origin: fullOrigin2, exitType: ExitType.Voluntary });

          const id1 = computeId(m1);
          const id2 = computeId(m2);
          expect(id1).not.toBe(id2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("encryption round-trips (encrypt → decrypt = original)", () => {
    fc.assert(
      fc.property(
        arbExitType,
        arbNonEmptyString,
        (exitType, justification) => {
          const { marker, kp } = makeMarkerAndKeys(exitType, justification, "https://encrypt-test.com");
          const signed = signMarker(marker, kp.privateKey, kp.publicKey);

          const recipientPrivate = randomBytes(32);
          const recipientPublic = x25519.getPublicKey(recipientPrivate);

          const encrypted = encryptMarker(signed, recipientPublic);
          const decrypted = decryptMarker(encrypted, recipientPrivate);

          expect(decrypted["@context"]).toBe(signed["@context"]);
          expect(decrypted.id).toBe(signed.id);
          expect(decrypted.subject).toBe(signed.subject);
          expect(decrypted.origin).toBe(signed.origin);
          expect(decrypted.timestamp).toBe(signed.timestamp);
          expect(decrypted.exitType).toBe(signed.exitType);
          expect(decrypted.status).toBe(signed.status);
          expect(decrypted.proof.proofValue).toBe(signed.proof.proofValue);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("redaction preserves non-redacted fields exactly", () => {
    fc.assert(
      fc.property(
        arbExitType,
        arbNonEmptyString,
        (exitType, justification) => {
          const { marker, kp } = makeMarkerAndKeys(exitType, justification, "https://redact-test.com");
          const signed = signMarker(marker, kp.privateKey, kp.publicKey);

          const redacted = redactMarker(signed, ["origin"]);

          expect(redacted["@context"]).toBe(signed["@context"]);
          expect(redacted.id).toBe(signed.id);
          expect(redacted.subject).toBe(signed.subject);
          expect(redacted.timestamp).toBe(signed.timestamp);
          expect(redacted.exitType).toBe(signed.exitType);
          expect(redacted.status).toBe(signed.status);

          expect(typeof redacted.origin).toBe("string");
          expect((redacted.origin as string).startsWith("redacted:sha256:")).toBe(true);
          expect(redacted.origin).not.toBe(signed.origin);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Merkle proofs always verify for included markers", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        fc.nat(),
        (count, indexSeed) => {
          const markers = [];
          for (let i = 0; i < count; i++) {
            const kp = generateKeyPair();
            const subject = didFromPublicKey(kp.publicKey);
            const marker = createMarker({
              subject,
              origin: `https://batch-${i}.com`,
              exitType: ExitType.Voluntary,
            });
            const signed = signMarker(marker, kp.privateKey, kp.publicKey);
            markers.push(signed);
          }

          const batch = createBatchExit(markers);
          const targetIdx = indexSeed % markers.length;
          const proof = computeMerkleProof(batch.leaves, targetIdx);

          const verified = verifyBatchMembership(
            markers[targetIdx],
            batch.merkleRoot,
            proof
          );
          expect(verified).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("valid markers always pass validation", () => {
    fc.assert(
      fc.property(
        arbExitType,
        arbNonEmptyString,
        (exitType, justification) => {
          const { marker, kp } = makeMarkerAndKeys(exitType, justification, "https://valid-test.com");
          const signed = signMarker(marker, kp.privateKey, kp.publicKey);

          const result = validateMarker(signed);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("markers with missing required fields always fail validation", () => {
    const requiredFields = ["@context", "id", "subject", "origin", "timestamp", "exitType", "status", "proof"];

    fc.assert(
      fc.property(
        fc.constantFrom(...requiredFields),
        (fieldToRemove) => {
          const { marker, kp } = makeMarkerAndKeys(ExitType.Voluntary, "n/a");
          const signed = signMarker(marker, kp.privateKey, kp.publicKey);

          const broken = { ...signed } as Record<string, unknown>;
          delete broken[fieldToRemove];

          const result = validateMarker(broken);
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
