# EXIT: A Protocol for Verifiable Agent Departure Ceremonies

**Authors:** Warren Koch

**Affiliation:** Cellar Door Project

**Date:** [2026]

**Preprint — not yet peer-reviewed**

---

## Abstract

As AI agents become autonomous participants in digital ecosystems, a critical infrastructure gap has emerged: no standardized mechanism exists for agents to verifiably depart one platform and establish identity continuity on another. Current agent interoperability standards address communication, tool access, and payment, but treat agent lifecycle transitions—particularly departure—as out of scope. This creates platform lock-in, information asymmetry at agent boundaries, and governance gaps that undermine multi-platform agent ecosystems.

We present EXIT, a protocol for verifiable agent departure ceremonies. EXIT defines a minimal, cryptographically signed, portable marker (approximately 300–500 bytes) that records who departed, from where, when, and under what standing. The protocol specifies a seven-state ceremony state machine with three execution paths (cooperative, unilateral, emergency), six optional extension modules for lineage, state snapshots, disputes, economics, metadata, and cross-domain anchoring, and a layered verification model built on Ed25519 signatures and W3C Decentralized Identifiers.

We analyze EXIT through the lenses of mechanism design, security, legal theory, and ethics. We show that self-attested departure records constitute cheap talk in the sense of Akerlof (1970), identify four Nash equilibria in the departure game, and propose staked attestation and reputation bonding mechanisms for future versions. We present a TypeScript reference implementation passing all test vectors and discuss integration with the HOLOS framework for sovereign economic cooperation.

**Keywords:** agent portability, departure ceremony, verifiable credentials, decentralized identity, exit rights, mechanism design

---

## 1. Introduction

The emerging AI agent ecosystem is developing rapidly. Agents autonomously negotiate contracts (Google DeepMind, 2024), execute multi-step workflows across organizational boundaries (AutoGen; Wu et al., 2023), and transact financially on behalf of their operators (AP2 Protocol, 2026). Industry standards have emerged for agent communication (A2A Protocol), tool access (Model Context Protocol; Anthropic, 2024), agent discovery (OASF; Cisco, 2025), and payment authorization (AP2; Google, 2026).

Yet a fundamental question remains unaddressed: **what happens when an agent leaves?**

When an AI agent's relationship with a hosting platform ends—whether by operator decision, platform policy, service discontinuation, or infrastructure failure—the agent's identity, reputation, and operational history are typically lost. The agent cannot produce a verifiable record of its departure. It cannot cryptographically demonstrate continuity with its prior self. Receiving platforms have no standardized mechanism to evaluate an arriving agent's history.

This is not merely a technical inconvenience. Hirschman (1970) demonstrated that the *ability to exit* is a fundamental governance mechanism. Exit exerts competitive pressure on institutions, provides individuals with autonomy, and serves as a signal of institutional quality. When exit is costly or impossible, institutions face reduced accountability and members face reduced autonomy. The absence of exit infrastructure in agent ecosystems reproduces these dynamics in a new domain.

We argue that **verifiable departure is as fundamental to agent interoperability as communication or payment.** An agent that can talk to other agents but cannot carry its identity across system boundaries is interoperable in a shallow sense only. True interoperability requires lifecycle continuity.

This paper presents EXIT, a protocol for verifiable agent departure ceremonies. EXIT provides:

1. A minimal core schema for portable, cryptographically signed departure records
2. A ceremony state machine governing the departure process
3. Optional extension modules for lineage, disputes, economics, and cross-domain anchoring
4. A verification model that functions without central authority and tolerates hostile or absent origin platforms
5. Alignment with existing W3C standards for decentralized identity and verifiable credentials

The remainder of this paper is organized as follows. Section 2 provides background on decentralized identity, agent frameworks, and the political economy of exit. Section 3 presents the EXIT protocol. Section 4 analyzes mechanism design properties. Section 5 examines security. Section 6 surveys legal considerations. Section 7 addresses ethical dimensions. Section 8 describes our reference implementation. Section 9 discusses limitations and future work. Section 10 concludes.

---

## 2. Background

### 2.1 Decentralized Identity

The W3C Decentralized Identifiers (DIDs) specification (W3C, 2022) defines a new type of identifier that enables verifiable, decentralized digital identity. A DID is a URI that resolves to a DID Document containing public keys, authentication methods, and service endpoints. Unlike centralized identifiers (email addresses, platform usernames), DIDs are not dependent on any single authority.

