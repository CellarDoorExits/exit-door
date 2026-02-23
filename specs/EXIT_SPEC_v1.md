# EXIT Protocol Specification v1.0-draft

**Status:** Draft
**Date:** 2026-02-19
**Authors:** Cellar Door Contributors
**License:** Apache 2.0

---

## Abstract

The EXIT protocol defines a verifiable, portable, cryptographically signed marker for entity departures from digital contexts. EXIT markers enable agents, services, and participants to create authenticated records of departure that preserve continuity, reputation signals, and asset references across system boundaries.

This specification defines the core schema, optional extension modules (A–F), ceremony state machine, verification requirements, and compliance considerations for EXIT markers.

---

## 1. Introduction

When an entity departs a digital system — whether an AI agent leaving a platform, a participant exiting a DAO, or a service migrating between providers — no standardized mechanism exists to create a verifiable record of that departure. EXIT fills this gap.

An EXIT marker is a JSON-LD document, approximately 300–500 bytes in its core form, that records: who departed, from where, when, how, and under what standing. The marker is cryptographically signed by the departing subject and optionally co-signed by the origin system or witnesses.

### 1.1 Design Goals

- **Always available:** EXIT must work even with hostile or absent origins
- **Minimal:** The core schema is 7 fields; everything else is optional
- **Verifiable:** Every marker is cryptographically signed
- **Portable:** Markers are self-contained and offline-verifiable
- **Non-custodial:** No central registry is required

### 1.2 Relationship to Other Standards

EXIT markers can be wrapped in W3C Verifiable Credentials (Decision D-001) but are not dependent on the VC ecosystem. The standalone JSON-LD format is the canonical representation.

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

---

## 3. Core Schema

Every valid EXIT marker MUST contain the following fields.

### 3.1 Mandatory Fields

| # | Field | Type | Description |
|---|---|---|---|
| 1 | `@context` | string | MUST be `"https://cellar-door.org/exit/v1"` |
| 2 | `id` | string (URI) | Globally unique identifier. SHOULD be content-addressed (`urn:exit:{sha256}`) |
| 3 | `subject` | string (DID/URI) | Who is exiting. MUST be a valid DID or agent URI |
| 4 | `origin` | string (URI) | What is being exited. MUST be a URI identifying the origin system |
| 5 | `timestamp` | string (ISO 8601) | When the exit occurred. MUST be UTC |
| 6 | `exitType` | enum | Nature of departure: `voluntary`, `forced`, `emergency`, `keyCompromise` |
| 7 | `status` | enum | Standing at departure: `good_standing`, `disputed`, `unverified` |
| — | `proof` | object | Cryptographic signature. MUST be present and MUST be signed by the subject |

### 3.2 Compliance Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `selfAttested` | boolean | MUST be present | Whether the `status` field is self-attested. Default: `true` |
| `emergencyJustification` | string | Conditional | MUST be present when `exitType` is `emergency`. Free-text justification |
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

### 3.4 Proof Structure

The `proof` object MUST contain:

| Field | Type | Description |
|---|---|---|
| `type` | string | Signature algorithm (e.g., `"Ed25519Signature2020"`) |
| `created` | string (ISO 8601) | When the proof was created |
| `verificationMethod` | string | DID or key URI for verification |
| `proofValue` | string | Base64-encoded signature |

### 3.5 Exit Types

| Value | Description | Default Status |
|---|---|---|
| `voluntary` | Subject-initiated departure | `good_standing` |
| `forced` | Origin-initiated expulsion | `disputed` |
| `emergency` | Departure under abnormal conditions | `unverified` |
| `keyCompromise` | Declaration of key compromise | `unverified` |

The `keyCompromise` type is used to declare that a previously-used signing key has been compromised. This marker SHOULD be signed with a different, trusted key. Verifiers MUST treat all prior markers signed with the compromised key with suspicion.

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

### 4.2 Module B: State Snapshot Reference

Purpose: Anchor the exit to a specific system state.

| Field | Type | Required | Description |
|---|---|---|---|
| `stateHash` | string | MUST (if module present) | Content-addressed hash of state |
| `stateLocation` | string (URI) | MAY | Retrieval location for full state |
| `stateSchema` | string | MAY | Schema describing state format |
| `obligations` | array of strings | MAY | Outstanding commitments (references) |

