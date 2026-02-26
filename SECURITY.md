# Security Policy

## Cryptographic Algorithms

cellar-door-exit supports two signature algorithms:

- **Ed25519** (default) — Fast, compact signatures. Widely used in DID/VC ecosystem. **Not FIPS 140-2/3 approved.**
- **ECDSA P-256** (NIST P-256 / secp256r1) — FIPS 140-2/3 approved. Use `algorithm: "P-256"` when FIPS compliance is required.

### Security Certification Status

⚠️ **Neither algorithm implementation has undergone formal security certification.** The underlying cryptographic primitives are provided by [@noble/ed25519](https://github.com/paulmillr/noble-ed25519) and [@noble/curves](https://github.com/paulmillr/noble-curves), which have been independently audited. However, this package's usage of those primitives has not been independently audited.

For production deployments requiring certified cryptography, use the `Signer` interface to plug in a FIPS-validated HSM or cloud KMS provider.

## Reporting Vulnerabilities

Open a GitHub issue with the "security" label, or email hawthornhollows@gmail.com. We will respond within 48 hours.