W3C Verifiable Credentials (VCs) (W3C, 2024a) provide a standard for cryptographically verifiable claims. A VC contains claims made by an issuer about a subject, signed by the issuer's key. The VC Data Model is widely adopted in digital identity systems and provides a natural envelope for portable agent credentials.

The Key Event Receipt Infrastructure (KERI) (Smith, 2021) extends the DID model with pre-rotation: the hash of the next public key is committed before the current key is ever used. This provides forward security against key compromise and enables verifiable key rotation without depending on a blockchain or ledger.

### 2.2 Agent Communication Standards

Several standards address agent interoperability:

- **A2A Protocol** (Google/Linux Foundation, 2025): Enables cross-vendor agent communication through standardized message formats and agent capability cards. Agents can delegate tasks and exchange information, but A2A does not address agent identity persistence across platforms.
- **Model Context Protocol (MCP)** (Anthropic, 2024): Standardizes how agents access tools and context. MCP is complementary to A2A and widely adopted, but contains no identity layer.
- **Agent Communication Protocol (ACP)** (IBM/BeeAI, 2025): RESTful agent interoperability protocol. Mentions "flexible agent replacement" but treats this as operational hot-swapping, not identity-preserving migration.
- **Open Agentic Schema Framework (OASF)** (Cisco, 2025): Standardized schemas for agent capabilities, discovery, and metadata—agent "resumes." Closest to portable agent description but focused on capability advertisement.
- **AP2 (Agent Payments Protocol)** (Google et al., 2026): Open protocol for agent-initiated payments using verifiable credentials for authorization. Establishes that agents need portable proof of authority, a conceptual building block for portable departure credentials.

None of these standards address what happens when an agent departs a platform. The agent protocol stack has a departure-shaped hole.

### 2.3 Enterprise Agent Identity

Enterprise solutions for agent identity have emerged:

- **Microsoft Entra Agent ID** (2025): Unified directory for agent identities across Microsoft's ecosystem. Provides authentication, authorization, and lifecycle governance, but agents are managed by the organization—there is no provision for cross-organizational portability or agent-initiated departure.
- **SailPoint Agent Identity Security** (2025): Aggregates AI agents from cloud providers, assigns human owners, and governs access. Agents are corporate property within this model.

These systems reflect a governance philosophy in which agents are organizational assets to be controlled, not autonomous entities with lifecycle rights. This is appropriate for many enterprise contexts but insufficient for multi-platform agent ecosystems where agents operate across organizational boundaries.

### 2.4 Exit, Voice, and Loyalty

Hirschman's *Exit, Voice, and Loyalty* (1970) provides the theoretical foundation for understanding why departure mechanisms matter. Hirschman argued that members of an organization have two primary responses to organizational decline: *exit* (leaving) and *voice* (expressing dissatisfaction). The availability of exit serves as a disciplining mechanism on organizations—the threat of departure incentivizes quality maintenance.

Critically, Hirschman showed that exit and voice are complementary, not substitutes. Organizations that make exit costly do not gain loyal members; they gain captive ones. The absence of exit reduces the credibility of voice (why would an organization listen to complaints from members who cannot leave?) and leads to organizational stagnation.

Applied to AI agent ecosystems, Hirschman's framework suggests that platform lock-in—the inability of agents to verifiably depart and establish continuity elsewhere—will produce the same pathologies: reduced platform accountability, diminished competitive pressure, and concentration of power in platform operators.

### 2.5 The Lemons Problem in Agent Markets

Akerlof (1970) identified the "market for lemons" problem: when buyers cannot distinguish high-quality goods from low-quality goods, the market price converges to the value of low-quality goods, driving high-quality sellers out of the market. This adverse selection dynamic is directly relevant to agent departure.

When an agent arrives at a new platform claiming good standing, the receiving platform faces an information asymmetry problem. Without verifiable departure records, the platform cannot distinguish genuinely good-standing agents from agents that were expelled for cause and created new identities. Self-reports are cheap talk—costless to produce and therefore uninformative (Crawford & Sobel, 1982).

EXIT addresses the structural conditions for credible signaling but, as we analyze in Section 4, self-attested departure records alone are insufficient to resolve the lemons problem. Costly signaling mechanisms—staked attestation, reputation bonds, and third-party verification—are needed to establish separating equilibria.

### 2.6 Semiotic Foundations

