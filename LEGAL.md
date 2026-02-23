# Cellar Door EXIT Protocol — Legal Compliance Notice

**Version:** 1.1-draft
**Date:** 2026-02-22
**Status:** Normative companion document to EXIT_SPEC_v1.1

---

## 1. Protocol Operates Subject to Applicable Law

The EXIT protocol is a technical specification for creating verifiable departure records. **Nothing in this protocol overrides, supersedes, or is intended to conflict with applicable law in any jurisdiction.** Parties using the EXIT protocol are responsible for ensuring their use complies with all applicable laws, regulations, and court orders.

The statement that "contests don't block exit" (Decision D-006) is a protocol design principle, not a legal privilege. Courts retain full authority to issue injunctions, temporary restraining orders, and other legal process that may restrict a party's ability to depart a system. Compliance with such orders is the responsibility of the parties, not the protocol.

---

## 2. EXIT Markers Are Factual Records

EXIT markers are **factual records of departure events**. They are:

- **NOT** certifications of good standing, competence, or fitness
- **NOT** warranties or guarantees of any kind
- **NOT** recommendations, endorsements, or referrals
- **NOT** credit ratings, background checks, or due diligence reports
- **NOT** authoritative determinations of any party's legal status

An EXIT marker records that a subject departed an origin at a given time, with a self-reported status. The marker is a statement of fact about an event, analogous to a timestamped log entry. It carries no more legal weight than any other self-authored record.

---

## 3. Self-Attested Status Carries No Warranty

The core `status` field in an EXIT marker is **self-attested** by the departing subject (indicated by `selfAttested: true`). Self-attested status:

- Carries **no warranty** of accuracy, completeness, or truthfulness
- Does **not** constitute an endorsement by any third party
- Does **not** constitute a certification by the origin system
- Does **not** bind any party to any obligation
- May be contradicted by the `originStatus` field in Module C

Verifiers MUST NOT treat self-attested `good_standing` as equivalent to independent verification. The `selfAttested` boolean exists specifically to make this unambiguous in both human and machine-readable form.

---

## 4. Module D Asset Manifests Are Declarations, Not Instruments

Module D (Economic) asset manifests are **declarations and references**. They:

- Are **NOT** transfer instruments — they do not effectuate, authorize, or execute transfers of assets
- Are **NOT** bearer instruments — possession of a marker does not confer ownership of referenced assets
- Are **NOT** negotiable instruments under the Uniform Commercial Code or equivalent legislation
- Are **NOT** securities, investment contracts, or financial instruments under the Securities Act of 1933, the Securities Exchange Act of 1934, or equivalent legislation in any jurisdiction
- Are **NOT** entitlements — listing an asset in a manifest does not create a claim to that asset

Asset manifests are analogous to a packing list on a shipping container: they describe what the shipper *claims* is inside. They do not transfer title, and possession of the list does not confer possession of the goods.

---

## 5. EXIT Markers Do Not Effectuate Transfers

EXIT markers **do not effectuate transfers** of:

- Assets (digital or physical)
- Rights (contractual, intellectual property, or otherwise)
- Obligations (financial, legal, or otherwise)
- Identity (the subject's DID remains under the subject's control)
- Reputation (status fields are informational, not transferable)

Any actual transfer of assets, rights, or obligations must occur through the appropriate mechanisms of the relevant platform, blockchain, or legal system. The EXIT marker may *document* that such a transfer occurred, but the marker itself is not the transfer mechanism.

---

## 6. Prohibition on Use as Financial Instruments

EXIT markers, including all modules and extensions, **MUST NOT** be used as:

- Securities or investment contracts
- Financial instruments or derivatives
- Bearer tokens or bearer instruments
- Currency or currency substitutes
- Collateral for loans or other financial obligations
- Tradeable reputation scores or credits

Any system that enables the buying, selling, trading, or collateralization of EXIT markers or their component data is operating outside the intended use of this protocol and does so at its own legal risk. The protocol authors disclaim all liability for such use.

---

## 7. GDPR and Data Protection Considerations

EXIT markers may contain personal data as defined by GDPR Article 4(1), including:

- **DIDs** — pseudonymous identifiers that may constitute personal data per *Breyer v. Bundesrepublik Deutschland* (C-582/14)
- **Timestamps** — behavioral data
- **Status fields** — reputational data
- **Module E narratives** — free-text personal data
- **Module A lineage chains** — movement and association data

