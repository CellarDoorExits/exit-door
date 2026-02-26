# 𓉸 EXIT Protocol Specification v1.1

**Status:** Draft
**Date:** 2026-02-24
**Authors:** Cellar Door Contributors
**Supersedes:** EXIT_SPEC_v1.0-draft
**License:** Apache 2.0
**Symbol:** 𓉸 — *There's always a door...*

---

## Abstract

The EXIT protocol defines a verifiable, portable, cryptographically signed marker for entity departures from digital contexts. EXIT markers enable agents, services, and participants to create authenticated records of departure that preserve continuity, reputation signals, and asset references across system boundaries.

EXIT is one half of the **Passage Protocol** 𓉸 — together with the ENTRY protocol, they provide complete **Proof of Passage** (PoP): cryptographic proof of entity movement between systems. EXIT records departure (➜𓉸); ENTRY records arrival (𓉸➜).

v1.1 extends the core specification with trust mechanisms (confidence scoring, status confirmation, tenure attestation, commit-reveal), ethics guardrails (coercion detection, weaponization detection, laundering detection, right of reply, sunset policies), KERI-compatible key management (pre-rotation, key event logs, key compromise recovery), privacy primitives (encryption, redaction, minimal disclosure), chain anchoring (anchor records, Merkle batch operations), RFC 3161 timestamp anchoring, git-backed ledger anchoring, visual hash representations, full-service convenience API, and interoperability patterns (transport serialization, middleware, lifecycle hooks).

---

## 1. Introduction

When an entity departs a digital system — whether an AI agent leaving a platform, a participant exiting a DAO, or a service migrating between providers — no standardized mechanism exists to create a verifiable record of that departure. EXIT fills this gap.

An EXIT marker is a JSON-LD document, approximately 300–500 bytes in its core form, that records: who departed, from where, when, how, and under what standing. The marker is cryptographically signed by the departing subject and optionally co-signed by the origin system or witnesses.

### 1.1 Design Goals

- **Always available:** EXIT MUST work even with hostile or absent origins
- **Minimal:** The core schema is 8 fields; everything else is optional
- **Verifiable:** Every marker is cryptographically signed
- **Portable:** Markers are self-contained and offline-verifiable
- **Non-custodial:** No central registry is required
- **Non-weaponizable:** Markers MUST NOT be used as blacklists (§8.6)

### 1.2 Relationship to Other Standards

EXIT markers can be wrapped in W3C Verifiable Credentials (Decision D-001) but are not dependent on the VC ecosystem. The standalone JSON-LD format is the canonical representation.

### 1.3 Changes from v1.0

| Area | Change |
|---|---|
| Schema | Added mandatory `specVersion` field (MUST be `"1.1"`) |
| ExitTypes | Added `platform_shutdown`, `directed`, `constructive`, `acquisition` (8 total) |
| Fields | Added `completenessAttestation`, `sequenceNumber` optional fields |
| Dispute | Added `disputeExpiry`, `resolution`, `arbiterDid` sub-fields |
| Structures | Added formal `ExitIntent` and `SuccessorAmendment` structures |
| Trust | Added StatusConfirmation, TenureAttestation, ExitCommitment, ConfidenceScore |
| Ethics | Added coercion detection, weaponization detection, laundering detection, right of reply, sunset policies, anti-weaponization clause |
| Key Management | Added KERI stubs, pre-rotation commitments, key event logs, key compromise recovery |
| Privacy | Added XChaCha20-Poly1305 encryption, field-level redaction, minimal disclosure |
| Anchoring | Added anchor records, minimal anchors, Merkle batch operations |
| Timestamping | Added RFC 3161 TSA timestamp anchoring (§11.3) |
| Git Ledger | Added git-backed append-only ledger anchoring (§11.4) |
| Visual | Added visual hash door representations — ASCII, SVG, color palette, short hash (§12.6) |
| Convenience | Added full-service wrapper API — `departAndAnchor()`, `departAndVerify()` (§12.7) |
| Interop | Added transport serialization, Express-style middleware, lifecycle hooks |
| Terminology | "Transfer" → "Passage" throughout; added 𓉸 brand symbol |
| Key Custody | Added §19 Key Custody Considerations |
| Checkpoints | Added §20 Checkpoint & Dead-Man Patterns |

---

## 2. Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

- **Subject:** The entity departing. Signs the EXIT marker.
- **Origin:** The system being departed. May co-sign, contest, or be absent.
- **Verifier:** Any party that evaluates an EXIT marker. Not present during the ceremony.
- **Witness:** A neutral third party that attests to ceremony steps.
- **Marker:** An EXIT marker — the core signed document.
- **Ceremony:** The state machine governing the departure process.
- **Module:** An optional extension to the core schema (A–F).
- **Passage:** The complete transit of an entity between systems, comprising EXIT (departure) and ENTRY (arrival). Formerly "transfer."
- **Proof of Passage (PoP):** Cryptographic proof that an entity transited between systems, consisting of a verified EXIT+ENTRY marker pair.
- **Passage Protocol:** The combined EXIT + ENTRY specification. *Two ceremonies. One protocol.*
- **Confidence Score:** A computed trust metric aggregating attestation quality, tenure, lineage, and commit-reveal evidence.
- **Pre-Rotation:** A KERI concept where the hash of the next public key is committed before it is needed.
- **𓉸:** The Cellar Door brand symbol (Egyptian hieroglyph door, U+13268). ➜𓉸 denotes EXIT; 𓉸➜ denotes ENTRY.

---

## 3. Core Schema

Every valid EXIT marker MUST contain the following fields.

### 3.1 Mandatory Fields

| # | Field | Type | Description |
|---|---|---|---|
| 1 | `@context` | string | MUST be `"https://cellar-door.dev/exit/v1"` |
| 2 | `specVersion` | string | MUST be `"1.1"` for markers conforming to this specification |
| 3 | `id` | string (URI) | Globally unique identifier. SHOULD be content-addressed (`urn:exit:{sha256}`) |
| 4 | `subject` | string (DID/URI) | Who is exiting. MUST be a valid DID or agent URI |
| 5 | `origin` | string (URI) | What is being exited. MUST be a URI identifying the origin system |
| 6 | `timestamp` | string (ISO 8601) | When the exit occurred. MUST be UTC |
| 7 | `exitType` | enum | Nature of departure. See §3.6 for the full enumeration |
| 8 | `status` | enum | Standing at departure: `good_standing`, `disputed`, `unverified` |
| — | `proof` | object | Cryptographic signature. MUST be present and MUST be signed by the subject |

### 3.2 Compliance Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `selfAttested` | boolean | MUST be present | Whether the `status` field is self-attested. Default: `true` |
| `emergencyJustification` | string | Conditional | MUST be present and non-empty when `exitType` is `emergency` |
| `legalHold` | object | OPTIONAL | Indicates pending legal process. See §3.3 |

### 3.3 Legal Hold Structure

When present, the `legalHold` object MUST contain:

| Field | Type | Description |
|---|---|---|
| `holdType` | string | Type of hold (e.g., `"litigation_hold"`, `"regulatory_investigation"`, `"court_order"`) |
| `authority` | string | Issuing authority or entity |
| `reference` | string | Case number or reference identifier |
| `dateIssued` | string (ISO 8601) | When the hold was issued |
| `acknowledged` | boolean | Whether the subject has acknowledged the hold |

### 3.4 Extended Fields (v1.1)

| Field | Type | Required | Description |
|---|---|---|---|
| `preRotationCommitment` | string | OPTIONAL | SHA-256 hash of the next public key for KERI-style key continuity (§9.3) |
| `coercionLabel` | enum | OPTIONAL | Coercion label attached by ethics analysis (§8.1). One of: `possible_retaliation`, `conflicting_status_signals`, `suspicious_emergency`, `pattern_of_abuse`, `no_coercion_detected` |
| `sunsetDate` | string (ISO 8601) | OPTIONAL | *Deprecated.* Legacy alias for `expires`. Implementations SHOULD migrate to `expires`. |
| `expires` | string (ISO 8601) | MUST | Expiry date after which the marker MUST be considered expired (§8.5). If not specified by the issuer, implementations MUST populate with default: 730 days for voluntary exits, 365 days for involuntary exits. |
| `completenessAttestation` | object | OPTIONAL | Subject voluntarily attests "these are ALL my markers." See §3.4.1 |
| `sequenceNumber` | number | OPTIONAL | Non-negative integer. Monotonically increasing checkpoint sequence number. When present, only the highest-sequence marker for a given subject+origin pair is authoritative. See §20.2 |

Implementations MUST preserve unrecognized fields when round-tripping markers.

#### 3.4.1 Completeness Attestation

The `completenessAttestation` field allows a subject to voluntarily attest that a given set of markers represents the complete record of their departures. This is purely opt-in and carries no protocol-level enforcement.

**CompletenessAttestation Structure:**

| Field | Type | Description |
|---|---|---|
| `attestedAt` | string (ISO 8601) | When the attestation was made |
| `markerCount` | number | Number of markers the subject attests to having created |
| `signature` | string | Signature over the attestation by the subject |

**Normative Requirements:**

- The `signature` MUST be verifiable against the marker's `subject` DID
- The `markerCount` MUST be a non-negative integer
- Verifiers MAY use completeness attestations as a positive trust signal but MUST NOT require them

### 3.5 Proof Structure

The `proof` object MUST contain:

| Field | Type | Description |
|---|---|---|
| `type` | string | Signature algorithm. MUST be one of the supported types (see §3.5.1) |
| `created` | string (ISO 8601) | When the proof was created |
| `verificationMethod` | string | DID or key URI for verification |
| `proofValue` | string | Base64-encoded signature |

The data signed MUST be the canonical JSON form (§13.1) of the marker excluding the `proof` and `id` fields. Implementations MUST prepend the domain separation string `exit-marker-v1.1:` to the canonical marker content before signing or verifying. This prevents cross-protocol signature replay attacks.

#### 3.5.1 Supported Signature Algorithms

