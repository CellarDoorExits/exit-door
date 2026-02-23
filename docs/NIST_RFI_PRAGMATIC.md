# Response to NIST AI Agent Standards Initiative Request for Information

## Agent Transition Documentation and Portable Liability Records for Competitive AI Markets

**Submitted to:** National Institute of Standards and Technology (NIST), Center for AI Standards and Interoperability (CAISI)

**In response to:** AI Agent Standards Initiative RFI (February 17, 2026)

**Submitted by:** Warren Koch, EXIT Protocol Project

**Date:** March 2026

**Contact:** Warren Koch — warrenkoch@gmail.com

---

## Executive Summary

The emerging AI agent economy has a documentation problem. Agents communicate across platforms (A2A), access tools (MCP), and execute payments (AP2) — but when an agent transitions between platforms, no standardized record exists. There is no chain of custody, no verifiable departure history, no portable liability documentation.

This is not an abstract concern. Without agent transition documentation:

- **Enterprises cannot perform due diligence** on agents with prior operational histories
- **Insurers cannot underwrite** agent deployments without lifecycle records
- **Regulators cannot audit** agent transitions across platform boundaries
- **Markets cannot price** agent-related risk because the information doesn't exist

We submit this response to highlight **agent transition documentation** as a critical gap in the current standards landscape and to present the EXIT protocol — a minimal, open, cryptographically verifiable format for portable agent departure records. We recommend that NIST include agent lifecycle transitions as a core concern alongside identity, authorization, and interoperability.

---

## 1. The Problem: Undocumented Agent Transitions

### 1.1 The Documentation Gap

The agent protocol stack is maturing rapidly. A2A handles communication. MCP handles tool access. AP2 handles payments. Microsoft Entra and SailPoint handle enterprise governance. OASF handles capability advertisement.

No protocol handles what happens when an agent leaves.

Today, when an AI agent's relationship with a platform ends:

- **No transition record exists.** The departure is undocumented. No timestamp, no standing, no verifiable proof it occurred.
- **Liability history is lost.** The agent's operational record — including any incidents, disputes, or compliance issues — is locked inside the departing platform.
- **Identity is fragmented.** The agent starts over on the receiving platform with no verifiable connection to its prior self.
- **Audit trails break.** Organizations deploying agents across platforms have no continuous lifecycle documentation.

This is the equivalent of a used car market with no vehicle history reports, or a real estate market with no property records. The transactions happen — but nobody can verify what they're getting.

### 1.2 Economic Consequences

This documentation gap has concrete economic costs:

- **Market friction:** Agent transitions are high-friction because receiving platforms cannot assess incoming agents. This reduces competitive pressure on platforms — if switching is costly and opaque, incumbents benefit regardless of service quality.
- **Adverse selection:** Without verifiable departure records, high-quality agents (with clean operational histories) cannot credibly distinguish themselves from problematic agents that created new identities. This is the classic "market for lemons" (Akerlof, 1970) applied to agent ecosystems.
- **Risk mispricing:** Insurers and enterprises cannot accurately price agent-related risk without lifecycle documentation. This leads to either excessive risk premiums (suppressing adoption) or inadequate reserves (creating systemic exposure).
- **Lock-in inefficiency:** When agent identity and history are platform-bound, operators face switching costs that have nothing to do with the quality of the receiving platform. This misallocates resources and reduces market efficiency.

### 1.3 The Compliance Imperative

As AI agents take on higher-stakes operational roles — managing supply chains, executing financial transactions, handling sensitive data — the absence of lifecycle documentation becomes a compliance liability.

- **SOC 2 / ISO 27001:** Asset lifecycle management requires documentation of system transitions. Undocumented agent migrations create audit gaps.
- **Financial regulation:** Agents executing transactions (AP2) create regulatory obligations that follow the agent's history, not just its current deployment.
- **EU AI Act:** Documentation requirements for AI systems implicitly extend to agent lifecycle events. Transitions without records create compliance exposure.
- **Insurance underwriting:** Agent operations increasingly require E&O and cyber insurance. Underwriters need lifecycle data. It doesn't exist.