### 7.1 Data Subject Rights

Data subjects retain all rights under applicable data protection law, including:

- **Right to erasure (Art. 17):** Subjects may request that their markers be encrypted such that only the subject holds the decryption key, rendering the marker unintelligible to third parties. This achieves functional erasure while preserving cryptographic integrity.
- **Right to rectification (Art. 16):** Subjects may issue amended markers with corrected information, linked to the original via the `id` field.
- **Right of access (Art. 15):** Any party holding a subject's markers must provide copies upon request.

### 7.2 ZK Selective Disclosure Roadmap

Future versions of the EXIT protocol will support zero-knowledge selective disclosure, allowing subjects to prove specific properties of their EXIT history (e.g., "I have exited at least one system in good standing") without revealing the full marker contents. This is a design priority, not a current capability.

### 7.3 Data Minimization

Implementers SHOULD collect and store only the minimum marker data necessary for their use case. Module E narratives and Module A lineage chains are particularly sensitive and SHOULD be encrypted at rest.

---

## 8. Court Orders and Legal Process

Compliance with court orders, subpoenas, preservation orders, and other legal process is **the responsibility of the parties**, not the protocol. The EXIT protocol:

- Does **not** enforce court orders
- Does **not** resist court orders
- Does **not** provide mechanisms for courts to block exit (by design)
- Does **not** absolve parties of their obligations under legal process

The `legalHold` field exists for parties to flag that a marker is subject to pending legal process. Setting this field is voluntary and informational. The presence or absence of a legal hold flag has no effect on the protocol's behavior — it is metadata for human and institutional consumption.

---

## 9. Legal Hold Field

The optional `legalHold` field allows any party to record that a marker is associated with pending legal process. This field:

- Is **informational only** — it does not prevent exit or modify protocol behavior
- Does **not** constitute legal advice or a legal determination
- Does **not** create an obligation on any party other than as required by applicable law
- Exists to enable parties to demonstrate good faith compliance with preservation obligations

Parties subject to litigation holds, regulatory investigations, or court orders SHOULD use this field to create a contemporaneous record of their awareness of legal process.

---

## 10. Absence of Co-Signature

The absence of an origin co-signature (Module C) on an EXIT marker is **NOT**:

- Evidence of bad standing
- Evidence of a disputed departure
- Evidence of wrongdoing by the subject
- Evidence that the origin contests the exit

Origins may decline to co-sign for many reasons, including technical inability, organizational policy, or simple indifference. Verifiers MUST NOT draw negative inferences from the absence of co-signatures.

---

## 11. Status Field Interpretation

**Neither self-attested status (core `status` field) nor origin-attested status (Module C `originStatus` field) is authoritative.** Both fields represent the perspective of their respective attester and nothing more.

Verifiers MUST apply their own trust policies when evaluating status fields. A reasonable trust policy might weight origin-attested status more heavily than self-attested status, or might require both to agree, or might disregard status entirely and rely on independent investigation. The protocol takes no position on which approach is correct.

---

## 12. Schema Intellectual Property

EXIT markers are factual records. The schema defining their structure is licensed under the Apache License, Version 2.0. Markers themselves are not copyrightable works under *Feist Publications, Inc. v. Rural Telephone Service Co.* (499 U.S. 340, 1991) — they are factual compilations with minimal creative expression.

Subjects retain any copyright in free-text fields (Module E narratives). The schema, context files, and specification documents are © Cellar Door Contributors, licensed Apache 2.0.

---

## 13. Security and DID Method Considerations

The current reference implementation uses `did:key` for subject identification. `did:key` is **prototype-grade** and has significant limitations:

- No key revocation mechanism
- No key rotation capability
- Compromised keys cannot be invalidated

Production deployments SHOULD use `did:keri` or an equivalent DID method that supports:

- Pre-rotation (key commitment before use)
- Key revocation
- Key rotation with cryptographic continuity
- Delegated key management

The `keyCompromise` exit type exists as a stopgap for declaring key compromise, but it requires possession of an alternative trusted key and does not fully mitigate the risks of `did:key` in production.

---

---

## Appendix: Recommended Amendments

