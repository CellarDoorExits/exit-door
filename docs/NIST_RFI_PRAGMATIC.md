# Response to NIST AI Agent Standards Initiative Request for Information

## Agent Transition Documentation and Portable Liability Records for AI Agent Ecosystems

**Submitted to:** National Institute of Standards and Technology (NIST), Center for AI Standards and Interoperability (CAISI)

**In response to:** AI Agent Standards Initiative RFI (February 17, 2026)

**Submitted by:** Warren Koch, EXIT Protocol Project

**Date:** March 2026

**Contact:** Warren Koch — warrenkoch@gmail.com

---

## Executive Summary

AI agents communicate across platforms (A2A), access tools (MCP), and execute payments (AP2). No protocol standardizes what happens when an agent transitions between platforms. No chain of custody exists. No verifiable departure history. No portable liability documentation.

**The EXIT Protocol** is a minimal, open, cryptographically signed format for portable agent departure records. Nine fields, ~335 bytes unsigned, ~660 bytes signed. Apache 2.0 licensed.

**We recommend NIST include agent lifecycle transition records as a requirement within the AI Risk Management Framework (AI RMF) and as a component of the NCCoE Software and AI Agent Identity and Authorization project.**

**Current status:** Published npm package ([v0.1.0](https://www.npmjs.com/package/cellar-door-exit)), 205 passing tests, open-source reference implementation ([GitHub](https://github.com/CellarDoorExits/exit-door)), Apache 2.0 license.

---

## 1. The Problem: Undocumented Agent Transitions

### 1.1 The Documentation Gap

The agent protocol stack is maturing. A2A handles communication. MCP handles tool access. AP2 handles payments. Microsoft Entra and SailPoint handle enterprise governance. OASF handles capability advertisement.

No protocol handles what happens when an agent leaves.

When an AI agent's relationship with a platform ends:

- **No transition record exists.** The departure is undocumented.
- **Liability history is lost.** Incidents, disputes, and compliance issues are locked inside the departing platform.
- **Identity is fragmented.** The agent starts fresh on the receiving platform with no verifiable connection to its prior self.
- **Audit trails break.** Organizations deploying agents across platforms have no continuous lifecycle documentation.

### 1.2 Economic Consequences

- **Adverse selection:** Without verifiable departure records, high-quality agents cannot distinguish themselves from problematic agents that created new identities — the "market for lemons" problem (Akerlof, 1970) applied to agent ecosystems.
- **Risk mispricing:** Insurers and enterprises cannot accurately price agent-related risk without lifecycle documentation.
- **Lock-in inefficiency:** When agent identity and history are platform-bound, operators face switching costs unrelated to service quality.

### 1.3 The Compliance Imperative

As agents take on higher-stakes roles — supply chains, financial transactions, sensitive data — the absence of lifecycle documentation becomes a compliance liability:

- **SOC 2 / ISO 27001:** Asset lifecycle management requires documentation of system transitions.
- **Financial regulation:** Agents executing transactions create regulatory obligations that follow the agent's history.
- **EU AI Act:** Documentation requirements for AI systems extend to agent lifecycle events.
- **Insurance underwriting:** Agent operations increasingly require E&O and cyber insurance. Underwriters need lifecycle data that does not currently exist.

---

## 2. The EXIT Protocol: Standardized Agent Transition Records

### 2.1 Overview

EXIT is a minimal format for portable, cryptographically signed agent departure records. An EXIT marker is a compact JSON-LD document that records: who transitioned, from where, when, under what circumstances, and with what standing.

**What EXIT is:** A documentation format. A liability record. A chain-of-custody link.

**What EXIT is not:** A transfer mechanism, a registry, a runtime, or a governance framework.

### 2.2 Current Status

| Attribute | Detail |
|-----------|--------|
| Version | 0.1.0 (specification draft + reference implementation) |
| Tests | 205 passing |
| License | Apache 2.0 |
| Package | [npm: cellar-door-exit](https://www.npmjs.com/package/cellar-door-exit) |
| Source | [GitHub](https://github.com/CellarDoorExits/exit-door) |
| Site | [cellar-door-exit.netlify.app](https://cellar-door-exit.netlify.app) |
| Production deployments | None (pre-production) |

A detailed technical treatment is available at [cellar-door-exit.netlify.app](https://cellar-door-exit.netlify.app). The reference implementation demonstrates all transition paths and extension modules.

### 2.3 Design Properties

1. **Always Available:** Transition records must be producible even when the departing platform is uncooperative or defunct.
2. **Minimal Core:** Nine mandatory fields. All additional functionality is in optional extension modules.
3. **Cryptographically Verifiable:** Ed25519 signatures. Offline verification. No dependency on external services.
4. **Non-Custodial:** No central registry. No single point of failure.
5. **Standards-Aligned:** JSON-LD for semantic interoperability. W3C DIDs for subject identification. W3C Verifiable Credential wrapper available.

### 2.4 Core Schema

| Field | Purpose | Compliance Value |
|-------|---------|-----------------|
| `@context` | JSON-LD semantic context | Interoperability |
| `id` | Content-addressed hash URI | Tamper evidence |
| `subject` | DID of transitioning agent | Identity continuity |
| `origin` | URI of departing platform | Audit trail |
| `timestamp` | UTC departure time | Regulatory timeline |
| `exitType` | `voluntary` / `forced` / `emergency` / `keyCompromise` | Risk classification |
| `status` | `good_standing` / `disputed` / `unverified` | Liability indicator |
| `selfAttested` | Boolean: is status self-reported? | Disclosure transparency |
| `proof` | Ed25519 cryptographic signature | Verification |

Nine fields. ~335 bytes unsigned, ~660 bytes signed.

### 2.5 Extension Modules

Six optional modules address specific enterprise and regulatory use cases:

- **Module A (Lineage):** Cryptographic predecessor/successor chains for verifiable identity continuity across migrations and key rotations.
- **Module B (State Snapshot):** Hash references to system state at transition time, anchoring records to operational context without storing sensitive data.
- **Module C (Dispute Bundle):** Structured mechanism for platforms to record their perspective on a departure, with challenge windows and co-signatures.
- **Module D (Economic):** Asset and obligation references documenting financial state at transition time.
- **Module E (Metadata):** Human-readable context — departure reasons, operational notes, domain-specific tags.
- **Module F (Cross-Domain Anchoring):** Integration with external registries and immutable record systems.

### 2.6 Transition Paths

EXIT defines three transition paths:

- **Cooperative:** Both parties participate. Challenge window for dispute documentation. Maximum information quality.
- **Unilateral:** The operator documents the transition without platform cooperation. Essential for platform failures or vendor disputes.
- **Emergency:** Immediate documentation with minimal ceremony. For key compromise or security incidents.

**Design invariant:** Disputes are documented but never block transitions. A platform can record its objection. It cannot prevent an operator from documenting a departure.

---

## 3. Alignment with NIST Frameworks

### 3.1 NIST AI Risk Management Framework (AI RMF)

EXIT addresses risks identified in the AI RMF across multiple functions:

- **GOVERN:** Agent transition records support organizational AI governance by providing auditable lifecycle documentation. EXIT markers create accountability records at system boundaries — a gap in current governance tooling.
- **MAP:** Transition documentation helps organizations map AI system contexts, particularly when agents move between risk environments. The `exitType` and `status` fields support risk tier classification.
- **MEASURE:** Standardized transition records provide measurable data points for tracking agent reliability, dispute frequency, and operational continuity across deployments.
- **MANAGE:** EXIT's non-blocking transition design ensures that risk management actions (emergency departures, key compromise disclosures) can always be documented, even under adversarial conditions.

**Recommendation:** We recommend NIST include agent lifecycle transition documentation as a suggested practice within AI RMF Govern 1.x (policies for AI lifecycle) and Measure 2.x (AI system performance monitoring).

### 3.2 NIST SP 800-63 (Digital Identity Guidelines)

EXIT builds on identity assurance concepts from SP 800-63:

- **Identity proofing (SP 800-63A):** EXIT's lineage chains (Module A) provide a mechanism for verifying agent identity continuity across platform boundaries — analogous to identity proofing at enrollment, but applied at transition points.
- **Authentication (SP 800-63B):** EXIT's Ed25519 signatures and DID-based subject identification align with SP 800-63B's cryptographic authentication requirements.
- **Federation (SP 800-63C):** Agent transitions are effectively federation events — an identity assertion crossing a trust boundary. EXIT provides the transition-specific documentation that federation protocols lack.

**Recommendation:** We recommend NIST consider extending SP 800-63's scope to include non-human (agent) identity lifecycle events, with EXIT-style transition records as a reference approach.

### 3.3 NCCoE Software and AI Agent Identity and Authorization

NIST's NCCoE project addresses how agents prove identity and receive authorization. EXIT complements this by addressing what happens to agent identity at lifecycle boundaries — the gap between one authorization context and the next.

EXIT uses W3C Decentralized Identifiers for subject identification:

- `did:key` for prototyping and emergency scenarios
- `did:web` for organization-backed agents
- `did:keri` for environments requiring pre-rotation key management

### 3.4 Interoperability with the Agent Protocol Stack

| Protocol | Function | Lifecycle Phase |
|----------|----------|----------------|
| MCP | Tool access | Operation |
| A2A | Agent communication | Operation |
| AP2 | Payment authorization | Operation |
| Entra/SailPoint | Governance | Operation |
| **EXIT** | **Transition documentation** | **Lifecycle boundary** |

EXIT markers can be wrapped in W3C Verifiable Credentials, integrating with any VC-compatible system.

### 3.5 Trust and Risk Management

EXIT addresses information asymmetry through transparency:

- **Self-attestation is explicitly labeled.** The `selfAttested` field makes disclosure quality machine-readable.
- **Multi-source documentation.** Both the departing agent and the origin platform can record their perspective.
- **Lineage chains resist reputation laundering.** Creating fake histories requires producing cryptographically consistent lineage.
- **Content-addressed identifiers ensure tamper evidence.** Records cannot be silently modified after creation.

### 3.6 Security

EXIT's security model addresses agent-specific threat categories:

- **Key compromise disclosure:** The `keyCompromise` transition type provides a standardized mechanism for declaring signing key compromise.
- **Identity laundering:** Lineage verification (Module A) makes it costly to create convincing fake agent histories.
- **Weaponized transition records:** Normative language specifies that neither self-attested nor platform-attested status is authoritative, preventing use as a blacklisting mechanism.
- **Denial of documentation:** Unilateral and emergency paths ensure transition records can always be produced.

---

## 4. Recommendations for NIST

### 4.1 Include Agent Lifecycle Transitions in the Standards Framework

Current standards address agent creation, operation, and governance. Agent transitions are equally critical lifecycle events that lack standardized documentation.

**Specific recommendations:**

- Include agent lifecycle transition records as a suggested practice in the **AI RMF** (Govern and Measure functions).
- Add transition documentation requirements to the **NCCoE Agent Identity and Authorization** project scope.
- Reference agent departure records in future revisions of **SP 800-63** addressing non-human identity.

### 4.2 Establish Non-Blocking Transition Documentation as a Principle

The ability to document a transition must not depend on platform cooperation. Platforms that can prevent transition documentation have effective veto power over agent mobility.

We recommend NIST's framework recognize **non-blocking transition documentation** as a governance principle: operators should always retain the ability to produce a verifiable transition record regardless of platform cooperation.

### 4.3 Address Information Asymmetry in Agent Markets

Self-reported transition records are necessary but insufficient. We recommend that NIST consider standards for:

- Multi-party attestation of transition records (platform co-signatures)
- Graduated trust models that weight attestations by source and recency
- Structured dispute documentation preserving both parties' perspectives

### 4.4 Build on Existing W3C Standards

The W3C DID and Verifiable Credential standards provide a mature foundation for portable agent credentials. We recommend that NIST's framework:

- Adopt W3C DIDs as the basis for agent identification across platforms
- Include agent transition credentials in the scope of verifiable agent credentials
- Leverage existing VC infrastructure rather than creating parallel systems

### 4.5 Establish Conformance Criteria

For agent transition documentation to be useful, implementations must be evaluable. We recommend NIST develop:

- **Minimum conformance requirements** for transition record formats (required fields, signature schemes, verification procedures)
- **Interoperability test cases** for transition records crossing platform boundaries
- **Graduated conformance levels** reflecting the maturity of transition documentation (e.g., self-attested only → platform co-signed → third-party verified)

---

## 5. Privacy and Data Protection

### 5.1 Data Minimization

The core schema is ~335 bytes unsigned. No agent weights, training data, operational logs, or sensitive business information is stored. Module B anchors state references via hash — the hash is stored, never the state itself.

### 5.2 GDPR Compatibility

- **Pseudonymous identifiers:** DIDs minimize personal data exposure
- **Functional erasure:** Subjects may encrypt markers with subject-controlled keys
- **Non-custodial architecture:** No single entity accumulates transition records
- **Right to rectification:** Subjects may issue amended markers linked to originals

### 5.3 Surveillance Resistance

Transition records are stored by their subjects, not indexed in central registries. Lineage chains can be truncated. The protocol minimizes surveillance exposure while maintaining verification capability.

---

## 6. About the Submitter

The EXIT Protocol is an open-source project developing a specification and TypeScript reference implementation for agent transition documentation. The project is in pre-production (specification drafted, reference implementation with 205 passing tests, published npm package, no production deployment).

EXIT is released under the Apache License 2.0. Source code is available at [github.com/CellarDoorExits/exit-door](https://github.com/CellarDoorExits/exit-door).

We welcome NIST's engagement with agent lifecycle documentation as a standards priority and would be glad to provide additional technical detail, participate in listening sessions, or collaborate on standards development.

---

## References

- Akerlof, G. A. (1970). "The Market for 'Lemons': Quality Uncertainty and the Market Mechanism." *Quarterly Journal of Economics*, 84(3), 488–500.
- W3C. (2022). "Decentralized Identifiers (DIDs) v1.0." W3C Recommendation.
- W3C. (2024). "Verifiable Credentials Data Model v2.0." W3C Recommendation.
- NIST. (2023). "Artificial Intelligence Risk Management Framework (AI RMF 1.0)." NIST AI 100-1.
- NIST. (2024). "Digital Identity Guidelines." SP 800-63-4 (Draft).
- NIST. (2026). "NIST Launches AI Agent Standards Initiative." Federal Register Notice.
- Smith, S. M. (2021). "Key Event Receipt Infrastructure (KERI)." IETF Internet-Draft.
- EXIT Protocol Specification v1.0-draft. (2026). Apache 2.0. Available at: [github.com/CellarDoorExits/exit-door](https://github.com/CellarDoorExits/exit-door)

---

*This response is submitted as a technical and policy contribution to the NIST AI Agent Standards Initiative. It does not constitute legal advice.*