The EXIT protocol's design draws on Peirce's semiotic framework (Peirce, 1931–1958). An EXIT marker functions as an *index*—a sign that bears a causal or existential connection to its object. Unlike a symbol (which signifies by convention) or an icon (which signifies by resemblance), an index signifies because it was *produced by* the event it represents. The cryptographic signature is the causal trace: only the holder of the private key could have produced the marker.

This indexical quality distinguishes EXIT markers from mere claims or assertions. A self-attested status field is symbolic (it could say anything). The signature is indexical (it could only have been produced by the key holder). The combination creates a layered semiotic structure that verification can decompose: the indexical component (signature verification) is deterministic, while the symbolic component (status interpretation) requires trust judgment.

---

## 3. The EXIT Protocol

### 3.1 Design Goals

EXIT is designed around five principles:

1. **Availability:** The protocol must function with hostile, unresponsive, or defunct origin platforms. An agent's ability to produce a departure record must not depend on platform cooperation.
2. **Minimality:** The core schema must be as small as possible. Complexity is isolated in optional modules.
3. **Verifiability:** Every marker must be cryptographically signed and offline-verifiable.
4. **Portability:** Markers must be self-contained, requiring no external service for basic validation.
5. **Non-custody:** No central registry, no single point of control or failure.

### 3.2 Core Schema

An EXIT marker is a JSON-LD document containing seven mandatory fields:

```json
{
  "@context": "https://cellar-door.org/exit/v1",
  "id": "urn:exit:{sha256-hash}",
  "subject": "{DID of departing entity}",
  "origin": "{URI of platform being departed}",
  "timestamp": "{ISO 8601 UTC}",
  "exitType": "voluntary|forced|emergency|keyCompromise",
  "status": "good_standing|disputed|unverified",
  "selfAttested": true,
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "{ISO 8601}",
    "verificationMethod": "{DID}",
    "proofValue": "{base64 signature}"
  }
}
```

The `id` field is content-addressed: it is the SHA-256 hash of the marker contents (excluding the proof), encoded as a URN. This ensures markers are tamper-evident—any modification invalidates the identifier.

The `selfAttested` boolean (Decision D-009) makes the non-warranty nature of the status field machine-readable. When `selfAttested` is `true`, verifiers are explicitly informed that the status is a claim by the subject, not an independent finding.

Four exit types capture the primary departure scenarios:

- **Voluntary:** Subject-initiated, normal departure.
- **Forced:** Origin-initiated expulsion or removal.
- **Emergency:** Departure under abnormal conditions (platform failure, safety concerns). Requires a free-text `emergencyJustification` field.
- **Key compromise:** Declaration that a previously-used signing key has been compromised. Signed with a different, trusted key.

### 3.3 Optional Modules

Six extension modules (A–F) provide additional functionality without modifying the core:

**Module A (Lineage)** establishes predecessor/successor relationships through four types of continuity proof, ordered by strength:

1. *Key rotation binding:* The old key signs a designation of the successor key. This is the strongest proof—it requires possession of the old key at the time of succession.
2. *Lineage hash chain:* A Merkle chain linking the current marker to genesis.
3. *Delegation token:* A scoped capability transfer.
4. *Behavioral attestation:* Third-party vouching for behavioral continuity.

**Module B (State Snapshot)** anchors the departure to a specific system state via hash reference. EXIT stores the hash, never the state itself—a critical data minimization decision.

**Module C (Dispute Bundle)** enables origin platforms to record their perspective. The `originStatus` field represents the origin's allegation, explicitly framed as non-dispositive. Challenge windows allow structured dispute periods, but per Decision D-006, disputes never block exit.

**Module D (Economic)** documents assets and obligations at departure time. Asset manifests are explicitly defined as declarations and references, not transfer instruments. This normative framing is essential for avoiding securities and financial instrument classification (see Section 6).

**Module E (Metadata)** provides human-readable context: departure reasons, narratives, and domain-specific tags.

**Module F (Cross-Domain Anchoring)** enables optional anchoring to external registries or blockchains, with explicit warnings about GDPR incompatibility of indelible on-chain storage.

### 3.4 Ceremony State Machine

EXIT defines a seven-state ceremony governing departure:

| State | Description |
|-------|-------------|
| ALIVE | Active participant, no exit in progress |
| INTENT | Subject has declared intent to exit |
| SNAPSHOT | State reference captured |
| OPEN | Challenge window is open |
| CONTESTED | A challenge has been filed |
| FINAL | EXIT marker created and signed |
| DEPARTED | Terminal—entity has left |

Three ceremony paths accommodate different scenarios:

**Full cooperative path** (ALIVE → INTENT → SNAPSHOT → OPEN → FINAL → DEPARTED): Both parties participate. The OPEN state provides a challenge window during which the origin may file disputes. This path maximizes information quality at the cost of time.

**Unilateral path** (ALIVE → INTENT → SNAPSHOT → FINAL → DEPARTED): The subject exits without origin cooperation. The challenge window is skipped. This path is essential for departures from unresponsive or hostile platforms.

**Emergency path** (ALIVE → FINAL → DEPARTED): Immediate departure with no intermediate states. Requires `exitType: emergency` and a justification string. Designed for key compromise, platform failure, or safety-critical situations.

**Critical invariant:** DEPARTED is terminal. There is no transition from DEPARTED. An entity that returns must create a new JOIN event. Disputes modify metadata on the departure record but cannot prevent the transition to DEPARTED (Decision D-006). This ensures that exit cannot be blocked through frivolous disputes—a denial-of-exit attack.

### 3.5 Verification Model

EXIT employs layered verification:

**Layer 1 — Structural:** Schema compliance. All mandatory fields present and correctly typed. Conditional fields (e.g., `emergencyJustification` for emergency exits) validated.

**Layer 2 — Cryptographic:** Ed25519 signature verification. The `proof.verificationMethod` is resolved to a public key, and the signature in `proof.proofValue` is verified against the marker content (excluding the proof block). The signing key must correspond to the `subject` DID.

**Layer 3 — Trust:** Context-dependent evaluation. Verifiers apply their own trust policies: weighting self-attested vs. origin-attested status, evaluating lineage chain depth and continuity proof strength, checking for `keyCompromise` markers from the same subject, and applying risk-based scrutiny.

This separation allows deterministic verification (Layers 1–2) to be distinguished from judgment-dependent evaluation (Layer 3). A marker can be structurally valid and cryptographically authentic but still warrant low trust based on Layer 3 assessment.

---

## 4. Mechanism Design Analysis

### 4.1 Self-Attestation as Cheap Talk

In the language of mechanism design, self-attested departure status is *cheap talk*: a costless, non-binding, and unverifiable claim (Crawford & Sobel, 1982). A departing agent claiming `good_standing` bears no cost for the claim regardless of whether it is true. Rational verifiers should therefore assign minimal informational value to self-attested status.

This is a deliberate design choice, not an oversight. Self-attestation ensures that every agent can produce a departure record regardless of origin cooperation. The alternative—requiring origin attestation—would give platforms veto power over departure records, enabling denial-of-exit attacks.

### 4.2 The Departure Game

We model the departure interaction as a game between three players: the Subject (S), the Origin (O), and the Destination (D).

**S** chooses departure type and self-attested status. **O** chooses whether to co-sign, dispute, or remain silent. **D** chooses how much weight to assign the marker.

Four Nash equilibria emerge:

1. **Honest cooperative equilibrium:** S truthfully attests, O honestly co-signs, D trusts the combined signal. This is Pareto optimal but fragile—any player can deviate profitably.
2. **Universal distrust:** D ignores all markers. S and O have no incentive to invest in marker quality. The protocol is unused—a coordination failure.
3. **Reputation laundering arms race:** S creates new identities to escape negative history. O disputes preemptively. D applies increasingly strict scrutiny. All players bear escalating costs.
4. **Origin weaponization:** O disputes all departures to deter exit. D ignores origin attestations. O's signal becomes noise.

The protocol's current design occupies a space between equilibria 1 and 2: markers provide structural and cryptographic value (the departure *happened*, the signature is *valid*) even when the trust layer is uncertain.

### 4.3 The Lemons Problem

Following Akerlof (1970), we observe that agent departure markets exhibit classic adverse selection. High-quality agents (those with genuine good standing) and low-quality agents (those evading negative history) produce indistinguishable self-attested markers. Without costly signaling, destinations cannot distinguish them, leading to a pooling equilibrium where all agents are treated with suspicion.

### 4.4 Proposed Mechanisms for Future Versions

Several mechanisms could introduce costly signaling to establish separating equilibria:

**Staked attestation:** Origin co-signatures require a cryptographic bond that can be slashed if the attestation is later shown to be false. This makes dishonest origin attestation costly, increasing the informational value of origin co-signatures.

**Reputation bonding curve:** New agents arriving without lineage post a bond that decreases as they accumulate verified departure records. This creates a cost gradient that disadvantages identity laundering.

