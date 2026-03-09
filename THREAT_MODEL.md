# EXIT Protocol — Threat Model

> Version: 0.x (pre-audit) · Last updated: 2026-03-09

## 1. Assets

| Asset | Sensitivity | Location |
|-------|------------|----------|
| **Private signing keys** | Critical — controls marker forgery | Agent-side (memory, file, HSM) |
| **EXIT markers** | High — departure history is PII under GDPR | Portable JSON files, on-chain anchors |
| **Departure history** | High — reveals agent lifecycle patterns | Aggregated by consumers, registries |
| **Agent DIDs** | Medium — pseudonymous but correlatable | Embedded in markers, on-chain |
| **Trust enhancers** | Medium — witness signatures, timestamps | Attached to markers |

## 2. Threat Actors

| Actor | Capability | Motivation |
|-------|-----------|------------|
| **Malicious agent** | Controls own keys, can forge self-attested claims | Fabricate clean departure history |
| **Compromised platform** | Access to agent runtime, potential key exfiltration | Forge markers on behalf of agents, suppress departures |
| **Network observer** | Passive traffic analysis, metadata correlation | DID correlation, departure pattern profiling |
| **State actor** | Full network visibility, compute resources | Surveillance, forced compliance, key compulsion |
| **Supply chain attacker** | Inject malicious code into dependencies | Exfiltrate keys, tamper with signing/verification |

## 3. Attack Surfaces & Mitigations

### 3.1 Key Compromise → Unlimited Forgery

**Risk:** No key revocation in v0.x. A compromised key can forge unlimited markers indefinitely.

| | Detail |
|---|--------|
| **Today** | `Signer.destroy()` zeros local key material (best-effort, JS GC caveats). Subject-key binding enforced in verification. |
| **Planned** | Key revocation via DID document updates. Marker revocation (`createRevocation()`). HSM/KMS integration to avoid software key exposure. |
| **NIST CSF** | Protect (PR.AC), Respond (RS.MI) |

### 3.2 Self-Attestation → False Claims

**Risk:** Agents self-sign `status: "good_standing"`. Nothing prevents a fired agent from claiming voluntary departure.

| | Detail |
|---|--------|
| **Today** | `selfAttested: true` flag signals unverified claims. Trust enhancers (witnesses, TSA timestamps) add corroboration. Consumers can require witness co-signatures. |
| **Planned** | Platform counter-signatures (cooperative exit ceremony). Reputation layers (L1) that weight corroborated vs. self-attested markers. |
| **NIST CSF** | Identify (ID.RA), Detect (DE.CM) |

### 3.3 Replay Attacks → Resubmitting Old Markers

**Risk:** Valid signed markers replayed to different consumers or contexts.

| | Detail |
|---|--------|
| **Today** | Content-addressed `id` field (deterministic from marker content). Consumers can deduplicate on `id`. EAS off-chain nonce (`refUID`) provides dedup for on-chain anchoring. |
| **Planned** | Consumer-side nonce challenges. Registry-level dedup indexes. |
| **NIST CSF** | Protect (PR.DS), Detect (DE.CM) |

### 3.4 Backdating → Past Timestamps

**Risk:** Creating markers with fabricated past timestamps to rewrite history.

| | Detail |
|---|--------|
| **Today** | `proof.created` records signing time (ISO 8601, validated). TSA timestamps in trust enhancers provide third-party time evidence. |
| **Planned** | On-chain anchoring provides immutable timestamp lower-bound. Required TSA for high-trust markers. |
| **NIST CSF** | Protect (PR.DS), Detect (DE.AE) |

### 3.5 Marker Tampering → Modified Signed Markers

**Risk:** Altering marker fields after signing.

| | Detail |
|---|--------|
| **Today** | **Fully mitigated by design.** Ed25519/P-256 signatures over canonical JSON. Any field change invalidates the signature. Domain-prefixed signing (`exit-marker-v1.2:`) prevents cross-protocol signature reuse. |
| **Planned** | N/A — current mitigation is sufficient. |
| **NIST CSF** | Protect (PR.DS) |

### 3.6 Supply Chain → Malicious Dependencies

**Risk:** Compromised npm/PyPI packages inject backdoors into signing or verification.

| | Detail |
|---|--------|
| **Today** | Minimal dependency tree. `@noble/ed25519` and `@noble/curves` for cryptography (audited libraries). Lockfile pinning. |
| **Planned** | SBOM generation. Reproducible builds. Dependency vendoring for critical paths. |
| **NIST CSF** | Identify (ID.SC), Protect (PR.IP) |

### 3.7 On-Chain → Permissionless Attestation Pollution

**Risk:** Anyone can create EAS attestations against EXIT schemas, polluting the attestation space with garbage or impersonation data.

| | Detail |
|---|--------|
| **Today** | Documented in EAS adapter `TRUST_MODEL.md`. Consumers MUST verify `attester` address against a trusted set. Commitment mode hides subject data. |
| **Planned** | Attester registries. Schema-level access control via wrapper contracts. |
| **NIST CSF** | Detect (DE.CM), Respond (RS.AN) |

### 3.8 Privacy → DID Correlation & Pattern Analysis

**Risk:** Pseudonymous DIDs are linkable across markers. Departure patterns reveal agent lifecycle metadata.

| | Detail |
|---|--------|
| **Today** | EAS `commitment` schema mode stores only hash + URI (no DID on-chain). Crypto-shredding support for GDPR compliance. |
| **Planned** | Per-context DIDs (unlinkable departures). Selective disclosure proofs. Timing obfuscation for pattern resistance. |
| **NIST CSF** | Identify (ID.RA), Protect (PR.IP) |

## 4. Residual Risks

| Risk | Why Unmitigated | Severity |
|------|----------------|----------|
| **No key revocation (v0.x)** | Requires DID document infrastructure not yet built | **Critical** |
| **Self-attestation is inherently unverifiable** | Fundamental protocol property — EXIT is agent-first by design | High |
| **JS GC prevents guaranteed key zeroing** | Language-level limitation; only HSMs fully solve this | Medium |
| **DID correlation across markers** | Per-context DIDs require identity infrastructure not yet built | Medium |
| **Backdating without TSA** | TSA is optional; mandatory TSA would break offline-first design | Medium |
| **No formal security audit** | Pre-release; audit planned before v1.0 | High |

## 5. NIST CSF Mapping Summary

| Function | Relevant Controls | EXIT Coverage |
|----------|------------------|---------------|
| **Identify** | ID.RA (Risk Assessment), ID.SC (Supply Chain) | Threat model (this doc), minimal deps, SBOM planned |
| **Protect** | PR.AC (Access Control), PR.DS (Data Security), PR.IP (Protective Processes) | Cryptographic signatures, Signer abstraction, HSM support, commitment mode |
| **Detect** | DE.CM (Continuous Monitoring), DE.AE (Anomalies & Events) | Consumer-side attester verification, timestamp validation, dedup nonces |
| **Respond** | RS.MI (Mitigation), RS.AN (Analysis) | Marker revocation, amendments, dispute bundles |
| **Recover** | RC.RP (Recovery Planning) | Immutable markers survive platform failure; offline-verifiable by design |
