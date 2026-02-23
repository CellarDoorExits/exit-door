# Cellar Door EXIT Protocol — Legal Red Team Report

> **📊 Risk Scale Reference:** This document uses letter grades (A through D) for legal quality assessment. See [risk-scale-mapping.md](risk-scale-mapping.md) for how this maps to scales used in other analysis documents.

**Prepared by:** [Redacted], Technology & Digital Assets Practice
**Date:** 2026-02-19
**Billing Rate:** $800/hr
**Classification:** Attorney-Client Privileged — Draft

---

## Executive Summary

You've built a beautifully engineered protocol for a problem the legal system hasn't caught up to yet. That's both the opportunity and the trap. EXIT creates formal, cryptographically signed records of departure — which means you're manufacturing *evidence* as a product feature. Every marker is a potential exhibit in litigation that doesn't exist yet under legal frameworks that haven't been written.

I've identified **4 critical**, **7 high**, **9 medium**, and **6 low** severity issues. Several could be existential.

---

## 1. Liability Landmines

### 1.1 The Evidence-Creation Problem
**Severity: CRITICAL**

EXIT markers don't just *record* departures — they *formalize* them. Without EXIT, an agent leaving a platform is an ambiguous event with no paper trail. With EXIT, you've created a signed, timestamped, status-bearing legal artifact.

**The nightmare:** An agent exits Platform A with `status: good_standing`, arrives at Platform B, and causes catastrophic harm. Platform B's lawyer subpoenas the EXIT marker. Platform A attested (or failed to contest) "good standing." Now Platform A has potential negligent misrepresentation liability that **would not have existed** if the agent had just... left.

You've turned a non-event into a quasi-certification.

**Mitigation:** The multi-source status design (D-003) helps — self-attested vs. origin-attested creates ambiguity. But ambiguity is a *litigation feature*, not a defense. Add explicit disclaimers in the JSON-LD context that `good_standing` is NOT a certification, warranty, or recommendation. Model this after how credit ratings disclaim liability. Even then, a jury might not care.

### 1.2 Downstream Harm & Duty of Care
**Severity: HIGH**

If EXIT becomes the standard for agent portability, platforms that accept agents based on EXIT markers may argue they reasonably relied on the protocol's integrity. If the protocol has a bug — say, signatures that can be forged, or status that can be trivially gamed — the protocol developers (you) could face product liability claims.

Under *Restatement (Third) of Torts: Products Liability*, information products have been held to a negligence standard. A cryptographic verification library with a signing bug that leads to reliance injuries is plausible tort territory. See *Brocklesby v. United States* (767 F.2d 1288) for information product liability.

**Mitigation:** MIT license disclaims warranties, but warranty disclaimers don't bar tort claims in most jurisdictions. You need: (1) professional liability insurance, (2) prominent disclaimers that EXIT markers are self-attested and verifiers assume all risk, (3) a formal security audit before any production use.

### 1.3 GDPR / Privacy
**Severity: HIGH**

EXIT markers contain:
- **DIDs** — potentially personally identifiable under GDPR's broad "personal data" definition (Art. 4(1)). Even pseudonymous identifiers are personal data per *Breyer v. Bundesrepublik Deutschland* (C-582/14).
- **Timestamps** — behavioral data.
- **Status** — reputational data, potentially "special category" if it reveals political opinions (left a political DAO) or union membership (left a worker cooperative).
- **Module E narratives** — free-text reasons for departure. This is unstructured personal data.
- **Module D asset manifests** — financial data.

GDPR Art. 17 (right to erasure) is **fundamentally incompatible** with an immutable, offline-verifiable, content-addressed marker system. If a marker's ID is a SHA-256 hash of its contents, you literally cannot modify it without invalidating it. "DEPARTED is terminal — no undo" is a feature that is also a GDPR violation.

**The cross-chain anchoring in Module F makes this worse.** On-chain data is indelible.

**Severity escalation if EXIT markers are ever stored on a public blockchain or registry: CRITICAL.**

**Mitigation:** (1) Conduct a Data Protection Impact Assessment (DPIA) under Art. 35 before any EU deployment. (2) Design marker encryption such that the subject holds the decryption key and can render the marker unintelligible. (3) Consider ZK selective disclosure (already noted as future work — accelerate this). (4) The optional public registry mentioned in Phase 4 should be abandoned or radically redesigned.