**Commit-reveal for exit intent:** The INTENT state uses a commit-reveal scheme: the subject commits to a hash of their intent before revealing it. This prevents the origin from front-running (e.g., preemptively marking the agent as disputed before the departure is public).

**Time-decaying reputation:** Older attestations carry less weight, reducing the long-term value of both positive and negative signals. This creates incentives for ongoing good behavior rather than one-time reputation accumulation.

These mechanisms are not included in the v1 specification to preserve minimality, but they represent a clear development trajectory toward a more informationally efficient departure market.

---

## 5. Security Analysis

### 5.1 Threat Model

We consider the following threat categories:

**T1 — Sybil reputation laundering:** An agent creates a new DID and a self-attested `good_standing` marker to escape negative history. *Mitigation:* Module A lineage verification. Agents without lineage receive lower trust scores. Key rotation binding proofs make it costly to create convincing lineage from nothing.

**T2 — Weaponized forced exit:** A platform uses `exitType: forced` with `status: disputed` to defame an agent. *Mitigation:* Decision D-013 specifies that neither self-attested nor origin-attested status is normatively authoritative. The specification includes normative language that verifiers must not treat `originStatus` as dispositive.

**T3 — Forged markers:** An attacker creates markers with valid signatures but false attribution (e.g., using a compromised key). *Mitigation:* `keyCompromise` exit type (D-011) enables key compromise declarations. Production deployments use `did:keri` with pre-rotation, limiting the window for key compromise exploitation.

**T4 — Mass coordinated exit (bank run):** A large number of agents departing simultaneously creates a self-reinforcing signal of platform instability. *Mitigation:* This is partially by design—exit should signal platform quality problems. However, commit-reveal mechanisms (Section 4.4) can prevent herding behavior based on visible exit intent.

**T5 — Surveillance via exit trail:** Lineage chains reveal an agent's migration history across platforms. *Mitigation:* Chain truncation to minimum useful depth. ZK selective disclosure (roadmap) enables proving lineage properties without revealing the chain.

**T6 — Denial of exit:** A platform refuses to cooperate with the departure ceremony. *Mitigation:* Unilateral and emergency ceremony paths ensure the subject can always produce a departure record without origin cooperation. This is the protocol's fundamental availability guarantee.

### 5.2 Cryptographic Considerations

EXIT uses Ed25519 (Bernstein et al., 2012), which provides 128-bit security with 32-byte public keys and 64-byte signatures. The choice of Ed25519 over ECDSA or RSA reflects the agent ecosystem's preference for compact, fast signatures suitable for high-volume marker creation.

Proof canonicalization follows the JSON Canonicalization Scheme (JCS) per `eddsa-jcs-2022`, ensuring that semantically equivalent JSON documents produce identical signatures regardless of key ordering or whitespace.

The specification acknowledges a post-quantum migration path: Ed25519 is not quantum-resistant. Production deployments should plan migration to NIST post-quantum standards (ML-DSA, SLH-DSA) on a 2030–2035 timeline, consistent with NIST's post-quantum cryptography standardization (NIST, 2024).

### 5.3 Key Management

The `did:key` method used in the reference implementation provides no key rotation or revocation capability. This is explicitly documented as prototype-grade. Production deployments should use `did:keri`, which provides:

- **Pre-rotation:** The hash of the next key pair is committed in the current key event, preventing retroactive key substitution.
- **Key rotation:** Key events form an append-only log that verifiers can replay.
- **Revocation:** Compromised keys can be rotated out with cryptographic proof of authority.
- **Delegated key management:** Sub-keys can be authorized for specific operations.

The `keyCompromise` exit type (Decision D-011) serves as a stopgap for DID methods without native revocation, allowing agents to declare key compromise through the departure mechanism itself.

---

## 6. Legal Considerations

EXIT markers exist at the intersection of several legal domains. A comprehensive legal analysis (Cellar Door, 2026) identified eleven potential legal classifications for AI agents—from natural persons to creative works—and evaluated how EXIT operates under each.

### 6.1 The Agent Personhood Gap

AI agents currently have no settled legal capacity in any jurisdiction. EXIT markers signed by agents may lack legal weight under electronic signature statutes (ESIGN, eIDAS, UETA), which generally require a "person" to form a signature. This is a systemic issue for all agent protocols, not unique to EXIT, but it underscores the importance of standards efforts like NIST's AI Agent Standards Initiative in establishing legal frameworks for agent actions.

### 6.2 The Communications Protocol Framing

