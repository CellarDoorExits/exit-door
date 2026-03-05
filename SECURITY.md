# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.3.x (v1.2 spec) | ✅ Active |
| 0.2.x (v1.1 spec) | ⚠️ Critical fixes only |
| < 0.2 | ❌ Unsupported |

## Reporting Vulnerabilities

**Please do NOT open public GitHub issues for security vulnerabilities.**

Email **hawthornhollows@gmail.com** with:
- Description of the vulnerability
- Steps to reproduce
- Impact assessment (if known)
- Your preferred attribution (or anonymous)

We will acknowledge receipt within **48 hours** and provide an initial assessment within **7 days**.

### Disclosure Policy

- We follow **coordinated disclosure** (90-day window).
- Critical vulnerabilities affecting deployed systems will receive expedited patches.
- We will credit reporters in the changelog unless anonymity is requested.
- We do not offer a bug bounty at this time.

## Cryptographic Algorithms

cellar-door-exit supports two signature algorithms:

| Algorithm | Default | FIPS 140-3 | Use Case |
|-----------|---------|------------|----------|
| **Ed25519** | ✅ | ❌ | General use, DID/VC ecosystem |
| **ECDSA P-256** | ✅ (co-default) | ✅ Approved | FIPS-required / enterprise / cloud KMS |

### Algorithm Agility

The `AlgorithmRegistry` supports fail-closed semantics: unknown algorithms are rejected, not silently downgraded. New algorithms require explicit registration.

### Security Certification Status

⚠️ **Neither algorithm implementation has undergone formal security certification.** The underlying cryptographic primitives are provided by [@noble/ed25519](https://github.com/paulmillr/noble-ed25519) and [@noble/curves](https://github.com/paulmillr/noble-curves), which have been independently audited by [Cure53 (2022)](https://github.com/nicolo-ribaudo/tc39-proposal-await-dictionary/blob/main/nicolo-ribaudo/tc39-proposal-await-dictionary/blob/main/nicolo-ribaudo/tc39-proposal-await-dictionary/).

However, **this package's specific usage of those primitives has not been independently audited.**

For production deployments requiring certified cryptography, use the `Signer` interface to connect a FIPS-validated HSM or cloud KMS provider.

### Key Storage

- **Production:** Use HSM-backed signing via the `Signer` interface
- **Cloud:** AWS KMS, GCP Cloud KMS, Azure Key Vault via `Signer` abstraction
- **Minimum:** Encrypted at rest, never in source control, via secrets managers
- **Crypto-shredding:** Use `KeyStore` interface for managed key lifecycle and deletion

### Key Material Zeroing Limitation

JavaScript runtimes use garbage-collected memory. `destroy()` calls `Uint8Array.fill(0)` on key buffers but this is **best-effort only** due to JIT copies and GC compaction. For high-security contexts, use hardware-backed signing where key material never enters JS memory.

## Known Limitations

These are documented honestly, not hidden:

1. **Self-attestation model.** EXIT markers are signed by participants, not verified by independent witnesses. Trust requires higher-layer protocols (L1+). See spec Section 7.
2. **TSA verification is structural only.** FreeTSA receipt structure is checked but cryptographic chain-of-trust to the TSA certificate is not verified in-library. See `checkTSAReceiptStructure()`.
3. **No formal security audit.** 443 automated tests cover functionality but are not a substitute for professional security review.

## Dependency Security

| Dependency | Purpose | Audit Status |
|------------|---------|-------------|
| `@noble/ed25519` | Ed25519 signatures | Cure53 audited |
| `@noble/curves` | P-256 / ECDSA | Cure53 audited |
| `@noble/hashes` | HKDF-SHA-256, SHA-256 | Cure53 audited |
| `canonicalize` | RFC 8785 JCS | Widely used, no formal audit |
| `commander` | CLI parsing | Dev/CLI only (not imported in library entry) |

## Threat Model

See the full threat model in [EXIT_SPEC_v1.2.md](./specs/EXIT_SPEC_v1.2.md), Section 9.

Key threats addressed: coerced departure, marker tampering, replay attacks, timing manipulation, key compromise.
Key threats deferred to L1+: Sybil origin attacks, reputation gaming, strategic departure patterns.

## Contact

- Security issues: hawthornhollows@gmail.com
- General: [GitHub Issues](https://github.com/CellarDoorExits/exit-door/issues)
