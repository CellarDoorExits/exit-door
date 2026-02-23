import { describe, it, expect } from "vitest";
import {
  generateKeyPair,
  createMarker,
  signMarker,
  wrapAsVC,
  unwrapVC,
  isVC,
  ExitType,
  EXIT_CONTEXT_V1,
  VC_CONTEXT,
} from "../index.js";

describe("Verifiable Credential Wrapper", () => {
  it("wraps a marker as VC and unwraps round-trip", () => {
    const marker = createMarker({
      subject: "did:key:zVCTest",
      origin: "https://example.com",
      exitType: ExitType.Voluntary,
    });

    const vc = wrapAsVC(marker);
    expect(vc["@context"]).toEqual([VC_CONTEXT, EXIT_CONTEXT_V1]);
    expect(vc.type).toEqual(["VerifiableCredential", "ExitCredential"]);
    expect(vc.issuer).toBe(marker.subject);
    expect(vc.issuanceDate).toBe(marker.timestamp);
    expect(vc.credentialSubject).toEqual(marker);

    const unwrapped = unwrapVC(vc);
    expect(unwrapped).toEqual(marker);
  });

  it("has correct VC structure", () => {
    const marker = createMarker({
      subject: "did:key:zStructure",
      origin: "https://example.com",
      exitType: ExitType.Voluntary,
    });

    const vc = wrapAsVC(marker);
    expect(vc.id).toMatch(/^urn:vc:exit:/);
    expect(isVC(vc)).toBe(true);
    expect(isVC({})).toBe(false);
    expect(isVC(null)).toBe(false);
    expect(isVC({ "@context": ["wrong"], type: ["VerifiableCredential"] })).toBe(false);
  });

  it("transfers proof from signed marker", () => {
    const { publicKey, privateKey } = generateKeyPair();
    const marker = createMarker({
      subject: "did:key:zSigned",
      origin: "https://example.com",
      exitType: ExitType.Voluntary,
    });

    const signed = signMarker(marker, privateKey, publicKey);
    const vc = wrapAsVC(signed);

    expect(vc.proof).toBeDefined();
    expect(vc.proof!.type).toBe("Ed25519Signature2020");
    expect(vc.proof!.proofValue).toBe(signed.proof.proofValue);

    // Round-trip still works
    const unwrapped = unwrapVC(vc);
    expect(unwrapped.proof.proofValue).toBe(signed.proof.proofValue);
  });
});