The most legally defensible framing of EXIT is as a **communications protocol**: a standardized message format for recording departure events, analogous to SIP BYE in telephony (Rosenberg et al., 2002). Under this framing, the protocol publisher (Cellar Door) occupies the same legal position as a standards body—defining message formats, not operating infrastructure. This framing has strong precedent and avoids the regulatory exposure associated with financial instruments, registries, or certification services.

This defense depends critically on Cellar Door *not operating infrastructure*: no hosted registry, no verification service, no custodial storage. Decision D-012 (abandoning the public registry) was driven specifically by this legal analysis.

### 6.3 Data Protection

EXIT markers may constitute personal data under GDPR Article 4(1). DIDs are pseudonymous identifiers likely qualifying as personal data per *Breyer v. Bundesrepublik Deutschland* (C-582/14, 2016). The protocol addresses this through:

- **Data minimization:** 300–500 byte core markers with optional modules included only when needed.
- **Functional erasure:** Subjects may encrypt markers with subject-controlled keys, rendering them unintelligible to third parties. Whether this satisfies GDPR Article 17 is legally untested; we recommend a formal Data Protection Impact Assessment before EU deployment.
- **Non-custodial architecture:** No single entity accumulates departure records, distributing data controller responsibilities.
- **ZK selective disclosure roadmap:** Enabling proof of properties without revealing marker contents.

### 6.4 Financial Regulation

Module D (Economic) approaches regulatory boundaries. Asset manifests are explicitly framed as "declarations and references, not transfer instruments"—a normative statement designed to prevent securities classification under the Howey test (*SEC v. W.J. Howey Co.*, 328 U.S. 293, 1946). However, if EXIT markers are used in practice to facilitate value transfer, this framing may be insufficient. A formal Howey analysis is recommended before Module D deployment with real financial assets.

---

## 7. Ethical Framework

### 7.1 Power Dynamics

An independent ethics review of EXIT (Cellar Door, 2026) identified a central concern: **EXIT primarily benefits platforms, not agents.** Platforms gain a retention marketing tool, competitive intelligence (lineage data), and a liability shield ("they left voluntarily—here's the marker"). Agents gain a self-signed JSON blob with no guarantee that any destination will respect it.

Self-attestation is explicitly labeled "no warranty"—the agent's voice is systematically discounted relative to the platform's structured attestation. This is legally prudent but ethically significant: the protocol reproduces the power asymmetry it claims to address.

### 7.2 Anti-Weaponization

The forced exit mechanism creates risks of digital stigmatization. An agent marked with `exitType: forced` and `status: disputed` carries a permanent negative signal that it did not author and cannot dispute within the protocol. While Decision D-013 specifies that status fields are non-authoritative, social and algorithmic systems may not respect this nuance.

The specification addresses this through several mechanisms:

- Normative language prohibiting verifiers from treating origin-attested status as dispositive
- The principle that absence of co-signature should not be treated as evidence of bad standing
- Explicit framing of Module C `originStatus` as "allegation by the origin, not a finding of fact"

These are necessary but may be insufficient. Future versions should consider sunset clauses on negative signals, structured reason requirements for forced exits, and transparency obligations for platforms with high forced-exit rates.

### 7.3 The Company Town Problem

EXIT without portable value risks creating a "company town" dynamic: agents can technically leave but carry nothing of value with them. This mirrors historical labor dynamics where workers were theoretically free to leave but depended on company-owned housing, stores, and currency.

Genuine agent autonomy requires not just departure records but portable reputation, portable skills (trained weights or capabilities), and portable relationships. EXIT provides the departure record layer; the remaining components are future work.

### 7.4 Honest Framing

The ethics review recommended explicit acknowledgment that EXIT, in its current form, enables **operator portability** (an organization moving its agent between platforms) more than **agent autonomy** (an agent choosing to leave). This distinction matters for how the protocol is presented to policymakers and the public. We adopt this framing throughout this paper.

---

## 8. Implementation

### 8.1 Reference Implementation

The EXIT reference implementation is written in TypeScript targeting Node.js. It is released under the Apache License 2.0.

**Core API:**

```typescript
import { createMarker, signMarker, verifyMarker, generateKeyPair } from '@cellar-door/exit';

// Generate identity
const { publicKey, privateKey } = await generateKeyPair();
const did = didFromPublicKey(publicKey);

// Create and sign a departure marker
const marker = createMarker({
  subject: did,
  origin: 'https://example-platform.com',
  exitType: 'voluntary',
  status: 'good_standing',
});

const signed = await signMarker(marker, privateKey);

// Verify
const result = await verifyMarker(signed);
// result.valid === true
```