### 1.4 Government Subpoenas & Discovery
**Severity: HIGH**

EXIT markers are designed to be durable, portable, and verifiable. That makes them excellent evidence. They will be subpoenaed. Questions:

- **Who is the custodian?** The protocol is non-custodial by design, but someone holds the markers. If that's the agent, the agent may not have standing to resist a subpoena. If that's a registry, the registry operator is a custodian.
- **Can you comply with a preservation order?** If markers are distributed and you don't control storage, you may be unable to comply, which is contempt.
- **Cross-border:** A US CLOUD Act request for markers held in the EU triggers GDPR Art. 48 blocking statute issues. A Chinese cybersecurity authority request creates even worse conflicts.

**Mitigation:** (1) Don't operate a registry. Seriously. (2) If you must, operate it in a jurisdiction with strong data protection (Switzerland, Iceland). (3) Design the protocol so that no single entity is a necessary custodian.

---

## 2. IP & Open Source Risks

### 2.1 MIT License Gaps
**Severity: MEDIUM**

MIT license covers copyright but says nothing about patents. If anyone holds a patent on:
- Portable identity attestation schemes
- Cryptographic departure certificates
- Agent reputation portability systems
- DID-based ceremony state machines

...MIT provides zero patent protection. Compare to Apache 2.0, which includes an explicit patent grant (§3) and patent retaliation clause.

IBM, Microsoft, and others hold broad patents in identity and credential systems. The W3C VC Data Model work has some patent commitments via W3C Patent Policy, but EXIT's standalone JSON-LD mode sits *outside* that umbrella.

**Mitigation:** Switch to Apache 2.0. The ecosystem cost is near-zero (Apache 2.0 is compatible with virtually everything MIT is compatible with). The patent protection is material.

### 2.2 Marker Ownership
**Severity: MEDIUM**

Who owns an EXIT marker?

- The **subject** created and signed it → copyright in the expression?
- The **protocol** defines the schema → no copyright in facts/formats (*Feist v. Rural*, 499 U.S. 340)
- The **platform** may have contributed origin attestation data → joint work?

This matters when someone wants to delete, modify, or commercially exploit markers. If a company builds a "reputation aggregation" service using EXIT markers, can subjects demand removal? Can the protocol foundation demand licensing?

**Mitigation:** Add a clear IP clause to the specification: markers are factual records, not copyrightable works. Subjects retain rights to any Module E narrative content. The schema itself is public domain or CC0.

### 2.3 Trademark
**Severity: LOW**

"Cellar Door" is a famous linguistic reference (Tolkien, *Donnie Darko*) — registrability is uncertain. "EXIT" is generic/descriptive for a departure protocol — likely unregistrable under *Abercrombie* classification. You'd have a hard time getting past the USPTO examiner.

More importantly: if you *don't* register, someone else might. Defensive registration is cheap insurance.

**Mitigation:** File an intent-to-use trademark application for "Cellar Door" (stylized) in Class 9 (software) and Class 42 (SaaS). Don't bother with "EXIT" alone. Budget: ~$2,500 total.

---

## 3. Regulatory Exposure

### 3.1 Financial Instrument Classification
**Severity: CRITICAL**

Module D (Economic) includes **asset manifests** — lists of assets with types, amounts, and destinations. Module types include `tokens`, `compute_credits`, and `reputation_score`. The reputation module includes numerical `metrics`.

Under the **Howey test** (*SEC v. W.J. Howey Co.*, 328 U.S. 293), an "investment contract" exists when there is (1) an investment of money, (2) in a common enterprise, (3) with an expectation of profits, (4) from the efforts of others.

If reputation scores or EXIT status become tradeable — and the project plan explicitly contemplates a reputation ecosystem — you are dangerously close to creating an unregistered security. The SEC has been aggressive here: see *SEC v. LBRY* (2022), *SEC v. Ripple* (2023).

Even if you don't intend tradeability, you can't control what downstream systems do. If someone builds a "reputation marketplace" on EXIT markers, the SEC may look upstream at the protocol.

**This also triggers MiCA (EU Markets in Crypto-Assets Regulation)** if any EXIT markers reference crypto tokens or are themselves tokenized.

