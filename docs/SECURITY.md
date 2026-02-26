# Security Considerations

## B2. Key Storage Guidance

Private keys used for signing EXIT markers MUST be stored securely. Recommendations:

- **Hardware Security Modules (HSMs):** For production deployments, use HSM-backed signing via the `Signer` interface. See [HSM_INTEGRATION.md](./HSM_INTEGRATION.md).
- **Cloud KMS:** AWS KMS, GCP Cloud KMS, and Azure Key Vault can be integrated through the `Signer` abstraction.
- **At minimum:** Store private keys in encrypted form at rest. Never commit keys to source control. Use environment variables or secrets managers for key material.
- **Key rotation:** Implement regular key rotation using the KERI pre-rotation mechanism.
- **Destroy after use:** Call `signer.destroy()` when signing is complete to zero key material (best-effort; see B3).

## B3. Key Material Zeroing Limitation

JavaScript/TypeScript runtimes (V8, Node.js) use garbage-collected memory. While `Ed25519Signer.destroy()` and `P256Signer.destroy()` call `Uint8Array.fill(0)` on private key buffers, **this is best-effort only**:

- The JIT compiler may retain optimized copies of key material.
- V8 may have copied the buffer during GC compaction.
- `fill(0)` is not guaranteed to be constant-time.

**For high-security contexts, use hardware-backed signing (HSM/TPM)** where key material never enters JavaScript memory.

## B10. Cross-Border Data Transfer

EXIT markers may contain Personally Identifiable Information (PII) in fields such as `subject`, `narrative`, `reason`, or identity claims in `trustEnhancers`. When markers are transmitted or stored across jurisdictions:

- **GDPR (EU):** Cross-border transfers of markers containing PII of EU data subjects require an adequate transfer mechanism (SCCs, adequacy decision, or BCRs). The `subject` DID is likely pseudonymous but may still constitute personal data under GDPR Art. 4(1).
- **Minimization:** Use the privacy module's redaction and minimal disclosure features to strip PII before cross-border transfer where possible.
- **Data residency:** Consider storing markers containing PII in the data subject's jurisdiction and sharing only redacted/encrypted versions externally.

Consult qualified data protection counsel for jurisdiction-specific requirements.

## B12. Ed25519 Verification Mode

This implementation uses **strict Ed25519 verification** (not ZIP-215 permissive verification). The `@noble/ed25519` library performs cofactor-less verification per RFC 8032, which may reject signatures that would be accepted under the ZIP-215 batch verification rules used by some blockchain protocols.

## B16. FIPS Encryption Profile

For deployments requiring FIPS 140-2/3 compliance, the recommended encryption profile is **AES-256-GCM** with HKDF-SHA-256 key derivation. The current privacy module uses ChaCha20-Poly1305; a FIPS-compliant alternative will be provided in a future version. In the interim, use HSM-backed encryption for FIPS-regulated contexts.
