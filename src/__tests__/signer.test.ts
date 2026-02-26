import { describe, it, expect } from "vitest";
import {
  Ed25519Signer,
  P256Signer,
  createSigner,
  createVerifier,
  generateKeyPairForAlgorithm,
  proofTypeForAlgorithm,
  algorithmFromProofType,
  generateKeyPair,
  generateP256KeyPair,
  didFromPublicKey,
  didFromP256PublicKey,
  publicKeyFromDid,
  publicKeyFromP256Did,
  createMarker,
  signMarker,
  verifyMarker,
  signMarkerWithSigner,
  verifyMarkerMultiAlg,
  ExitType,
} from "../index.js";

// ─── Ed25519Signer ───────────────────────────────────────────────────────────

describe("Ed25519Signer", () => {
  it("generates, signs, and verifies", () => {
    const kp = generateKeyPairForAlgorithm("Ed25519");
    const signer = new Ed25519Signer(kp.privateKey, kp.publicKey);
    const data = new TextEncoder().encode("hello");
    const sig = signer.sign(data);
    expect(signer.verify(data, sig as Uint8Array)).toBe(true);
  });

  it("has correct algorithm", () => {
    const kp = generateKeyPairForAlgorithm("Ed25519");
    const signer = new Ed25519Signer(kp.privateKey, kp.publicKey);
    expect(signer.algorithm).toBe("Ed25519");
  });

  it("produces did:key starting with z6Mk", () => {
    const kp = generateKeyPairForAlgorithm("Ed25519");
    const signer = new Ed25519Signer(kp.privateKey, kp.publicKey);
    expect(signer.did()).toMatch(/^did:key:z6Mk/);
  });

  it("returns the public key", () => {
    const kp = generateKeyPairForAlgorithm("Ed25519");
    const signer = new Ed25519Signer(kp.privateKey, kp.publicKey);
    expect(signer.publicKey()).toEqual(kp.publicKey);
  });
});

// ─── P256Signer ──────────────────────────────────────────────────────────────

describe("P256Signer", () => {
  it("generates, signs, and verifies", () => {
    const kp = generateKeyPairForAlgorithm("P-256");
    const signer = new P256Signer(kp.privateKey, kp.publicKey);
    const data = new TextEncoder().encode("hello");
    const sig = signer.sign(data);
    expect(signer.verify(data, sig as Uint8Array)).toBe(true);
  });

  it("has correct algorithm", () => {
    const kp = generateKeyPairForAlgorithm("P-256");
    const signer = new P256Signer(kp.privateKey, kp.publicKey);
    expect(signer.algorithm).toBe("P-256");
  });

  it("produces did:key with P-256 prefix", () => {
    const kp = generateKeyPairForAlgorithm("P-256");
    const signer = new P256Signer(kp.privateKey, kp.publicKey);
    expect(signer.did()).toMatch(/^did:key:z/);
    // P-256 compressed key is 33 bytes
    expect(kp.publicKey.length).toBe(33);
  });

  it("returns the public key", () => {
    const kp = generateKeyPairForAlgorithm("P-256");
    const signer = new P256Signer(kp.privateKey, kp.publicKey);
    expect(signer.publicKey()).toEqual(kp.publicKey);
  });

  it("rejects tampered data", () => {
    const kp = generateKeyPairForAlgorithm("P-256");
    const signer = new P256Signer(kp.privateKey, kp.publicKey);
    const data = new TextEncoder().encode("hello");
    const sig = signer.sign(data) as Uint8Array;
    const tampered = new TextEncoder().encode("tampered");
    expect(signer.verify(tampered, sig)).toBe(false);
  });
});

// ─── createSigner factory ────────────────────────────────────────────────────

describe("createSigner", () => {
  it("defaults to Ed25519", () => {
    const signer = createSigner();
    expect(signer.algorithm).toBe("Ed25519");
  });

  it("creates P-256 signer", () => {
    const signer = createSigner({ algorithm: "P-256" });
    expect(signer.algorithm).toBe("P-256");
  });

  it("accepts existing keypair", () => {
    const kp = generateKeyPairForAlgorithm("P-256");
    const signer = createSigner({ algorithm: "P-256", privateKey: kp.privateKey, publicKey: kp.publicKey });
    expect(signer.did()).toBe(didFromP256PublicKey(kp.publicKey));
  });
});

// ─── createVerifier ──────────────────────────────────────────────────────────

describe("createVerifier", () => {
  it("verifies Ed25519 signatures", () => {
    const signer = createSigner({ algorithm: "Ed25519" });
    const data = new TextEncoder().encode("test");
    const sig = signer.sign(data) as Uint8Array;
    const verifier = createVerifier(signer.did(), signer.publicKey());
    expect(verifier.verify(data, sig)).toBe(true);
    expect(verifier.algorithm).toBe("Ed25519");
  });

  it("verifies P-256 signatures", () => {
    const signer = createSigner({ algorithm: "P-256" });
    const data = new TextEncoder().encode("test");
    const sig = signer.sign(data) as Uint8Array;
    const verifier = createVerifier(signer.did(), signer.publicKey());
    expect(verifier.verify(data, sig)).toBe(true);
    expect(verifier.algorithm).toBe("P-256");
  });
});