---

## 2. The EXIT Protocol: Standardized Agent Transition Records

### 2.1 Overview

EXIT is a minimal format for portable, cryptographically signed agent departure records. An EXIT marker is a compact JSON-LD document (~335 bytes (unsigned) to ~596 bytes (signed)) that records: who transitioned, from where, when, under what circumstances, and with what standing.

EXIT is released under the Apache License 2.0 and is designed as a composable primitive that complements the existing agent protocol stack.

**What EXIT is:** A documentation format. A liability record. A chain-of-custody link.

**What EXIT is not:** A transfer mechanism, a registry, a runtime, or a governance framework.

### 2.2 Design for Enterprise Requirements

The protocol is built around five properties directly relevant to enterprise and regulatory needs:

1. **Always Available:** Transition records must be producible even when the departing platform is uncooperative, defunct, or in legal dispute. An operator's ability to document a transition cannot depend on vendor cooperation.
2. **Minimal Core:** Seven mandatory fields. All additional functionality is in optional modules. Minimal integration cost, minimal attack surface.
3. **Cryptographically Verifiable:** Ed25519 signatures. Offline verification. No dependency on any external service or authority.
4. **Non-Custodial:** No central registry. No single point of failure. No custodian liability exposure.
5. **Standards-Aligned:** JSON-LD for semantic interoperability. W3C DIDs for subject identification. W3C Verifiable Credential wrapper available for ecosystem compatibility.

### 2.3 Core Schema

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

### 2.4 Extension Modules

Six optional modules address specific enterprise and regulatory use cases:

- **Module A (Lineage):** Cryptographic predecessor/successor chains. Enables verifiable agent identity continuity across platform migrations and key rotations. Essential for audit trails spanning multiple transitions.
- **Module B (State Snapshot):** Hash references to system state at transition time. Anchors the departure record to a specific operational context without storing sensitive data.
- **Module C (Dispute Bundle):** Structured mechanism for platforms to record their perspective on a departure. Challenge windows, co-signatures, and bi-lateral documentation. Critical for liability allocation in disputed transitions.
- **Module D (Economic):** Asset and obligation references. Documents the financial state at transition time. Designed as declarations and references, not transfer instruments.
- **Module E (Metadata):** Human-readable context. Departure reasons, operational notes, domain-specific tags.
- **Module F (Cross-Domain Anchoring):** Integration with external registries and immutable record systems.

### 2.5 Transition Ceremony

EXIT defines three transition paths accommodating different operational scenarios:

- **Cooperative transition:** Both parties participate. Includes a challenge window for dispute documentation. Maximum information quality. Appropriate for planned vendor migrations.
- **Unilateral transition:** The operator documents the transition without platform cooperation. Essential for platform failures, vendor disputes, or emergency migrations.
- **Emergency transition:** Immediate documentation with minimal ceremony. For key compromise, platform security incidents, or time-critical situations.

**Design invariant:** Disputes are documented but never block transitions. A platform can record its objection. It cannot prevent an operator from documenting a departure. This prevents denial-of-documentation attacks while preserving both parties' ability to record their perspective.

---

## 3. Alignment with NIST's Standards Objectives

### 3.1 Agent Identity

NIST's NCCoE project on "Software and AI Agent Identity and Authorization" addresses how agents prove identity and receive authorization. EXIT complements this by addressing what happens to agent identity at lifecycle transitions — the gap between one authorization context and the next.

EXIT uses W3C Decentralized Identifiers for subject identification, supporting multiple DID methods appropriate to different deployment contexts:

- `did:key` for prototyping and emergency scenarios
- `did:keri` for production (pre-rotation key management, key lifecycle support)
- `did:web` for organization-backed agents

Module A (Lineage) provides cryptographic continuity proofs enabling verifiable identity persistence across platform boundaries — an agent can demonstrate that its current identity is a legitimate successor to its prior identity, even after key rotation.

### 3.2 Interoperability

EXIT fills a specific gap in the agent protocol stack:

| Protocol | Function | Lifecycle Phase |
|----------|----------|----------------|
| MCP | Tool access | Operation |
| A2A | Agent communication | Operation |
| AP2 | Payment authorization | Operation |
| Entra/SailPoint | Governance | Operation |
| **EXIT** | **Transition documentation** | **Lifecycle boundary** |

EXIT markers can be wrapped in W3C Verifiable Credentials, integrating with any VC-compatible system. The JSON-LD context provides semantic interoperability across linked data ecosystems.

### 3.3 Trust and Risk Management

EXIT addresses the information asymmetry problem through transparency rather than centralized authority:

- **Self-attestation is explicitly labeled.** The `selfAttested` field makes disclosure quality machine-readable. Verifiers know exactly what they're getting.
- **Multi-source documentation.** Both the departing agent and the origin platform can record their perspective. Verifiers evaluate both.
- **Lineage chains resist reputation laundering.** Creating fake histories requires producing cryptographically consistent lineage — significantly more costly than creating a new identity.
- **Content-addressed identifiers ensure tamper evidence.** Records cannot be silently modified after creation.

### 3.4 Security

EXIT's security model addresses agent-specific threat categories:

- **Key compromise disclosure:** The `keyCompromise` transition type provides a standardized mechanism for declaring signing key compromise, alerting downstream systems.
- **Identity laundering:** Lineage verification (Module A) makes it costly to create convincing fake agent histories.
- **Weaponized transition records:** Normative language specifies that neither self-attested nor platform-attested status is authoritative, preventing use of EXIT as a blacklisting mechanism.
- **Denial of documentation:** Unilateral and emergency paths ensure transition records can always be produced, even without platform cooperation.

---

## 4. The Competitive Standards Argument

### 4.1 The Interoperability Advantage

The United States currently leads in AI agent development. Maintaining this lead requires that US agent ecosystems remain interoperable and competitive — not fragmented into proprietary walled gardens.

Without portable agent identity and transition documentation:

- Each platform's agents are effectively trapped inside that platform's ecosystem
- Agent operators face switching costs unrelated to service quality
- Competitive pressure on platforms is reduced — lock-in substitutes for quality
- The interoperability advantages of the US agent ecosystem erode

### 4.2 The Standardization Race

Agent transition standards will emerge. The question is whether they emerge from an open, US-led standards process or from proprietary platform implementations that the rest of the ecosystem must reverse-engineer.

- **If US-led:** Open standard, interoperable, competitive market, innovation at the edges
- **If platform-led:** Proprietary formats, fragmented ecosystems, lock-in as business model
- **If foreign-led:** US platforms retrofit compliance, lose first-mover advantage on interoperability

NIST's AI Agent Standards Initiative is well-positioned to catalyze the first outcome. Agent transition documentation should be within scope.

### 4.3 The Insurance Infrastructure Argument

The AI insurance market is nascent but growing. Agent operations increasingly require E&O coverage, cyber liability insurance, and specialized AI risk policies. Underwriters need data.

Agent transition records are to AI insurance what claims histories are to auto insurance — the foundational documentation that makes risk assessment possible. Without standardized transition records, insurers either refuse to underwrite agent operations (suppressing adoption) or underwrite blind (creating systemic risk).

EXIT provides the documentation format. The insurance industry provides the economic incentive for adoption.

---

## 5. Privacy and Data Protection

### 5.1 Data Minimization

The core schema is ~335 bytes (unsigned), ~596 bytes signed. No agent weights, training data, operational logs, or sensitive business information is stored in the marker. Module B anchors state references via hash — the hash is stored, never the state itself.

### 5.2 GDPR Compatibility

- **Pseudonymous identifiers:** DIDs are pseudonymous, minimizing personal data exposure
- **Functional erasure:** Subjects may encrypt markers with subject-controlled keys
- **Non-custodial architecture:** No single entity accumulates transition records
- **Right to rectification:** Subjects may issue amended markers linked to originals
- **ZK roadmap:** Zero-knowledge selective disclosure planned for privacy-preserving verification

### 5.3 Surveillance Resistance