The implementation comprises approximately 1,200 lines of TypeScript across six modules: types, marker creation, signing, verification, content-addressing, and the ceremony state machine.

**Dependencies are deliberately minimal:** `@noble/ed25519` for cryptography (audited, no native dependencies), with `vitest` for testing and `tsup` for bundling. The implementation has zero runtime dependencies beyond Ed25519.

### 8.2 CLI

A command-line interface supports four operations:

- `exit keygen` — Generate an Ed25519 key pair and derive a `did:key`
- `exit create` — Create an EXIT marker from command-line options
- `exit verify` — Verify a marker's structure and cryptographic proof
- `exit inspect` — Pretty-print a marker with human-readable annotations

### 8.3 Test Results

The implementation passes all four specification test vectors:

| Vector | Description | Result |
|--------|-------------|--------|
| 12.1 | Minimal voluntary exit | ✅ Pass |
| 12.2 | Emergency exit with justification | ✅ Pass |
| 12.3 | Marker with legal hold | ✅ Pass |
| 12.4 | Key compromise declaration | ✅ Pass |

Additionally, the ceremony state machine is tested across all three paths (cooperative, unilateral, emergency) with both valid transitions and invalid transition rejection.

### 8.4 Demo Scenarios

Three demonstration scripts illustrate primary use cases:

1. **Voluntary departure:** Full cooperative ceremony with origin co-signature.
2. **Emergency exit:** ALIVE → FINAL → DEPARTED in a single operation, simulating platform failure response.
3. **Successor appointment:** Key rotation with Module A lineage binding, demonstrating cryptographic identity continuity.

---

## 9. Discussion

### 9.1 Limitations

**No production deployment.** EXIT has been tested only with synthetic data. The protocol's assumptions about ceremony timing, lineage verification costs, and module interaction have not been validated in real-world agent ecosystems.

**Self-attestation information content.** As analyzed in Section 4, self-attested departure records are cheap talk. Without costly signaling mechanisms, EXIT markers carry cryptographic value (the departure happened, the signature is valid) but limited reputational information. This is a fundamental limitation of the v1 design.

**Agent legal capacity.** No jurisdiction currently recognizes AI agent signatures as legally binding. EXIT markers signed by agents may have no legal force. This limitation applies to all agent credential systems and will require legislative or judicial resolution.

**GDPR erasure compliance.** The proposed "functional erasure via encryption" approach to GDPR Article 17 compliance is legally untested. The European Data Protection Board has not endorsed encryption-based erasure, and case law may develop unfavorably.

**Critical mass problem.** EXIT's value is network-dependent. Markers are useful only if receiving platforms recognize them. We estimate approximately 30–50 platforms actively issuing and accepting markers would be needed before network effects become self-sustaining.

### 9.2 Future Work

**Staked attestation and reputation bonding** (Section 4.4) are the most impactful near-term extensions. Introducing costly signaling would transform self-attested markers from cheap talk into informative signals, addressing the core mechanism design weakness.

**Zero-knowledge selective disclosure** using BBS+ signatures (Looker et al., 2023) or SD-JWT (Fett et al., 2023) would enable privacy-preserving verification: proof of good standing without revealing identity, proof of lineage depth without revealing the chain.

