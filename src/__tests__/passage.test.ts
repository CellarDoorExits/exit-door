/**
 * Passage API tests — verify renamed API surface works correctly.
 */

import { describe, it, expect } from "vitest";
import {
  createDepartureMarker,
  signDepartureMarker,
  verifyDeparture,
  quickDeparture,
  quickPassageVerify,
  generatePassageIdentity,
  signDepartureWithSigner,
  verifyDepartureMultiAlg,
  // Verify old names still work
  createMarker,
  signMarker,
  verifyMarker,
  quickExit,
} from "../passage.js";
import type { DepartureMarker, PassageVerificationResult } from "../passage.js";
import { generateKeyPair, didFromPublicKey } from "../crypto.js";
import { createSigner } from "../signer.js";

describe("Passage API (v0.2.0 rename)", () => {
  it("createDepartureMarker is createMarker", () => {
    expect(createDepartureMarker).toBe(createMarker);
  });

  it("signDepartureMarker is signMarker", () => {
    expect(signDepartureMarker).toBe(signMarker);
  });

  it("verifyDeparture is verifyMarker", () => {
    expect(verifyDeparture).toBe(verifyMarker);
  });

  it("quickDeparture is quickExit", () => {
    expect(quickDeparture).toBe(quickExit);
  });

  it("full round-trip with Passage API", () => {
    const { publicKey, privateKey } = generateKeyPair();
    const did = didFromPublicKey(publicKey);

    const marker = createDepartureMarker({
      subject: did,
      origin: "https://platform.example.com",
      exitType: "voluntary" as any,
      status: "good_standing" as any,
    });

    const signed = signDepartureMarker(marker, privateKey, publicKey);
    const result = verifyDeparture(signed);
    expect(result.valid).toBe(true);
  });

  it("quickDeparture creates valid marker", () => {
    const result = quickDeparture("https://platform.example.com");
    expect(result.marker.proof.proofValue).toBeTruthy();
    expect(result.identity.did).toMatch(/^did:key:z/);
  });

  it("quickPassageVerify verifies marker (takes JSON string)", () => {
    const { marker } = quickDeparture("https://test.com");
    const result = quickPassageVerify(JSON.stringify(marker));
    expect(result.valid).toBe(true);
  });

  it("generatePassageIdentity returns identity", () => {
    const identity = generatePassageIdentity();
    expect(identity.did).toMatch(/^did:key:z/);
    expect(identity.publicKey).toBeInstanceOf(Uint8Array);
    expect(identity.privateKey).toBeInstanceOf(Uint8Array);
  });

  it("signDepartureWithSigner works with P-256", async () => {
    const signer = createSigner({ algorithm: "P-256" });
    const marker = createDepartureMarker({
      subject: signer.did(),
      origin: "https://platform.example.com",
      exitType: "voluntary" as any,
      status: "good_standing" as any,
    });
    const signed = await signDepartureWithSigner(marker, signer);
    expect(signed.proof.type).toBe("EcdsaP256Signature2019");

    const result = await verifyDepartureMultiAlg(signed);
    expect(result.valid).toBe(true);
  });

  it("type aliases are compatible", () => {
    const { marker } = quickDeparture("https://test.com");
    // DepartureMarker should be assignable to/from ExitMarker
    const departure: DepartureMarker = marker;
    expect(departure.proof).toBeDefined();

    // PassageVerificationResult should work
    const result: PassageVerificationResult = verifyDeparture(marker);
    expect(result.valid).toBe(true);
  });

  it("old names still work (backward compat)", () => {
    const result = quickExit("https://compat.example.com");
    expect(result.marker.proof.proofValue).toBeTruthy();
  });
});
