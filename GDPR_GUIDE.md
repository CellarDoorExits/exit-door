# EXIT Protocol — GDPR Compliance Guide

**Version:** 1.0
**Last Updated:** 2026-03-04
**Applies to:** EXIT Specification v1.2

---

## ⚠️ DISCLAIMER

**This document is not legal advice.** It is a practical guide for EXIT implementers operating within the scope of the EU General Data Protection Regulation (Regulation (EU) 2016/679). GDPR interpretation varies by Member State, and Data Protection Authorities (DPAs) have not yet issued guidance specific to decentralized departure attestation protocols.

**Consult a qualified data protection officer or legal counsel before deploying EXIT in the EEA, UK, or Switzerland.**

Where the law is unsettled, this guide says so explicitly.

---

## Table of Contents

1. [Personal Data in EXIT Markers](#1-personal-data-in-exit-markers)
2. [Controller/Processor Determination](#2-controllerprocessor-determination)
3. [Lawful Basis Analysis](#3-lawful-basis-analysis)
4. [Three-Tier Erasure Model](#4-three-tier-erasure-model)
5. [Data Subject Rights Implementation](#5-data-subject-rights-implementation)
6. [Cross-Border Transfer](#6-cross-border-transfer)
7. [DPIA Template](#7-dpia-template)

---

## 1. Personal Data in EXIT Markers

Under GDPR Art. 4(1), "personal data" means any information relating to an identified or identifiable natural person. Following *Breyer v. Bundesrepublik Deutschland* (C-582/14, CJEU 2016), **pseudonymous identifiers are personal data** when the controller has lawful means to re-identify the individual.

### 1.1 Field-by-Field Classification

| Marker Field | Personal Data? | Classification | Rationale |
|---|---|---|---|
| `subjectDid` | **Yes** | Pseudonymous identifier | DID resolves to key material; platform likely can link to operator identity |
| `originPlatformDid` | Possibly | Organizational identifier | Personal data only if the platform is a sole proprietorship or identifiable individual |
| `destinationDid` | Possibly | Same as above | |
| `originStatus` | **Yes** | Behavioral data about data subject | Characterizes the subject's departure — directly relates to an identifiable person |
| `timestamp` | **Yes** (in combination) | Temporal metadata | Combined with DID, narrows identification |
| `markerContentId` | **Yes** (derived) | Content-addressed hash | Derived from personal data; functions as unique identifier for the record |
| `selfAttested` | **Yes** (in combination) | Processing metadata | Indicates whether subject or third party produced the record |
| `proof` / signatures | **Yes** (in combination) | Cryptographic material linked to identifiable keys | |
| `disputeBundle` | **Yes** | Free-text narrative about the subject | May contain highly sensitive details |
| `rightOfReply` | **Yes** | Subject's own statement | Personal data produced by the subject |
| `anchorRecord` (on-chain) | **Yes** | Contains `subjectDid` or hash thereof | Immutable; see §4 on erasure |
| Encrypted envelope fields | **Yes** | Encrypted personal data is still personal data | GDPR Recital 26 applies to data that can be decrypted |

### 1.2 Special Category Data

EXIT markers **should not** contain special category data (Art. 9) — racial origin, political opinions, health data, etc. However, free-text `disputeBundle` and `rightOfReply` fields could inadvertently include such data. Implementers should:

- Warn users not to include special category data in free-text fields
- Consider automated screening (with appropriate caveats about over-filtering)
- Document the risk in their DPIA

---

## 2. Controller/Processor Determination

GDPR requires clear allocation of controller and processor roles. EXIT's decentralized architecture distributes these roles across multiple parties.

### 2.1 Role Allocation

| Party | Role | Rationale |
|---|---|---|
| **Subject / operator** | Controller (for self-attested markers) | Determines purpose (departure attestation) and means (marker content). Art. 4(7). |
| **Origin platform** | Joint controller (for co-signed markers) | Co-determines purpose and means when co-signing. Independent controller when issuing forced-exit markers unilaterally. |
| **Destination platform** | Independent controller | Independently determines purpose (admission decision) and means (verification, storage, scoring). |
| **Escrow provider** | Processor | Stores encrypted markers on behalf of the subject; does not determine purpose or means. |
| **TSA provider** | Independent controller | Determines its own processing purposes (timestamping service) and means. Processes DID and hash data for its own service. |
| **Protocol designer (Cellar Door)** | Neither | Provides specification only; does not process personal data. If Cellar Door operates hosted services (verification endpoints, registries), it becomes a processor or controller depending on the service. |

### 2.2 Template Art. 26 Joint Controller Arrangement

For use between the **subject/operator** and the **origin platform** when co-signing a departure marker:

> ---
>
> **JOINT CONTROLLER ARRANGEMENT**
> Pursuant to Article 26 GDPR
>
> **Parties:**
> - Controller A: [OPERATOR / SUBJECT NAME] ("Subject")
> - Controller B: [ORIGIN PLATFORM NAME] ("Platform")
>
> **Processing Activity:** Creation, signing, and initial transmission of an EXIT departure marker.
>
> **Allocation of Responsibilities:**
>
> | Obligation | Responsible Party |
> |---|---|
> | Determining marker content (originStatus, metadata) | Platform (forced exit) / Subject (voluntary exit) |
> | Ensuring accuracy of originStatus | Platform |
> | Ensuring accuracy of self-attested claims | Subject |
> | Cryptographic signing | Both (respective keys) |
> | Providing Art. 13/14 privacy notice to the subject | Platform |
> | Responding to data subject access requests (Art. 15) | Platform (primary contact point) |
> | Handling erasure requests (Art. 17) | Platform (for mutable storage); Subject (for their copies) |
> | Responding to rectification requests (Art. 16) | Platform (via MarkerAmendment mechanism) |
> | Conducting DPIA | Platform (primary); Subject contributes where feasible |
> | Breach notification (Art. 33/34) | Whichever party detects the breach; both must cooperate |
>
> **Contact Point for Data Subjects:** [PLATFORM CONTACT — Art. 26(1) requires this be made available to data subjects]
>
> **Essence of Arrangement Made Available to Data Subjects:** The subject and platform jointly produce a cryptographically signed departure record. The platform is the primary contact for exercising data subject rights.
>
> ---

### 2.3 Template Art. 28 Processor Agreement

For use with **escrow providers**:

> ---
>
> **DATA PROCESSING AGREEMENT**
> Pursuant to Article 28 GDPR
>
> **Controller:** [SUBJECT / PLATFORM NAME]
> **Processor:** [ESCROW PROVIDER NAME]
>
> **Subject Matter:** Storage and conditional release of encrypted EXIT departure markers.
>
> **Duration:** Until marker expiration (sunset period) or earlier deletion by the controller.
>
> **Nature and Purpose:** The processor stores encrypted marker data and releases it to authorized parties upon presentation of valid cryptographic credentials. The processor does not access, analyze, or make decisions based on marker content.
>
> **Type of Personal Data:** Pseudonymous identifiers (DIDs), encrypted behavioral data (marker content), cryptographic proof material.
>
> **Categories of Data Subjects:** Agent operators (natural persons controlling agent DIDs).
>
> **Processor Obligations:**
> 1. Process only on documented instructions from the controller (Art. 28(3)(a))
> 2. Ensure persons authorized to process have committed to confidentiality (Art. 28(3)(b))
> 3. Implement appropriate technical and organizational security measures (Art. 28(3)(c)), including encryption at rest and in transit
> 4. Engage sub-processors only with prior written authorization (Art. 28(3)(d))
> 5. Assist the controller with data subject rights requests (Art. 28(3)(e))
> 6. Assist the controller with DPIA and prior consultation (Art. 28(3)(f))
> 7. Delete or return all personal data upon termination (Art. 28(3)(g))
> 8. Make available all information necessary to demonstrate compliance and allow audits (Art. 28(3)(h))
>
> **Sub-processors:** [LIST OR "None"]
>
> **Data Transfers:** [SPECIFY whether data may be transferred outside EEA; if so, the transfer mechanism]
>
> ---

---

## 3. Lawful Basis Analysis

Every processing activity involving EXIT markers requires a lawful basis under Art. 6(1). The primary basis for most EXIT processing is **legitimate interest** (Art. 6(1)(f)).

### 3.1 Legitimate Interest Assessment

Art. 6(1)(f) requires a three-part balancing test.

#### For Voluntary Departure Markers

| Element | Analysis |
|---|---|
| **Legitimate interest** | The subject has a legitimate interest in portable reputation and the ability to attest their departure history to new platforms. The destination platform has a legitimate interest in evaluating trustworthiness of incoming agents. |
| **Necessity** | EXIT markers are necessary for decentralized departure attestation — no less intrusive means achieves the same result while maintaining cryptographic verifiability. |
| **Balancing** | The subject initiates the process voluntarily. The data disclosed is limited to departure circumstances. The subject controls distribution. The subject's interest aligns with the processing purpose. **Balance favors processing.** |

#### For Forced-Exit Markers

| Element | Analysis |
|---|---|
| **Legitimate interest** | The origin platform has a legitimate interest in accurately documenting agent departures for safety, accountability, and regulatory compliance. The destination platform has an interest in safety-relevant information. |
| **Necessity** | Forced-exit markers serve a function that cannot be achieved without identifying the subject and the departure circumstances. |
| **Balancing** | The subject did not choose to create this record. The data has **reputational impact**. The subject may suffer economic harm. Mitigating factors: sunset periods limit duration; dispute and amendment mechanisms exist; the subject receives the marker and can contest it. **Balance is closer. Heightened safeguards required:** (1) strict accuracy obligations, (2) dispute mechanism, (3) sunset enforcement, (4) adverse action notice at destination. |

#### Balancing Test Template

Implementers should document their own balancing test. Template:

> **Processing Activity:** [DESCRIBE]
> **Controller Interest:** [WHAT LEGITIMATE INTEREST?]
> **Necessity:** [WHY IS THIS PROCESSING NECESSARY? COULD LESS DATA ACHIEVE THE SAME PURPOSE?]
> **Impact on Data Subject:** [WHAT RISKS? REPUTATIONAL? ECONOMIC? DISCRIMINATION?]
> **Safeguards:** [WHAT MITIGATIONS? SUNSET? DISPUTE? ENCRYPTION? ACCESS CONTROLS?]
> **Reasonable Expectations:** [WOULD THE DATA SUBJECT EXPECT THIS PROCESSING?]
> **Conclusion:** [INTEREST OUTWEIGHS IMPACT / DOES NOT OUTWEIGH — WITH REASONING]

### 3.2 Alternative Bases

- **Consent (Art. 6(1)(a)):** Viable for voluntary markers but problematic for forced exits (consent cannot be freely given if the marker is mandatory). Not recommended as primary basis.
- **Contract (Art. 6(1)(b)):** If EXIT integration is part of a platform's terms of service, contract performance may apply. However, forced-exit markers issued after the relationship ends are harder to justify under contract.
- **Legal obligation (Art. 6(1)(c)):** May apply if a regulator mandates departure documentation. Not currently the case.

---

## 4. Three-Tier Erasure Model

GDPR Art. 17 establishes a right to erasure ("right to be forgotten"). EXIT's cryptographic architecture creates varying degrees of erasure feasibility.

### Tier 1: Mutable Storage (Default)

**Applies to:** Markers stored in databases, file systems, APIs — any mutable medium.

**Erasure method:** Standard deletion. Remove marker data from all storage, backups, and caches within a reasonable period (30 days recommended for backup propagation).

**GDPR compliance:** Full. Art. 17 is straightforwardly satisfied.

**Recommendation:** This should be the default storage tier. Markers should be stored mutably unless there is a specific, documented reason for immutability.

### Tier 2: Crypto-Shredding

**Applies to:** Markers encrypted with per-marker keys where the key can be destroyed.

**Erasure method:** Delete the encryption key. The ciphertext remains but is computationally infeasible to decrypt without the key. This constitutes **functional erasure** — the personal data is rendered permanently inaccessible.

**GDPR compliance:** Uncertain. The CNIL's 2018 guidance on blockchain and GDPR (*Premiers éléments d'analyse de la CNIL — Solutions pour un usage responsable de la blockchain*) cautiously acknowledges that crypto-shredding may satisfy Art. 17 in contexts where true deletion is impossible. However:

- No DPA has formally endorsed crypto-shredding as full Art. 17 compliance
- The EDPB has not issued guidance on this specific question
- The ciphertext technically persists, and future cryptographic breakthroughs could theoretically compromise it
- The UK ICO's 2025 draft guidance on emerging technologies suggests a pragmatic approach but stops short of endorsement

**Recommendation:** Use Tier 2 when Tier 1 is not feasible. Document the crypto-shredding mechanism in your DPIA. Use AES-256-GCM or XChaCha20-Poly1305 with per-marker keys of sufficient length. Maintain a key deletion audit trail.

### Tier 3: Immutable On-Chain Storage

**Applies to:** Anchor records written to a public blockchain or append-only ledger.

**Erasure method:** None. True deletion is technically impossible on most public blockchains.

**GDPR compliance:** **Explicitly incompatible with Art. 17.** On-chain personal data cannot be erased in any meaningful sense.

**Mitigations:**

1. **Minimize on-chain data.** EXIT v1.2 specifies minimal anchor records: hash of marker content + timestamp. Do NOT put `subjectDid` in plaintext on-chain. Use the hash of `subjectDid` or omit it entirely.
2. **Informed consent.** If any personal data is placed on-chain, the data subject must provide explicit, informed, specific consent under Art. 7, with a clear warning that erasure will not be possible. This consent must be freely given — if the subject has no alternative to on-chain anchoring, consent is not valid.
3. **Legitimate interest with explicit documentation.** If consent is not viable, a very strong legitimate interest argument with extensive safeguards may be attempted. This is legally risky.

**Note:** The CNIL's 2018 guidance recommends that controllers "carefully assess the necessity of on-chain storage" and prefer off-chain solutions. We agree. **Tier 3 should be used only when the subject explicitly opts in with full knowledge of the consequences.**

---

## 5. Data Subject Rights Implementation

### 5.1 Art. 15 — Right of Access

**What the subject can request:** A copy of all EXIT markers associated with their DID, plus information about processing purposes, recipients, retention periods, and data sources.

**Implementation:**

```
GET /exit/markers?subjectDid={DID}
Authorization: Bearer {token proving DID ownership}

Response: {
  "markers": [...],
  "processingPurposes": ["departure attestation", "admission evaluation"],
  "recipients": ["list of destination DIDs that received markers"],
  "retentionPeriod": "730 days (voluntary) / 365 days (involuntary)",
  "source": "self-attested / co-signed by {originPlatformDid}"
}
```

**Requirements:**
- DID ownership must be verified (signature challenge) before disclosure
- Response within 1 month (extendable to 3 months for complex requests)
- First copy is free; subsequent copies may incur a reasonable fee

### 5.2 Art. 16 — Right to Rectification

**Implementation:** The `MarkerAmendment` mechanism (EXIT Spec §7) maps directly to Art. 16.

- Subject requests rectification of inaccurate `originStatus` or other factual errors
- Origin platform investigates (align with the 30-day FCRA dispute timeline — satisfies both regimes)
- If rectification is warranted, origin platform issues a `MarkerAmendment` cryptographically linked to the original marker
- Verifiers MUST check for amendments before reliance
- The original marker is not deleted (content-addressed integrity requires it to persist), but the amendment supersedes it

**Limitations:** Content-addressed markers cannot be modified in place. The amendment mechanism provides functional rectification — a correction linked to the original — rather than literal correction. Document this in your Art. 13/14 privacy notice.

### 5.3 Art. 17 — Right to Erasure

See [§4 Three-Tier Erasure Model](#4-three-tier-erasure-model) above.

**Decision tree:**

1. Is the marker stored only in mutable storage? → **Delete it.** (Tier 1)
2. Is the marker encrypted with a per-marker key? → **Delete the key.** (Tier 2)
3. Is the marker anchored on-chain? → **Erasure is not possible.** Inform the data subject. If no valid consent or overriding legitimate interest exists, you may be in violation of Art. 17.

**Exemptions:** Art. 17(3) provides exemptions for freedom of expression, legal claims, and public interest archiving. These may apply in some EXIT contexts (e.g., regulatory compliance records) but should not be assumed.

### 5.4 Art. 20 — Right to Data Portability

EXIT markers are inherently portable by design:

- JSON-LD format is structured, commonly used, and machine-readable
- Markers are self-contained (include all necessary verification material)
- The EXIT protocol exists precisely to enable cross-platform data portability

**Implementation:** Provide markers in the standard EXIT JSON-LD format. No additional transformation should be necessary. The Art. 15 access endpoint can double as the Art. 20 portability endpoint.

### 5.5 Art. 21 — Right to Object

Data subjects have the right to object to processing based on legitimate interest (Art. 6(1)(f)).

**For self-attested markers:** The subject can simply withdraw or delete their own marker. Trivial.

**For forced-exit markers:** The subject may object to the origin platform's continued processing. The platform must then demonstrate "compelling legitimate grounds" that override the subject's interests. This requires a case-by-case assessment.

**Implementation:** Platforms must provide an objection mechanism (email, web form, or API). Objections must be assessed within 1 month.

### 5.6 Art. 22 — Automated Decision-Making

If a destination platform uses EXIT markers as input to an **automated admission system** that produces legal or similarly significant effects — and the decision is made without meaningful human involvement — Art. 22 protections apply:

- The subject must be informed of the automated processing
- The subject has the right to obtain human intervention
- The subject has the right to contest the decision
- The subject has the right to an explanation of the logic involved

**Confidence scores** derived from EXIT markers (tenure weighting, multi-platform corroboration) are particularly likely to trigger Art. 22 if used as the sole basis for admission/rejection.

**Recommendation:** Always include human review in the admission decision loop, or provide a robust Art. 22(3) contestation mechanism.

---

## 6. Cross-Border Transfer

EXIT markers transmitted between platforms in different jurisdictions may constitute cross-border transfers of personal data under GDPR Chapter V.

### 6.1 When Transfers Occur

- Subject in the EEA sends marker to a destination platform outside the EEA
- Origin platform in the EEA co-signs a marker received by a non-EEA destination
- Escrow provider stores data outside the EEA
- TSA provider operates outside the EEA

### 6.2 Transfer Mechanisms

| Mechanism | When to Use |
|---|---|
| **Adequacy decision (Art. 45)** | Destination is in a country with an EU adequacy decision (e.g., Japan, UK, South Korea, Canada (commercial), US (DPF participants)) |
| **Standard Contractual Clauses (Art. 46(2)(c))** | Most common mechanism; use the 2021 EU Commission SCCs (Implementing Decision 2021/914) |
| **Binding Corporate Rules (Art. 47)** | For intra-group transfers within a multinational organization operating EXIT infrastructure |
| **Derogations (Art. 49)** | Explicit consent (for occasional transfers) or necessity for contract performance |

### 6.3 SCC Implementation Notes

For EXIT implementations using SCCs:

- **Module 1 (Controller to Controller):** Use between origin platform (EEA) and destination platform (non-EEA)
- **Module 2 (Controller to Processor):** Use between subject/platform (EEA) and escrow provider (non-EEA)
- **Module 4 (Processor to Controller):** Unlikely in EXIT context but may apply for TSA providers

Each SCC execution requires a **Transfer Impact Assessment (TIA)** evaluating the legal framework of the recipient country.

### 6.4 US-Specific Considerations

For transfers to the US:
- Check whether the recipient participates in the **EU-US Data Privacy Framework** (adequacy decision of July 2023)
- If not a DPF participant, use SCCs + supplementary measures per *Schrems II* (C-311/18)
- Supplementary measures may include: encryption in transit and at rest, pseudonymization, contractual limitations on government access

---

## 7. DPIA Template

Article 35 requires a Data Protection Impact Assessment when processing is "likely to result in a high risk to the rights and freedoms of natural persons." EXIT marker processing — particularly forced-exit markers with reputational impact — likely triggers this requirement.

The following template is pre-filled for EXIT. Adapt it to your specific implementation.

---

> ### DATA PROTECTION IMPACT ASSESSMENT
> **EXIT Protocol Implementation**
>
> **Date:** [DATE]
> **Controller:** [ORGANIZATION NAME]
> **DPO Contact:** [NAME, EMAIL]
> **Assessment Author:** [NAME]
>
> ---
>
> #### 1. Description of Processing
>
> | Element | Description |
> |---|---|
> | **Nature** | Creation, signing, transmission, verification, and storage of EXIT departure markers containing pseudonymous identifiers and behavioral data |
> | **Scope** | All agent operators using [PLATFORM NAME] who depart, whether voluntarily or involuntarily |
> | **Context** | Multi-platform agent ecosystem where departure markers are transmitted between competing platforms for admission evaluation |
> | **Purpose** | (1) Enable portable departure attestation for agent operators; (2) Provide destination platforms with verifiable departure history; (3) Maintain tamper-evident audit trail |
>
> #### 2. Necessity and Proportionality
>
> | Question | Assessment |
> |---|---|
> | Is the processing necessary for the stated purpose? | Yes — cryptographically signed departure attestations require the identified personal data fields to function |
> | Could the purpose be achieved with less data? | Partially — `subjectDid` is necessary for identification; free-text dispute/reply fields could be constrained; on-chain anchoring of personal data is not strictly necessary |
> | Is the lawful basis appropriate? | Art. 6(1)(f) legitimate interest — see §3 of this guide for balancing test |
> | Are retention periods proportionate? | Yes — 365/730 day sunset periods are shorter than comparable industry standards |
>
> #### 3. Risk Assessment
>
> | Risk | Likelihood | Severity | Mitigation |
> |---|---|---|---|
> | **False forced-exit marker causes economic harm** | Medium | High | MarkerAmendment mechanism; dispute procedure; adverse action notice requirement; sunset period |
> | **Re-identification of pseudonymous DID** | Medium | Medium | Per-marker encryption (Tier 2); minimal on-chain data; access controls on DID resolution |
> | **Marker weaponization (retaliation)** | Low-Medium | High | Anti-weaponization clause (§8.6); dispute mechanism; legal liability for issuers |
> | **Automated rejection without human review** | Medium | High | Art. 22 guidance; recommendation for human-in-the-loop admission |
> | **Cross-border transfer without adequate protection** | Low | Medium | SCCs; DPF certification check; TIA requirement |
> | **Inability to erase on-chain data** | Low (if Tier 3 is avoided) | High | Default to Tier 1; Tier 3 only with explicit informed consent; minimal anchor data |
> | **Special category data in free-text fields** | Low | High | User warnings; input guidance; optional screening |
> | **Breach of encrypted markers** | Low | High | AES-256-GCM / XChaCha20-Poly1305; per-marker keys; key rotation |
>
> #### 4. Measures to Address Risks
>
> | Measure | Status |
> |---|---|
> | MarkerAmendment mechanism for rectification | Implemented (Spec v1.2 §7) |
> | Sunset periods (365/730 days) | Implemented |
> | Anti-weaponization clause | Implemented (Spec v1.2 §8.6) |
> | Per-marker encryption with crypto-shredding capability | Implemented (privacy tier) |
> | Adverse action notice template | Published (LEGAL.md §1.3) |
> | Dispute investigation procedure | Published (LEGAL.md §1.4) |
> | Art. 26 joint controller arrangement template | Published (this guide §2.2) |
> | Art. 28 processor agreement template | Published (this guide §2.3) |
> | Art. 22 automated decision-making guidance | Published (this guide §5.6) |
> | Minimal on-chain anchor format (hash only, no plaintext DID) | Specified (Spec v1.2) |
> | SCC/transfer mechanism guidance | Published (this guide §6) |
> | Default mutable storage (Tier 1) | Recommended |
>
> #### 5. DPO Opinion
>
> [TO BE COMPLETED BY YOUR DPO]
>
> #### 6. Decision
>
> | Option | Selected? |
> |---|---|
> | Processing may proceed with identified mitigations | [ ] |
> | Processing may proceed with additional mitigations: [SPECIFY] | [ ] |
> | Processing should not proceed — residual risk too high | [ ] |
> | Prior consultation with supervisory authority required (Art. 36) | [ ] |
>
> **Approved by:** [NAME, TITLE, DATE]

---

## Revision History

| Date | Version | Changes |
|---|---|---|
| 2026-03-04 | 1.0 | Initial publication with EXIT Spec v1.2 |