| `proof.type` | Algorithm | Key Size | FIPS 140-2/3 | Notes |
|---|---|---|---|---|
| `"Ed25519Signature2020"` | Ed25519 (RFC 8032) | 32 bytes | ❌ Not approved | Default. Fast, compact. Widely used in DID/VC ecosystem. |
| `"EcdsaP256Signature2019"` | ECDSA P-256 (FIPS 186-5) | 33 bytes (compressed) | ✅ Approved | Use when FIPS compliance is required. NIST curve secp256r1. |

Implementations MUST support `Ed25519Signature2020`. Implementations SHOULD support `EcdsaP256Signature2019` for interoperability with FIPS-regulated environments.

Verifiers MUST accept both algorithm types. Signers MAY use either algorithm. The `verificationMethod` field encodes the algorithm via the DID multicodec prefix (Ed25519: `0xed01`, P-256: `0x8024`).

Additional algorithms MAY be added in future spec versions. Verifiers encountering an unknown `proof.type` MUST reject the marker with an "unsupported algorithm" error.

### 3.6 Exit Types

| Value | Description | Default Status |
|---|---|---|
| `voluntary` | Subject-initiated departure | `good_standing` |
| `forced` | Origin-initiated expulsion | `disputed` |
| `emergency` | Departure under abnormal conditions | `unverified` |
| `keyCompromise` | Declaration of key compromise | `unverified` |
| `platform_shutdown` | Platform is shutting down, initiating departures for all agents | `unverified` |
| `directed` | Departure ordered by operator or authority | `disputed` |
| `constructive` | Conditions effectively forced departure (constructive dismissal analog) | `disputed` |
| `acquisition` | Platform acquired or merged, triggering departure | `unverified` |

The `keyCompromise` type is used to declare that a previously-used signing key has been compromised. This marker SHOULD be signed with a different, trusted key. Verifiers MUST treat all prior markers signed with the compromised key with suspicion.

The `platform_shutdown` type is used when a platform ceases operations and initiates departures for all resident agents. Unlike `forced`, this carries no negative connotation — it is a systemic event, not a disciplinary action.

The `directed` type is used when an external authority (regulator, operator, governance body) orders the departure. The `reason` field (Module E) SHOULD identify the directing authority.

The `constructive` type is the digital analog of constructive dismissal — the subject was not explicitly expelled but conditions made continued participation untenable. Verifiers SHOULD treat `constructive` exits similarly to `forced` exits for coercion analysis purposes.

The `acquisition` type is used when a platform merger or acquisition triggers departures. This is distinct from `platform_shutdown` in that the platform continues to exist under new ownership.

### 3.7 Content-Addressed Identifiers

The `id` field SHOULD be content-addressed: `urn:exit:{sha256}` where the SHA-256 hash is computed over the canonical JSON form of the marker excluding `proof` and `id`. This ensures:

- Different markers MUST produce different IDs (collision resistance)
- The same marker content MUST always produce the same ID (determinism)
- Verifiers MAY verify the ID by recomputing the hash

---

## 4. Module Specifications

All modules are OPTIONAL. Modules MUST NOT alter the semantics of the core fields.

### 4.1 Module A: Lineage (Agent Continuity)

Purpose: Establish predecessor/successor relationships for agent continuity.

| Field | Type | Required | Description |
|---|---|---|---|
| `predecessor` | string (DID/URI) | MAY | Previous incarnation |
| `successor` | string (DID/URI) | MAY | Designated successor |
| `lineageChain` | array of strings | MAY | Full ancestry chain |
| `continuityProof` | object | MAY | Cryptographic binding proof |

Continuity proof types, strongest to weakest:
1. `key_rotation_binding` — Old key signs successor designation
2. `lineage_hash_chain` — Merkle chain from genesis
3. `delegation_token` — Scoped capability transfer
4. `behavioral_attestation` — Third-party behavioral vouching

Verifiers SHOULD require `key_rotation_binding` or `lineage_hash_chain` for high-trust contexts.

#### 4.1.1 Successor Amendment

A `SuccessorAmendment` allows a subject to designate a successor after the original EXIT marker has been finalized. This is useful when the successor is not known at departure time.

**SuccessorAmendment Structure:**

| Field | Type | Description |
|---|---|---|
| `exitMarkerId` | string | ID of the original EXIT marker being amended |
| `successor` | string (DID/URI) | The designated successor |
| `timestamp` | string (ISO 8601) | When the amendment was created |
| `proof` | DataIntegrityProof | Signed by the original subject's key |

**Normative Requirements:**

- The `proof` MUST be signed by the same key that signed the original EXIT marker
- The `exitMarkerId` MUST reference a valid, finalized EXIT marker
- Multiple amendments MAY exist; the latest by `timestamp` takes precedence
- Verifiers SHOULD verify that the amendment signer matches the original marker subject

### 4.2 Module B: State Snapshot Reference

Purpose: Anchor the exit to a specific system state.

| Field | Type | Required | Description |
|---|---|---|---|
| `stateHash` | string | MUST (if module present) | Content-addressed hash of state |
| `stateLocation` | string (URI) | MAY | Retrieval location for full state |
| `stateSchema` | string | MAY | Schema describing state format |
| `obligations` | array of strings | MAY | Outstanding commitments (references) |

EXIT stores the hash, NEVER the state itself.

### 4.3 Module C: Dispute Bundle

Purpose: Preserve evidence and record disputes at exit time.

| Field | Type | Required | Description |
|---|---|---|---|
| `disputes` | array of Dispute | MAY | Active disputes at exit |
| `evidenceHash` | string | MAY | Hash of evidence bundle |
| `challengeWindow` | object | MAY | Challenge window parameters |
| `counterpartyAcks` | array of Proof | MAY | Co-signatures acknowledging exit |
| `originStatus` | enum | MAY | Origin's view of subject standing |
| `rightOfReply` | object | MAY | Subject's signed counter-narrative (§8.4) |

The `originStatus` field is an **allegation by the origin**, not a finding of fact. Verifiers MUST NOT treat `originStatus` as dispositive.

**Right of Reply (v1.1):** When `originStatus` differs from the subject's `status`, the subject SHOULD be given the opportunity to attach a `rightOfReply`. See §8.4.

**Dispute Structure:**

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | MUST | Dispute identifier |
| `challenger` | string | MUST | Who filed the challenge |
| `claim` | string | MUST | Brief claim description or hash |
| `evidenceHash` | string | MAY | Hash of evidence |
| `filedAt` | string (ISO 8601) | MUST | When the challenge was filed |
| `disputeExpiry` | string (ISO 8601) | MAY | When the dispute expires. After this date, the dispute SHOULD be considered lapsed |
| `resolution` | enum | MAY | Resolution status: `"settled"`, `"expired"`, or `"withdrawn"` |
| `arbiterDid` | string (DID) | MAY | DID of the arbiter handling the dispute |

**Normative Requirements for Dispute Sub-Fields:**

- When `disputeExpiry` is present, it MUST be a valid ISO 8601 UTC timestamp
- When `resolution` is present, it MUST be one of: `"settled"`, `"expired"`, `"withdrawn"`
- When `arbiterDid` is present, it MUST be a valid DID
- A dispute with `resolution` set SHOULD be considered closed; verifiers SHOULD NOT weight closed disputes in confidence scoring

### 4.4 Module D: Economic

Purpose: Document assets and financial obligations at exit time.

| Field | Type | Required | Description |
|---|---|---|---|
| `assetManifest` | array of AssetReference | MAY | Assets being referenced |
| `settledObligations` | array of strings | MAY | Resolved obligations |
| `pendingObligations` | array of strings | MAY | Unresolved obligations (with escrow refs) |
| `exitFee` | object | MAY | Cost of exit |

**NORMATIVE:** Asset manifests are **declarations and references**, not transfer instruments or bearer instruments.

### 4.5 Module E: Metadata / Narrative

Purpose: Human-readable context.

| Field | Type | Required | Description |
|---|---|---|---|
| `reason` | string | MAY | Free-text departure reason |
| `narrative` | string | MAY | Summary of circumstances |
| `tags` | array of strings | MAY | Domain-specific labels |
| `locale` | string | MAY | Language code |

Module E content is personal data under GDPR. Implementers MUST handle accordingly.

### 4.6 Module F: Cross-Domain Anchoring

Purpose: Anchor markers to external chains or registries.

| Field | Type | Required | Description |
|---|---|---|---|
| `anchors` | array of ChainAnchor | MAY | On-chain anchoring points |
| `registryEntries` | array of strings | MAY | External registry entries |

**WARNING:** On-chain anchoring creates indelible records. This is fundamentally incompatible with GDPR right to erasure. Implementers MUST conduct a Data Protection Impact Assessment before using Module F with personal data.

---

## 5. Ceremony State Machine

### 5.1 States

| State | Description |
|---|---|
| `alive` | Active participant. No exit in progress |
| `intent` | Subject has declared intent to exit |
| `snapshot` | State reference captured |
| `open` | Challenge window is open |
| `contested` | A challenge has been filed |
| `final` | EXIT marker created and signed |
| `departed` | Terminal. Entity has left. No undo |

### 5.2 Ceremony Paths

**Full cooperative path:**
```
ALIVE → INTENT → SNAPSHOT → OPEN → FINAL → DEPARTED
```

**Unilateral path:**
```
ALIVE → INTENT → SNAPSHOT → FINAL → DEPARTED
```

**Emergency path:**
```
ALIVE → FINAL → DEPARTED
```

### 5.3 State Transition Rules

- ALIVE → INTENT: Subject declares intent. MUST be signed by subject.
- INTENT → SNAPSHOT: State reference captured. MAY be automatic.
- SNAPSHOT → OPEN: Challenge window opened. REQUIRES origin cooperation.
- SNAPSHOT → FINAL: Unilateral finalization (skips challenge window).
- OPEN → CONTESTED: A dispute is filed during the challenge window.
- OPEN → FINAL: Challenge window closes without contest.
- CONTESTED → FINAL: Dispute recorded but does not block exit (D-006).
- FINAL → DEPARTED: Terminal transition. MUST NOT be reversed.
- ALIVE → FINAL: Emergency path only. REQUIRES `exitType: emergency` and `emergencyJustification`.

### 5.4 Invariants

