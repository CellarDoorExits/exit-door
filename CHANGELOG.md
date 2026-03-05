# Changelog

## [0.2.0] - 2026-03-05

### Added
- **P-256 (ECDSA) co-default**: Full P-256 support alongside Ed25519 — `quickExitP256()`, `P256Signer`, `createSigner({ algorithm: "P-256" })`.
- **Amendments**: Amend existing markers with corrections or additions while preserving the original chain of custody.
- **Revocations**: Revoke markers cryptographically with signed revocation records.
- **Discovery protocol**: Machine-readable `.well-known/cellar-door` endpoint for platform capability discovery.
- **GDPR crypto-shredding**: Delete marker data by destroying associated keys, supporting right-to-erasure compliance.
- **JCS canonicalization**: JSON Canonicalization Scheme (RFC 8785) for deterministic signing input.
- **Anti-retaliation flags**: Markers can signal that departure should not trigger punitive actions.
- **Signer abstraction**: Algorithm-agnostic `Signer` interface with `signMarkerWithSigner()` for HSM/TPM support.
- **Algorithm registry**: Pluggable algorithm registration via `AlgorithmRegistry`.
- **Full-service API**: `departAndAnchor()` and `departAndVerify()` for one-call workflows with optional TSA timestamps, git ledger anchoring, and visual QR codes.
- **Passage API**: Renamed public surface (`createDepartureMarker`, `signDepartureMarker`, etc.) with backward-compatible aliases.
- **Trust enhancers**: Timestamps, witnesses, and identity claims for enhanced marker provenance.
- **Ceremony state machine**: Formal state transitions for multi-step departure ceremonies.

### Changed
- `quickExit()` and `quickExitP256()` are now **async** (breaking for sync callers) — P-256 path routes through `signMarkerWithSigner()` for canonical signing.
- `signP256()` now returns a defensive `Uint8Array.from()` copy for forward compatibility with noble/curves API changes.
- Default domain prefix updated to `exit-marker-v1.2:`.

### Fixed
- **PCR-07**: P-256 `quickExit()` no longer bypasses `proof.ts` — uses `signMarkerWithSigner()` with `P256Signer`.
- **PCR-01**: `signP256()` explicitly normalizes signature output to plain `Uint8Array`.

## [0.1.0] - 2025-12-01

### Added
- Initial release: Ed25519 EXIT markers with DID:key subject binding.
- `createMarker()`, `signMarker()`, `verifyMarker()`.
- `quickExit()`, `quickVerify()`, `fromJSON()`, `toJSON()`.
- `generateIdentity()`, `generateKeyPair()`.
- `ValidationError`, `SigningError`, `VerificationError` error hierarchy.
