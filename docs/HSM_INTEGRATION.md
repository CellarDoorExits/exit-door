# HSM Integration Guide

Use the `Signer` interface to plug in hardware security modules (HSMs), cloud KMS providers, or hardware tokens for FIPS-validated cryptography.

## The Signer Interface

```typescript
interface Signer {
  readonly algorithm: "Ed25519" | "P-256";
  sign(data: Uint8Array): Promise<Uint8Array> | Uint8Array;
  verify(data: Uint8Array, signature: Uint8Array): Promise<boolean> | boolean;
  did(): string;
  publicKey(): Uint8Array;
}
```

The interface accepts both sync and async return types, so HSM implementations that require network calls work natively.

## AWS KMS

```typescript
import { KMSClient, SignCommand, VerifyCommand, GetPublicKeyCommand } from "@aws-sdk/client-kms";
import { signMarkerWithSigner } from "cellar-door-exit";
import type { Signer } from "cellar-door-exit";

class AwsKmsSigner implements Signer {
  readonly algorithm = "P-256" as const;
  private client: KMSClient;
  private keyId: string;
  private cachedPublicKey?: Uint8Array;
  private cachedDid?: string;

  constructor(keyId: string, region: string = "us-east-1") {
    this.client = new KMSClient({ region });
    this.keyId = keyId;
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    const cmd = new SignCommand({
      KeyId: this.keyId,
      Message: data,
      MessageType: "RAW",
      SigningAlgorithm: "ECDSA_SHA_256",
    });
    const result = await this.client.send(cmd);
    return new Uint8Array(result.Signature!);
  }

  async verify(data: Uint8Array, signature: Uint8Array): Promise<boolean> {
    const cmd = new VerifyCommand({
      KeyId: this.keyId,
      Message: data,
      MessageType: "RAW",
      Signature: signature,
      SigningAlgorithm: "ECDSA_SHA_256",
    });
    const result = await this.client.send(cmd);
    return result.SignatureValid ?? false;
  }

  publicKey(): Uint8Array {
    if (!this.cachedPublicKey) throw new Error("Call init() first");
    return this.cachedPublicKey;
  }

  did(): string {
    if (!this.cachedDid) throw new Error("Call init() first");
    return this.cachedDid;
  }

  /** Must be called once before use — fetches public key from KMS. */
  async init(): Promise<this> {
    const cmd = new GetPublicKeyCommand({ KeyId: this.keyId });
    const result = await this.client.send(cmd);
    // KMS returns DER-encoded SubjectPublicKeyInfo — extract raw key
    this.cachedPublicKey = extractP256PublicKey(new Uint8Array(result.PublicKey!));
    this.cachedDid = didFromP256PublicKey(this.cachedPublicKey);
    return this;
  }
}

// Usage:
const signer = await new AwsKmsSigner("alias/exit-signing-key").init();
const signed = await signMarkerWithSigner(marker, signer);
```

**KMS Key Requirements:**
- Key spec: `ECC_NIST_P256`
- Key usage: `SIGN_VERIFY`
- This provides FIPS 140-2 Level 2 (or Level 3 with CloudHSM backing)

## Azure Key Vault

```typescript
import { CryptographyClient, KeyClient } from "@azure/keyvault-keys";
import { DefaultAzureCredential } from "@azure/identity";
import type { Signer } from "cellar-door-exit";

class AzureKeyVaultSigner implements Signer {
  readonly algorithm = "P-256" as const;
  private cryptoClient: CryptographyClient;
  private cachedPublicKey?: Uint8Array;
  private cachedDid?: string;

  constructor(vaultUrl: string, keyName: string) {
    const credential = new DefaultAzureCredential();
    const keyClient = new KeyClient(vaultUrl, credential);
    // CryptographyClient is initialized in init()
    this.cryptoClient = null as any;
    this._vaultUrl = vaultUrl;
    this._keyName = keyName;
    this._credential = credential;
    this._keyClient = keyClient;
  }
  private _vaultUrl: string;
  private _keyName: string;
  private _credential: any;
  private _keyClient: any;

  async sign(data: Uint8Array): Promise<Uint8Array> {
    // Azure expects pre-hashed data for ES256
    const hash = await crypto.subtle.digest("SHA-256", data);
    const result = await this.cryptoClient.sign("ES256", new Uint8Array(hash));
    return result.result;
  }

  async verify(data: Uint8Array, signature: Uint8Array): Promise<boolean> {
    const hash = await crypto.subtle.digest("SHA-256", data);
    const result = await this.cryptoClient.verify("ES256", new Uint8Array(hash), signature);
    return result.result;
  }

  publicKey(): Uint8Array {
    if (!this.cachedPublicKey) throw new Error("Call init() first");
    return this.cachedPublicKey;
  }

  did(): string {
    if (!this.cachedDid) throw new Error("Call init() first");
    return this.cachedDid;
  }

  async init(): Promise<this> {
    const key = await this._keyClient.getKey(this._keyName);
    this.cryptoClient = new CryptographyClient(key.id!, this._credential);
    // Extract raw P-256 point from JWK
    const jwk = key.key!;
    this.cachedPublicKey = compressP256Point(
      Buffer.from(jwk.x!, "base64url"),
      Buffer.from(jwk.y!, "base64url")
    );
    this.cachedDid = didFromP256PublicKey(this.cachedPublicKey);
    return this;
  }
}
```

