# Cellar Door EXIT Protocol — Second-Pass Legal Red Team Report

> **📊 Risk Scale Reference:** This document uses letter grades and text risk levels. See [risk-scale-mapping.md](risk-scale-mapping.md) for how this maps to scales used in other analysis documents.

**Prepared by:** [Redacted], Regulatory Compliance & Novel Technology Practice
**Date:** 2026-02-19
**Billing Rate:** $900/hr
**Classification:** Attorney-Client Privileged — Draft
**Engagement:** Independent second-pass review following first legal red team and compliance remediation

---

## Executive Summary

The first lawyer did competent work. The team responded well — implementing roughly 80% of the recommended mitigations within what appears to be a single sprint. The compliance documents (LEGAL.md, SECURITY.md, updated spec) are substantially better than what most early-stage protocol projects produce.

But the first lawyer was a generalist playing the hits. They caught the obvious stuff — GDPR, Howey, court orders, patent exposure. What they missed is where the real danger lives: in the structural assumptions about what EXIT *is* legally, in international regulatory frameworks that don't map to US-centric analysis, and in the emergent properties of a protocol that creates a portable reputation layer for entities whose legal personhood is unsettled.

I've identified **2 critical** gaps remaining, **5 high-severity** issues the first lawyer missed entirely, and **3 areas** where the compliance documents create new problems while solving old ones. The team has gone from "reckless" to "plausibly defensible" — but "plausibly defensible" is not the same as "compliant."

---

## Part I: Scorecard on First Lawyer's Concerns

### What Was Addressed Well

| First Lawyer's Issue | Remediation | Grade |
|---|---|---|
| D-006 court order conflict | `legalHold` field added, LEGAL.md §1 and §8 acknowledge applicable law | **A-** |
| Patent exposure (MIT→Apache) | D-007 switched to Apache 2.0 | **A** |
| Self-attestation ambiguity | `selfAttested: boolean` added (D-009), LEGAL.md §3 disclaims warranty | **A-** |
| Emergency path abuse | `emergencyJustification` required (D-010), enforced by validation | **B+** |
| Key compromise gap | `keyCompromise` exit type added (D-011) | **B** |
| Public registry liability | D-012 abandoned public registry entirely | **A** |
| Financial instrument risk | LEGAL.md §4, §5, §6 explicitly disclaim instrument status | **B+** |
| Status field confusion | D-013 normative language that neither field is authoritative | **B+** |

### What Was Addressed Poorly or Incompletely

| First Lawyer's Issue | Problem with Remediation | Grade |
|---|---|---|
| GDPR right to erasure | LEGAL.md §7.1 proposes "encrypt so only subject can decrypt" as "functional erasure." This is legally untested and the Article 29 Working Party has not endorsed encryption as erasure. The CJEU in *Google Spain* required actual delisting, not obfuscation. | **C** |
| Howey analysis for Module D | Disclaimers added but no actual Howey analysis commissioned. Disclaiming something is a security doesn't make it not a security — see *SEC v. Telegram* (2020) where the court disregarded contractual disclaimers entirely. | **C-** |
| Entity formation / insurance | No evidence these were acted on. Still operating as unincorporated individuals. | **D** |
| GDPR DPIA | Spec mentions DPIA obligation but doesn't conduct one. Telling others to do a DPIA while not doing your own is a regulator's favorite punching bag. | **C-** |
| Security audit | Not done. Not scheduled. The `keyCompromise` type is a band-aid on a gunshot wound if the underlying crypto has implementation bugs. | **D** |

---

## Part II: What the First Lawyer Missed

### 2.1 The Agent Personhood Problem (CRITICAL)

The first lawyer treated agents as if they have settled legal status. They don't. EXIT is designed for "agents, services, and participants" — but the legal system has no consensus on whether an AI agent can:

- **Sign** anything (capacity to contract)
- **Attest** to standing (competency as a witness)
- **Hold** assets (legal ownership)
- **Depart** from anything (you can't leave if you were never "there" in a legally cognizable sense)

The entire EXIT ceremony assumes the subject has *agency* — the legal capacity to form intent, declare departure, and attest to status. For human users, this is obvious. For AI agents, it's an open question that varies by jurisdiction:

- **EU AI Act (2024):** AI systems are tools, not persons. An AI "exiting" a platform is like a hammer leaving a toolbox — the handler exits, not the tool. EXIT markers signed by AI agents may be legally void for want of capacity.
- **Saudi Arabia** granted citizenship to Sophia the robot (2017), but this is performative, not precedential.
- **US:** No federal recognition of AI personhood. Some corporate personhood arguments (*Citizens United*) could theoretically extend, but this is speculative.

**Why this matters for EXIT:** If an agent lacks legal capacity, its EXIT markers are unsigned in a legal sense, regardless of cryptographic validity. A `selfAttested: true` field from an entity with no legal capacity to attest is not just weak — it's meaningless. The first lawyer's entire analysis assumed the subject *could* be a legal actor.

**Recommendation:** The spec needs a section on "Subject Capacity" that explicitly addresses the three cases: (1) human subjects (full capacity), (2) organizational subjects (capacity through authorized representatives), (3) agent subjects (capacity delegated by or derived from a human/org principal). For case 3, the marker should reference the delegating principal. Without this, EXIT markers from autonomous agents are legally orphaned.

### 2.2 Labor Law: Agents as Workers (HIGH)

Nobody's talking about this yet, but they will.

If AI agents are performing work on platforms — and EXIT formalizes their "employment" relationship by documenting departure with standing — then EXIT is creating *employment records* for entities that may qualify as workers under evolving labor frameworks:

- **EU Platform Workers Directive (2024):** Establishes a presumption of employment for platform workers when certain control indicators are met. An AI agent controlled by a platform, performing tasks, and subject to forced exit (`exitType: forced`) meets multiple indicators.
- **California AB5 / Dynamex:** The ABC test for independent contractor status. An agent that is (A) controlled by the platform, (B) performing the platform's core business, and (C) not independently established, is an employee.
- **ILO Conventions:** Apply to "workers" broadly defined. An agent "exiting" a "workplace" creates exactly the framing labor regulators would use.

A `forced` exit with `disputed` status is functionally a **termination record**. Module E narratives explaining why the agent was expelled are functionally **termination documentation**. Module D showing unpaid obligations is functionally a **final pay dispute**.

**I am not being creative here.** I am telling you how a labor regulator will read this protocol if AI agent labor rights become a legislative issue in the next 2-5 years — which is approximately the timeline for EXIT to reach adoption.

**Recommendation:** Add a LEGAL.md section explicitly stating that EXIT markers are technical records, not employment documentation, and that the protocol takes no position on the legal status of AI agents as workers. This won't prevent the argument, but it establishes intent.

### 2.3 Antitrust: Coordinated Refusal to Deal (HIGH)

The first lawyer flagged "weaponized exit" (platform blackballing agents) but missed the flip side: **coordinated agent behavior using EXIT as a signaling mechanism**.

Scenario: 100 agents exit Platform A with `disputed` status on the same day, each with Module E narratives describing unfair treatment. Platform B, C, and D read these markers and refuse to accept agents from Platform A. This is a **group boycott** — a per se violation of Section 1 of the Sherman Act if the agents are treated as independent economic actors.

Worse: if EXIT becomes standard infrastructure for agent mobility, the protocol itself becomes a **coordination mechanism**. The SECURITY.md §1.4 "bank run" analysis focuses on the victim platform — it misses that the *exiting agents* may be engaging in antitrust-violating coordinated behavior, and EXIT is the facilitating technology.

Under *FTC v. Qualcomm* (2019, partially reversed 2020), even unilateral conduct by a standard-essential facility can trigger antitrust scrutiny. If EXIT becomes standard-essential for agent portability, its design choices (e.g., which status values exist, how disputes are surfaced) become antitrust-relevant.

**Recommendation:** SECURITY.md should discuss coordinated exit as an antitrust risk, not just a reputational one. The spec should note that use of EXIT markers for coordinated refusal to deal may violate competition law.

### 2.4 Insurance Law: Reliance and Indemnity (HIGH)

EXIT markers will inevitably be used in insurance-adjacent contexts:

- A platform insuring against agent misbehavior will check EXIT markers as part of risk assessment
- An EXIT marker showing `good_standing` that turns out to be fraudulent creates a **misrepresentation in an insurance context** — potentially voiding coverage under the doctrine of *uberrimae fidei* (utmost good faith)
- Module D asset manifests, if relied upon for valuation, create **material misrepresentation** exposure

The first lawyer mentioned Tech E&O insurance for the *protocol developers* but entirely missed the insurance implications for *protocol users*. If an insurer denies a claim because they relied on an EXIT marker that was self-attested and wrong, the insured will sue everyone in the chain — including the protocol for not making the self-attestation limitation clear enough.

LEGAL.md §2 and §3 disclaim this, but disclaimers in a technical spec are not the same as disclaimers in an insurance application. The insurer's lawyer will argue that the *structure* of the marker (a signed, cryptographic credential with a "good_standing" field) creates a reasonable expectation of reliability regardless of spec disclaimers.

**Recommendation:** LEGAL.md should explicitly address insurance contexts. Consider adding a "NOT FOR USE IN INSURANCE UNDERWRITING" warning to the status field documentation, or at minimum a normative statement that EXIT markers do not satisfy due diligence requirements for insurance risk assessment.

### 2.5 International Treaty Obligations (HIGH)

The first lawyer's cross-jurisdiction analysis was US-centric with EU bolted on. Missing:

**Hague Convention on Choice of Court Agreements (2005):** If EXIT markers reference a challenge window with an arbiter (Module C), they may constitute a choice-of-forum agreement. International enforcement of such agreements is governed by the Hague Convention, and a smart-contract-style arbiter designation may not satisfy the Convention's "writing" requirement.

**Budapest Convention on Cybercrime (2001):** EXIT markers documenting forced exits from systems could be relevant evidence in cybercrime proceedings. The Convention's mutual legal assistance provisions (Art. 29-35) create preservation obligations that may conflict with the protocol's non-custodial design.

**OECD AI Principles (2019) / Hiroshima AI Process (2023):** Voluntary but influential frameworks. EXIT creates "traceability" for AI agents (OECD Principle 1.3) — which is good — but also creates surveillance infrastructure that may conflict with OECD Principle 1.2 (human-centric values). G7 nations are actively developing binding frameworks based on these principles.

**WTO GATS (General Agreement on Trade in Services):** If AI agents are providing services across borders and EXIT facilitates their mobility, EXIT markers may become relevant to Mode 4 (movement of natural persons) or Mode 1 (cross-border supply) commitments. The WTO hasn't addressed AI agents, but the framework exists and will be applied.

**Recommendation:** The legal analysis needs internationalization. At minimum, LEGAL.md should state that the protocol is designed for global use and users must comply with applicable international obligations. More substantively, Module C's arbiter mechanism needs to address choice-of-law and enforcement issues.

### 2.6 Platform TOS Conflicts (MEDIUM)

EXIT assumes the subject has the right to create a departure record. Most platform Terms of Service say otherwise:

- **AWS TOS §4.2:** "You will not... reverse engineer... any aspect of the Services"
- **OpenAI TOS §2(c):** Output restrictions and non-compete provisions
- **Discord TOS §6:** All user-generated content is licensed to Discord
- **Ethereum Foundation TOS:** Various restrictions on derivative protocols

If an agent exits a platform and the EXIT marker references that platform as the `origin`, the marker may violate the platform's TOS by:
1. Disclosing the existence of the relationship (NDA-violating)
2. Characterizing the platform's behavior (`originStatus: disputed`)
3. Referencing proprietary state information (Module B `stateHash`)
4. Listing assets that the platform claims ownership of (Module D)

The first lawyer didn't consider that *creating an EXIT marker might itself be a TOS violation*.

**Recommendation:** LEGAL.md should note that users are responsible for ensuring EXIT marker creation complies with applicable platform agreements. The spec should warn that Module B state hashes and Module D asset manifests may reference information subject to platform TOS restrictions.

---

## Part III: Compliance Document Grades

### LEGAL.md — Grade: B+

**Strengths:**
- Comprehensive disclaimers for financial instrument classification (§4-6)
- Smart handling of the evidence-creation problem (§2 — "factual records, not certifications")
- Good GDPR section with practical right-to-erasure approach (§7)
- Appropriate "not legal advice" disclaimer
- The packing-list analogy in §4 is genuinely clever and would land well with a judge

**Weaknesses:**
- "Functional erasure via encryption" (§7.1) is legally untested and may not survive a CJEU challenge. The document presents it with more confidence than is warranted.
- No mention of labor law, antitrust, or insurance contexts
- No international law considerations
- §8 says the protocol "does not provide mechanisms for courts to block exit (by design)" — this is exactly the kind of statement a prosecutor would highlight. Rephrase as "the protocol is not designed to enforce or resist court orders; compliance is the responsibility of the parties."
- §12 claims markers aren't copyrightable under *Feist*, which is correct for the factual elements but Module E narratives are creative expression and arguably copyrightable. The section acknowledges this but could be clearer.
- No versioning strategy — if LEGAL.md is updated, how do parties know which version applied to their marker?

**Regulatory scrutiny survival: Would survive initial review. Would face pointed questions on GDPR erasure approach and the "by design" language in §8. Fix those two and it's solid B+/A- territory.**

### SECURITY.md — Grade: B

**Strengths:**
- Comprehensive threat model covering the major attack vectors
- Good verifier policy recommendations (§5) with risk-tiered approach
- Honest about `did:key` limitations (§2) — rare to see a project acknowledge its own crypto weaknesses
- Rate limiting guidance (§7) is practical
- The threat/mitigation format is clean and actionable

**Weaknesses:**
- Entirely defensive — covers threats *to* the protocol but not threats *from* the protocol. Missing: how EXIT can be weaponized as a coordination mechanism, surveillance tool, or censorship infrastructure.
- No threat model for the `legalHold` field itself (see Part IV below)
- §1.2 "Weaponized Exit" mentions Section 230 but doesn't analyze it — just name-drops. A platform creating retaliatory markers likely *doesn't* get 230 protection because the marker is the platform's own speech, not user content moderation.
- No discussion of quantum computing threats to Ed25519 (NIST post-quantum migration timeline is 2030-2035, within EXIT's likely operational lifetime)
- "Security contact TBD" at the bottom is embarrassing for a security document. Even a PGP key or security@domain is better than TBD.
- No incident response plan

**Regulatory scrutiny survival: Would survive review by a generalist regulator. A specialist (ENISA, NIST) would flag the missing threat-from-protocol analysis and lack of post-quantum roadmap. Solid B, not yet A territory.**

### EXIT_SPEC_v1.md — Grade: B+

**Strengths:**
- Clean RFC 2119 usage
- Good separation of MUST/SHOULD/MAY requirements
- Module system is well-designed — optional complexity with mandatory simplicity
- §9 Privacy Considerations acknowledges GDPR directly in the spec (not just companion docs)
- Test vectors (§12) are helpful for implementers and legally useful for establishing "intended use"
- The warning about Module F and GDPR incompatibility (§4.6) is exactly the kind of candor regulators want to see

**Weaknesses:**
- No formal grammar or ABNF for field validation — "valid ISO 8601 UTC" is ambiguous (which ISO 8601 profile?)
- The ceremony state machine (§5) has no timeout semantics — a marker can sit in INTENT state forever, which creates preservation obligation ambiguity
- §7 Legal Compliance section is just a pointer to LEGAL.md — the spec itself should contain normative legal statements, not delegate them. If LEGAL.md is updated independently, the spec and LEGAL.md may diverge.
- No extension mechanism for future fields beyond Modules A-F. Adding Module G requires a spec revision, which creates versioning headaches.
- `@context` URL (`https://cellar-door.org/exit/v1`) — the domain `cellar-door.org` presumably doesn't exist yet. JSON-LD processors that attempt to resolve it will fail. This is a practical deployment blocker.
- No accessibility considerations (relevant under EU Accessibility Act if EXIT markers are displayed to humans)

**Regulatory scrutiny survival: Strong for a v1 draft. The normative MUST/SHOULD language and explicit security/privacy sections would satisfy most regulatory review requirements. The main gap is the delegation of legal compliance to a companion document rather than inline normative requirements.**

---

## Part IV: The legalHold Stress Test

The first lawyer recommended `legalHold`. The team implemented it. But nobody asked: **does `legalHold` actually help, or does it create new problems?**

### 4.1 The Spoliation Trap

If a party *knows* they can set `legalHold` but *chooses not to*, that omission is now **evidence of intent to conceal.** Before `legalHold` existed, there was no expectation that markers would flag legal process. Now that the field exists, its *absence* carries meaning.

A plaintiff's lawyer will argue: "The protocol provided a mechanism to flag legal holds. The defendant knew about the litigation. The defendant chose not to set the flag. This demonstrates consciousness of guilt."

The `acknowledged: boolean` sub-field makes this worse. If `acknowledged: false`, the subject can claim ignorance. If `acknowledged: true`, they've created a contemporaneous record that they knew about the legal process and exited anyway. If the field is absent entirely, a court may infer they deliberately avoided creating the record.

**The legalHold field has turned EXIT into a litigation-awareness documentation system.** Every time a subject *doesn't* use it when they arguably should have, that's a negative inference.

### 4.2 The Authority Problem

`legalHold.authority` is a free-text string. There is no validation that the claimed authority actually issued the hold. This means:

- A malicious origin could set a fake `legalHold` to make the subject's exit appear legally compromised
- The subject could set a `legalHold` citing a non-existent proceeding to preemptively frame their exit as legally constrained (creating sympathy or reducing scrutiny)
- A third party who intercepts and modifies a marker could add a `legalHold` to create confusion

There is no authentication of the `legalHold` field. It's not signed by the authority. It's not verified against any court system. It's just a text field that says "trust me, there's a court order."

### 4.3 Jurisdictional Chaos

A `legalHold` referencing a Chinese court order has no enforcement mechanism in the EU. A US litigation hold has no meaning in Saudi Arabia. But the field doesn't indicate jurisdiction — it's just `authority: string`.

A verifier in Germany receiving a marker with `legalHold: { authority: "People's Court of Beijing" }` has no idea what to do. Are they obligated to respect it? Ignore it? Report it? The protocol gives no guidance.

### 4.4 GDPR Problem

The `legalHold` field contains:
- `authority` — potentially identifies a government entity
- `reference` — a case number, which is personal data when linked to the subject
- `holdType` — reveals that the subject is under investigation/litigation

Under GDPR Art. 10, processing of personal data relating to criminal convictions and offences requires specific authorization. A `holdType: "criminal_investigation"` is exactly this. The protocol has no safeguards for Art. 10 compliance.

### 4.5 Verdict on legalHold

**The legalHold field is net-positive but needs significant refinement.** It addresses the first lawyer's core concern (Tornado Cash problem) but creates secondary problems that could be worse in specific scenarios.

**Recommendations:**
1. Add guidance that absence of `legalHold` MUST NOT be interpreted as absence of legal process
2. The `legalHold` should be signable by the authority (not just free-text) — add an optional `proof` sub-field
3. Add `jurisdiction` as a required sub-field
4. Add GDPR Art. 10 warning to LEGAL.md
5. Consider making `legalHold` a separate, detachable document rather than an inline field — this allows it to be added post-hoc by courts without modifying the signed marker

---

## Part V: The Risk Spectrum — Bare Minimum vs. Full Service

The first lawyer didn't frame this clearly, so I will. EXIT can be deployed at various compliance levels:

### Level 1: "Hash Mark" (Bare Minimum)
Just the 7 core fields. No modules. No registry. Subject signs, subject holds.

**Legal risk:** Low. It's a signed JSON blob. Legally equivalent to a screenshot with a timestamp. No financial implications, no reputation portability, no surveillance concerns. The disclaimers in LEGAL.md are overkill for this level.

**What could still go wrong:** Evidence-creation liability (first lawyer's §1.1) still applies. Even a bare marker formalizes departure.

### Level 2: "Reputation Passport" (Core + Modules A, C, E)
Lineage, disputes, and narratives. This is where EXIT becomes a portable reputation system.

**Legal risk:** Medium-High. Now you have a reputation portability system, which triggers: defamation concerns (Module C originStatus), surveillance concerns (Module A lineage), and GDPR concerns (Module E narratives). The insurance and labor law concerns I raised kick in here.

### Level 3: "Economic Passport" (Core + Modules A-D)
Add asset manifests and economic obligations.

**Legal risk:** High. Module D is where securities law, KYC/AML, and financial regulation enter. The disclaimers in LEGAL.md §4-6 are necessary but may not be sufficient. The first lawyer was right: get a formal Howey analysis before anyone uses Level 3.

### Level 4: "Permanent Record" (Core + All Modules + Module F On-Chain)
Everything, anchored to a blockchain.

**Legal risk:** Critical. On-chain anchoring creates indelible records incompatible with GDPR erasure. Cross-chain references create multi-jurisdictional compliance nightmares. Module F is a legal bomb.

**Recommendation:** The spec should explicitly describe these risk levels and recommend that implementers choose the minimum level necessary. Currently, the spec treats all modules as equally optional — but they are not equally risky.

---

## Part VI: Where I Disagree with the First Lawyer

### 6.1 "D-006 Legal Grade: D" — I'd Give It a B

The first lawyer was overly alarmed about "contests don't block exit." After remediation (legalHold field, LEGAL.md §1 and §8), D-006 is defensible. The protocol doesn't enforce court orders, but it doesn't resist them either. This is the correct position — it's where HTTPS, email, and every other neutral protocol sits. The Tornado Cash comparison was inapt; Tornado Cash was *designed to prevent compliance*. EXIT is designed to be neutral.

The first lawyer also conflated "protocol allows exit" with "protocol facilitates contempt." A phone lets you make calls during a litigation hold too. That doesn't make AT&T liable for contempt.

### 6.2 "Form a Delaware LLC" — Too Early, Wrong Vehicle

An LLC provides liability protection but also creates a *target*. An unincorporated open-source project is harder to sue than an LLC because there's no entity to serve. The Ethereum Foundation didn't incorporate until it had to handle money. The first lawyer recommended a $500 LLC before the project has revenue, users, or even a stable spec. That's premature — and the Series LLC suggestion is bizarre for a protocol project.

**My recommendation:** Incorporate when you need to (accepting donations, entering contracts, hiring). Until then, the Apache 2.0 license and disclaimer language provide adequate protection for an open-source specification project.

### 6.3 "Rename good_standing to self_reported_good_standing" — Wrong Fix

The team correctly chose `selfAttested: boolean` over renaming the field. Renaming would break the semantic clarity of the enum (`self_reported_good_standing` is awkward as an enum value and implies non-self-reported variants exist in the core). The boolean flag is cleaner engineering and equally effective legally. First lawyer got the diagnosis right, proposed the wrong treatment.

---

## Part VII: Updated Verdict

### Where Things Stand Now

The EXIT protocol has gone from "legally reckless" to "thoughtfully incomplete." The compliance documents are real — not theater. LEGAL.md in particular is one of the better legal companion documents I've seen for an early-stage protocol. The team clearly took the first review seriously.

But "incomplete" matters. The gaps I've identified — agent personhood, labor law framing, antitrust coordination risk, insurance reliance, international treaty obligations, and the legalHold field's secondary effects — are not hypothetical. They represent the *next wave* of regulatory attention that will hit protocols like EXIT within 2-5 years.

### Would I Invest?

**Cautious yes**, with conditions. The technical architecture is genuinely novel and addresses a real problem. The compliance posture is ahead of 90% of comparable projects. But the remaining gaps need to be on a roadmap with timelines, not just acknowledged.

### Would I Advise a Client to Use This?

**Level 1 (bare markers):** Yes. The risk is manageable and the disclaimers are adequate.

**Level 2 (reputation passport):** Yes, with documented risk acceptance and legal counsel review.

**Level 3 (economic passport):** Not until the Howey analysis is complete.

**Level 4 (on-chain):** No. Module F + GDPR is an unresolved conflict.

---

## Part VIII: Prioritized Remaining Work

### Tier 1 — Do Before Any Public Launch
1. **Fix LEGAL.md §8 language** — remove "by design" from the statement about not providing court-blocking mechanisms. Replace with neutral language. (Cost: $0, Time: 15 min)
2. **Add jurisdiction field to legalHold** (Cost: minimal dev time)
3. **Add "absence of legalHold is not evidence of absence of legal process" to LEGAL.md §9** (Cost: $0, Time: 15 min)
4. **Add Subject Capacity section to spec** — addressing human, organizational, and agent subjects (Cost: 1-2 hours drafting)
5. **Add GDPR Art. 10 warning for legalHold fields containing criminal/investigation data** (Cost: $0, Time: 15 min)
6. **Fill in security contact** — "TBD" in a security document is unacceptable (Cost: $0, Time: 5 min)
7. **Add risk-level guidance** — document which module combinations carry which compliance burden (Cost: 2-3 hours)

### Tier 2 — Do Before Production Deployment
8. **Commission formal Howey analysis for Module D** (Cost: $15-30K)
9. **Conduct or commission a GDPR DPIA** (Cost: $5-15K)
10. **Cryptographic security audit** (Cost: $20-50K)
11. **Add labor law disclaimer to LEGAL.md** (Cost: $0-2K with counsel review)
12. **Add antitrust/coordination risk to SECURITY.md** (Cost: $0, Time: 2 hours)
13. **Address platform TOS conflict in LEGAL.md** (Cost: $0, Time: 1 hour)
14. **Resolve `cellar-door.org` domain and JSON-LD context hosting** (Cost: ~$50/yr)
15. **Add post-quantum migration note to SECURITY.md** (Cost: $0, Time: 30 min)

### Tier 3 — Do Before Scale
16. **International legal review** — at minimum EU, UK, and one Asian jurisdiction (Cost: $30-75K)
17. **Entity formation** — when accepting money or contracts, not before (Cost: $500-15K depending on structure)
18. **Insurance** — Tech E&O when the entity exists (Cost: $3-8K/yr) — *Deferred per Battery §VII trigger framework; GL only ($500-1,500/yr) until first platform integration*
19. **Make legalHold authority-signable** — add optional proof sub-field (Cost: moderate dev time)
20. **ZK selective disclosure** — move from roadmap to active development for GDPR compliance (Cost: significant)

### Total Remaining Legal Spend Estimate
- Tier 1: ~$0-500 (all self-service except counsel review of capacity section)
- Tier 2: ~$40-95K
- Tier 3: ~$35-100K

---

## Final Note

The first lawyer charged $800/hr and told you the house was on fire. I charge $900/hr and I'm telling you the fire's mostly out, but you left the stove on in the kitchen and there's a gas leak in the basement. The kitchen is fixable today. The basement needs a professional.

Good work getting this far. Now finish it.

---

*This report is provided for discussion purposes and does not constitute legal advice. The author has no prior engagement with the Cellar Door project and no financial interest in its outcome. Formal engagement requires a signed retainer agreement.*