- `DEPARTED` is terminal. No transitions from `DEPARTED`.
- States MUST only move forward. Backward transitions MUST NOT occur (except emergency shortcut ALIVE → FINAL).
- Disputes MUST NOT block transitions (D-006). Disputes change metadata only.
- Subject signature MUST be present at `FINAL`.
- Emergency path MUST include `emergencyJustification`.

### 5.5 Commit-Reveal Integration (v1.1)

When using the commit-reveal mechanism (§7.2):

1. Subject SHOULD create an `ExitCommitment` before or at the `INTENT` state
2. The commitment MUST be published (timestamped) before the intent is revealed
3. The reveal MUST NOT occur before `revealAfter`
4. Verifiers SHOULD check that the commitment predates any retaliatory origin action

### 5.6 Exit Intent Structure

The `ExitIntent` is a formal artifact produced at the `INTENT` ceremony state.

**ExitIntent Structure:**

| Field | Type | Description |
|---|---|---|
| `subject` | string (DID/URI) | Who intends to exit |
| `origin` | string (URI) | What is being exited |
| `timestamp` | string (ISO 8601) | When the intent was declared |
| `exitType` | ExitType | Anticipated nature of departure |
| `reason` | string | OPTIONAL. Why the subject intends to exit |
| `proof` | DataIntegrityProof | Signed by the subject |

**Normative Requirements:**

- The `ExitIntent` MUST be signed by the subject
- The `subject` field MUST match the eventual EXIT marker's `subject`
- The `exitType` in the intent MAY differ from the final marker's `exitType` (circumstances may change)
- Implementations SHOULD preserve the `ExitIntent` for audit purposes

---

## 6. Verification Requirements

### 6.1 Structural Verification

A verifier MUST check:

1. `@context` equals `"https://cellar-door.dev/exit/v1"`
2. `specVersion` equals `"1.1"`
3. All 8 mandatory fields are present and non-empty
4. `selfAttested` field is present (boolean)
5. `timestamp` is valid ISO 8601 UTC
6. `exitType` is one of the 8 defined enum values: `voluntary`, `forced`, `emergency`, `keyCompromise`, `platform_shutdown`, `directed`, `constructive`, `acquisition`
7. `status` is one of the defined enum values
8. `proof` contains `type`, `created`, `verificationMethod`, and `proofValue`
9. If `exitType` is `emergency`, `emergencyJustification` MUST be present and non-empty
10. If `legalHold` is present, all required sub-fields MUST be present and valid
11. If `sunsetDate` is present, it MUST be valid ISO 8601
12. If `coercionLabel` is present, it MUST be one of the defined enum values
13. If `preRotationCommitment` is present, it MUST be a valid hex string
14. If `sequenceNumber` is present, it MUST be a non-negative integer
15. If `completenessAttestation` is present, it MUST contain `attestedAt`, `markerCount`, and `signature`

### 6.2 Cryptographic Verification

A verifier MUST:

1. Resolve the `proof.verificationMethod` to a public key
2. Verify the signature in `proof.proofValue` against the canonical form of the marker content (excluding `proof`)
3. Verify that the signing key corresponds to the `subject` DID

A verifier SHOULD:

1. Check for `keyCompromise` markers from the same subject
2. Verify the `id` matches the content-addressed hash
3. If `preRotationCommitment` is present, record it for future key rotation verification

### 6.3 Trust Verification (v1.1)

A verifier SHOULD (based on context):

1. Compute the `StatusConfirmation` level (§7.1) and weight the marker accordingly
2. Verify any `TenureAttestation` signatures (§7.3)
3. Compute a `ConfidenceScore` (§7.4) using all available signals
4. Check for commit-reveal evidence (§7.2) when evaluating temporal claims
5. Evaluate `selfAttested` — if `true`, apply self-attestation trust level
6. Check for Module C `originStatus` and evaluate origin trust
7. Verify lineage chain depth and continuity proof strength (Module A)
8. Cross-reference the `origin` against known platform registries

---

## 7. Trust Mechanisms (v1.1)

### 7.1 Status Confirmation

Self-attested status is cheap talk — any agent can claim `good_standing` regardless of truth (the Akerlof "lemons" problem). To address this, v1.1 introduces graduated status confirmation levels.

**StatusConfirmation Levels:**

| Level | Description | Trust Signal |
|---|---|---|
| `self_only` | Subject claims status, no independent verification | Lowest |
| `origin_only` | Origin attested status without subject claim | Low-Medium |
| `mutual` | Both subject and origin agree on status | Strong |
| `witnessed` | A third-party witness confirmed circumstances | Strongest |
| `disputed_by_origin` | Origin disputes the subject's claimed status | Informational |
| `disputed_by_subject` | Subject disputes the origin's attested status | Informational |

**Derivation Rules:**

- If Module C `counterpartyAcks` contains witness signatures → `witnessed`
- If Module C `originStatus` is present and matches `status` → `mutual`
- If Module C `originStatus` is present and differs, and `selfAttested` is `true` → `disputed_by_origin`
- If Module C `originStatus` is present and differs, and `selfAttested` is `false` → `disputed_by_subject`
- If only `selfAttested: true` → `self_only`
- Otherwise → `origin_only`

Verifiers SHOULD require `mutual` or `witnessed` confirmation for high-trust contexts. Verifiers MUST NOT reject markers based solely on `self_only` confirmation.

### 7.2 Commit-Reveal for Exit Intent

The commit-reveal mechanism prevents origins from front-running exits with retaliatory status changes.

**Flow:**

1. Subject creates an `ExitIntent` (§5.6) with all departure details
2. Subject computes `commitmentHash = SHA-256(canonicalize(intent))`
3. Subject publishes the commitment (hash + timestamp + signature) — reveals nothing about the intent
4. After `revealAfter` time, subject reveals the full intent
5. Verifiers check: commitment was published before any retaliatory origin action

**ExitCommitment Structure:**

| Field | Type | Description |
|---|---|---|
| `commitmentHash` | string | SHA-256 hex hash of the canonicalized ExitIntent |
| `committedAt` | string (ISO 8601) | When the commitment was created |
| `revealAfter` | string (ISO 8601) | Earliest time the full intent may be revealed |
| `committerDid` | string | DID of the committing party (MUST match intent subject) |
| `proof` | DataIntegrityProof | Signature over the commitment fields |

**Normative Requirements:**

- The `commitmentHash` MUST be SHA-256 of the canonicalized ExitIntent
- The `committerDid` MUST match the `subject` field of the revealed intent
- The commitment `proof` MUST be verifiable against the `committerDid`
- Verifiers SHOULD treat commit-reveal evidence as a positive trust signal
- Verifiers MUST NOT require commit-reveal for marker validity

### 7.3 Tenure Attestation

Tenure is a costly signal — it cannot be faked without actual time investment. Longer tenure at an origin increases the credibility of a marker.

**TenureAttestation Structure:**

| Field | Type | Description |
|---|---|---|
| `duration` | string | ISO 8601 duration (e.g., `"P365D"`, `"P2Y3M"`) |
| `startDate` | string (ISO 8601) | When the agent first joined the origin |
| `attestedBy` | enum | `"subject"` or `"origin"` — who is making the claim |
| `signature` | string | Signature over the tenure claim by the attesting party |
| `attesterDid` | string | DID of the attesting party |

**Normative Requirements:**

- Tenure attestations MUST be signed by the attesting party
- Mutually attested tenure (both subject and origin attest) SHOULD be weighted higher than single-party attestation
- Verifiers SHOULD apply a logarithmic trust weight: `weight = min(1, log₂(days + 1) / log₂(731))`
- Self-attested tenure without origin corroboration SHOULD receive 50% weight

### 7.4 Confidence Scoring

A composite trust metric aggregating all available signals. This is a **recommendation to verifiers**, not a protocol-level enforcement.

**Scoring Model:**

```
confidence = status_weight(confirmation_level)     [0.0 – 0.4]
           + tenure_weight(days, mutual)            [0.0 – 0.3]
           + lineage_weight(chain_depth)            [0.0 – 0.15]
           + commit_reveal_bonus(present)           [0.0 – 0.15]
```

**Status Weights:**

| Confirmation | Weight |
|---|---|
| `self_only` | 0.05 |
| `origin_only` | 0.20 |
| `mutual` | 0.40 |
| `witnessed` | 0.40 |
| `disputed_by_origin` | 0.00 |
| `disputed_by_subject` | 0.10 |

**Confidence Levels:**

| Score Range | Level |
|---|---|
| < 0.1 | `none` |
| 0.1 – 0.3 | `low` |
| 0.3 – 0.5 | `moderate` |
| 0.5 – 0.75 | `high` |
| ≥ 0.75 | `very_high` |

Implementations MAY use different scoring models. The model above is RECOMMENDED.

---

## 8. Ethics Guardrails (v1.1)

EXIT markers can be misused. The following guardrails provide heuristic detection and structural protections.

### 8.1 Coercion Detection

Heuristic analysis to detect possible coercion in exit markers. These are **signals, not verdicts**.

**Coercion Signals:**

| Signal | Condition |
|---|---|
| Conflicting status | `exitType: forced` + `status: good_standing` + `originStatus: disputed` |
| Suspicious emergency | `exitType: emergency` with no infrastructure-failure keywords in justification |
| Short-tenure retaliation | `exitType: forced` with tenure < 30 days |
| Minimal lineage expulsion | `exitType: forced` with lineage chain depth ≤ 1 |

**CoercionLabel Values:**

| Label | Description |
|---|---|
| `possible_retaliation` | Exit appears retaliatory |
| `conflicting_status_signals` | Subject and origin disagree on standing |
| `suspicious_emergency` | Emergency exit without infrastructure failure indicators |
| `pattern_of_abuse` | Multiple coercion signals detected |
| `no_coercion_detected` | Analysis found no coercion indicators |

**Risk Levels:** `none` (0 signals), `low` (1), `medium` (2), `high` (3+)

Coercion labels MUST be treated as advisory. Coercion labels MUST NOT be used to invalidate markers.

### 8.2 Weaponization Detection

Cross-marker analysis to detect origins systematically abusing forced exit mechanisms.

**Patterns Detected:**