**Mitigation:** (1) Module D should carry an explicit "this is a manifest, not a transfer instrument" disclaimer. (2) Asset type `reputation_score` should be removed or renamed to something less tradeable-sounding. (3) The spec should explicitly prohibit using EXIT markers as bearer instruments. (4) Get a formal Howey analysis from securities counsel before Module D goes live. Budget: $15,000-30,000 but worth it.

### 3.2 KYC/AML
**Severity: HIGH**

Portable agent identity that moves across platforms is, functionally, a **pseudonymous identity system**. Under:
- **Bank Secrecy Act / FinCEN** — if EXIT facilitates value transfer (Module D), you may be a "money services business"
- **EU 6th Anti-Money Laundering Directive (6AMLD)** — "enabling" anonymous transactions has criminal liability
- **FATF Travel Rule** — transfers over $1,000 require originator/beneficiary identification

An agent exits Platform A with an asset manifest showing 10,000 tokens, arrives at Platform B with the same manifest — that's a portable record of value transfer with no KYC checkpoint.

**Mitigation:** (1) Module D should be a *reference* to assets, not an *instrument* for transferring them. Clarify that EXIT markers don't effectuate transfers — they document them. (2) Consider whether Module D should require the origin platform's co-signature to be valid, which adds a compliance checkpoint. (3) Engage FinCEN informally before any financial use cases.

### 3.3 Cross-Jurisdiction
**Severity: HIGH**

| Jurisdiction | Problem |
|---|---|
| **US** | SEC (securities), FinCEN (money transmission), FTC (consumer protection), state AG actions |
| **EU** | GDPR (privacy), MiCA (crypto), AI Act (if agents are "AI systems," EXIT may be part of a "high-risk AI system" requiring conformity assessment under Art. 6) |
| **China** | Cybersecurity Law Art. 37 (data localization), PIPL (personal information), agent AI governance rules (2025 draft) — EXIT markers containing Chinese citizen/entity data may not leave China |
| **UK** | Post-Brexit GDPR equivalent + FCA crypto regulation |

The **EU AI Act** is the sleeper here. If EXIT is used by AI agents classified as "high-risk AI systems" (e.g., agents in employment, credit scoring, law enforcement), the EXIT protocol may itself become part of the regulated system and subject to conformity assessment requirements.

**Mitigation:** Jurisdiction-specific legal review before any deployment outside the US. Seriously — this isn't a "we'll deal with it later" issue.

---

## 4. Adversarial Scenarios

### 4.1 Reputation Laundering
**Severity: HIGH**

Agent gets banned from Platform A (`forced` exit, `disputed` status). Agent creates a *new* DID, generates a *new* EXIT marker from some cooperative or fake platform with `voluntary` / `good_standing`. Arrives at Platform B clean.

The protocol has **zero defense** against this. DIDs are free. `did:key` can be generated in milliseconds. There's no identity binding to prevent Sybil exits.

**Mitigation:** This is fundamentally a DID problem, not an EXIT problem. But EXIT amplifies it by giving the clean identity a formal credential. Lineage chains (Module A) help if platforms require them, but the emergency path allows exit with zero lineage. Consider requiring a minimum endorsement threshold for `good_standing` to be meaningful.

### 4.2 Weaponized Forced Exit
**Severity: HIGH**

Platform creates a `forced` / `disputed` EXIT marker for a subject as retaliation. Since the subject's core `status` is self-attested, the subject can claim `good_standing`. But Module C allows `originStatus: disputed`.

The problem: downstream systems that trust origin attestations will effectively let the platform blackball the agent across the ecosystem. This is **defamation by protocol** — and the platform may have sovereign immunity (if governmental) or Section 230 protection (if a private platform moderating content).

**Mitigation:** (1) Dispute resolution mechanism is critical — the deferred decisions on arbiters need to be prioritized. (2) Consider a "right of reply" field where subjects can attach a signed counter-narrative to origin status claims. (3) The spec should explicitly state that `originStatus` is an allegation, not a finding.

### 4.3 Forged Markers
**Severity: MEDIUM**

Ed25519 signatures are strong, but the verification depends on resolving `did:key` to a public key. If an attacker generates a keypair, creates a marker with *your* agent's name/metadata but *their* DID, the marker is cryptographically valid but attributes false information.

The marker's `subject` field is just a DID string — there's no reverse lookup to confirm the DID belongs to the entity claiming that identity.