**Key Vault Key Requirements:**
- Key type: `EC`
- Curve: `P-256`
- Operations: `sign`, `verify`
- Azure Key Vault Managed HSM provides FIPS 140-2 Level 3

## YubiKey (PKCS#11)

```typescript
import * as pkcs11 from "pkcs11js";
import type { Signer } from "cellar-door-exit";

class YubiKeySigner implements Signer {
  readonly algorithm = "P-256" as const;
  private session: any;
  private privateKeyHandle: any;
  private cachedPublicKey: Uint8Array;
  private cachedDid: string;

  constructor(pin: string, slot: number = 0) {
    const p11 = new pkcs11.PKCS11();
    p11.load("/usr/lib/libykcs11.so"); // Platform-dependent path
    p11.C_Initialize();

    const slots = p11.C_GetSlotList(true);
    this.session = p11.C_OpenSession(slots[slot], pkcs11.CKF_SERIAL_SESSION);
    p11.C_Login(this.session, pkcs11.CKU_USER, pin);

    // Find the P-256 key pair on the YubiKey
    // (assumes key is already generated on the device)
    const { privateKey, publicKey } = this.findKeyPair(p11);
    this.privateKeyHandle = privateKey;
    this.cachedPublicKey = publicKey;
    this.cachedDid = didFromP256PublicKey(publicKey);
  }

  sign(data: Uint8Array): Uint8Array {
    // ECDSA signing via PKCS#11
    const mechanism = { mechanism: pkcs11.CKM_ECDSA_SHA256 };
    const p11 = this.p11;
    p11.C_SignInit(this.session, mechanism, this.privateKeyHandle);
    return new Uint8Array(p11.C_Sign(this.session, Buffer.from(data), Buffer.alloc(64)));
  }

  verify(data: Uint8Array, signature: Uint8Array): boolean {
    // For YubiKey verification, use software verification
    // (hardware verify is slow and unnecessary — just verify the public key)
    return verifyP256(data, signature, this.cachedPublicKey);
  }

  publicKey(): Uint8Array { return this.cachedPublicKey; }
  did(): string { return this.cachedDid; }

  private findKeyPair(p11: any) { /* ... PKCS#11 object search ... */ }
  private p11: any;
}
```

**YubiKey Requirements:**
- YubiKey 5 series or newer (FIPS variant for FIPS 140-2 Level 3)
- PIV applet with P-256 key in slot 9a (Authentication) or 9c (Digital Signature)
- YKCS11 library installed

## Google Cloud KMS

```typescript
import { KeyManagementServiceClient } from "@google-cloud/kms";
import type { Signer } from "cellar-door-exit";

class GcpKmsSigner implements Signer {
  readonly algorithm = "P-256" as const;
  // Similar pattern to AWS: init() fetches public key, sign() calls KMS
  // Key: projects/{project}/locations/{location}/keyRings/{ring}/cryptoKeys/{key}/cryptoKeyVersions/{version}
  // Algorithm: EC_SIGN_P256_SHA256
}
```

## Helper Functions

You'll need these utilities to extract raw P-256 keys from HSM responses:

```typescript
import { didFromP256PublicKey, verifyP256 } from "cellar-door-exit";

/** Extract compressed P-256 public key from DER SubjectPublicKeyInfo. */
function extractP256PublicKey(spki: Uint8Array): Uint8Array {
  // The uncompressed point (65 bytes: 0x04 + 32 X + 32 Y) is at the end
  const uncompressed = spki.slice(-65);
  if (uncompressed[0] !== 0x04) throw new Error("Expected uncompressed point");
  return compressP256Point(uncompressed.slice(1, 33), uncompressed.slice(33));
}

/** Compress an uncompressed P-256 point to 33 bytes. */
function compressP256Point(x: Uint8Array, y: Uint8Array): Uint8Array {
  const prefix = (y[31] & 1) === 0 ? 0x02 : 0x03;
  const compressed = new Uint8Array(33);
  compressed[0] = prefix;
  compressed.set(x, 1);
  return compressed;
}
```

## Testing HSM Integrations

```typescript
import { signMarkerWithSigner, verifyMarkerMultiAlg } from "cellar-door-exit";

// 1. Sign with HSM
const signed = await signMarkerWithSigner(marker, hsmSigner);

// 2. Verify with software (no HSM needed for verification)
const result = await verifyMarkerMultiAlg(signed);
console.log(result.valid); // true

// 3. Check proof type
console.log(signed.proof.type); // "EcdsaP256Signature2019"
```

## Algorithm Selection Guide

| Provider | Ed25519 | P-256 (FIPS) | Notes |
|----------|---------|--------------|-------|
| Software (default) | ✅ Fast | ✅ Fast | `createSigner()` — no HSM, no FIPS |
| AWS KMS | ❌ | ✅ | `ECC_NIST_P256` key spec |
| Azure Key Vault | ❌ | ✅ | `P-256` curve, `ES256` algorithm |
| Google Cloud KMS | ❌ | ✅ | `EC_SIGN_P256_SHA256` |
| YubiKey (PIV) | ❌ | ✅ | PKCS#11 via ykcs11 |
| HashiCorp Vault | ✅ | ✅ | Transit secrets engine |

**Note:** Most cloud HSMs do not support Ed25519. Use P-256 for FIPS/HSM deployments.

---

*This guide references the `Signer` interface from cellar-door-exit v0.1.x.*