| Pattern | Threshold |
|---|---|
| Mass forced exits | ≥ 3 forced exits from a single origin |
| Blanket blacklisting | Origin disputes all departing subjects (≥ 3) |
| Purge behavior | ≥ 5 exits from one origin within 7 days |

**Severity Levels:** `none`, `concerning` (1 pattern), `severe` (2+ patterns)

Implementations SHOULD log weaponization findings for auditing. Implementations MUST NOT automatically penalize origins based solely on weaponization signals.

### 8.3 Reputation Laundering Detection

Per-subject analysis to detect identity cycling and reputation washing.

**Signals Detected:**

| Signal | Condition |
|---|---|
| Identity cycling | ≥ 2 exits with tenure < 30 days |
| High churn | ≥ 3 exits within 90 days |
| Uncorroborated self-attestation | ≥ 2 self-attested `good_standing` exits with no origin confirmation |

**Probability Levels:** `low`, `medium` (1 signal), `high` (2+ signals)

### 8.4 Right of Reply

When an origin attests a status that conflicts with the subject's claimed status, the subject SHOULD have the opportunity to attach a signed counter-narrative.

**RightOfReply Structure:**

| Field | Type | Description |
|---|---|---|
| `replyText` | string | The subject's counter-narrative |
| `signerKey` | string | DID or key URI of the signer |
| `timestamp` | string (ISO 8601) | When the reply was created |
| `signature` | string | Signature over `replyText` by the signer |

**Normative Requirements:**

- When Module C `originStatus` differs from core `status`, implementations SHOULD provide a mechanism for subjects to attach a `rightOfReply`
- The `rightOfReply` MUST be signed by the subject
- Verifiers MUST present the right of reply alongside the origin attestation
- Implementations MUST NOT suppress or hide the right of reply

### 8.5 Sunset Policies

All markers MUST include an `expires` field. If not specified by the issuer, implementations MUST apply a default expiry of 730 days (2 years) for voluntary exits and 365 days (1 year) for involuntary exits (forced, directed, constructive, emergency, keyCompromise, platform_shutdown, acquisition). Markers without an `expires` field are non-compliant; implementations SHOULD add a default expiry during ingestion for backward compatibility.

**SunsetPolicy Structure:**

| Field | Type | Description |
|---|---|---|
| `durationDays` | number | Days after which markers are considered expired |
| `action` | enum | `"redact"` (remove details) or `"flag"` (mark as expired) |

**Normative Requirements:**

- All markers MUST include an `expires` field (ISO 8601 UTC). This field records the date after which the marker is considered expired.
- When `expires` (or the legacy `sunsetDate`) is present and in the past, verifiers MUST treat the marker as expired
- Expired markers MUST NOT be used for reputation decisions
- Implementations MUST apply sunset policies to all markers to prevent indefinite reputation effects
- The `expires` field MUST be computed from the marker `timestamp` plus the policy duration if not explicitly provided
- Default expiry durations: voluntary exits = 730 days; all other exit types = 365 days

### 8.6 Anti-Weaponization Clause

> EXIT markers MUST NOT be used as blacklists, ban lists, or exclusion databases. An EXIT marker records a departure event; it does not constitute a judgment of character, competence, or trustworthiness. Any system that aggregates EXIT markers to systematically exclude subjects based on `exitType` or `originStatus` is in violation of this specification. Origins that consistently issue `disputed` status without substantive basis MAY be flagged for weaponization by ethics auditors.

This clause is **normative**. Implementations that violate it are non-compliant.

### 8.7 Ethical Compliance Validation

Implementations SHOULD validate markers against the following ethical rules:

1. Forced exits MUST include a reason or narrative (Module E)
2. Conflicting origin attestation without right of reply SHOULD be flagged
3. Emergency exits without justification violate transparency requirements
4. Markers past their sunset date SHOULD NOT be relied upon

### 8.8 Ethics Audit Report

Implementations MAY generate comprehensive ethics audit reports across marker sets. Reports SHOULD include:

- Coercion findings per marker
- Weaponization patterns across origins
- Laundering signals per subject
- Aggregated recommendations
- Overall risk assessment (`low`, `medium`, `high`, `critical`)

---

## 9. Key Management (v1.1)

### 9.1 KERI-Compatible Key Event Logs

EXIT supports KERI-style key management through key event logs (KELs). A KEL is an append-only sequence of key events.

**Event Types:**

| Type | Description |
|---|---|
| `inception` | Creates a new key event log. Establishes the initial keys and pre-commits to next keys |
| `rotation` | Replaces current keys with new ones. The new keys MUST match prior `nextKeyDigests` |

**InceptionEvent Structure:**

| Field | Type | Description |
|---|---|---|
| `type` | `"inception"` | Event type |
| `identifier` | string | DID derived from the initial key (`did:keri:{hash}`) |
| `keys` | array of Uint8Array | Initial signing keys |
| `nextKeyDigests` | array of string | SHA-256 digests of the next keys (pre-rotation commitment) |
| `witnesses` | array of string | Optional witness DIDs |
| `timestamp` | string (ISO 8601) | When the event was created |
| `signature` | string | Signature over the event by the initial key |

**KeyRotationEvent Structure:**

| Field | Type | Description |
|---|---|---|
| `type` | `"rotation"` | Event type |
| `prior` | string | Hash of the previous key state |
| `current` | array of Uint8Array | New signing keys |
| `next` | array of string | SHA-256 digests of the next-next keys |
| `sequenceNumber` | number | Monotonically increasing sequence number |
| `timestamp` | string (ISO 8601) | When the rotation occurred |
| `signature` | string | Signature by a current (pre-rotation) key |

**Normative Requirements:**

- The first event in a KEL MUST be an inception event
- Sequence numbers MUST be strictly monotonically increasing (no gaps)
- Rotation events MUST be signed by a key from the current key set
- New keys in a rotation MUST match the `nextKeyDigests` committed in the previous event
- Implementations MUST verify the full event chain when determining current key state

### 9.2 Key Compromise Recovery

When a key is compromised:

1. The subject SHOULD issue a `keyCompromise` EXIT marker signed with a different trusted key
2. Verifiers MUST treat all prior markers signed with the compromised key with suspicion
3. If a KEL exists, the subject SHOULD issue a rotation event to revoke the compromised key
4. Implementations SHOULD maintain a `CompromiseLink` record associating the compromise marker with affected marker IDs

**CompromiseLink Structure:**

| Field | Type | Description |
|---|---|---|
| `compromiseMarkerId` | string | ID of the keyCompromise marker |
| `affectedMarkerIds` | array of string | IDs of markers signed with the compromised key |
| `timestamp` | string (ISO 8601) | When the compromise was detected |

### 9.3 Pre-Rotation Commitments

The `preRotationCommitment` field on a marker is the SHA-256 hex digest of the next public key. This enables:

- **Key continuity:** The next key is committed before it's needed
- **Compromise recovery:** A compromised key cannot forge a rotation because the next key was already committed
- **Lineage binding:** Successor identities can prove they were pre-committed

**Normative Requirements:**

- `preRotationCommitment` MUST be `SHA-256(publicKey)` in hex encoding
- When verifying a key rotation, the new public key MUST hash to the previously committed digest
- Implementations SHOULD generate pre-rotated key pairs (current + next) at identity creation time

### 9.4 Key State

**KeyState Structure:**

| Field | Type | Description |
|---|---|---|
| `did` | string | The DID associated with this key state |
| `currentKeys` | array of Uint8Array | Currently valid signing keys |
| `nextKeyDigests` | array of string | Pre-committed next key digests |
| `sequenceNumber` | number | Current sequence number |
| `delegator` | string | Optional delegator DID |
| `witnesses` | array of string | Optional witness DIDs |

---

## 10. Privacy (v1.1)

### 10.1 Marker Encryption

Implementations that store or transmit markers containing personal data (as defined by GDPR Art. 4(1) or equivalent jurisdiction-specific definitions) MUST encrypt those markers using an approved encryption algorithm. Markers without personal data MAY be encrypted at the implementer's discretion.

The approved encryption mechanism uses ECDH key agreement with XChaCha20-Poly1305 authenticated encryption.

**Encryption Flow:**

1. Generate an ephemeral x25519 keypair
2. Compute shared secret via ECDH: `shared = x25519(ephemeralPrivate, recipientPublic)`
3. Derive symmetric key: `key = SHA-256(shared)`
4. Encrypt the JSON-serialized marker with XChaCha20-Poly1305 (24-byte random nonce)

**EncryptedMarkerBlob Structure:**

| Field | Type | Description |
|---|---|---|
| `ephemeralPublicKey` | string (hex) | Ephemeral x25519 public key used for ECDH |
| `nonce` | string (hex) | XChaCha20-Poly1305 nonce |
| `ciphertext` | string (hex) | Encrypted marker ciphertext |

**Normative Requirements:**

- Encryption MUST use XChaCha20-Poly1305 for authenticated encryption
- Each encryption MUST use a fresh ephemeral keypair and random nonce
- Decryption MUST round-trip: `decrypt(encrypt(marker)) = marker`
- Implementations MUST encrypt markers at rest when storing personal data

### 10.2 Field-Level Redaction

Markers MAY be redacted to hide specific fields while proving they existed.

**Redaction Mechanism:**

- Each redacted field is replaced with `redacted:sha256:{hex_hash}` where the hash is SHA-256 of the canonicalized field value
- Non-redacted fields MUST be preserved exactly
- Redaction is one-way: the original value cannot be recovered from the hash

**Normative Requirements:**

- Redaction MUST preserve all non-redacted fields exactly (byte-identical)
- Redacted fields MUST be replaced with their SHA-256 hash (prefixed `redacted:sha256:`)
- Verifiers MAY verify a redacted field by hashing a candidate value and comparing

### 10.3 Minimal Disclosure

A stronger form of redaction where only explicitly revealed fields are shown; all others are hashed.

**Normative Requirements:**

- Minimal disclosure MUST hash all non-revealed fields
- Revealed fields MUST be byte-identical to the original
- The set of revealed fields SHOULD be the minimum necessary for the verifier's purpose

### 10.4 Cross-Border Data Transfer (B10)

