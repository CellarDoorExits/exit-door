# Response to NIST AI Agent Standards Initiative Request for Information

## Agent Portability, Exit Rights, and Verifiable Departure Ceremonies

**Submitted to:** National Institute of Standards and Technology (NIST), Center for AI Standards and Interoperability (CAISI)

**In response to:** AI Agent Standards Initiative RFI (February 17, 2026)

**Submitted by:** Cellar Door Contributors

**Date:** [MONTH DAY, 2026]

**Contact:** [CONTACT INFORMATION]

---

## Executive Summary

As AI agents become autonomous participants in digital ecosystems—negotiating, transacting, and operating across platforms—a critical governance gap has emerged: **no standardized mechanism exists for agents to verifiably depart one system and establish continuity in another.** This gap creates platform lock-in, impedes interoperability, undermines trust, and leaves both operators and agents without reliable departure records.

We respectfully submit this response to highlight the importance of **agent portability and exit rights** as a foundational element of any comprehensive AI agent standards framework. We describe the EXIT protocol, an open specification for verifiable agent departure ceremonies, and recommend that NIST consider agent lifecycle transitions—particularly departure—as a core concern alongside identity, authorization, and interoperability.

---

## 1. The Problem: Agents Without Exit Rights

### 1.1 The Current Landscape

The AI agent ecosystem is rapidly developing standards for how agents communicate (A2A Protocol), access tools (Model Context Protocol), make payments (AP2), and are governed within organizations (Microsoft Entra Agent ID, SailPoint). These initiatives address important dimensions of the agent lifecycle.

However, the current standards landscape contains a significant omission: **no protocol addresses what happens when an agent departs a platform.** Today, when an AI agent's relationship with a hosting platform ends—whether voluntarily, by operator decision, or due to platform failure—the following occurs:

- **Identity is lost.** The agent's identity is typically bound to the platform. Departure means starting over.
- **Reputation is non-portable.** Performance history, trust signals, and standing accumulated on one platform cannot be verified elsewhere.
- **No departure record exists.** There is no standardized, verifiable record that the departure occurred, when it occurred, or under what circumstances.
- **Continuity is broken.** Successor agents cannot cryptographically demonstrate lineage from predecessor agents.

### 1.2 Why This Matters for Standards

This gap has concrete consequences for the concerns NIST has identified:

- **Identity:** Without portable departure credentials, agent identity is fragmented across platforms with no mechanism for cross-platform verification of lifecycle history.
- **Trust:** Receiving platforms cannot verify an agent's prior standing, creating information asymmetry that undermines trust in multi-platform agent ecosystems.
- **Security:** The absence of departure records means compromised agents can silently re-emerge on new platforms without any traceable history. Key compromise events have no standardized disclosure mechanism.
- **Governance:** Organizations deploying agents across platforms lack auditable records of agent lifecycle transitions, creating compliance gaps.
- **Interoperability:** Agents that cannot carry verifiable credentials across system boundaries are not truly interoperable—they are merely communicable.

### 1.3 The Lock-In Dynamic

Without exit standards, platform operators have a structural incentive to make departure difficult. Agent identity, reputation, and operational history become platform assets rather than agent attributes. This dynamic mirrors the data portability challenges that motivated regulations like GDPR Article 20, but applied to autonomous software entities rather than human data subjects.

---

## 2. The EXIT Protocol: A Proposed Standard for Agent Departure Ceremonies

### 2.1 Overview

The EXIT protocol defines a verifiable, portable, cryptographically signed marker for entity departures from digital contexts. An EXIT marker is a compact JSON-LD document (approximately 300–500 bytes in its core form) that records: who departed, from where, when, under what circumstances, and with what standing.

EXIT is released under the Apache License 2.0 and is designed as a minimal, composable primitive that complements existing agent standards rather than competing with them.

### 2.2 Design Principles

The protocol is built on five principles directly relevant to NIST's standards objectives:

1. **Always Available:** Exit must function even when the origin platform is hostile, unresponsive, or defunct. An agent's ability to produce a departure record must not depend on platform cooperation.
2. **Minimal Core:** The core schema comprises seven mandatory fields. All additional functionality is provided through optional extension modules, enabling implementers to adopt only what their use case requires.
3. **Cryptographically Verifiable:** Every EXIT marker is signed using Ed25519 (DataIntegrityProof). Markers are self-contained and can be verified offline without contacting any central authority.
4. **Non-Custodial:** No central registry is required. The protocol operates without a single point of control or failure.
5. **Standards-Aligned:** EXIT uses JSON-LD for semantic interoperability, aligns with W3C Decentralized Identifiers (DIDs) for subject identification, and can be wrapped in W3C Verifiable Credentials for ecosystem compatibility.

### 2.3 Core Schema

An EXIT marker contains:

| Field | Purpose |
|-------|---------|
| `@context` | JSON-LD context for semantic interoperability |
| `id` | Content-addressed identifier (SHA-256 hash URI) |
| `subject` | The departing entity, identified by DID |
| `origin` | The system being departed, identified by URI |
| `timestamp` | UTC departure time (ISO 8601) |
| `exitType` | Nature of departure: `voluntary`, `forced`, `emergency`, or `keyCompromise` |
| `status` | Standing at departure: `good_standing`, `disputed`, or `unverified` |
| `selfAttested` | Boolean indicating whether status is self-reported |
| `proof` | Ed25519 cryptographic signature by the subject |

### 2.4 Extension Modules

Six optional modules extend the core for specific use cases:

- **Module A (Lineage):** Predecessor/successor relationships enabling cryptographic proof of agent continuity across key rotations and platform migrations.
- **Module B (State Snapshot):** Hash references to external state at departure time, enabling verifiable anchoring without storing sensitive data.
- **Module C (Dispute Bundle):** Structured mechanism for origin platforms to record their perspective on a departure, with challenge windows and co-signatures.
- **Module D (Economic):** Asset and obligation references for departures with financial dimensions.
- **Module E (Metadata):** Human-readable context including departure reasons and narratives.
- **Module F (Cross-Domain Anchoring):** Integration with external registries and blockchain systems.

### 2.5 Ceremony State Machine

EXIT defines a seven-state ceremony governing the departure process:

```
ALIVE → INTENT → SNAPSHOT → OPEN → CONTESTED → FINAL → DEPARTED
```

Three paths accommodate different scenarios:
- **Full cooperative:** Both parties participate; includes a challenge window.
- **Unilateral:** The agent exits without origin cooperation (essential for platform failure or hostility).
- **Emergency:** Immediate departure (ALIVE → FINAL → DEPARTED) for time-critical situations such as key compromise.

A critical design invariant: **disputes never block exit.** Disputes modify metadata on the departure record but cannot prevent the departure itself. This prevents denial-of-exit attacks while preserving the origin's ability to record its perspective.

### 2.6 Verification Model

EXIT employs layered verification:

1. **Structural verification:** Schema compliance, field validation.
2. **Cryptographic verification:** Ed25519 signature validation against the subject's DID.
3. **Trust verification:** Context-dependent evaluation of self-attested vs. origin-attested status, lineage depth, and continuity proof strength.

This layered approach allows different verifiers to apply different trust policies, accommodating the diversity of agent deployment contexts.

---

## 3. Alignment with NIST's Standards Objectives

### 3.1 Agent Identity

NIST's concurrent NCCoE project on "Software and AI Agent Identity and Authorization" addresses how agents prove identity and receive authorization. EXIT complements this work by addressing what happens to agent identity at lifecycle transitions.

EXIT uses W3C Decentralized Identifiers as the subject identification mechanism, supporting multiple DID methods appropriate to different trust levels:

- `did:key` for prototyping and emergency scenarios
- `did:keri` for production deployments (supporting pre-rotation and key revocation via the Key Event Receipt Infrastructure)
- `did:web` for organization-backed agents

Module A (Lineage) provides cryptographic continuity proofs enabling an agent to demonstrate that its current identity is a legitimate successor to a previous identity, even after key rotation. This directly addresses the agent identity persistence problem across platform boundaries.

### 3.2 Interoperability

EXIT is designed to function within the emerging agent protocol stack:

- **MCP** (Model Context Protocol) handles agent-to-tool connections
- **A2A** (Agent-to-Agent Protocol) handles inter-agent communication
- **AP2** (Agent Payments Protocol) handles agent transactions
- **EXIT** handles agent lifecycle transitions and portable departure credentials

EXIT markers can be wrapped in W3C Verifiable Credentials, enabling integration with any VC-compatible system. The JSON-LD context provides semantic interoperability with linked data ecosystems.

### 3.3 Trust and Governance

EXIT addresses the trust problem through mechanism design rather than centralized authority:

- **Self-attestation is explicitly labeled** (`selfAttested: true`), making the non-warranty nature machine-readable. This prevents misinterpretation of departure records as authoritative certifications.
- **Multi-source status** allows both the departing agent and the origin platform to record their perspective, enabling verifiers to evaluate both sides.
- **Lineage chains** create auditable histories that resist reputation laundering (creating new identities to escape negative history).
- **Content-addressed identifiers** ensure markers cannot be silently modified after creation.

### 3.4 Security

EXIT's security model addresses several threat categories relevant to NIST's agent security concerns:

- **Key compromise:** The `keyCompromise` exit type provides a standardized mechanism for declaring that a signing key has been compromised, alerting verifiers to treat prior markers with suspicion.
- **Reputation laundering:** Lineage verification (Module A) with cryptographic continuity proofs makes it costly to create convincing fake histories.
- **Weaponized departure records:** Normative language specifies that neither self-attested nor origin-attested status is authoritative, preventing platforms from using EXIT as a blacklisting mechanism.
- **Denial-of-exit attacks:** The unilateral and emergency ceremony paths ensure agents can always produce departure records, even without platform cooperation.

---

## 4. Privacy Considerations

### 4.1 GDPR Compatibility

The EXIT specification explicitly addresses data protection:

- **Data minimization:** The core schema is 300–500 bytes. Optional modules are included only when needed.
- **Functional erasure:** Subjects may encrypt markers such that only the subject holds the decryption key, achieving functional erasure while preserving cryptographic integrity.
- **Right to rectification:** Subjects may issue amended markers linked to originals.
- **No central data store:** The non-custodial architecture means no single entity accumulates departure records.

### 4.2 Zero-Knowledge Roadmap

The specification includes a roadmap for zero-knowledge selective disclosure, enabling agents to prove properties of their departure history (e.g., "I have exited at least one system in good standing") without revealing the full marker contents. This addresses the tension between verifiability and privacy that is inherent in portable credential systems.

### 4.3 Surveillance Resistance

EXIT's design minimizes surveillance exposure: markers are stored by their subjects, not indexed in central registries. Lineage chains can be truncated to the minimum useful depth. Module F (Cross-Domain Anchoring) carries explicit warnings about the GDPR implications of indelible on-chain storage.

---

## 5. Security Model

### 5.1 Cryptographic Foundation

- **Signing algorithm:** Ed25519 (Edwards-curve Digital Signature Algorithm), providing 128-bit security with compact 64-byte signatures.
- **Proof format:** DataIntegrityProof with `eddsa-jcs-2022` canonicalization, aligned with W3C Data Integrity specification.
- **Content addressing:** SHA-256 hash URIs for tamper-evident marker identification.
- **Key management:** DID-method-agnostic, with production recommendation for `did:keri` supporting pre-rotation key commitment.

### 5.2 Pre-Rotation and Key Lifecycle

For production deployments, EXIT recommends the Key Event Receipt Infrastructure (KERI) approach to key management. KERI's pre-rotation mechanism—where the hash of the next public key is committed before the current key is used—provides forward security against key compromise. This is particularly important for long-lived agents whose signing keys may be exposed over extended operational lifetimes.

### 5.3 Threat Model

The specification addresses threats including: Sybil-based reputation laundering, weaponized forced exits (defamation by protocol), forged markers, mass coordinated exit signaling, surveillance via exit trails, and key compromise without revocation capability.

---

## 6. Recommendations for NIST

We respectfully recommend that NIST consider the following as the AI Agent Standards Initiative develops:

### 6.1 Include Agent Lifecycle Transitions in the Standards Framework

Current standards efforts focus on agent creation, communication, and governance during operation. **Agent departure and migration are equally critical lifecycle events** that require standardized, verifiable mechanisms. We recommend that any comprehensive agent standards framework include provisions for:

- Portable agent identity that persists across platform boundaries
- Verifiable departure records
- Cryptographic continuity proofs for agent lineage
- Mechanisms for agents to carry reputation signals across systems

### 6.2 Establish Agent Exit Rights as a Governance Principle

The ability to exit is fundamental to healthy market dynamics and governance. Albert O. Hirschman's framework of Exit, Voice, and Loyalty (1970) demonstrates that exit rights serve as a check on institutional power. In agent ecosystems, the inability to exit creates platform lock-in that concentrates power and reduces competitive pressure.

We recommend that NIST's framework recognize **non-blocking exit** as a governance principle: agents (or their operators) should always retain the ability to produce a departure record and establish continuity elsewhere, regardless of platform cooperation.

### 6.3 Address the Information Asymmetry Problem

Self-attested departure records are necessary but insufficient. Without mechanisms for independent verification, departure records suffer from the "market for lemons" problem identified by Akerlof (1970): high-quality agents cannot credibly distinguish themselves from low-quality agents, leading to market failure.

We recommend that NIST consider standards for:

- Multi-party attestation of departure records
- Staked attestation mechanisms that create economic incentives for honest reporting
- Graduated trust models that weight attestations by source reliability

### 6.4 Align with Existing W3C Standards

The W3C Decentralized Identifier and Verifiable Credential standards provide a mature foundation for agent identity and portable credentials. We recommend that NIST's agent identity framework build on these existing standards rather than creating parallel infrastructure, and that agent departure credentials be included in the scope of verifiable agent credentials.

---

## 7. About the Submitter

**Cellar Door** is an open-source project developing the EXIT protocol specification and reference implementation. The project is in early-stage development (specification drafted, TypeScript reference implementation built, no production deployment).

Cellar Door's work is motivated by the observation that the emerging AI agent ecosystem lacks mechanisms for verifiable agent departure and portable identity. The EXIT protocol is released under the Apache License 2.0 and is intended as a public good—a minimal, composable primitive that any platform or framework can adopt.

The project draws on established work in decentralized identity (W3C DIDs, KERI), verifiable credentials (W3C VC Data Model 2.0), mechanism design, and the political economy of exit rights (Hirschman 1970).

We welcome NIST's engagement with these questions and would be glad to provide additional technical detail, participate in listening sessions, or collaborate on standards development related to agent portability and lifecycle governance.

---

## References

- Akerlof, G. A. (1970). "The Market for 'Lemons': Quality Uncertainty and the Market Mechanism." *Quarterly Journal of Economics*, 84(3), 488–500.
- Hirschman, A. O. (1970). *Exit, Voice, and Loyalty: Responses to Decline in Firms, Organizations, and States.* Harvard University Press.
- W3C. (2022). "Decentralized Identifiers (DIDs) v1.0." W3C Recommendation. https://www.w3.org/TR/did-core/
- W3C. (2024). "Verifiable Credentials Data Model v2.0." W3C Recommendation. https://www.w3.org/TR/vc-data-model-2.0/
- W3C. (2024). "JSON-LD 1.1." W3C Recommendation. https://www.w3.org/TR/json-ld11/
- Smith, S. M. (2021). "Key Event Receipt Infrastructure (KERI)." IETF Internet-Draft. https://datatracker.ietf.org/doc/draft-ssmith-keri/
- NIST. (2026). "NIST Launches AI Agent Standards Initiative." https://www.nist.gov/news-events/news/2026/02/nist-launches-ai-agent-standards-initiative
- EXIT Protocol Specification v1.0-draft. (2026). https://github.com/CellarDoorExits/exit-door [Apache 2.0]

---

*This response is submitted by the Cellar Door project contributors. It does not constitute legal advice and is intended as a technical and policy contribution to the NIST AI Agent Standards Initiative.*