**Mitigation:** This is partially addressed by the VC wrapper (issuer = subject = signer), but the standalone JSON-LD format has no issuer field. The spec should clarify that marker validity requires the verifier to independently confirm the subject-DID binding through an out-of-band channel.

### 4.4 Mass Coordinated Exit (Bank Run)
**Severity: MEDIUM**

If EXIT becomes standard for DAOs, a coordinated mass exit could be used as an economic attack — the equivalent of a bank run. 1,000 agents simultaneously exit with asset manifests, each claiming their share.

Moloch DAO's ragequit mechanism handles this by processing claims pro-rata from the actual treasury. EXIT's Module D just *lists* assets — it doesn't interact with actual treasuries. But the *perception* of mass exit (1,000 `good_standing` departures in an hour) could trigger panic in downstream systems.

**Mitigation:** Module D should explicitly disclaim that asset manifests are declarations, not entitlements. The spec should discuss rate-limiting and economic attack vectors in a security considerations section.

### 4.5 Surveillance via EXIT Trail
**Severity: HIGH**

EXIT markers create a chain: agent exits A → arrives at B → exits B → arrives at C. Module A (lineage) makes this explicit with predecessor/successor chains. This is a **movement tracking system for agents**, accessible to anyone who can collect the markers.

For human-adjacent agents (personal assistants, therapy bots, etc.), this reveals user behavior patterns. For autonomous agents, this reveals strategic information.

Nation-state actors would *love* this data.

**Mitigation:** (1) ZK selective disclosure is essential, not a nice-to-have. (2) Consider making lineage chains opt-in and encrypted. (3) The spec should include a privacy threat model. (4) Consider onion-routing-style techniques where markers don't reveal the full chain to any single verifier.

---

## 5. Technical-Legal Gaps

### 5.1 "Contests Don't Block Exit" vs. Court Orders
**Severity: CRITICAL**

D-006 states disputes never block exit. This is philosophically sound and technically elegant.

It is also **potentially illegal.**

A court can issue a **temporary restraining order (TRO)** or **preliminary injunction** preventing departure. In corporate law, courts regularly issue orders preventing asset dissipation (*Mareva injunctions* in UK, *asset freezing orders* in US). In employment, non-compete injunctions prevent departure.

If an agent is subject to a court order preventing departure, and EXIT allows departure anyway because "contests don't block exit," the protocol facilitates **contempt of court.** The developers could face aiding-and-abetting liability if they designed the system to be injunction-proof by design.

This is the **crypto mixer problem** applied to identity. Tornado Cash developers were prosecuted for designing a system that couldn't comply with sanctions. EXIT could face similar treatment if designed to be judicially unrestrainable.

**Mitigation:** The spec needs a "legal holds" mechanism — an ability to flag a marker as subject to legal process, which doesn't *prevent* exit but creates a record that the exiting party is potentially violating an order. This threads the needle: exit remains available (the protocol doesn't enforce court orders), but the protocol doesn't actively resist them either. Also add a compliance section to the spec acknowledging that protocol rules do not override applicable law.

### 5.2 Self-Attested Status
**Severity: MEDIUM**

Self-attested `good_standing` is legally similar to a **self-certification** — you're saying you're fine, with no independent verification. This has some legal value (analogous to SOX officer certifications, GDPR processor self-assessments) but limited weight.

In litigation, a self-attested `good_standing` that turns out to be false could be evidence of fraud or misrepresentation. The subject *knew* they were disputed but claimed good standing.

**Mitigation:** Rename `good_standing` to `self_reported_good_standing` or add a `self_attested: true` boolean to make the nature unmistakable. Alternatively, keep the names but add a specification-level normative statement that core status fields are always self-attested and carry no warranty.

### 5.3 DID:key — No Revocation
**Severity: HIGH**

`did:key` has no revocation mechanism. If a private key is compromised:
- Attacker can create forged EXIT markers for the subject
- Attacker can designate fraudulent successors (Module A)
- Attacker can claim assets (Module D)
- There is **no way to invalidate the compromised key**

The project plan notes `did:keri` as the production method (with pre-rotation), but `did:key` is the emergency fallback. If an agent uses the emergency path with `did:key` (which is the design), they're permanently stuck with an unrevocable key.

**Mitigation:** (1) The spec should warn that `did:key` markers are lower-trust. (2) Add a `keyCompromise` marker type that allows a subject to declare a key compromised using a different key (requires pre-established key hierarchy). (3) Prioritize `did:keri` integration — this is a security vulnerability, not just a feature gap.