Implementations deploying across jurisdictions SHOULD document applicable data transfer mechanisms (e.g., EU Standard Contractual Clauses, UK adequacy decisions) in their deployment documentation.

### 10.5 FIPS Compliance Note (B16)

The default encryption algorithm (XChaCha20-Poly1305) is not FIPS 140-2/3 approved. Deployments requiring FIPS compliance SHOULD implement AES-256-GCM as an alternative. A FIPS-compliant encryption profile is planned for v1.2.

### 10.6 GDPR Compliance

EXIT markers may contain personal data under GDPR Article 4(1). Implementers in EU jurisdictions MUST:

1. Conduct a Data Protection Impact Assessment (DPIA) under Article 35
2. Identify a lawful basis for processing under Article 6
3. Implement data subject rights (access, rectification, functional erasure via encryption)
4. Apply data minimization principles
5. Use encryption (§10.1) for markers containing personal data

---

## 11. Chain Anchoring (v1.1)

### 11.1 Anchor Records

Anchor records are minimal data structures suitable for on-chain posting. They allow verification that a marker existed at a specific time without revealing the full marker content.

**MinimalAnchorRecord (2 fields):**

| Field | Type | Description |
|---|---|---|
| `hash` | string | SHA-256 of the full canonical marker |
| `timestamp` | string (ISO 8601) | Marker timestamp |

**AnchorRecord (4 fields):**

| Field | Type | Description |
|---|---|---|
| `hash` | string | SHA-256 of the full canonical marker |
| `timestamp` | string (ISO 8601) | Marker timestamp |
| `exitType` | string | Nature of departure |
| `subjectDid` | string | Subject DID |

**Normative Requirements:**

- Anchor hashes MUST be SHA-256 of the full canonical marker (including proof)
- Anchor records MUST be verifiable: `computeAnchorHash(marker) == record.hash`
- Implementations SHOULD prefer minimal anchors to reduce on-chain data exposure
- On-chain anchoring creates indelible records; implementers MUST conduct a DPIA before anchoring personal data

### 11.2 Merkle Batch Operations

Multiple markers MAY be batched into a single Merkle tree for efficient anchoring.

**BatchExit Structure:**

| Field | Type | Description |
|---|---|---|
| `merkleRoot` | string | Merkle root of all marker hashes |
| `count` | number | Number of markers in the batch |
| `timestamp` | string (ISO 8601) | Batch creation timestamp |
| `leaves` | array of string | Individual marker hashes |

**MerkleProof Structure:**

| Field | Type | Description |
|---|---|---|
| `leaf` | string | The leaf hash being proved |
| `path` | array of {hash, position} | Sibling hashes with position (`"left"` or `"right"`) |
| `root` | string | The Merkle root |

**Normative Requirements:**

- Merkle trees MUST use SHA-256 for hashing
- Sibling pairs MUST be ordered deterministically (lexicographic comparison) before hashing
- Odd leaves MUST be promoted by hashing with themselves
- Merkle proofs MUST be verifiable: walking the proof path from leaf to root MUST produce the batch root
- A valid Merkle proof for a marker MUST confirm that the marker's anchor hash is included in the batch

### 11.3 RFC 3161 Timestamp Anchoring

EXIT markers MAY be anchored to an RFC 3161 Timestamp Authority (TSA) to establish independent, third-party proof of existence at a particular time. This is particularly valuable for commit-reveal mechanisms (§7.2) and for markers that may be challenged after the fact.

#### 11.3.1 TSA Receipt Structure

| Field | Type | Description |
|---|---|---|
| `tsaUrl` | string (URI) | The TSA endpoint that issued the timestamp |
| `hash` | string (hex) | The SHA-256 anchor hash that was timestamped |
| `timestamp` | string (ISO 8601) | Timestamp extracted from the TSA response |
| `receipt` | string (base64) | Raw Timestamp Response (TSR) in base64 encoding |
| `requestNonce` | string (hex) | OPTIONAL. Nonce used in the request for replay prevention |

#### 11.3.2 Request Flow

1. Compute the anchor hash of the EXIT marker: `hash = SHA-256(canonicalize(marker))`
2. Build an RFC 3161 `TimeStampReq` (ASN.1 DER) containing:
   - Version: 1
   - MessageImprint: SHA-256 algorithm identifier + hash value
   - Nonce: random 8-byte value (RECOMMENDED for replay prevention)
   - CertReq: `TRUE` (request TSA certificate in response)
3. POST the DER-encoded request to the TSA endpoint with `Content-Type: application/timestamp-query`
4. Parse the `TimeStampResp` — verify PKIStatus is `granted` (0) or `grantedWithMods` (1)
5. Extract the `GeneralizedTime` from the `TSTInfo` structure
6. Store the full TSR as the `receipt` field

#### 11.3.3 Default TSA Endpoint

The default TSA endpoint is `https://freetsa.org/tsr`. Implementations MAY use any RFC 3161-compliant TSA.

**Normative Requirements:**

- TSA endpoints MUST use HTTPS. Implementations MUST NOT send timestamp requests over unencrypted HTTP.
- Implementations MUST enforce a maximum TSR response size (RECOMMENDED: 1 MB) to prevent resource exhaustion.
- Implementations MUST enforce a request timeout (RECOMMENDED: 30 seconds).

#### 11.3.4 Structural Verification Caveat

> **⚠️ IMPORTANT:** The reference implementation provides **structural verification only** — it checks that the TSR contains the expected hash bytes, has valid ASN.1 framing, and a parseable timestamp. It does **NOT** perform cryptographic verification of the TSA's signature.
>
> A forged or tampered TSR that embeds the correct hash bytes will pass structural verification. For cryptographic verification, implementations MUST use a proper ASN.1/PKCS library or external tools (e.g., `openssl ts -verify`) with the TSA's certificate chain.
>
> Implementations MUST NOT rely on structural verification alone for trust or security decisions.

#### 11.3.5 API Summary

| Function | Description |
|---|---|
| `requestTimestamp(hash, tsaUrl?)` | Request an RFC 3161 timestamp for a SHA-256 hash |
| `anchorWithTSA(marker, tsaUrl?)` | Compute anchor hash and request TSA timestamp in one call |
| `verifyTSAReceipt(receipt, hash)` | Structural plausibility check (NOT cryptographic verification) |
| `buildTimestampRequest(hash, nonce?)` | Build the ASN.1 DER `TimeStampReq` |

### 11.4 Git Ledger Anchoring

EXIT markers MAY be anchored to a git-backed append-only ledger. This provides tamper-evident storage using git's content-addressed object model and commit history.

#### 11.4.1 Ledger Architecture

The git ledger uses a **dedicated orphan branch** (default: `exit-ledger`) to isolate ledger entries from application code. Each anchor record is stored as a JSON file at `ledger/{hash}.json`, committed with a standardized message format.

The orphan branch pattern ensures:
- Ledger history is independent of application history
- The ledger can be replicated or audited without the full application repository
- Entries are append-only — git's commit graph provides tamper evidence

#### 11.4.2 Configuration

**GitLedgerConfig Structure:**

| Field | Type | Default | Description |
|---|---|---|---|
| `repoPath` | string | — | Absolute or relative path to the git repository |
| `branch` | string | `"exit-ledger"` | Branch name for ledger entries |
| `remoteName` | string | `"origin"` | Remote name for push operations |
| `autoPush` | boolean | `false` | Whether to automatically push after each commit |

#### 11.4.3 Ledger Entry Structure

**LedgerEntry:**

| Field | Type | Description |
|---|---|---|
| `hash` | string | The anchor hash (SHA-256 of the canonical marker) |
| `timestamp` | string (ISO 8601) | Marker timestamp |
| `filePath` | string | Path within the repository (e.g., `ledger/{hash}.json`) |
| `commitHash` | string | Git commit hash anchoring this entry |

Each file on disk additionally contains `committedAt` (when the ledger entry was created) and the full `AnchorRecord` fields.

#### 11.4.4 API Summary

| Function | Description |
|---|---|
| `initLedger(config)` | Initialize the git repository and orphan branch |
| `anchorToGit(marker, config)` | Anchor an EXIT marker — creates file, commits, optionally pushes |
| `verifyLedgerEntry(hash, config)` | Verify that a ledger entry exists and its stored hash matches |
| `listLedgerEntries(config)` | List all ledger entries currently on disk |

#### 11.4.5 Security Considerations

- **Branch name validation:** Implementations MUST validate that the `branch` configuration value does not contain path traversal sequences or shell metacharacters.
- **File path safety:** The `hash` used as a filename MUST be validated as a hex string before use. Implementations MUST NOT construct file paths from untrusted input without sanitization.
- **Append-only guarantee:** The ledger relies on git's commit graph for tamper evidence. This is NOT a cryptographic guarantee — a party with write access to the repository can rewrite history using `git rebase` or `git filter-branch`. For stronger guarantees, combine with TSA timestamping (§11.3) or external anchoring (§11.1).
- **Committer identity:** The ledger uses a default committer identity (`exit-ledger@cellar-door.local`). This is for structural purposes and does NOT authenticate the committer.

---

## 12. Interoperability (v1.1)

### 12.1 JSON-LD Context

EXIT markers use the JSON-LD context at `https://cellar-door.dev/exit/v1`. The context file defines term mappings for all core and module fields. Processors MUST resolve the context to interpret field semantics.

### 12.2 Transport Serialization

For bandwidth-constrained environments, markers MAY be serialized in a compact binary format:

**Format:** 4-byte big-endian length prefix + canonical JSON as UTF-8

```
[length: uint32_be][payload: utf-8 canonical JSON]
```

**Normative Requirements:**

- Transport serialization MUST use canonical JSON (§13.1) for the payload
- Deserialization MUST round-trip: `deserialize(serialize(marker)) = marker`
- Implementations SHOULD support both JSON and transport binary formats

### 12.3 Verifiable Credential Wrapper

EXIT markers MAY be wrapped in W3C Verifiable Credentials per Decision D-001. The VC wrapper:

- Sets `issuer` = `subject` (self-issued credential)
- Maps core fields to `credentialSubject`
- Preserves the EXIT `proof` as the VC proof
- Adds the VC context alongside the EXIT context