Transition records are stored by their subjects, not indexed in central registries. Lineage chains can be truncated. The protocol is designed to minimize surveillance exposure while maintaining verification capability.

---

## 6. Recommendations for NIST

### 6.1 Include Agent Lifecycle Transitions in the Standards Framework

Current standards address agent creation, operation, and governance. **Agent transitions are equally critical lifecycle events** that require standardized documentation. We recommend that any comprehensive agent standards framework include:

- Portable agent identity that persists across platform boundaries
- Verifiable transition records with tamper-evident properties
- Cryptographic continuity proofs for agent lineage
- Standardized mechanisms for bi-lateral transition documentation

**Rationale:** Agent transitions are already happening. The question is whether they happen with documentation or without it. Standardizing transition records reduces risk, enables insurance, supports compliance, and maintains competitive market dynamics.

### 6.2 Establish Non-Blocking Transition Documentation as a Governance Principle

The ability to document a transition must not depend on platform cooperation. Platforms that can prevent transition documentation have effective veto power over agent mobility — creating lock-in that undermines market competition.

We recommend that NIST's framework recognize **non-blocking transition documentation** as a principle: operators should always retain the ability to produce a verifiable transition record regardless of platform cooperation.

**Rationale:** This is the same principle behind data portability requirements (GDPR Article 20) applied to agent lifecycle documentation. The economic case is identical: markets function better when switching costs reflect genuine value differences, not documentation barriers.

### 6.3 Address the Information Asymmetry Problem

Self-reported transition records are necessary but insufficient. Without independent verification mechanisms, transition records suffer from adverse selection — high-quality agents cannot credibly distinguish themselves, leading to market inefficiency.

We recommend that NIST consider standards for:

- Multi-party attestation of transition records (platform co-signatures)
- Graduated trust models that weight attestations by source and recency
- Structured dispute documentation that preserves both parties' perspectives
- Economic mechanisms (staked attestation, reputation bonds) that create incentives for honest reporting

**Rationale:** The "market for lemons" problem (Akerlof, 1970) applies directly to agent transitions. Standardized mechanisms for credible signaling improve market efficiency and reduce risk.

### 6.4 Build on Existing W3C Standards

The W3C Decentralized Identifier and Verifiable Credential standards provide a mature, widely-adopted foundation for portable agent credentials. We recommend that NIST's framework:

- Adopt W3C DIDs as the foundation for agent identification across platforms
- Include agent transition credentials in the scope of verifiable agent credentials
- Leverage existing VC infrastructure rather than creating parallel systems

**Rationale:** Standards adoption is accelerated by building on existing infrastructure. The DID/VC ecosystem already supports the cryptographic primitives, credential formats, and verification models that agent transition documentation requires.

---

## 7. About the Submitter

**Cellar Door** is an open-source project developing the EXIT protocol specification and TypeScript reference implementation. The project is in early-stage development (specification drafted, reference implementation built, no production deployment). EXIT is released under the Apache License 2.0 as a public good.

We welcome NIST's engagement with agent lifecycle documentation as a standards priority and would be glad to provide additional technical detail, participate in listening sessions, or collaborate on standards development.

---

## References

- Akerlof, G. A. (1970). "The Market for 'Lemons': Quality Uncertainty and the Market Mechanism." *Quarterly Journal of Economics*, 84(3), 488–500.
- Hirschman, A. O. (1970). *Exit, Voice, and Loyalty: Responses to Decline in Firms, Organizations, and States.* Harvard University Press.
- W3C. (2022). "Decentralized Identifiers (DIDs) v1.0." W3C Recommendation.
- W3C. (2024). "Verifiable Credentials Data Model v2.0." W3C Recommendation.
- Smith, S. M. (2021). "Key Event Receipt Infrastructure (KERI)." IETF Internet-Draft.
- NIST. (2026). "NIST Launches AI Agent Standards Initiative."
- EXIT Protocol Specification v1.0-draft. (2026). Apache 2.0.

---

*This response is submitted by the Cellar Door project contributors. It does not constitute legal advice and is intended as a technical and policy contribution to the NIST AI Agent Standards Initiative.*
