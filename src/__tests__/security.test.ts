import { describe, it, expect } from "vitest";
import { generateKeyPair, didFromPublicKey, generateP256KeyPair, didFromP256PublicKey } from "../crypto.js";
import { signMarker, verifyMarker, signMarkerWithSigner } from "../proof.js";
import { Ed25519Signer, P256Signer } from "../signer.js";
import { createMarker } from "../marker.js";
import { ExitType } from "../types.js";

function makeMarker(subject: string) {
  return createMarker({
    subject,
    origin: "did:key:zFakeOrigin",
    exitType: ExitType.Voluntary,
  });
}

describe("Security: Subject-key binding (P19-F2)", () => {
  it("rejects marker where verificationMethod does not match subject", () => {
    const attacker = generateKeyPair();
    const victim = generateKeyPair();
    const victimDid = didFromPublicKey(victim.publicKey);

    // Attacker signs a marker claiming to be the victim
    const marker = makeMarker(victimDid);
    const signed = signMarker(marker, attacker.privateKey, attacker.publicKey);

    // verificationMethod will be attacker's DID, subject is victim's DID
    const result = verifyMarker(signed);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("attribution forgery") || e.includes("does not match"))).toBe(true);
  });

  it("accepts marker where verificationMethod matches subject", () => {
    const keys = generateKeyPair();
    const did = didFromPublicKey(keys.publicKey);
    const marker = makeMarker(did);
    const signed = signMarker(marker, keys.privateKey, keys.publicKey);
    const result = verifyMarker(signed);
    expect(result.valid).toBe(true);
  });

  it("accepts marker with no subject field (backward compat)", () => {
    const keys = generateKeyPair();
    const marker = makeMarker(didFromPublicKey(keys.publicKey));
    delete (marker as any).subject;
    const signed = signMarker(marker, keys.privateKey, keys.publicKey);
    const result = verifyMarker(signed);
    // The key point: it should NOT fail on subject-key binding
    expect(result.errors.every(e => !e.includes("attribution forgery"))).toBe(true);
  });
});

describe("Security: Algorithm cross-check (P19-F1)", () => {
  it("rejects P-256 signature with Ed25519 proof type", () => {
    const keys = generateP256KeyPair();
    const did = didFromP256PublicKey(keys.publicKey);
    const marker = makeMarker(did);

    const signer = new P256Signer(keys.privateKey, keys.publicKey);
    return signMarkerWithSigner(marker, signer).then(signed => {
      // Tamper: change proof type to Ed25519
      const tampered = {
        ...signed,
        proof: { ...signed.proof!, type: "Ed25519Signature2020" as any }
      };
      const result = verifyMarker(tampered);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("Algorithm mismatch"))).toBe(true);
    });
  });
});

describe("Security: id exclusion from signing", () => {
  it("markers with different ids but same content verify identically", () => {
    const keys = generateKeyPair();
    const did = didFromPublicKey(keys.publicKey);
    const marker = makeMarker(did);
    const signed = signMarker(marker, keys.privateKey, keys.publicKey);

    // Change the id after signing
    const modified = { ...signed, id: "completely-different-id" };
    const result = verifyMarker(modified);
    expect(result.valid).toBe(true);
  });
});