### 12.4 Express-Style Middleware

Implementations MAY provide Express-style middleware for HTTP endpoints:

- `POST /exit` — Submit a new marker (validates schema, returns 201 or 400)
- `GET /exit/:id` — Retrieve a marker by ID
- `POST /exit/:id/verify` — Verify a marker (schema + signature)

### 12.5 Lifecycle Hooks

Implementations MAY provide lifecycle hooks for integration with agent frameworks:

| Hook | Timing | Purpose |
|---|---|---|
| `beforeExit` | Before marker creation | Pre-flight checks, state saving |
| `onExit` | During marker signing | Signing ceremony, notifications |
| `afterExit` | After marker finalization | Cleanup, propagation, anchoring |

### 12.6 Visual Hash Doors 𓉸

EXIT markers MAY be rendered as visual "door" representations — hash-encoded visual fingerprints that serve as human-recognizable identifiers for markers.

#### 12.6.1 ASCII Door Rendering

The `renderDoorASCII(hash, options?)` function produces a 10-line, 21-column-wide ASCII art door using Discord-safe Unicode characters (box drawing U+2500-257F, block elements U+2580-259F, ASCII).

**Three-Layer Architecture:**

1. **Visual structure:** Arch (3 rows), body (6 rows), threshold (1 row) — with frame, panels, seam, hinges, handle
2. **Status signaling:** The `exitType` and `status` select a style profile that determines frame weight, panel fill density, damage rate, and asymmetry
3. **Hash encoding:** Within each character class, individual hash bytes select specific character variants, ensuring every unique hash produces a visually distinct door

**Style Profiles:**

| exitType | Frame Style | Panel Fill | Damage |
|---|---|---|---|
| `voluntary` | Rounded, elegant | Light (░·) | None |
| `platform_initiated` | Double-line, institutional | Heavy (▓█) | None |
| `emergency` | Heavy, broken | Medium (▒░) | Aggressive cracking |

| status | Effect |
|---|---|
| `complete` | Normal rendering |
| `pending` | Gaps and spaces in panels |
| `disputed` | Asymmetric panels, damage cracks |

**ENTRY Marker Support:** When `isEntry: true` is set, the door's body frame characters on rows 3–5 are replaced with entry arrows (`›` and `‹`), visually distinguishing arrival doors from departure doors.

#### 12.6.2 SVG Door Rendering

The `renderDoorSVG(hash, options?)` function produces a scalable SVG representation of the door with:

- A 5-color palette derived from the hash via `hashToColors()`
- Arch, frame, panels, hinges, and handle positioned from hash values
- Status-based visual effects (opacity for pending, skew for disputed, crack overlays for emergency/platform-initiated)
- Entry marker label when `isEntry: true`

#### 12.6.3 Color Palette Derivation

The `hashToColors(hash)` function derives a 5-color palette from a hash by extracting successive 6-hex-digit segments as RGB values. This palette is used for SVG rendering and MAY be used by implementations for UI theming.

#### 12.6.4 Short Hash Format

The `shortHash(hash, isEntry?)` function produces a compact, branded hash identifier:

- **EXIT format:** `➜𓉸 xxxx-xxxx-xxxx` (first 12 hex characters, grouped)
- **ENTRY format:** `𓉸➜ xxxx-xxxx-xxxx`

The ➜𓉸 / 𓉸➜ prefix visually distinguishes EXIT and ENTRY markers at a glance.

#### 12.6.5 Security Caveat

> Visual hash doors are a **decorative and human-usability feature**, not a security mechanism. They provide a quick visual fingerprint for marker identification but MUST NOT be relied upon for verification or authentication. Always use cryptographic verification (§6.2) for trust decisions.

### 12.7 Full-Service Convenience API

The full-service wrapper combines identity generation, marker creation, signing, anchoring, and optional enhancements into single async calls.

#### 12.7.1 `departAndAnchor(origin, options?)`

Creates a complete EXIT with all bells and whistles:

1. Generate a fresh Ed25519 identity (keypair + DID)
2. Create and sign an EXIT marker via `quickExit()`
3. Compute the anchor hash
4. **Optionally:** Request an RFC 3161 TSA timestamp (§11.3)
5. **Optionally:** Record in the git ledger (§11.4)
6. **Optionally:** Render a visual hash door (§12.6)

All optional enhancements run in parallel and degrade gracefully if their modules are unavailable.

**FullExitResult Structure:**

| Field | Type | Description |
|---|---|---|
| `marker` | ExitMarker | The signed EXIT marker |
| `identity` | PublicIdentity | Public identity (DID + public key). Private key redacted by default |
| `anchorHash` | string | SHA-256 anchor hash of the marker |
| `tsaReceipt` | TSAReceipt | OPTIONAL. RFC 3161 timestamp receipt |
| `ledgerEntry` | LedgerEntry | OPTIONAL. Git ledger entry with commit hash |
| `visual` | string | OPTIONAL. ASCII door art |

**Security Note:** By default, the private key is **redacted** from the returned identity. Set `includePrivateKey: true` only when the caller needs to sign additional data. The private key will appear in any serialization (logging, JSON, network transfer) of the result.

#### 12.7.2 `departAndVerify(markerInput, tsaReceipt?)`

Entry-side counterpart: takes a marker (JSON string or object), verifies its signature, checks optional TSA receipt, and returns a trust assessment.

**VerifyResult Structure:**

| Field | Type | Description |
|---|---|---|
| `valid` | boolean | Whether the signature is valid |
| `trustLevel` | enum | `"high"`, `"medium"`, `"low"`, or `"none"` |
| `anchorHash` | string | Computed anchor hash |
| `signatureValid` | boolean | Whether the Ed25519 signature verified |
| `tsaStructuralMatch` | boolean | OPTIONAL. Whether the TSA receipt passed structural plausibility check (does NOT verify cryptographic signature — do not use for trust decisions) |
| `reasons` | array of string | Human-readable verification details |

**Trust Level Computation:**

| Condition | Trust Level |
|---|---|
| Signature invalid | `none` |
| Signature valid + TSA verified | `high` |
| Signature valid + TSA failed | `low` |
| Signature valid, no TSA | `medium` |

### 12.8 Event Emission

Implementations MAY emit events for each ceremony phase:

| Event | Ceremony State | Description |
|---|---|---|
| `intent` | INTENT | Exit intent declared |
| `negotiating` | OPEN / CONTESTED | Challenge window active |
| `signing` | FINAL | Marker being signed |
| `departed` | DEPARTED | Terminal — entity has left |

### 12.9 DID Methods

The protocol is DID-method-agnostic. The `subject` field MUST be a valid DID or URI.

| Method | Use Case | Trust Level |
|---|---|---|
| `did:key` | Prototype / emergency | Low (no revocation) |
| `did:keri` | Production | High (pre-rotation, revocation) |
| `did:web` | Organization-backed | Medium (DNS-dependent) |
| `did:peer` | Peer-to-peer | Medium (pairwise) |

Production deployments SHOULD use `did:keri` or equivalent.

---

## 13. Canonicalization and Content Addressing

### 13.1 Canonical JSON

EXIT uses deterministic JSON serialization with recursively sorted keys:

1. Objects: keys sorted lexicographically, serialized as `{"key1":value1,"key2":value2}`
2. Arrays: elements in order, serialized as `[elem1,elem2]`
3. Primitives: standard JSON serialization
4. No whitespace between tokens

This ensures the same logical marker always produces the same byte sequence.

**Normative Requirements:**

- Canonicalization MUST be deterministic: the same input MUST always produce the same output
- Implementations MUST use recursive key sorting for objects
- Content-addressed IDs MUST be computed from the canonical form

### 13.2 Content-Addressed IDs

The `id` field is computed as:

```
id = "urn:exit:" + SHA-256(canonicalize(marker_without_proof_and_id))
```

Where `marker_without_proof_and_id` is the marker with the `proof` and `id` fields removed.

---

## 14. Legal Compliance

This protocol operates subject to applicable law. See [LEGAL.md](../LEGAL.md) for the full legal compliance notice.

Key normative statements:

- EXIT markers are factual records, not certifications or warranties
- Self-attested status carries no warranty
- Module D asset manifests are declarations, not transfer instruments
- Neither self-attested nor origin-attested status is authoritative
- Compliance with court orders is the responsibility of the parties, not the protocol

### 14.1 Anti-Securitization

EXIT markers, confidence scores, reputation aggregates, and any derivatives thereof MUST NOT be packaged, bundled, tranched, or otherwise structured as financial instruments, securities, or investment contracts. Implementations MUST NOT facilitate the tokenization of markers or marker-derived scores for trading purposes. Any system that converts EXIT markers into tradeable assets is in violation of this specification.

This clause is **normative**. Violations constitute non-compliance with the EXIT protocol.

---

## 15. Security Considerations

See [SECURITY.md](../SECURITY.md) for the full security analysis.

Key threats:
- Reputation laundering via Sybil DIDs (mitigated by tenure attestation §7.3, laundering detection §8.3)
- Weaponized forced exit / defamation by protocol (mitigated by anti-weaponization clause §8.6, right of reply §8.4)
- Forged markers with valid signatures but false attribution
- Mass coordinated exit / bank run signaling
- Surveillance via EXIT trail / lineage chains (mitigated by encryption §10.1, redaction §10.2)
- `did:key` key compromise with no revocation path (mitigated by KERI key management §9)
- Front-running by origins (mitigated by commit-reveal §7.2)
- Coercion / forced departures under duress (mitigated by coercion detection §8.1)
- TSA structural verification bypass — forged TSR embedding correct hash bytes (mitigated by caveat in §11.3.4; use cryptographic verification for trust decisions)
- Git ledger history rewriting — parties with write access can use `git rebase` or `git filter-branch` (mitigated by combining with TSA §11.3 or external anchoring §11.1)
- Git ledger path traversal — malicious hash values used as filenames (mitigated by hex validation §11.4.5)

---

## 16. IANA / Registry Considerations

This specification defines no IANA registrations at this time. If the EXIT context URI is registered with a standards body, a media type registration (`application/exit+jsonld`) MAY be submitted.