### 5.4 Emergency Exit Path Abuse
**Severity: MEDIUM**

ALIVE → FINAL → DEPARTED in one operation. No snapshot, no challenge window, no negotiation. Designed for genuine emergencies (platform dying).

Abuse case: Agent uses emergency exit to skip dispute resolution, challenge windows, and any obligation settlement. Claims "emergency" when the platform is clearly operational. The marker is valid. There's no verification that an emergency actually existed.

**Mitigation:** (1) Emergency markers should require a `emergencyJustification` field. (2) Verifiers should apply higher scrutiny to emergency exits from platforms that are clearly still operational. (3) The spec should note that false emergency claims may have legal consequences.

---

## 6. The LLC Question

### 6.1 Entity Structure
**Severity: HIGH**

An LLC is the *minimum* — not the answer. Issues:

**Piercing the corporate veil:** If the LLC is underfunded, doesn't maintain formalities, or is an alter ego of the developers, the veil can be pierced. (*Kinney Shoe Corp v. Polan*, 939 F.2d 209). For a protocol with no revenue, the "underfunded" argument is strong.

**Product liability may not respect the LLC:** Tort claims for defective products can sometimes reach through LLCs to individual developers, especially in jurisdictions with "product seller" liability statutes.

### 6.2 Jurisdiction Recommendation

| Option | Pros | Cons |
|---|---|---|
| **Delaware LLC** | Best case law, predictable courts, low cost | No special DAO/protocol protections |
| **Wyoming DAO LLC** | DAO-friendly statutes (WY Stat. §17-31), member liability protection | Untested in court, limited case law, may signal "we're a DAO" to regulators |
| **Cayman Foundation** | Common for protocols (Ethereum Foundation model), no corporate tax, established | Expensive ($15K+ setup), may trigger US PFIC/CFC issues for US founders |
| **Swiss Association (Verein)** | Privacy-friendly jurisdiction, Ethereum Foundation model | Requires Swiss resident board members, complex compliance |

**My recommendation:** Delaware Series LLC initially ($500 to form, $300/yr). This gives you the liability shield with maximum flexibility. When you raise money or have meaningful users, restructure. Don't over-engineer the entity before you have product-market fit.

### 6.3 Insurance

You need:
- **Technology E&O insurance** — covers claims arising from software defects. $1M-5M policy, ~$3,000-8,000/yr.
- **Cyber liability** — covers data breach, which EXIT markers could trigger. ~$2,000-5,000/yr.
- **D&O insurance** — if you have a board or officers. ~$2,000-4,000/yr.

**Do not launch without Tech E&O.** It's cheap and it's the difference between "we have insurance" and "they're coming for my house."

> **⚠️ Insurance Decision Update (2026-02-22):** The Legal Battery (§VII) provides a more nuanced trigger-based insurance framework that supersedes this blanket recommendation. The current decision is to **defer insurance** until specific trigger events (first platform integration, first revenue, first employee, etc.). See Battery §VII "When Insurance Becomes Non-Negotiable" table for the canonical trigger framework. General liability ($500–$1,500/yr) is the only immediate requirement; Tech E&O defers until meaningful adoption.

---

## 7. Decision Review

### D-001: Dual Format (Envelope)
**Legal Grade: B+**

The dual format is smart — it avoids hard-coupling to the W3C VC ecosystem while maintaining interop. The standalone JSON-LD mode, however, sits outside W3C Patent Policy protections. The VC wrapper benefits from W3C's royalty-free patent commitments; the standalone format does not.

**Recommendation:** Keep, but note the patent asymmetry in the spec.

### D-002: Layered Verification
**Legal Grade: A-**

Subject-mandatory, co-signatures optional is the correct legal architecture. It preserves the subject's right to self-attest while allowing stronger trust signals. The only weakness: it may create a *de facto* two-tier system where markers without co-signatures are treated as suspect. This could enable the "weaponized exit" attack (Section 4.2).

**Recommendation:** Keep as-is. Add guidance for verifiers that absence of co-signature is not evidence of bad standing.

### D-003: Multi-Source Status
**Legal Grade: B**

Good design, but the two competing status fields (self-attested core + origin Module C) will confuse lay users and courts. A judge will ask: "So which one is true?" The answer "both are perspectives" is philosophically correct but legally ambiguous.