EXIT stores the hash, NEVER the state itself. The state snapshot is stored externally.

### 4.3 Module C: Dispute Bundle

Purpose: Preserve evidence and record disputes at exit time.

| Field | Type | Required | Description |
|---|---|---|---|
| `disputes` | array of Dispute | MAY | Active disputes at exit |
| `evidenceHash` | string | MAY | Hash of evidence bundle |
| `challengeWindow` | object | MAY | Challenge window parameters |
| `counterpartyAcks` | array of Proof | MAY | Co-signatures acknowledging exit |
| `originStatus` | enum | MAY | Origin's view of subject standing |

The `originStatus` field is an **allegation by the origin**, not a finding of fact. Verifiers MUST NOT treat `originStatus` as dispositive (see LEGAL.md §11).

### 4.4 Module D: Economic

Purpose: Document assets and financial obligations at exit time.

| Field | Type | Required | Description |
|---|---|---|---|
| `assetManifest` | array of AssetReference | MAY | Assets being referenced |
| `settledObligations` | array of strings | MAY | Resolved obligations |
| `pendingObligations` | array of strings | MAY | Unresolved obligations (with escrow refs) |
| `exitFee` | object | MAY | Cost of exit |

**NORMATIVE:** Asset manifests are **declarations and references**, not transfer instruments or bearer instruments. They do not effectuate transfers of assets, rights, or obligations. See LEGAL.md §4.

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
- Disputes MUST NOT block transitions (D-006). Disputes change metadata only.
- Subject signature MUST be present at `FINAL`.
- Emergency path MUST include `emergencyJustification`.

---

## 6. Verification Requirements

### 6.1 Structural Verification

A verifier MUST check:

1. `@context` equals `"https://cellar-door.org/exit/v1"`
2. All 7 mandatory fields are present and non-empty
3. `selfAttested` field is present (boolean)
4. `timestamp` is valid ISO 8601 UTC
5. `exitType` is one of the defined enum values
6. `status` is one of the defined enum values
7. `proof` contains `type`, `created`, `verificationMethod`, and `proofValue`
8. If `exitType` is `emergency`, `emergencyJustification` MUST be present and non-empty
9. If `legalHold` is present, all required sub-fields MUST be present and valid

### 6.2 Cryptographic Verification

A verifier MUST:

1. Resolve the `proof.verificationMethod` to a public key
2. Verify the signature in `proof.proofValue` against the marker content (excluding `proof`)
3. Verify that the signing key corresponds to the `subject` DID

A verifier SHOULD:

1. Check for `keyCompromise` markers from the same subject
2. Verify the `id` matches the content-addressed hash

### 6.3 Trust Verification

A verifier SHOULD (based on context):

1. Evaluate `selfAttested` — if `true`, apply self-attestation trust level
2. Check for Module C `originStatus` and evaluate origin trust
3. Verify lineage chain depth and continuity proof strength (Module A)
4. Cross-reference the `origin` against known platform registries
5. Apply risk-based scrutiny (see SECURITY.md §5)

---

## 7. Legal Compliance

This protocol operates subject to applicable law. See [LEGAL.md](../LEGAL.md) for the full legal compliance notice.

Key normative statements:

- EXIT markers are factual records, not certifications or warranties
- Self-attested status carries no warranty
- Module D asset manifests are declarations, not transfer instruments
- Neither self-attested nor origin-attested status is authoritative
- Compliance with court orders is the responsibility of the parties, not the protocol

---

## 8. Security Considerations

See [SECURITY.md](../SECURITY.md) for the full security analysis.

Key threats:
- Reputation laundering via Sybil DIDs
- Weaponized forced exit (defamation by protocol)
- Forged markers with valid signatures but false attribution
- Mass coordinated exit (bank run signaling)
- Surveillance via EXIT trail / lineage chains
- `did:key` key compromise with no revocation path

---

## 9. Privacy Considerations

### 9.1 GDPR Compliance

EXIT markers may contain personal data under GDPR Article 4(1). Implementers in EU jurisdictions MUST:

1. Conduct a Data Protection Impact Assessment (DPIA) under Article 35
2. Identify a lawful basis for processing under Article 6
3. Implement data subject rights (access, rectification, functional erasure via encryption)
4. Apply data minimization principles

### 9.2 Data Minimization

Implementers SHOULD:

1. Include only necessary modules
2. Minimize Module E narrative content
3. Truncate lineage chains to the minimum useful depth
4. Encrypt markers at rest with subject-controlled keys

### 9.3 ZK Selective Disclosure Roadmap

Future versions will support zero-knowledge proofs enabling:

- Proof of exit without revealing origin
- Proof of good standing without revealing identity
- Proof of lineage depth without revealing the chain
- Proof of asset class without revealing amounts

This is a design priority tracked separately from the v1.0 specification.

---

## 10. Interoperability

### 10.1 JSON-LD

EXIT markers use the JSON-LD context at `https://cellar-door.org/exit/v1`. The context file defines term mappings for all core and module fields. Processors MUST resolve the context to interpret field semantics.

### 10.2 Verifiable Credential Wrapper

EXIT markers MAY be wrapped in W3C Verifiable Credentials per Decision D-001. The VC wrapper:

- Sets `issuer` = `subject` (self-issued credential)
- Maps core fields to `credentialSubject`
- Preserves the EXIT `proof` as the VC proof
- Adds the VC context alongside the EXIT context

### 10.3 DID Methods

The protocol is DID-method-agnostic. The `subject` field MUST be a valid DID or URI. Supported methods include:

| Method | Use Case | Trust Level |
|---|---|---|
| `did:key` | Prototype / emergency | Low (no revocation) |
| `did:keri` | Production | High (pre-rotation, revocation) |
| `did:web` | Organization-backed | Medium (DNS-dependent) |
| `did:peer` | Peer-to-peer | Medium (pairwise) |

Production deployments SHOULD use `did:keri` or equivalent.

---

## 11. IANA / Registry Considerations

This specification defines no IANA registrations at this time. If the EXIT context URI is registered with a standards body, a media type registration (`application/exit+jsonld`) MAY be submitted.

The EXIT protocol is non-custodial by design (Decision D-012). No central registry is required or recommended. Optional registries are convenience layers operated independently of the protocol.

---

## 12. Appendix: Test Vectors

### 12.1 Minimal Voluntary Exit

```json
{
  "@context": "https://cellar-door.org/exit/v1",
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

### 12.2 Emergency Exit with Justification

```json
{
  "@context": "https://cellar-door.org/exit/v1",
  "id": "urn:exit:def456",
  "subject": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  "origin": "https://failing-platform.org",
  "timestamp": "2026-01-20T03:45:00.000Z",
  "exitType": "emergency",
  "status": "unverified",
  "selfAttested": true,
  "emergencyJustification": "Origin platform unresponsive for 72+ hours. DNS resolution failing. No API endpoints reachable.",
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2026-01-20T03:45:00.000Z",
    "verificationMethod": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    "proofValue": "z4ABCd1234..."
  }
}
```

### 12.3 Marker with Legal Hold

```json
{
  "@context": "https://cellar-door.org/exit/v1",
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

### 12.4 Key Compromise Declaration

```json
{
  "@context": "https://cellar-door.org/exit/v1",
  "id": "urn:exit:jkl012",
  "subject": "did:key:z6MknewTrustedKey123",
  "origin": "https://any-context.com",
  "timestamp": "2026-02-10T08:00:00.000Z",
  "exitType": "keyCompromise",
  "status": "unverified",
  "selfAttested": true,
  "metadata": {
    "reason": "Private key for did:key:z6MkCompromisedOldKey was exposed in a server breach on 2026-02-09.",
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

---

## References

- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) — Key words for use in RFCs
- [W3C Verifiable Credentials Data Model 2.0](https://www.w3.org/TR/vc-data-model-2.0/)
- [W3C DID Core](https://www.w3.org/TR/did-core/)
- [JSON-LD 1.1](https://www.w3.org/TR/json-ld11/)
- [LEGAL.md](../LEGAL.md) — Legal compliance notice
- [SECURITY.md](../SECURITY.md) — Security considerations