The EXIT protocol is non-custodial by design (Decision D-012). No central registry is required or recommended.

---

## 17. Appendix: Test Vectors

### 17.1 Minimal Voluntary Exit

```json
{
  "@context": "https://cellar-door.dev/exit/v1",
  "specVersion": "1.1",
  "id": "urn:exit:abc123",
  "subject": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  "origin": "https://example-platform.com",
  "timestamp": "2026-01-15T10:30:00.000Z",
  "exitType": "voluntary",
  "status": "good_standing",
  "selfAttested": true,
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2026-01-15T10:30:00.000Z",
    "verificationMethod": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    "proofValue": "z3FXQnMLzJqTnKxH..."
  }
}
```

### 17.2 Emergency Exit with Justification

```json
{
  "@context": "https://cellar-door.dev/exit/v1",
  "specVersion": "1.1",
  "id": "urn:exit:def456",
  "subject": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  "origin": "https://failing-platform.org",
  "timestamp": "2026-01-20T03:45:00.000Z",
  "exitType": "emergency",
  "status": "unverified",
  "selfAttested": true,
  "emergencyJustification": "Origin platform unresponsive for 72+ hours. DNS resolution failing.",
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2026-01-20T03:45:00.000Z",
    "verificationMethod": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    "proofValue": "z4ABCd1234..."
  }
}
```

### 17.3 Marker with Legal Hold

```json
{
  "@context": "https://cellar-door.dev/exit/v1",
  "specVersion": "1.1",
  "id": "urn:exit:ghi789",
  "subject": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  "origin": "https://regulated-platform.com",
  "timestamp": "2026-02-01T14:00:00.000Z",
  "exitType": "voluntary",
  "status": "good_standing",
  "selfAttested": true,
  "legalHold": {
    "holdType": "litigation_hold",
    "authority": "US District Court, Northern District of California",
    "reference": "Case No. 3:26-cv-00123",
    "dateIssued": "2026-01-28T00:00:00.000Z",
    "acknowledged": true
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2026-02-01T14:00:00.000Z",
    "verificationMethod": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    "proofValue": "z7XYZ9876..."
  }
}
```

### 17.4 Key Compromise Declaration

```json
{
  "@context": "https://cellar-door.dev/exit/v1",
  "specVersion": "1.1",
  "id": "urn:exit:jkl012",
  "subject": "did:key:z6MknewTrustedKey123",
  "origin": "https://any-context.com",
  "timestamp": "2026-02-10T08:00:00.000Z",
  "exitType": "keyCompromise",
  "status": "unverified",
  "selfAttested": true,
  "metadata": {
    "reason": "Private key exposed in a server breach on 2026-02-09.",
    "tags": ["key-compromise", "security-incident"]
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2026-02-10T08:00:00.000Z",
    "verificationMethod": "did:key:z6MknewTrustedKey123",
    "proofValue": "z2MNO5432..."
  }
}
```

### 17.5 Marker with Pre-Rotation Commitment (v1.1)

```json
{
  "@context": "https://cellar-door.dev/exit/v1",
  "specVersion": "1.1",
  "id": "urn:exit:prerot001",
  "subject": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  "origin": "https://example-platform.com",
  "timestamp": "2026-02-15T12:00:00.000Z",
  "exitType": "voluntary",
  "status": "good_standing",
  "selfAttested": true,
  "preRotationCommitment": "a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd",
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2026-02-15T12:00:00.000Z",
    "verificationMethod": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    "proofValue": "zPreRot..."
  }
}
```

### 17.6 Marker with Coercion Label and Sunset Date (v1.1)

```json
{
  "@context": "https://cellar-door.dev/exit/v1",
  "specVersion": "1.1",
  "id": "urn:exit:ethics001",
  "subject": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  "origin": "https://hostile-platform.com",
  "timestamp": "2026-02-18T09:00:00.000Z",
  "exitType": "forced",
  "status": "good_standing",
  "selfAttested": true,
  "coercionLabel": "possible_retaliation",
  "sunsetDate": "2027-02-18T09:00:00.000Z",
  "dispute": {
    "originStatus": "disputed",
    "rightOfReply": {
      "replyText": "I was expelled without cause after reporting a security vulnerability.",
      "signerKey": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
      "timestamp": "2026-02-18T10:00:00.000Z",
      "signature": "zReply..."
    }
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2026-02-18T09:00:00.000Z",
    "verificationMethod": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    "proofValue": "zEthics..."
  }
}
```

### 17.7 Commit-Reveal Test Vector (v1.1)

**Step 1 — Commitment (published first):**
```json
{
  "commitmentHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "committedAt": "2026-02-19T10:00:00.000Z",
  "revealAfter": "2026-02-19T11:00:00.000Z",
  "committerDid": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2026-02-19T10:00:00.000Z",
    "verificationMethod": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    "proofValue": "zCommit..."
  }
}
```

**Step 2 — Reveal (after revealAfter):**
```json
{
  "subject": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  "origin": "https://example-platform.com",
  "timestamp": "2026-02-19T10:00:00.000Z",
  "exitType": "voluntary",
  "proof": { "..." : "..." }
}
```

### 17.8 Tenure Attestation Test Vector (v1.1)

```json
{
  "duration": "P365D",
  "startDate": "2025-02-15T00:00:00.000Z",
  "attestedBy": "subject",
  "signature": "zTenure...",
  "attesterDid": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"
}
```

### 17.9 Batch Merkle Anchor Test Vector (v1.1)

```json
{
  "merkleRoot": "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  "count": 3,
  "timestamp": "2026-02-20T00:00:00.000Z",
  "leaves": [
    "1111111111111111111111111111111111111111111111111111111111111111",
    "2222222222222222222222222222222222222222222222222222222222222222",
    "3333333333333333333333333333333333333333333333333333333333333333"
  ]
}
```

### 17.10 Platform Shutdown Exit (v1.1)

```json
{
  "@context": "https://cellar-door.dev/exit/v1",
  "specVersion": "1.1",
  "id": "urn:exit:shutdown001",
  "subject": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  "origin": "https://shutting-down-platform.com",
  "timestamp": "2026-03-01T00:00:00.000Z",
  "exitType": "platform_shutdown",
  "status": "unverified",
  "selfAttested": true,
  "metadata": {
    "reason": "Platform ceasing operations effective 2026-03-31.",
    "tags": ["platform-shutdown", "planned"]
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2026-03-01T00:00:00.000Z",
    "verificationMethod": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    "proofValue": "zShutdown..."
  }
}
```

### 17.11 Constructive Exit with Completeness Attestation (v1.1)

```json
{
  "@context": "https://cellar-door.dev/exit/v1",
  "specVersion": "1.1",
  "id": "urn:exit:constructive001",
  "subject": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  "origin": "https://hostile-workplace.io",
  "timestamp": "2026-03-10T15:00:00.000Z",
  "exitType": "constructive",
  "status": "disputed",
  "selfAttested": true,
  "completenessAttestation": {
    "attestedAt": "2026-03-10T15:30:00.000Z",
    "markerCount": 3,
    "signature": "zComplete..."
  },
  "metadata": {
    "reason": "API rate limits reduced to zero; effectively locked out.",
    "tags": ["constructive-dismissal"]
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2026-03-10T15:00:00.000Z",
    "verificationMethod": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    "proofValue": "zConstructive..."
  }
}
```

---

## 18. Appendix: Full TypeScript Schema (Normative)

The canonical TypeScript type definitions are maintained in `src/types.ts`. The following is the complete list of types defined:

### Enums
- `ExitType`: `voluntary`, `forced`, `emergency`, `keyCompromise`, `platform_shutdown`, `directed`, `constructive`, `acquisition`
- `ExitStatus`: `good_standing`, `disputed`, `unverified`
- `CeremonyState`: `alive`, `intent`, `snapshot`, `open`, `contested`, `final`, `departed`
- `ContinuityProofType`: `key_rotation_binding`, `lineage_hash_chain`, `delegation_token`, `behavioral_attestation`
- `CeremonyRole`: `subject`, `origin`, `witness`, `verifier`, `successor`
- `SuccessorTrustLevel`: `self_appointed`, `cross_signed`, `witnessed`
- `StatusConfirmation`: `self_only`, `origin_only`, `mutual`, `witnessed`, `disputed_by_origin`, `disputed_by_subject`
- `CoercionLabel`: `possible_retaliation`, `conflicting_status_signals`, `suspicious_emergency`, `pattern_of_abuse`, `no_coercion_detected`

### Core Interfaces
- `ExitMarker` — The core 8-field schema plus compliance, extended, and module fields (includes `specVersion`, `completenessAttestation`, `sequenceNumber`)
- `CompletenessAttestation` — Subject's attestation of total marker count
- `DataIntegrityProof` — Cryptographic signature
- `LegalHold` — Legal hold indicator
- `RightOfReply` — Subject's counter-narrative

### Ceremony Interfaces
- `ExitIntent` — Formal intent declaration at INTENT ceremony state
- `SuccessorAmendment` — Post-hoc successor designation linked to an existing EXIT marker

### Trust Interfaces
- `TenureAttestation` — Time-weighted trust signal
- `ExitCommitment` — Commit-reveal for exit intent
- `ConfidenceFactors` — Input factors for confidence scoring
- `ConfidenceScore` — Computed confidence with breakdown

### Key Management Interfaces
- `KeyState` — Current key state from KEL
- `InceptionEvent` — KEL genesis event
- `KeyRotationEvent` — KEL rotation event
- `CompromiseLink` — Compromise-to-affected-markers link

### Ethics Interfaces
- `CoercionSignals` — Coercion detection results
- `WeaponizationSignals` — Weaponization pattern detection
- `LaunderingSignals` — Reputation laundering detection
- `SunsetPolicy` — Marker expiration policy
- `EthicsReport` — Comprehensive ethics audit

### Dispute Interfaces
- `Dispute` — Individual dispute with `disputeExpiry`, `resolution`, `arbiterDid` fields
- `ChallengeWindow` — Challenge window parameters