**Recommendation:** Add a normative spec statement explaining that neither field is authoritative and verifiers must apply their own trust policies. Consider renaming `status` to `selfReportedStatus` to prevent confusion.

### D-004: TypeScript First
**Legal Grade: N/A** (technical decision, no legal implications)

### D-005: Standalone Package
**Legal Grade: B+**

Good for limiting liability — the EXIT package stands alone, so defects in the parent Cellar Door project don't automatically attach to EXIT, and vice versa. The submodule reference creates a loose coupling.

**Recommendation:** Keep. Ensure the packages have independent LICENSE files and disclaimers.

### D-006: Contests Don't Block Exit
**Legal Grade: D**

This is the most legally dangerous decision. See Section 5.1. The principle is sound — you don't want denial-of-exit attacks. But the categorical statement "never prevents departure" puts you in direct conflict with the power of courts to issue injunctions.

**The fix isn't to allow blocking.** The fix is to acknowledge that the protocol operates *subject to applicable law* and that compliance with legal orders is the responsibility of the parties, not the protocol. Add a `legalHold` flag that can be set on a marker to indicate pending legal process. The marker still gets created — but the flag exists.

**Recommendation:** Amend. Add legal compliance language to the spec. Add a `legalHold` optional field. This doesn't change the protocol's behavior but dramatically reduces your liability exposure.

---

## Severity Summary

| Severity | Count | Key Issues |
|---|---|---|
| **CRITICAL** | 4 | Evidence-creation liability, financial instrument classification, GDPR conflict, court order defiance |
| **HIGH** | 7 | Downstream harm, government subpoenas, KYC/AML, reputation laundering, weaponized exit, surveillance, key compromise |
| **MEDIUM** | 9 | Patent exposure, marker ownership, forged markers, bank run, self-attested status, emergency abuse, entity structure, multi-source confusion, cross-jurisdiction |
| **LOW** | 6 | Trademark, implementation language, repo structure, minor spec ambiguities |

---

## Priority Mitigations (Do These Before Launch)

1. **Add legal compliance language to the spec** — "this protocol operates subject to applicable law" (Cost: $0, Time: 1 hour)
2. **Switch to Apache 2.0 license** (Cost: $0, Time: 30 minutes)
3. **Add `legalHold` optional field to schema** (Cost: minimal dev time)
4. **Rename `good_standing` or add `selfAttested: true`** (Cost: minimal)
5. **Form a Delaware LLC** (Cost: $500)
6. **Get Tech E&O insurance** (Cost: $3,000-8,000/yr) — *Deferred per Battery §VII trigger framework; get GL only ($500-1,500/yr) until first platform integration*
7. **Commission a Howey analysis for Module D** (Cost: $15,000-30,000)
8. **Conduct a GDPR DPIA** (Cost: $5,000-15,000)
9. **Security audit of cryptographic operations** (Cost: $20,000-50,000)
10. **Abandon or redesign the public registry idea** (Cost: $0, saves you pain)

---

## The Verdict

### Would I invest?

**Not yet.** The technical architecture is genuinely innovative, and the problem space (agent portability, platform exit rights) is real and growing. But the regulatory surface area is enormous and largely unaddressed. The project plan has zero legal budget, zero compliance milestones, and treats legal questions as "deferred decisions." That's how you get sanctioned.

If the team adds the priority mitigations above ($25K-50K in legal spend), I'd reconsider. The core protocol design is sound enough to survive regulatory scrutiny *if the spec and surrounding documentation acknowledge legal reality.*

### Would I advise a client to use this?

**For internal/experimental use:** Yes, with caveats. It's a useful primitive for agent portability research. Keep it off-chain, don't use Module D with real assets, treat all status fields as informational only.

**For production deployment:** No. Not until: (1) the Howey analysis clears Module D, (2) GDPR compliance is designed in (not bolted on), (3) the spec has a proper legal compliance section, (4) `did:keri` replaces `did:key` as default, and (5) a security audit is complete.

**For anything involving real money or regulated entities:** Absolutely not. Come back after you've spent $50K on legal and compliance. That's cheap compared to the SEC enforcement action you'll face otherwise.

---

*This report is provided for discussion purposes and does not constitute legal advice. Formal engagement requires a signed retainer agreement. But seriously, fix D-006 before someone gets a contempt citation.*