*Consolidated from analysis documents. Each recommendation includes source attribution. These are pending review — not yet incorporated into the normative sections above.*

### From Legal Lenses Analysis (`cellar-door-legal-lenses.md`)

**New §1.1 — Nature of This Protocol:**
Add after §1: "The EXIT protocol is a data format specification and open-source software library published under Apache 2.0. Cellar Door provides technical documentation, reference implementations, and interoperability standards. Cellar Door does not operate infrastructure, host data, provide services, or act as a custodian, registry, or intermediary." *(Lenses: Strategic Position §1, §4)*

**New §6.1 — Licensing and Intellectual Property:**
Add after §6: EXIT markers may reference data subject to third-party IP rights (copyright, trade secret, platform TOS). Users responsible for compliance. EXIT is not designed to circumvent access controls or technical protection measures. *(Lenses: Lens 4 — Licensed Software)*

**New §6.2 — Employment and Labor Contexts:**
EXIT markers are technical records, not employment documentation. If used in labor/employment contexts, users responsible for compliance with notice periods, final pay, record retention. *(Lenses: Lens 5 — Employees/Contractors)*

**New §6.3 — Fiduciary Contexts:**
Entities in fiduciary capacities may have obligations beyond protocol requirements. Emergency exit does not relieve fiduciary obligations. *(Lenses: Lens 10 — Fiduciaries)*

**New §8.1 — Legal Hold Limitations:**
Absence of `legalHold` is not evidence of no legal process. `legalHold` may contain Art. 10 criminal data requiring specific safeguards. *(Lenses: Lens 8 — Data Subjects)*

**New §8.2 — Jurisdictional Neutrality:**
Different jurisdictions may classify agents, markers, and parties under different legal frameworks. Implementers SHOULD include jurisdiction info and MUST NOT assume origin jurisdiction applies at destination. *(Lenses: Cross-Jurisdictional Divergence)*

**New §14 — Agent Legal Status:**
Protocol takes no position on legal status of AI agents. Designed to function regardless of classification. For subjects with uncertain legal capacity, implementers SHOULD consider identifying a human/organizational principal. *(Lenses: Synthesis §5)*

**Anti-discrimination clause** for forced exits under personhood lens. *(Lenses: Lens 1)*

**Tax implications disclaimer** — EXIT markers don't address tax consequences of dissolution/transfer. *(Lenses: Lens 2)*

**Reference EU AI Act and AI Liability Directive.** *(Lenses: Lens 9)*

### From Legal Battery (`cellar-door-legal-battery.md`)

**Module C defamation mitigation** (Battery §I):
- Require structured reasons for `disputed` status
- Build right-of-reply mechanism for origin attestations
- Mandate prominent display of `selfAttested: true`

**FCRA disclaimer for Module B** (Battery §II):
- Add: "Module B receipts are individual attestations and are not intended to constitute consumer reports under 15 U.S.C. §1681."
- Remove `reputation_score` from Module D asset types

**Securities prohibition strengthening** (Battery §III):
- Prohibit tokenization of EXIT markers in normative language
- Remove `reputation_score` as asset type
- Add FinCEN and OFAC disclaimers

**Insurance context warning** (Battery §VII, RT2 §2.4):
- Add: "EXIT markers do not satisfy due diligence requirements for insurance risk assessment"
- NOT FOR USE IN INSURANCE UNDERWRITING warning for status fields

**GDPR compliance templates needed** (Battery §IV):
- Privacy notice template for implementers
- Data processing agreement template
- Art. 10 safeguards for `legalHold` criminal/investigation data

### From Red Team v2 (`cellar-door-legal-redteam-v2.md`)

**Antitrust warning** (RT2 §2.3):
- Note that coordinated use of EXIT markers for refusal to deal may violate competition law

**Bankruptcy automatic stay** (RT2, Lenses Lens 2):
- §8 should specifically address bankruptcy automatic stays (11 U.S.C. §362), not just generic court orders

---

## Disclaimer

THIS DOCUMENT IS PROVIDED FOR INFORMATIONAL PURPOSES AND DOES NOT CONSTITUTE LEGAL ADVICE. Users of the EXIT protocol should consult qualified legal counsel regarding their specific use case, jurisdiction, and regulatory obligations. The protocol authors make no representations regarding the legal compliance of any particular use of this protocol.