// ─── Cross-algorithm ─────────────────────────────────────────────────────────

describe("Cross-algorithm", () => {
  it("Ed25519 sig fails P-256 verify", () => {
    const edSigner = createSigner({ algorithm: "Ed25519" });
    const p256Signer = createSigner({ algorithm: "P-256" });
    const data = new TextEncoder().encode("cross");
    const sig = edSigner.sign(data) as Uint8Array;
    expect(p256Signer.verify(data, sig)).toBe(false);
  });

  it("P-256 sig fails Ed25519 verify", () => {
    const edSigner = createSigner({ algorithm: "Ed25519" });
    const p256Signer = createSigner({ algorithm: "P-256" });
    const data = new TextEncoder().encode("cross");
    const sig = p256Signer.sign(data) as Uint8Array;
    expect(edSigner.verify(data, sig)).toBe(false);
  });
});

// ─── signMarkerWithSigner + verifyMarkerMultiAlg ─────────────────────────────

describe("signMarkerWithSigner", () => {
  function makeMarker(did: string) {
    return createMarker({
      subject: did,
      origin: "https://example.com",
      exitType: ExitType.Voluntary,
    });
  }

  it("round-trips with Ed25519", async () => {
    const signer = createSigner({ algorithm: "Ed25519" });
    const marker = makeMarker(signer.did());
    const signed = await signMarkerWithSigner(marker, signer);
    expect(signed.proof).toBeDefined();
    expect(signed.proof!.type).toBe("Ed25519Signature2020");
    const result = await verifyMarkerMultiAlg(signed);
    expect(result.valid).toBe(true);
  });

  it("round-trips with P-256", async () => {
    const signer = createSigner({ algorithm: "P-256" });
    const marker = makeMarker(signer.did());
    const signed = await signMarkerWithSigner(marker, signer);
    expect(signed.proof).toBeDefined();
    expect(signed.proof!.type).toBe("EcdsaP256Signature2019");
    const result = await verifyMarkerMultiAlg(signed);
    expect(result.valid).toBe(true);
  });
});

// ─── Backward compatibility ──────────────────────────────────────────────────

describe("Backward compatibility", () => {
  it("old signMarker/verifyMarker still work", () => {
    const kp = generateKeyPair();
    const did = didFromPublicKey(kp.publicKey);
    const marker = createMarker({
      subject: did,
      origin: "https://example.com",
      exitType: ExitType.Voluntary,
    });
    const signed = signMarker(marker, kp.privateKey, kp.publicKey);
    const result = verifyMarker(signed);
    expect(result.valid).toBe(true);
  });

  it("verifyMarker accepts P-256 proofs", async () => {
    const signer = createSigner({ algorithm: "P-256" });
    const marker = createMarker({
      subject: signer.did(),
      origin: "https://example.com",
      exitType: ExitType.Voluntary,
    });
    const signed = await signMarkerWithSigner(marker, signer);
    const result = verifyMarker(signed);
    expect(result.valid).toBe(true);
  });
});

// ─── DID encoding ────────────────────────────────────────────────────────────

describe("P-256 DID encoding", () => {
  it("round-trips through did:key", () => {
    const kp = generateP256KeyPair();
    const did = didFromP256PublicKey(kp.publicKey);
    const recovered = publicKeyFromP256Did(did);
    expect(recovered).toEqual(kp.publicKey);
  });

  it("publicKeyFromDid also works for P-256 DIDs", () => {
    const kp = generateP256KeyPair();
    const did = didFromP256PublicKey(kp.publicKey);
    const recovered = publicKeyFromDid(did);
    expect(recovered).toEqual(kp.publicKey);
  });
});

// ─── proofTypeForAlgorithm ───────────────────────────────────────────────────

describe("proofTypeForAlgorithm", () => {
  it("returns Ed25519Signature2020 for Ed25519", () => {
    expect(proofTypeForAlgorithm("Ed25519")).toBe("Ed25519Signature2020");
  });

  it("returns EcdsaP256Signature2019 for P-256", () => {
    expect(proofTypeForAlgorithm("P-256")).toBe("EcdsaP256Signature2019");
  });
});

describe("algorithmFromProofType", () => {
  it("returns Ed25519 for Ed25519Signature2020", () => {
    expect(algorithmFromProofType("Ed25519Signature2020")).toBe("Ed25519");
  });

  it("returns P-256 for EcdsaP256Signature2019", () => {
    expect(algorithmFromProofType("EcdsaP256Signature2019")).toBe("P-256");
  });

  it("returns null for unknown", () => {
    expect(algorithmFromProofType("Unknown")).toBeNull();
  });
});