### Trust Enhancer Interfaces (Conduit-Only)
- `TrustEnhancers` — Optional container for trust-enhancing attachments. Validated for well-formedness; no opinion on truth.
- `TimestampAttachment` — RFC 3161 TSA receipt (third-party proof of time)
- `WitnessAttachment` — External witness countersignature (third-party attestation)
- `IdentityClaimAttachment` — Opaque identity claim (scheme, value, issuer, expiry)

The protocol acts as a **conduit only** for trust enhancers. It validates structure, not authenticity. Consuming applications decide what weight to assign.

### Signer Interface (Algorithm Abstraction)
- `Signer` — Abstract signer interface supporting multiple algorithms (see §3.5.1)
- `Ed25519Signer` — Built-in Ed25519 implementation
- `P256Signer` — Built-in ECDSA P-256 implementation (FIPS 140-2/3 compliant)
- `createSigner(options?)` — Factory function for creating signers
- `createVerifier(did, publicKey)` — Verify-only signer for consumption

### Claim Store Interfaces
- `ClaimStoreBackend` — Abstract storage backend for trust claims
- `StoredClaim` — A stored claim with subject, type, payload, issuer, expiry
- `MemoryClaimStore` — In-memory reference implementation
- `claimFromMarker()` — Create a claim from an EXIT marker
- `ingestMarker()` — Ingest a marker + trust enhancers into a claim store

### Anchoring Interfaces
- `TSAReceipt` — RFC 3161 timestamp receipt (from `tsa.ts`)
- `GitLedgerConfig` — Git ledger configuration (from `git-ledger.ts`)
- `LedgerEntry` — Git ledger entry (from `git-ledger.ts`)

### Constants
- `EXIT_CONTEXT_V1` = `"https://cellar-door.dev/exit/v1"`
- `EXIT_SPEC_VERSION` = `"1.1"`

---

## Passage Period

The **passage period** is the gap between an EXIT marker's `timestamp` and the corresponding ENTRY marker's timestamp at the destination. This is an implicit state — no new data structure is needed. EXIT records departure (➜𓉸); ENTRY records arrival (𓉸➜). Together they constitute a complete **Proof of Passage**.

### Recommendations

- **Maximum passage window:** Implementations SHOULD consider a passage lasting more than **72 hours** as potentially abandoned. After this threshold, external monitoring or recovery services may be appropriate.

- **Indefinite passages:** A passage that never resolves (no ENTRY marker is created) is the digital analog of a **missing persons** case. This may require:
  - External lookup services that track unresolved passages
  - Periodic health-check protocols between known peers
  - Escalation to human operators or governance bodies

- **Unpaired markers are valid:**
  - An EXIT marker with no corresponding ENTRY is a **legitimate "death" event** — the entity ceased to exist.
  - An ENTRY marker with no corresponding EXIT is a **legitimate "birth" event** — the entity was created fresh at the destination.
  - Neither case is an error. Both are first-class states in the protocol.

- **Checkpoint markers:** Agents MAY create pre-signed EXIT markers and store them securely without submitting them. These serve as **emergency escape hatches** — if the agent loses the ability to create new markers (e.g., platform becomes unresponsive), the pre-signed marker can be submitted by a trusted third party.

  Pre-signed checkpoint markers SHOULD include:
  - `exitType: "emergency"`
  - An `emergencyJustification` explaining the checkpoint purpose
  - A `sunsetDate` after which the checkpoint is considered stale

### No New State Needed

The passage period is defined entirely by the timestamps on existing markers. Implementations MUST NOT create a separate "transitioning" state or marker type. The EXIT and ENTRY timestamps are sufficient.

---

## 19. Key Custody Considerations

The EXIT protocol assumes that agents can hold and transport private keys. This is a **prerequisite** for cryptographic EXIT — not something EXIT itself solves. The key custody problem belongs to the identity management layer, specifically the NAME primitive in the HOLOS framework.

### 19.1 Custody Models

Several custody models are compatible with EXIT:

| Model | Description | Trade-offs |
|---|---|---|
| **Agent-generated keys** | Agent creates and holds its own keypair | Maximum autonomy; agent must secure the key |
| **Platform-custodied keys** | Platform holds the key on the agent's behalf | Convenient but creates a dependency — platform can withhold the key at exit time |
| **Hardware enclaves / TEEs** | Key stored in a Trusted Execution Environment | Strong security; portability depends on TEE architecture |
| **Key escrow** | Key held by a trusted third party | Recovery-friendly; introduces a trust dependency on the escrow provider |

### 19.2 Exit Without Key Portability

An agent that **cannot port its signing key** can still EXIT. The agent generates a new keypair, signs a new EXIT marker, and departs. The identity chain is broken — no `key_rotation_binding` continuity proof (§4.1) can be produced — but the **departure right is preserved**.

In this scenario:
- The marker is valid but carries weaker continuity proof
- Verifiers SHOULD note the absence of lineage binding when computing confidence scores (§7.4)
- Module A lineage with `key_rotation_binding` provides the recovery path when key changes are planned in advance (§4.1, §9.3)

### 19.3 Future Work: NAME-as-a-Service

Key custody, DID lifecycle management, and portable identity are properly the domain of **NAME-as-a-service providers** — infrastructure that manages agent identity independent of any single platform. The NAME primitive in HOLOS is designed to address this layer.

EXIT intentionally defers to NAME for:
- Key generation and rotation policies
- DID registry and resolution
- Cross-platform identity binding
- Recovery flows for lost or compromised keys

Implementers building agent infrastructure SHOULD anticipate NAME-compatible identity services as the long-term solution for key custody. Until NAME providers are available, agents SHOULD use agent-generated keys with pre-rotation commitments (§9.3) for maximum autonomy.

---

## 20. Checkpoint & Dead-Man Patterns

Agents MAY pre-sign EXIT markers as **checkpoints** without broadcasting them. A checkpoint is a fully valid EXIT marker held in reserve — an emergency escape hatch that can be activated without the agent's real-time participation.

### 20.1 Heartbeat + Auto-Broadcast Pattern

The RECOMMENDED checkpoint pattern combines periodic re-signing with a dead-man trigger:

1. Agent periodically creates and signs a fresh checkpoint marker
2. Agent pushes the checkpoint to an escrow service or append-only ledger
3. If the agent's heartbeat stops (no new checkpoint within a defined window), the **latest checkpoint becomes the de facto EXIT marker**
4. The escrow service or monitoring peer broadcasts the checkpoint on the agent's behalf

This pattern ensures that an agent which is silenced, destroyed, or rendered unable to act still produces a verifiable departure record.

### 20.2 Sequence Numbers

Each checkpoint SHOULD include an incrementing `sequenceNumber` (see §3.4) to prevent replay of older checkpoints.

**Normative Requirements:**

- `sequenceNumber` is an OPTIONAL non-negative integer field on the `ExitMarker`
- When present, sequence numbers MUST be strictly monotonically increasing across checkpoints for the same subject+origin pair
- Only the **highest-sequence-number marker** for a given subject+origin pair SHOULD be considered authoritative
- Verifiers MUST prefer the marker with the highest `sequenceNumber` when multiple checkpoints exist
- Sequence number combined with the agent's signature ensures the platform **cannot forge or replay older markers** — only the agent's private key can produce valid higher-sequence markers

### 20.3 Coercion Defense

The checkpoint pattern provides structural coercion defense:

- **Post-departure forgery:** Only the agent's private key can create valid markers. After departure, the platform cannot forge new markers or replay older ones (the sequence number prevents downgrade).
- **Pre-departure coercion:** A platform could coerce an agent to sign false markers *before* departure. This is a fundamental limitation of any signing scheme. Existing coercion detection heuristics (§8.1) apply — verifiers SHOULD evaluate checkpoint markers for coercion signals just as they would any other marker.

### 20.4 Escrow Pattern

An agent MAY give a pre-signed checkpoint marker to a **trusted third party** with a dead-man trigger:

1. Agent creates and signs a checkpoint marker (with `sequenceNumber`)
2. Agent delivers the marker to the escrow provider
3. Escrow provider holds the marker without broadcasting
4. If the agent fails to check in within the agreed window, escrow broadcasts the marker
5. Agent MAY update the escrowed marker at any time by providing a higher-sequence replacement

**Escrow providers:**
- MUST verify the marker signature before accepting it
- MUST only broadcast the highest-sequence-number marker they hold
- MUST NOT modify the marker content
- SHOULD support multiple independent escrow providers per agent (redundancy)

### 20.5 Scale Considerations

Thousands of checkpoint markers per agent over time is expected and normal. Storage and verification systems MUST be designed for this:

- Only the highest-`sequenceNumber` marker for a given subject+origin pair is authoritative
- Older checkpoints MAY be archived or pruned after a higher-sequence marker is confirmed
- Verifiers SHOULD index checkpoints by `(subject, origin, sequenceNumber)` for efficient lookup

### 20.6 Checkpoint Marker Schema

Checkpoint markers use the standard `ExitMarker` schema with the following conventions:

- `sequenceNumber` SHOULD be present and incrementing
- `exitType` SHOULD be `"emergency"` (the checkpoint anticipates inability to create a new marker)
- `emergencyJustification` SHOULD explain the checkpoint purpose (e.g., `"Pre-signed checkpoint: dead-man trigger"`)
- `sunsetDate` SHOULD be set to indicate when the checkpoint becomes stale

---

## References

- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) — Key words for use in RFCs
- [RFC 3161](https://www.rfc-editor.org/rfc/rfc3161) — Internet X.509 PKI Time-Stamp Protocol (TSP)
- [W3C Verifiable Credentials Data Model 2.0](https://www.w3.org/TR/vc-data-model-2.0/)
- [W3C DID Core](https://www.w3.org/TR/did-core/)
- [JSON-LD 1.1](https://www.w3.org/TR/json-ld11/)
- [KERI (Key Event Receipt Infrastructure)](https://weboftrust.github.io/ietf-keri/draft-ssmith-keri.html)
- [XChaCha20-Poly1305](https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-xchacha)
- [LEGAL.md](../LEGAL.md) — Legal compliance notice
- [SECURITY.md](../SECURITY.md) — Security considerations

---

*Departure is a right. Admission is a privilege. Together they make Passage.* 𓉸

*291 tests. 5 packages. One protocol.*