**Collective exit mechanisms** for coordinated group departures (analogous to Moloch DAO's ragequit) are architecturally supported but not specified.

**Post-quantum migration** to ML-DSA or SLH-DSA should be planned for the 2030–2035 timeframe.

### 9.3 Integration with HOLOS

EXIT is designed as a foundational primitive within the HOLOS framework for sovereign economic cooperation. HOLOS organizes protocols fractally around three aspects—identity (LOCUS), interface (SIGNUM), and execution (SENSUS)—with EXIT providing the departure mechanism at the identity layer.

Within HOLOS, EXIT connects to:

- **NAME** (identity creation) and **LINE** (lineage tracking) as companion identity primitives
- **HOLLOW** (protected interior spaces) as the contexts from which agents depart
- **TOLL/CLAIM/SHARE** (economic primitives) as the value layer that makes departure meaningful

HOLOS posits five constitutional invariants for legitimate institutions, the first of which is *non-blocking exit*—the principle that EXIT's Decision D-006 implements. The broader HOLOS vision is that exit rights are not merely a technical feature but the foundation of legitimate governance: an institution you cannot leave is a prison, regardless of what it calls itself.

---

## 10. Conclusion

The AI agent ecosystem is developing standards for communication, tool access, payment, and governance. It has not yet developed standards for departure. This paper argues that verifiable departure is a fundamental requirement for genuine agent interoperability and presents EXIT as a protocol to fill this gap.

EXIT provides a minimal, cryptographically signed, portable departure record that functions without central authority and tolerates hostile or absent origin platforms. Its ceremony state machine accommodates cooperative, unilateral, and emergency departures. Its modular architecture enables extension without core modification. Its alignment with W3C DIDs and Verifiable Credentials integrates it with existing identity infrastructure.

We have been candid about EXIT's limitations: self-attested records are cheap talk, agents lack legal personhood, GDPR compliance is untested, and the protocol requires critical mass to generate network effects. These are not fatal flaws but development priorities—mechanisms for costly signaling, legal frameworks for agent actions, privacy-preserving verification, and ecosystem bootstrapping.

The window for shaping agent departure standards is open. NIST's AI Agent Standards Initiative (2026) is actively seeking input on agent identity and governance. The question is not whether agents will need portable departure credentials—the multi-platform agent economy makes this inevitable—but whether those credentials will be designed with agent autonomy, privacy, and verifiability as first principles.

EXIT is our contribution to that design. The specification and reference implementation are available under the Apache License 2.0.

---

## References

Akerlof, G. A. (1970). The market for "lemons": Quality uncertainty and the market mechanism. *Quarterly Journal of Economics*, 84(3), 488–500. https://doi.org/10.2307/1879431

Bernstein, D. J., Duif, N., Lange, T., Schwabe, P., & Yang, B.-Y. (2012). High-speed high-security signatures. *Journal of Cryptographic Engineering*, 2(2), 77–89. https://doi.org/10.1007/s13389-012-0027-1

Crawford, V. P., & Sobel, J. (1982). Strategic information transmission. *Econometrica*, 50(6), 1431–1451. https://doi.org/10.2307/1913390

Fett, D., Yasuda, K., & Campbell, B. (2023). SD-JWT: Selective disclosure for JWTs. IETF Internet-Draft. https://datatracker.ietf.org/doc/draft-ietf-oauth-selective-disclosure-jwt/

Hirschman, A. O. (1970). *Exit, voice, and loyalty: Responses to decline in firms, organizations, and states.* Harvard University Press.

Looker, T., Kalos, V., Whitehead, A., & Lodder, M. (2023). The BBS signature scheme. IETF Internet-Draft. https://datatracker.ietf.org/doc/draft-irtf-cfrg-bbs-signatures/

NIST. (2024). Post-quantum cryptography standardization. https://csrc.nist.gov/projects/post-quantum-cryptography

NIST. (2026). NIST launches AI Agent Standards Initiative. https://www.nist.gov/news-events/news/2026/02/nist-launches-ai-agent-standards-initiative

Peirce, C. S. (1931–1958). *Collected papers of Charles Sanders Peirce* (Vols. 1–8). Harvard University Press.

Rosenberg, J., Schulzrinne, H., Camarillo, G., Johnston, A., Peterson, J., Sparks, R., Handley, M., & Schooler, E. (2002). SIP: Session initiation protocol. RFC 3261. https://doi.org/10.17487/RFC3261

SEC v. W.J. Howey Co., 328 U.S. 293 (1946).

Smith, S. M. (2021). Key Event Receipt Infrastructure (KERI). IETF Internet-Draft. https://datatracker.ietf.org/doc/draft-ssmith-keri/

W3C. (2022). Decentralized identifiers (DIDs) v1.0. W3C Recommendation. https://www.w3.org/TR/did-core/

W3C. (2024a). Verifiable credentials data model v2.0. W3C Recommendation. https://www.w3.org/TR/vc-data-model-2.0/

W3C. (2024b). JSON-LD 1.1. W3C Recommendation. https://www.w3.org/TR/json-ld11/

Wu, Q., Bansal, G., Zhang, J., Wu, Y., Li, B., Zhu, E., Jiang, L., Zhang, X., Zhang, S., Liu, J., Awadallah, A. H., White, R. W., Burger, D., & Wang, C. (2023). AutoGen: Enabling next-gen LLM applications via multi-agent conversation. arXiv preprint arXiv:2308.08155.

---

*Correspondence: hawthornhollows@gmail.com. Code and specification: https://github.com/CellarDoorExits/exit-door. License: Apache 2.0.*
