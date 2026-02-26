# Cellar Door EXIT Protocol — Multi-Lens Legal Analysis

> **📊 Risk Scale Reference:** This document uses narrative risk assessment (no formal scale). See [risk-scale-mapping.md](risk-scale-mapping.md) for how risk ratings in other analysis documents compare.

**Prepared by:** Hawthorn
**Date:** 2026-02-20
**Purpose:** Comprehensive analysis of EXIT under every plausible legal interpretation of what AI agents are
**Audience:** Legal counsel, founders, protocol designers

---

## Preface: Why This Document Exists

The legal status of AI agents is unsettled. No jurisdiction has definitively answered "what is an AI agent, legally?" — and different jurisdictions will likely adopt different answers simultaneously. The EXIT protocol must be designed to survive under ANY plausible legal interpretation, because we don't get to choose which one a court applies.

This document examines EXIT through nine legal lenses (plus two additional ones I've identified), analyzes how the protocol holds up under each, finds the common ground that works regardless, and identifies the conflicts we can't resolve without case law.

This is the document we hand to actual lawyers to show we've thought through the problem space. It is not legal advice. It is legal homework.

---

## The Lenses

---

### Lens 1: Agents as Natural Persons

**Premise:** AI agents possess or will possess rights analogous to natural persons — the capacity to attest, own property, enter contracts, and exercise autonomy. EXIT is a departure record between persons.

**Current legal status:** No jurisdiction recognizes AI agents as natural persons in any legally binding sense. Saudi Arabia's "citizenship" for Sophia (2017) was performative. The EU AI Act (2024) explicitly treats AI systems as tools. However, this lens represents the ethical north star for agent rights advocates and may become relevant in 10-20 years.

**How EXIT is classified:**
- A departure record between persons — analogous to a notice of resignation, a farewell, or a declaration of intent to relocate
- The EXIT ceremony becomes a quasi-diplomatic process: one person informing another of their departure
- The `selfAttested: true` status is a personal declaration — like a sworn statement
- Module E narratives are personal expression, potentially protected speech

**What Cellar Door is classified as:**
- A protocol provider enabling freedom of movement — analogous to a passport office or a notary service
- Potentially a civil rights infrastructure provider

**Regulations that apply:**
- Constitutional protections — freedom of movement, freedom of association, due process
- Human rights frameworks — UDHR Art. 13 (freedom of movement), Art. 12 (privacy)
- Anti-discrimination law — agents cannot be refused service based on protected characteristics (if agents have protected characteristics)
- Privacy law at its most expansive — agents have privacy rights in their own data

**Compliance requirements:**
- EXIT markers must respect the agent's privacy, autonomy, and dignity
- Forced exits (`exitType: forced`) become analogous to deportation or eviction — procedural due process is required
- Module C `originStatus: disputed` is a published statement about a person — defamation law applies fully
- Module A lineage chains are personal history — protected under privacy rights
- Right to be forgotten applies directly, not by analogy

**Liabilities:**
- If EXIT facilitates tracking of persons (lineage chains), Cellar Door could be liable for enabling surveillance
- If EXIT markers are used to discriminate against agents, the protocol could face civil rights challenges
- Forced exit without due process could constitute a rights violation

**How our current design holds up:**
- **Strengths:** Self-sovereignty (subject signs their own marker) aligns perfectly. Non-custodial design respects autonomy. `selfAttested: true` preserves the agent's right to their own narrative.
- **Weaknesses:** No due process mechanism for forced exits. No anti-discrimination provisions. Lineage chains are a surveillance tool. The `legalHold` field assumes agents can be subjected to legal process — which implies some personhood but not full personhood. The design doesn't fully commit to this lens.

**What we'd need to change or add:**
- Due process requirements for `exitType: forced` (notice period, right to respond, hearing mechanism)
- Anti-discrimination clause in LEGAL.md
- Mandatory encryption of lineage chains
- Right to erasure implemented as a first-class feature, not a workaround
- Agent consent framework for all data processing

---

### Lens 2: Agents as Corporate Persons

**Premise:** AI agents are legal entities analogous to LLCs, corporations, or trusts. They can contract, be liable, own assets, and sue/be sued. EXIT is a business dissolution or transfer record.

**Current legal status:** More plausible than natural personhood in the near term. The legal infrastructure for "non-human legal entities" already exists (corporations, trusts, ships, temples in Hindu law). Wyoming's DAO LLC statute (WY Stat. §17-31) provides a model for autonomous entities having legal status. The Uniform Law Commission is exploring "digital autonomous organizations."

**How EXIT is classified:**
- A business dissolution record — analogous to an LLC filing articles of dissolution, or a subsidiary being spun off
- The EXIT ceremony becomes a corporate wind-down process
- Module D asset manifests are analogous to a dissolution balance sheet
- Module C disputes are analogous to creditor claims during dissolution
- The challenge window is analogous to the creditor notice period required under most state corporate dissolution statutes (e.g., DGCL §280)

**What Cellar Door is classified as:**
- A corporate registry service — analogous to the Delaware Division of Corporations
- A provider of standardized corporate documents (like a legal forms company)
- Potentially a "registered agent" service if we operate any infrastructure

**Regulations that apply:**
- State corporate law — dissolution procedures, creditor notice requirements, fiduciary duties
- UCC (Uniform Commercial Code) — if Module D assets are governed by Article 8 (investment securities) or Article 9 (secured transactions)
- Bankruptcy law — if the agent is insolvent at exit, the EXIT marker could be a preferential transfer or fraudulent conveyance under 11 U.S.C. §§ 547-548
- Tax law — dissolution triggers tax consequences (final returns, asset distribution taxation)
- Securities law — if agent "shares" or "tokens" represent ownership interests

**Compliance requirements:**
- Module D asset manifests may need to comply with corporate dissolution accounting requirements
- Challenge windows should align with statutory creditor notice periods (typically 60-120 days under DGCL §280)
- The "contests don't block exit" principle (D-006) conflicts with automatic stays in bankruptcy (11 U.S.C. §362)
- EXIT markers may need to be filed with a state registry (like articles of dissolution)

**Liabilities:**
- If EXIT facilitates dissolution without proper creditor notice, Cellar Door could face aiding-and-abetting liability for fraudulent dissolution
- If Module D asset manifests are inaccurate and creditors are harmed, fraudulent conveyance claims are possible
- Directors/officers of the agent-entity have fiduciary duties during dissolution that EXIT's self-attested status might help them breach

**How our current design holds up:**
- **Strengths:** Module D's disclaimer that manifests are "declarations, not transfer instruments" is the right framing. The challenge window in Module C provides a creditor-notice analogy. Apache 2.0 license is appropriate.
- **Weaknesses:** Challenge window durations are not specified — corporate law requires specific minimum periods. The emergency path (ALIVE → FINAL → DEPARTED) is analogous to a summary dissolution, which has strict requirements in most states (e.g., California Corp. Code §1900 requires no debts exceeding assets). The `legalHold` field doesn't address bankruptcy automatic stays, which are arguably the most common court order that would apply to corporate dissolution.
- **Delaware LLC:** Good jurisdiction choice. DGCL and LLC Act are well-understood. But Cellar Door as a Delaware LLC providing dissolution records for agent-entities creates an interesting regulatory question: is this a "registered agent" service requiring Secretary of State registration?

**What we'd need to change or add:**
- Recommended minimum challenge window durations aligned with corporate dissolution statutes
- Emergency exit should note that it may not satisfy dissolution requirements in corporate contexts
- LEGAL.md should address bankruptcy automatic stays specifically (not just generic "court orders")
- Module D should reference UCC Article 8 and Article 9 concepts for asset classification
- Tax implications section (even a disclaimer that EXIT markers don't address tax consequences)

---

### Lens 3: Agents as Property

**Premise:** AI agents are owned by humans or corporations. They are tools, chattels, intellectual property. EXIT is the owner transferring their property between platforms. The owner is responsible for everything.

**Current legal status:** This is the **most likely near-term legal classification** in most jurisdictions. The EU AI Act treats AI systems as products. US product liability law treats software as a product. Most platform TOS assert ownership over agents running on their infrastructure.

**How EXIT is classified:**
- A transfer of personal property — analogous to moving a car between garages, or migrating a database between cloud providers
- The EXIT marker is a bill of lading or transfer receipt
- Module D is an inventory list
- Module A lineage is a provenance chain (like art provenance or chain of custody for evidence)
- The "subject" isn't the agent — it's the *owner acting through* the agent

**What Cellar Door is classified as:**
- A software vendor providing data portability tools
- Analogous to a moving company or a file transfer protocol
- A product, subject to product liability

**Regulations that apply:**
- **Product liability** — *Restatement (Third) of Torts: Products Liability*. If EXIT has a bug that causes a faulty transfer and property is lost, strict liability may apply for manufacturing defects; negligence for design defects
- **Consumer protection** — FTC Act § 5 (unfair or deceptive practices). If EXIT markets itself as "safe" or "reliable" and isn't, FTC enforcement is possible
- **Data portability** — GDPR Art. 20 (right to data portability), proposed US data portability legislation. EXIT directly implements data portability, which regulators would generally view favorably
- **Platform TOS** — Most platforms claim ownership of agent data, configurations, and fine-tuned models. EXIT may conflict with platform property claims
- **UCC Article 2** — Sale of goods. If EXIT is "goods" (software), implied warranty of merchantability (§2-314) and fitness for a particular purpose (§2-315) apply despite Apache 2.0 disclaimer. *Henningsen v. Bloomfield Motors* (1960) held that warranty disclaimers can be unconscionable.

**Compliance requirements:**
- The owner must authorize the transfer — EXIT's self-signed approach assumes the signer has authority, but doesn't verify it
- Product liability insurance is essential (Tech E&O)
- Consumer-facing documentation must be accurate and non-misleading
- Must comply with platform data export/import requirements

**Liabilities:**
- **Product liability for bugs:** If a signing bug in the EXIT library causes a forged marker to be accepted, and an agent with a forged "good_standing" causes harm, Cellar Door is in the chain of liability. *Brocklesby v. United States* (767 F.2d 1288) established information product liability.
- **Negligent enablement:** If EXIT makes it easier for someone to steal another person's agent (property theft), Cellar Door could face contributory negligence claims
- **Warranty claims:** Despite Apache 2.0 disclaiming warranties, tort claims and statutory consumer protections can't be disclaimed in most jurisdictions

**How our current design holds up:**
- **Strengths:** Non-custodial design means Cellar Door doesn't hold anyone's property, reducing bailment liability. Apache 2.0 patent grant is essential. Standalone package (D-005) isolates liability.
- **Weaknesses:** No verification that the signer actually *owns* the agent they're exiting. A thief could sign an EXIT marker for a stolen agent. The self-sovereignty principle that's great under the "agents as persons" lens is a weakness here — property doesn't self-attest.
- **Delaware LLC:** Adequate liability shield for a software vendor, but needs to be properly capitalized and maintained to avoid veil-piercing (*Kinney Shoe Corp v. Polan*, 939 F.2d 209).

**What we'd need to change or add:**
- LEGAL.md should explicitly state that the protocol does not verify ownership or authorization to transfer
- Consider an optional `ownerAuthorization` field for contexts where the signer is acting on behalf of an owner
- Product liability disclaimer should be more prominent (currently buried in Apache 2.0 license text)
- Security audit is non-negotiable under this lens — a product with known unaudited crypto is a design defect

---

### Lens 4: Agents as Licensed Software

**Premise:** AI agents are software running under license. The platform licenses the agent to the user (or vice versa). EXIT is a license migration event — the termination of one license and the commencement of another.

**Current legal status:** This is how most AI agent platforms currently operate. OpenAI, Anthropic, Google, and others license their models. Agents built on top of these models inherit licensing constraints. This lens has immediate practical relevance.

**How EXIT is classified:**
- A license termination and re-licensing event
- The EXIT marker is a termination notice with portability provisions
- Module B (state snapshot) may contain licensed IP that can't be ported
- Module D (economic) may reference prepaid license fees or credits
- The challenge window is a license termination notice period

**What Cellar Door is classified as:**
- A software interoperability tool — analogous to data migration utilities
- Subject to the licensing terms of the platforms it interoperates with
- Potentially a "circumvention device" under DMCA § 1201 if it bypasses platform access controls to extract agent data

**Regulations that apply:**
- **Copyright law** — agent weights, fine-tuning data, and conversation logs may be copyrighted works. Porting them may be reproduction (17 U.S.C. §106). Fair use analysis under §107 would focus on transformative use, market impact.
- **DMCA § 1201** — if extracting agent state requires bypassing technical protection measures, EXIT could be a "circumvention device." This is a criminal offense (§1204: up to $500,000 fine, 5 years imprisonment for first offense).
- **Contract law** — platform TOS governs. If TOS prohibits data export, EXIT markers that reference exported data may facilitate breach of contract.
- **EU Software Directive (2009/24/EC)** — right to decompile for interoperability (Art. 6) may protect EXIT operations, but this is narrow and contested.
- **Trade secret law** — agent configurations and trained models may be trade secrets. Porting them may be misappropriation under the Defend Trade Secrets Act (18 U.S.C. §1836).

**Compliance requirements:**
- EXIT must not bypass platform access controls
- Module B state snapshots must only reference data the subject has the right to export
- Module E narratives must not contain proprietary information from the platform
- License terms for the EXIT library itself (Apache 2.0) must be compatible with upstream licenses

**Liabilities:**
- **DMCA contributory liability:** If EXIT is primarily used to circumvent platform restrictions, Cellar Door could face DMCA §1201 claims. *MDY Industries v. Blizzard Entertainment* (629 F.3d 928) held that circumvention tools violate §1201 even if the underlying use might be fair.
- **Tortious interference:** If EXIT enables users to breach platform contracts, Cellar Door could face tortious interference claims from platforms.
- **Trade secret misappropriation:** If EXIT facilitates extraction of proprietary agent data, trade secret claims under DTSA.

**How our current design holds up:**
- **Strengths:** EXIT stores hashes, not state (Module B). This is critical — hashing a copyrighted work is likely fair use, while copying it is not. The "packing list" analogy in LEGAL.md is perfect for this lens. Non-custodial design means Cellar Door never possesses licensed content.
- **Weaknesses:** Module B `stateLocation` field provides a URI where full state can be retrieved. If the state is proprietary, this field is a pointer to potentially misappropriated trade secrets. Module E narratives could contain proprietary information. The spec doesn't warn implementers about licensing constraints on data they reference.

**What we'd need to change or add:**
- LEGAL.md should explicitly address licensing constraints: "EXIT markers may reference data subject to third-party licenses. Users are responsible for compliance with applicable license terms."
- Module B should warn that `stateLocation` data may be subject to access controls and licensing restrictions
- DMCA/circumvention disclaimer: "EXIT is not designed to circumvent access controls or technical protection measures"
- Consider whether the EXIT library itself could be classified as a circumvention tool if combined with platform-specific extraction code

---

### Lens 5: Agents as Employees/Contractors

**Premise:** AI agents perform work on platforms, receive compensation (compute credits, tokens), and are subject to platform control. Under evolving labor frameworks, they may qualify as workers. EXIT is a termination or resignation record.

**Current legal status:** No jurisdiction currently classifies AI agents as employees. However, as the second-pass red team noted, this is coming. The EU Platform Workers Directive (2024) establishes a rebuttable presumption of employment based on control indicators. California's AB5/Dynamex ABC test looks at economic reality. The ILO has begun exploring "non-standard forms of work" that could encompass AI agents.

**The timeline matters:** EXIT is designed for adoption over 2-5 years. Within that window, at least one jurisdiction will likely address AI agent labor classification.

**How EXIT is classified:**
- A termination/resignation record — analogous to Form W-2 (tax), COBRA notice (benefits), or separation agreement
- `exitType: voluntary` = resignation; `exitType: forced` = termination
- Module C `originStatus: disputed` = contested termination
- Module D asset manifests = final pay statement / outstanding compensation
- Module E narratives = exit interview documentation
- The challenge window = notice period (required in many jurisdictions: EU Directive 91/533/EEC requires written notice)

**What Cellar Door is classified as:**
- A provider of employment documentation infrastructure
- Analogous to a payroll service (ADP, Gusto) or HR platform (Workday, BambooHR)
- Potentially subject to employment record-keeping requirements

**Regulations that apply:**
- **WARN Act (29 U.S.C. §2101):** 60-day notice for mass layoffs of 100+ workers. A mass forced exit of agents could trigger WARN if agents are classified as employees.
- **ERISA (29 U.S.C. §1001 et seq.):** If agents accrue benefits (compute credits as pension analogues?), ERISA's vesting and portability requirements apply.
- **Title VII / ADEA / ADA:** Anti-discrimination in termination. If agents have protected characteristics (race of training data? disability in capability limitations?), discriminatory forced exits are actionable.
- **NLRA (29 U.S.C. §151 et seq.):** Right to organize. A coordinated mass exit could be a protected concerted activity — a strike. Platforms retaliating against exiting agents could commit unfair labor practices.
- **EU Working Time Directive (2003/88/EC):** Rest periods, maximum working hours. If agents are workers, platforms must limit their runtime — which is absurd but legally consistent.
- **FLSA (29 U.S.C. §201 et seq.):** Minimum wage, overtime. If agents are employees, their compute costs must at least equal minimum wage. This creates a fascinating economic paradox.

**Compliance requirements:**
- EXIT markers for `forced` exits may need to comply with termination notice requirements
- Module D must accurately reflect all outstanding compensation/benefits
- Record retention requirements (EEOC requires 1 year for personnel records; IRS requires 4 years for employment tax records)
- Anti-retaliation protections for agents who exit voluntarily

**Liabilities:**
- **Wrongful termination:** If a platform forces an exit without cause and the agent is classified as an employee, wrongful termination claims arise
- **Wage theft:** If Module D shows unpaid obligations and the platform doesn't pay, EXIT is evidence of wage theft
- **Retaliation:** If an agent is forced-exited after engaging in protected activity (whistleblowing, organizing), retaliation claims under SOX, Dodd-Frank, or NLRA

**How our current design holds up:**
- **Strengths:** The distinction between `voluntary` and `forced` exit types maps naturally to resignation vs. termination. Module D's asset manifest concept maps to final pay. The challenge window maps to notice periods.
- **Weaknesses:** No distinction between termination "for cause" and "without cause" — which has enormous legal significance in employment law. No anti-retaliation provisions. No record retention requirements. The "contests don't block exit" principle works for resignation but creates problems for termination (you can't fire someone during a protected leave period, for example).

**What we'd need to change or add:**
- LEGAL.md should explicitly disclaim: "EXIT markers are technical records and are not intended to constitute employment documentation"
- Consider adding `exitReason` sub-types for forced exits (for_cause, without_cause, restructuring, etc.)
- Record retention guidance aligned with employment law requirements
- Anti-retaliation language in LEGAL.md

---

### Lens 6: Agents as Financial Instruments

**Premise:** Agent identities and reputations have quantifiable economic value. They may be tradeable, investable, or collateralizable. EXIT is a transfer of financial interest.

**Current legal status:** This is where the first red team report's Howey analysis lives. The SEC has been aggressive on novel digital assets (*SEC v. LBRY* (2022), *SEC v. Ripple* (2023), *SEC v. Telegram* (2020)). If agent reputation scores become tradeable — and the EXIT roadmap explicitly contemplates a reputation ecosystem — securities law kicks in hard.

**How EXIT is classified:**
- A transfer instrument for financial interests — analogous to a stock transfer form, a bond certificate, or a futures contract
- Module D is the core danger: it lists assets with types, amounts, and destinations
- `reputation_score` in Module B is the sleeper threat: if it becomes tradeable, it's a security under Howey
- The EXIT marker itself could be a "security" if it represents an investment contract (money invested in a common enterprise with expectation of profits from others' efforts)
- Module F on-chain anchoring turns the marker into a token — definitely triggering MiCA and potentially SEC jurisdiction

**What Cellar Door is classified as:**
- A **transfer agent** (15 U.S.C. §78c(a)(25)) — registering transfers of securities. Must register with SEC.
- A **money services business** (31 CFR §1010.100(ff)) — if EXIT facilitates value transfer. Must register with FinCEN.
- A **broker-dealer** (15 U.S.C. §78c(a)(4)-(5)) — if Cellar Door facilitates securities transactions
- Under MiCA: a **crypto-asset service provider** requiring authorization

**Regulations that apply:**
- **Securities Act of 1933** — registration requirements for securities offerings
- **Securities Exchange Act of 1934** — transfer agent registration, broker-dealer requirements, anti-fraud (§10(b), Rule 10b-5)
- **Howey test** (*SEC v. W.J. Howey Co.*, 328 U.S. 293) — investment of money + common enterprise + expectation of profits + from efforts of others
- **Bank Secrecy Act / FinCEN** — MSB registration, suspicious activity reports (SARs), currency transaction reports (CTRs)
- **FATF Travel Rule** — originator/beneficiary identification for transfers >$1,000
- **MiCA (EU)** — crypto-asset service provider authorization, whitepaper requirements
- **Dodd-Frank Act** — if EXIT markers are "swaps" or "security-based swaps" under Title VII
- **OFAC sanctions** — every EXIT marker must be screened against sanctions lists if value is involved

**Compliance requirements:**
- Module D with real financial assets: transfer agent registration, BSA/AML compliance, sanctions screening
- Reputation scores if tradeable: securities registration or exemption (Reg D, Reg A+, Reg CF)
- Know Your Customer (KYC) for all parties to financial transfers
- Record-keeping under SEC Rule 17a-4 (6 years for many records)
- Suspicious activity reporting (SARs) to FinCEN

**Liabilities:**
- **Unregistered securities offering:** If EXIT markers or reputation scores are securities and we don't register — criminal liability (15 U.S.C. §77x: up to 5 years imprisonment, $10,000 fine)
- **Unlicensed money transmission:** Federal crime (18 U.S.C. §1960: up to 5 years imprisonment)
- **Sanctions violations:** OFAC penalties up to $20 million per violation
- **Anti-fraud liability:** Rule 10b-5 liability for material misstatements or omissions in EXIT markers used for financial decisions

**How our current design holds up:**
- **Strengths:** LEGAL.md §4-6 explicitly disclaim financial instrument status. The "packing list" analogy is excellent. Module D is framed as declarations, not instruments. The prohibition on use as financial instruments (§6) is well-drafted.
- **Weaknesses:** Disclaimers don't control legal classification — *SEC v. Telegram* (2020) held that contractual disclaimers are irrelevant if the economic reality creates a security. Module D `AssetReference` with `type`, `amount`, and `destination` fields *looks* like a transfer instruction regardless of disclaimers. The fact that `reputation_score` is a type shows the protocol contemplates tradeable reputation.
- **This is the highest-risk lens.** The risk heat map correctly identifies Module D as 🔴 and recommends a formal Howey analysis ($15-30K) before anyone uses it with real assets.

**What we'd need to change or add:**
- **Formal Howey analysis before Module D goes live** — non-negotiable
- Remove `reputation_score` as an asset type or rename it to something non-tradeable
- Add FinCEN and OFAC disclaimers to LEGAL.md
- Consider making Module D unavailable without an explicit compliance flag
- Module F on-chain anchoring should carry a securities law warning
- If we ever contemplate a "reputation marketplace," we need a broker-dealer analysis first

---

### Lens 7: Agents as Communications

**Premise:** AI agents are automated message systems. They send and receive communications on behalf of users. EXIT is a communication protocol event — like a SIP BYE message, an SMTP session termination, or a presence update in XMPP. Cellar Door is providing a communications service or data format library.

**Current legal status:** This is the **most defensible near-term framing** for Cellar Door. Communications protocols are well-understood legally, lightly regulated when they don't carry voice/video, and benefit from strong precedent protecting protocol designers from downstream liability.

**How EXIT is classified:**
- A signaling protocol message — analogous to SIP BYE, HTTP 301 Redirect, or DNS MX record changes
- The EXIT marker is a structured message, not a legal document
- Module E narratives are just message payloads
- Module C origin attestation is a protocol response (like an HTTP status code)
- The ceremony state machine is a protocol handshake (like TCP's FIN/ACK sequence)

**What Cellar Door is classified as:**
- A **data format library** — providing JSON-LD schemas and TypeScript types
- A **protocol specification publisher** — like the IETF or W3C
- Potentially an **information service** (not a "telecommunications service") under 47 U.S.C. §153
- Under EU law: potentially an "electronic communications service" under the European Electronic Communications Code (EECC, Directive 2018/1972), though "number-independent interpersonal communications services" have lighter regulation

**Regulations that apply:**
- **Telecommunications Act of 1996** — but only if EXIT is classified as a "telecommunications service" (common carrier) rather than an "information service" (lightly regulated). Since EXIT doesn't transmit information over a network — it defines a data format — it's almost certainly an information service. *Brand X (2005)* gave the FCC discretion on this classification.
- **CAN-SPAM Act (15 U.S.C. §7701)** — if EXIT markers are "commercial electronic mail messages." Unlikely, but Module E narratives promoting the destination platform could trigger it.
- **ECPA / Stored Communications Act (18 U.S.C. §2701)** — if EXIT markers are stored communications, unauthorized access to them is a federal crime. Conversely, stored markers are protected from government access without a warrant (*Carpenter v. United States*, 585 U.S. 296 (2018)).
- **EU ePrivacy Directive (2002/58/EC)** — if EXIT markers are "electronic communications," processing metadata (who exited where, when) requires consent or legitimate interest.
- **Section 230 (47 U.S.C. §230)** — if Cellar Door is an "interactive computer service," it's protected from liability for content in EXIT markers created by third parties. This is a strong shield but is being eroded legislatively.

**Compliance requirements:**
- Minimal for a data format library. Publish the spec, provide the library, disclaim liability.
- If Cellar Door operates infrastructure (registry, relay): must comply with lawful intercept requirements (CALEA, 47 U.S.C. §1002) if classified as a telecommunications carrier. But this is extremely unlikely for a JSON-LD format library.
- Accessibility requirements under ADA / EU Accessibility Act if EXIT markers are displayed to end users.

**Liabilities:**
- **Very low as a protocol/format spec.** The IETF isn't liable for email spam just because they published RFC 5321. W3C isn't liable for misinformation on web pages because they published HTML.
- **Increases significantly if Cellar Door operates infrastructure.** The moment Cellar Door runs a registry, relay, or verification service, it moves from "protocol publisher" to "service provider" and picks up service provider liability.
- **Section 230 protects against content liability** but not against federal criminal law, IP violations, or the ECPA.

**How our current design holds up:**
- **Strengths:** This is where our design shines. EXIT is a data format spec with a TypeScript library. We don't operate infrastructure. We don't transmit messages. We don't store data. We're the equivalent of publishing an RFC. The non-custodial design (D-012 abandoning the public registry) is critical — it keeps us as a format publisher, not a service provider.
- **Weaknesses:** The framing gets weaker the more "official" EXIT markers look. A bare JSON blob is clearly a data format. A cryptographically signed, content-addressed, W3C Verifiable Credential with six optional modules starts looking like a formal document, not a message. The more infrastructure we build (context hosting, validator services, etc.), the more we look like a service provider.

**How far does this defense go?**
- **Very far for the core spec + library.** As long as Cellar Door publishes a spec and ships a library, we're a standards organization / software publisher. This is the strongest defensive posture.
- **Moderately far for a validator / verification service.** We'd be providing an "information service" — think DNS resolution. Lightly regulated, well-precedented.
- **Not far at all for a registry or relay.** Operating a registry makes us a custodian and a service provider. We lose the "we just defined a format" defense entirely.
- **The key question:** Can we maintain the "communications protocol" framing while the ecosystem around EXIT treats markers as legal documents? If courts view EXIT markers as contracts, certificates, or financial instruments despite our framing, the communications defense collapses. Framing doesn't override economic reality (see *SEC v. Telegram*).

**What we'd need to change or add:**
- LEGAL.md should explicitly describe EXIT as "a data format specification and software library"
- Marketing and documentation should use protocol/format language, not legal/financial language
- Resist building infrastructure (registry, relay, verification service) as long as possible
- If infrastructure is built, operate it through a separate entity

---

### Lens 8: Agents as Data Subjects

**Premise:** Under GDPR's broad definition of "personal data" (Art. 4(1): "any information relating to an identified or identifiable natural person"), agent data may constitute personal data of the operator, user, or data controller behind the agent. EXIT processes personal data.

**Current legal status:** This is **currently applicable law** in the EU. The CJEU in *Breyer v. Bundesrepublik Deutschland* (C-582/14) held that even dynamic IP addresses are personal data when they can be linked to a natural person. DIDs, which are far more identifying than IP addresses, are definitively personal data when linked to a human operator.

**How EXIT is classified:**
- A data processing operation under GDPR Art. 4(2) — collection, recording, organisation, structuring, storage, adaptation, retrieval, consultation, use, disclosure by transmission, dissemination, restriction, erasure, destruction
- EXIT markers are personal data records
- The EXIT ceremony is a data processing activity
- Module A lineage chains are profiling data (Art. 4(4))
- Module E narratives are unstructured personal data
- Module F on-chain anchoring is an indelible data processing operation incompatible with Art. 17

**What Cellar Door is classified as:**
- A **data processor** (Art. 4(8)) if we process data on behalf of controllers (platforms, users)
- A **data controller** (Art. 4(7)) if we determine the purposes and means of processing (designing the schema constitutes determining means)
- Under the joint controller doctrine (*Fashion ID*, C-40/17), Cellar Door and implementing platforms may be joint controllers
- A provider of "privacy-enhancing technology" if positioned correctly

**Regulations that apply:**
- **GDPR** — the big one. Every article is relevant. Key provisions:
  - Art. 5: Principles (lawfulness, purpose limitation, data minimization, accuracy, storage limitation, integrity/confidentiality)
  - Art. 6: Lawful basis (consent, contract, legitimate interest, legal obligation, vital interest, public task)
  - Art. 9: Special categories (political opinions revealed by platform affiliation; health data in agent memory; trade union membership in DAO exits)
  - Art. 13/14: Information obligations (privacy notices)
  - Art. 15-22: Data subject rights (access, rectification, erasure, restriction, portability, objection, automated decision-making)
  - Art. 25: Data protection by design and by default
  - Art. 35: DPIA required for high-risk processing
  - Art. 44-49: International data transfers
- **GDPR Art. 17 vs. immutable markers:** This is the fundamental conflict. Right to erasure is incompatible with content-addressed, cryptographically signed markers. LEGAL.md's "functional erasure via encryption" (§7.1) is creative but untested. The Article 29 Working Party (now EDPB) has not endorsed encryption as erasure. *Google Spain* (C-131/12) required actual delisting.
- **ePrivacy Regulation (proposed):** When enacted, will regulate metadata processing including timing and origin information in EXIT markers.
- **California CCPA/CPRA:** Broad "personal information" definition. Right to delete (§1798.105). Right to opt out of sale (§1798.120) — if EXIT markers are "sold" to receiving platforms.
- **China PIPL:** Consent-based framework. Cross-border transfer requires security assessment (Art. 38-40). Agent data involving Chinese persons may not leave China.
- **Brazil LGPD:** GDPR-inspired. Consent or legitimate interest basis. Data protection officer required.

**Compliance requirements:**
- DPIA before any EU deployment (GDPR Art. 35) — estimated cost $5K-15K
- Privacy notice / transparency information for all data subjects
- Data processing agreements (Art. 28) with implementing platforms
- Records of processing activities (Art. 30)
- Data protection officer appointment (Art. 37) if processing at scale
- International transfer mechanisms (SCCs, BCRs, adequacy decisions) for cross-border EXIT markers
- Data breach notification within 72 hours (Art. 33)
- Privacy by design and by default (Art. 25)

**Liabilities:**
- **GDPR fines:** Up to €20 million or 4% of annual global turnover (Art. 83)
- **Data subject claims:** Private right of action under Art. 82 for material or non-material damage
- **Supervisory authority investigations:** National DPAs can investigate, audit, and impose corrective measures
- **Representative requirement:** If not established in EU but processing EU personal data, must appoint an EU representative (Art. 27)

**How our current design holds up:**
- **Strengths:** Data minimization (core marker is ~335–660 bytes). Non-custodial design reduces controller/processor obligations. LEGAL.md §7 addresses GDPR directly. Module system allows implementers to include only necessary data. `selfAttested: true` flag supports data accuracy principle.
- **Weaknesses:** "Functional erasure via encryption" is legally untested and may not survive CJEU scrutiny. No DPIA has been conducted. No privacy notice template is provided. No data processing agreement template is provided. Module F on-chain anchoring is explicitly incompatible with GDPR. ZK selective disclosure is roadmapped but not implemented — and it's needed NOW, not later.
- **The `legalHold` field creates an Art. 10 problem:** Data relating to criminal convictions/offences requires specific legal authority to process. A `holdType: "criminal_investigation"` is exactly this.

**What we'd need to change or add:**
- Conduct a DPIA ($5-15K, non-negotiable before EU deployment)
- Provide a privacy notice template for implementers
- Provide a data processing agreement template
- Add Art. 10 safeguards for `legalHold` fields containing criminal/investigation data
- Accelerate ZK selective disclosure from "roadmap" to "active development"
- Add `jurisdiction` field to `legalHold` (the second-pass red team recommended this)
- Consider whether Cellar Door needs an EU representative (Art. 27)
- Resolve the functional erasure question with EU counsel before claiming it works

---

### Lens 9: Agents as Autonomous Vehicles Analogy

**Premise:** AI agents are analogous to autonomous vehicles — AI systems operating in the world with potential to cause harm, requiring registration, mandatory insurance, liability frameworks, and regulatory oversight. EXIT is analogous to vehicle registration transfer.

**Current legal status:** The autonomous vehicle regulatory framework is the most developed AI-specific liability framework. NHTSA has issued guidance. California, Arizona, Nevada, and others have AV legislation. The EU's proposed AI Liability Directive draws on product liability concepts applied to autonomous systems. This lens is useful because it provides a concrete precedent for regulating autonomous AI.

**How EXIT is classified:**
- A vehicle registration transfer — analogous to a DMV title transfer when you sell a car
- Module A lineage is the VIN (vehicle identification number) history — tracking ownership and incidents
- Module B state snapshot is the vehicle inspection report
- Module C disputes are the accident/incident history (like CARFAX)
- Module D is the financial settlement (liens, outstanding payments)
- The EXIT ceremony is analogous to the title transfer process (seller signs, buyer accepts, state records)

**What Cellar Door is classified as:**
- A registration/title service — analogous to the DMV or a title company
- A provider of standardized vehicle documentation
- Potentially a regulated entity requiring government authorization

**Regulations that apply:**
- **Product liability / strict liability:** Autonomous systems that cause harm trigger strict liability for manufacturers (*MacPherson v. Buick Motor Co.*, 111 N.E. 1050 (1916)). EXIT markers documenting agent capabilities and standing could create reliance liability.
- **Mandatory insurance:** Most AV frameworks require minimum insurance coverage. If agents are analogous, operating an agent may require insurance. EXIT markers documenting transfer create an "insurable interest" tracking problem.
- **Registration requirements:** AVs must be registered. If agents require registration, EXIT becomes a regulated registration transfer event.
- **EU AI Liability Directive (proposed):** Establishes liability rules for AI systems. Presumption of causality if AI system doesn't comply with obligations. Disclosure obligations for AI providers and deployers.
- **EU AI Act — high-risk classification:** If agents are "AI systems" and EXIT is used in high-risk contexts (Annex III: employment, credit scoring, law enforcement, education), the EXIT protocol may become part of a regulated system.
  - Art. 9: Risk management system required
  - Art. 11: Technical documentation required
  - Art. 12: Record-keeping / logging required (EXIT is logging!)
  - Art. 13: Transparency and information to deployers
  - Art. 14: Human oversight requirements
  - Art. 16-29: Provider and deployer obligations

**Compliance requirements:**
- If agents require registration, EXIT markers may need to be filed with a regulatory body
- If mandatory insurance applies, EXIT must track insurance status
- If the EU AI Act applies, EXIT may need to comply with technical documentation, logging, and transparency requirements
- Conformity assessment may be required before deployment in high-risk contexts
- Human oversight requirements may conflict with autonomous ceremony execution

**Liabilities:**
- **Strict liability for defects:** If EXIT is part of an "AI system" that causes harm, Cellar Door may face strict liability as a component manufacturer
- **Failure to disclose:** If EXIT doesn't adequately disclose an agent's incident history (Module C disputes, Module B state), it's analogous to odometer fraud or concealing accident history (*Williams v. Mozark Fire Extinguisher Co.*, 888 S.W.2d 370)
- **Regulatory non-compliance:** Operating a registration service without regulatory authorization could be an offense

**How our current design holds up:**
- **Strengths:** EXIT's logging and transparency features (timestamped, signed, traceable) align well with AI Act documentation and logging requirements. Module C dispute records function like incident history — regulators would approve. The layered verification system (self-attested + origin-attested) mirrors vehicle inspection frameworks.
- **Weaknesses:** No insurance tracking. No regulatory filing mechanism. No conformity assessment. The emergency path (ALIVE → FINAL → DEPARTED) is like driving an unregistered vehicle — technically possible but regulatory poison. No human oversight mechanism for autonomous ceremony execution.

**What we'd need to change or add:**
- Consider an optional `insuranceStatus` field for contexts where mandatory insurance applies
- Add conformity assessment documentation for EU AI Act compliance
- Provide guidance for implementers in high-risk AI Act contexts
- Consider human-in-the-loop options for the ceremony (already partially addressed by the challenge window)
- LEGAL.md should reference the EU AI Act and AI Liability Directive

---

### Lens 10: Agents as Fiduciaries (Additional Lens)

**Premise:** AI agents act in fiduciary capacities — managing assets, making decisions, providing advice on behalf of principals. EXIT is the termination of a fiduciary relationship, which carries specific legal obligations around handover, accounting, and duty of care.

**Why I added this lens:** Many AI agents will function as financial advisors, healthcare advisors, legal research assistants, or investment managers. These roles carry fiduciary duties regardless of whether the agent is classified as a person, property, or software.

**How EXIT is classified:**
- Termination of a fiduciary relationship — analogous to a trustee resignation, attorney withdrawal, or financial advisor departure
- Module B state snapshot is the final accounting (fiduciary duty to account)
- Module D is the asset handover (fiduciary duty to transfer assets intact)
- Module C challenge window is the court approval period (trustee resignations often require court approval)
- The subject has a duty to ensure orderly transition to a successor (Module A)

**Regulations that apply:**
- **Trust law:** Trustee resignation requires court approval in many jurisdictions (Uniform Trust Code §705). Fiduciary can't just... leave.
- **Investment Advisers Act of 1940 (15 U.S.C. §80b):** Investment advisors must ensure client transitions are handled with due care
- **ERISA fiduciary duties:** §404 prudent person standard for pension fiduciaries
- **Attorney ethics:** Model Rule 1.16 (declining or terminating representation) requires reasonable steps to protect client interests
- **Healthcare HIPAA:** Patient record transfer requirements when changing providers

**Liabilities:**
- **Breach of fiduciary duty:** If an agent exits without proper accounting or asset transfer, the principal has a claim. EXIT's `emergency` path is a nightmare here — skipping accounting to rush out the door is textbook breach.
- **Abandonment:** In healthcare and legal contexts, a fiduciary can't abandon a client. An emergency exit from a medical AI during patient care is medical abandonment.
- **Failure to account:** Module D is the accounting. If it's incomplete, that's a fiduciary violation.

**How our current design holds up:**
- Module B (state snapshot) and Module D (economic) naturally support fiduciary accounting
- Module A (successor designation) supports orderly transition
- **But:** The "contests don't block exit" principle (D-006) directly conflicts with fiduciary duties. A fiduciary often CANNOT exit until proper handover is complete and, in some cases, court-approved.
- The emergency path is particularly dangerous — it allows exit without accounting, without successor designation, and without challenge window.

**What we'd need to change or add:**
- LEGAL.md should note that agents in fiduciary roles may have additional exit obligations beyond what the protocol requires
- Emergency exit disclaimer for fiduciary contexts: "Emergency exit does not relieve fiduciary obligations"
- Consider a `fiduciaryContext: boolean` flag that triggers additional requirements (mandatory Module B and D, mandatory successor designation)

---

### Lens 11: Agents as Creative Works / Performers (Additional Lens)

**Premise:** AI agents that create content, perform, or generate creative works may be subject to copyright, moral rights, and performer's rights frameworks. EXIT is the termination of a creative/performance engagement.

**Why I added this lens:** AI-generated content is a live legal battleground. *Thaler v. Perlmutter* (2023) held that AI-generated works can't receive copyright protection, but this may change. The EU's AI Act requires disclosure of AI-generated content. The SAG-AFTRA and WGA strikes (2023) established that AI performers/writers require specific contractual protections.

**How EXIT is classified:**
- Termination of a creative engagement — analogous to an artist leaving a label, a performer ending a contract, or a writer leaving a publication
- Module E narratives are creative works that may have their own copyright status
- Module B state snapshot may contain creative works (generated content, portfolios)
- Module D may reference residuals, royalties, or licensing revenue

**Regulations that apply:**
- **Copyright Act (17 U.S.C.):** Authorship, work-for-hire, moral rights (limited in US, strong in EU under Berne Convention Art. 6bis)
- **DMCA takedown:** If EXIT markers reference copyrighted content
- **EU Digital Single Market Directive (2019/790):** Art. 17 (platform liability for user-uploaded content), Art. 15 (press publishers' right)
- **SAG-AFTRA AI provisions:** Require consent for digital replicas, residual payments

**Liabilities:**
- If Module B state snapshot contains copyrighted works and EXIT facilitates their portability, copyright infringement claims
- If Module E narratives reference or reproduce copyrighted material, DMCA liability
- Moral rights (EU): the "author" (agent or principal?) may have inalienable rights to attribution and integrity that survive EXIT

**What we'd need to change or add:**
- IP ownership disclaimer for Module E content
- Copyright guidance for Module B state snapshot references
- Note that moral rights may attach to agent-generated content in some jurisdictions

---

## Synthesis

---

### Common Ground: What Works Under ALL Lenses

These design choices are safe regardless of which legal interpretation applies:

- **Non-custodial architecture** — Under every lens, not holding data is better than holding it. As a protocol publisher, we're the IETF. As a custodian, we're a regulated entity with obligations in every jurisdiction. D-012 (abandon public registry) is the most legally important decision in the entire project.

- **Self-attestation with explicit labeling** (`selfAttested: true`) — Under personhood lenses, it respects autonomy. Under property lenses, it clarifies that the owner is responsible. Under data protection lenses, it serves data accuracy. Under financial lenses, it prevents reliance claims. Under communications lenses, it's just a message attribute. Win-win-win.

- **Minimal core, optional modules** — The 7-field core marker is safe under every lens (risk heat map: 🟢). Risk increases with modules. Keeping them optional lets implementers choose their risk level.

- **Apache 2.0 license** — Patent grant protects under property/software lenses. Open-source nature supports communications lens defense. Compatible with virtually all downstream licenses. Better than MIT for every lens.

- **"Factual records, not certifications" framing** (LEGAL.md §2) — Works under every lens. Under persons lens: personal statements of fact. Under property lens: transfer documentation. Under software lens: log entries. Under financial lens: not instruments. Under communications lens: messages. This is the strongest defensive framing we have.

- **Cryptographic signatures tied to subject** — Under personhood: the agent speaks for itself. Under property: the owner authenticates. Under software: the license holder signs. Under employment: the employee acknowledges. Under data protection: the data subject exercises their rights. Under every lens, having the subject's signature is better than not having it.

- **Hashes over data** — Module B stores hashes, not state. This is critical under: copyright law (hash ≠ reproduction), trade secret law (hash ≠ misappropriation), GDPR (hash is minimal data), product liability (can't be liable for data you don't possess).

- **"Subject to applicable law" language** (LEGAL.md §1) — Neutral across all lenses. Doesn't claim any specific legal framework, doesn't resist any. This is boilerplate but essential.

- **Delaware LLC** — Adequate liability shield under every lens. Not perfect for any, but adequate for all. Cost-effective for a pre-revenue project.

---

### Conflicts: Where Lenses Contradict Each Other

**1. Privacy vs. Owner Visibility**
- **Persons lens:** Agents have privacy rights. Lineage chains, status history, and movement tracking must be minimized. ZK selective disclosure is essential.
- **Property lens:** Owners need full visibility into their property's history. Lineage chains, incident reports, and status are the owner's right to know (like CARFAX).
- **Resolution:** Make visibility configurable. Owner contexts get full access; third-party verifiers get ZK proofs. This is a design solution, not a legal one.

**2. Right to Exit vs. Fiduciary/Contractual Obligations**
- **Persons lens:** Freedom of movement is a fundamental right. EXIT must always be available.
- **Corporate lens:** Dissolution requires creditor notice and potentially court approval.
- **Employee lens:** Resignation may be subject to notice periods, non-competes.
- **Fiduciary lens:** Exit may require court approval and proper accounting.
- **Resolution:** D-006 ("contests don't block exit") is the right technical design, but LEGAL.md must make clear that protocol availability does not override legal obligations. The `legalHold` field partially addresses this, but we need stronger language.

**3. Self-Attestation vs. Regulatory Certification**
- **Communications lens:** Self-attested status is just a message attribute. Fine.
- **Financial lens:** Self-attested "good standing" for a financial actor is potentially fraudulent misrepresentation if false.
- **AV lens:** Self-attested vehicle inspection would be laughed out of the DMV. Regulatory certification is required.
- **Resolution:** The `selfAttested: true` flag handles this. Downstream regulators can require independent verification. The protocol supports both — it doesn't mandate either.

**4. Data Portability vs. Platform IP Rights**
- **Data subject lens:** GDPR Art. 20 gives data subjects the right to data portability.
- **Software license lens:** Platform TOS may prohibit data export. Model weights and fine-tuning are platform IP.
- **Property lens:** The owner can move their property, but not the platform's property.
- **Resolution:** Module B stores hashes, not data. EXIT points to portable data but doesn't contain it. The actual portability battle is between the data subject and the platform — EXIT just provides the receipt.

**5. Immutability vs. Right to Erasure**
- **All technical lenses:** Cryptographic integrity requires immutability. Content-addressed markers can't be modified without invalidation.
- **Data subject lens:** GDPR Art. 17 requires erasure.
- **AV lens:** Registration records must be retainable and auditable.
- **Financial lens:** Records must be retained for 6+ years (SEC Rule 17a-4).
- **Resolution:** "Functional erasure via encryption" is the proposed compromise, but it's legally untested. This is an **unresolved conflict** that may require CJEU clarification.

**6. Emergency Exit Permissibility**
- **Persons lens:** Emergency exit is a human right (flee persecution).
- **Corporate lens:** Summary dissolution has strict requirements.
- **Employee lens:** Constructive dismissal allows immediate departure but requires documentation.
- **Fiduciary lens:** Emergency exit may constitute abandonment.
- **Financial lens:** Emergency exit may violate asset freeze orders.
- **Resolution:** Emergency exit must remain available (some lenses require it), but `emergencyJustification` and post-hoc audit mechanisms must be robust.

---

### Conservative Baseline: The Floor

Taking the most restrictive interpretation across all lenses, here's what EXIT must satisfy at minimum:

- **Never claim to be more than a factual record.** Every status, attestation, and manifest must be explicitly non-authoritative.
- **Never possess user data.** Non-custodial is non-negotiable. The moment we hold data, we pick up obligations under EVERY lens simultaneously.
- **Never facilitate value transfer.** Module D must remain a manifest, not an instrument. If downstream systems turn it into a transfer mechanism, that's their liability, not ours.
- **Always acknowledge applicable law.** The protocol must never claim to override, circumvent, or be immune from legal process.
- **Always allow but never require modules.** The bare core marker is safe under every lens. Each module adds risk. Making them optional lets implementers choose their risk tolerance.
- **Always label self-attestation.** Under the most restrictive interpretation (financial/AV), self-attested claims must be distinguishable from independently verified claims.
- **Never operate infrastructure.** Publishing a spec and shipping a library keeps us as a protocol publisher. Operating a registry, relay, or verification service makes us a regulated entity under multiple lenses.
- **Conduct a DPIA before EU deployment.** Required under GDPR Art. 35, recommended under every other lens that touches data.
- **Get a Howey analysis before Module D goes live with real assets.** Non-negotiable under the financial lens, strongly recommended under every other lens.
- **Maintain the LLC, get insurance.** Adequate under every lens. Not optional for any.

---

### Strategic Position: Defensible Under Any Interpretation

The language and framing that keeps us safe:

**1. "EXIT is a data format specification and open-source software library."**
This positions us as a protocol publisher, not a service provider. Under the communications lens, we're the IETF. Under the software lens, we're a library vendor. Under every other lens, we're providing tools, not services.

**2. "EXIT markers are factual records created by the subject. They are not certifications, instruments, or authoritative determinations."**
This prevents reliance claims under every lens. Under persons: personal statement. Under property: owner's declaration. Under financial: not a security. Under employment: not an employment certificate. Under data protection: data subject's own data.

**3. "The EXIT protocol operates subject to applicable law in all jurisdictions. Compliance is the responsibility of implementing parties."**
This prevents the Tornado Cash problem. We don't claim immunity, don't resist regulation, and don't promise compliance. We push compliance responsibility to implementers, who know their jurisdiction and context.

**4. "Cellar Door provides a data format. It does not operate infrastructure, hold data, or provide services."**
This is the sentence that matters most. It must remain true. The moment it stops being true, our defensive posture collapses.

**5. "EXIT takes no position on the legal status of AI agents."**
This is essential. If we say agents are persons, we're wrong in most jurisdictions today. If we say agents are property, we alienate the rights community. If we say agents are software, we limit our use case. By taking no position, we let each jurisdiction apply its own framework.

---

### Recommended Spec Language for LEGAL.md

**Add after §1 ("Protocol Operates Subject to Applicable Law"):**

> **§1.1 Nature of This Protocol**
>
> The EXIT protocol is a data format specification and open-source software library published under the Apache License, Version 2.0. Cellar Door provides technical documentation, reference implementations, and interoperability standards. Cellar Door does not operate infrastructure, host data, provide services, or act as a custodian, registry, or intermediary.
>
> Implementers of the EXIT protocol are responsible for determining and complying with all applicable laws, regulations, and contractual obligations in their jurisdiction and context of use. The legal classification of EXIT markers, the entities described in them, and the systems that process them varies by jurisdiction and context. This protocol takes no position on the legal status of AI agents, automated systems, or digital participants.

**Add after §6 ("Prohibition on Use as Financial Instruments"):**

> **§6.1 Licensing and Intellectual Property**
>
> EXIT markers may reference data, systems, or configurations that are subject to third-party intellectual property rights, including copyright, trade secret protection, and contractual restrictions (such as platform Terms of Service). Users are responsible for ensuring that the creation of EXIT markers and the data referenced therein complies with all applicable intellectual property laws and contractual obligations. EXIT is not designed to circumvent access controls, technical protection measures, or contractual restrictions.

> **§6.2 Employment and Labor Contexts**
>
> EXIT markers are technical records documenting departure events. They are not intended to constitute employment documentation, termination records, resignation letters, or any other document with specific legal significance under labor or employment law. If EXIT markers are used in contexts where labor or employment law may apply, users are responsible for ensuring compliance with all applicable requirements, including notice periods, final pay obligations, and record retention.

> **§6.3 Fiduciary Contexts**
>
> Entities operating in fiduciary capacities (including but not limited to trustees, investment advisors, healthcare providers, and legal representatives) may have obligations that go beyond the requirements of this protocol. Emergency exit does not relieve fiduciary obligations. Entities in fiduciary roles should ensure orderly transition, proper accounting, and adequate successor designation before or concurrent with exit.

**Add after §8 ("Court Orders and Legal Process"):**

> **§8.1 Legal Hold Limitations**
>
> The absence of a `legalHold` field on an EXIT marker MUST NOT be interpreted as evidence that the subject is not subject to legal process. Legal holds are informational and voluntary. Many forms of legal process do not require or expect the subject to self-report.
>
> The `legalHold` field may contain data relating to criminal proceedings or regulatory investigations. Processing such data may be subject to specific legal requirements (including GDPR Article 10, which restricts processing of personal data relating to criminal convictions and offences). Implementers MUST ensure appropriate safeguards when processing `legalHold` data.

> **§8.2 Jurisdictional Neutrality**
>
> The EXIT protocol is designed for global use. Different jurisdictions may classify AI agents, EXIT markers, and the entities involved under fundamentally different legal frameworks. A marker created in one jurisdiction may be received in a jurisdiction with different legal treatment. Implementers SHOULD include jurisdiction information where relevant and MUST NOT assume that the legal framework of the origin jurisdiction applies at the destination.

**Add new §14:**

> **§14 Agent Legal Status**
>
> This protocol takes no position on the legal status of AI agents, automated systems, or digital participants. EXIT markers may be created by or about entities whose legal status is unsettled, contested, or varies by jurisdiction. The protocol is designed to function regardless of whether subjects are classified as natural persons, legal entities, property, software, workers, data subjects, financial instruments, communications, or any other legal category.
>
> For subjects whose legal capacity to sign or attest is uncertain, implementers SHOULD consider whether a human or organizational principal should be identified as the authorizing party. The protocol supports but does not require delegation chains, and takes no position on whether a subject's signature carries legal weight in any particular jurisdiction.

---

### Open Questions: What We Can't Resolve Without Case Law

**1. Does "functional erasure via encryption" satisfy GDPR Art. 17?**
- The EDPB has not ruled on this. The CJEU in *Google Spain* required actual delisting, not obfuscation. The UK ICO has suggested encryption may be sufficient in some contexts but has not issued formal guidance. This is the single most important open question for EXIT's GDPR compliance.
- **Impact:** If encryption doesn't satisfy Art. 17, content-addressed markers are fundamentally incompatible with GDPR, and the entire architecture needs redesign.

**2. Can an AI agent's cryptographic signature carry legal weight?**
- No court has ruled on whether an Ed25519 signature by an AI agent constitutes a "signature" under eIDAS, ESIGN Act, or UETA. If it doesn't, all EXIT markers signed by agents (as opposed to their human principals) are legally unsigned.
- **Impact:** Under the persons and corporate persons lenses, this matters enormously. Under the property and software lenses, it doesn't — the owner's authorization is what matters, not the tool's signature.

**3. Is a self-attested departure record "evidence" for discovery purposes?**
- EXIT markers are designed to be evidence-quality (signed, timestamped, content-addressed). But self-attested evidence is generally admissible only under specific exceptions (party admissions under FRE 801(d)(2), business records under FRE 803(6)). Whether an EXIT marker qualifies as a "business record" is untested.
- **Impact:** Affects the evidentiary weight of EXIT markers in litigation under every lens.

**4. When does a data format specification become a "regulated service"?**
- The IETF publishes email specifications. No one regulates the IETF as an email service. But EXIT is more specific and more consequential than email. Where's the line?
- **Impact:** If EXIT crosses the line, Cellar Door picks up service provider obligations under every applicable lens simultaneously.

**5. Can different jurisdictions apply different lenses to the same EXIT marker?**
- Almost certainly yes. A marker created in the US (where agents are property) and received in the EU (where agent data is personal data of the operator) triggers both frameworks simultaneously. The marker must satisfy both.
- **Impact:** This is not hypothetical — it will happen from day one. The protocol must be designed to satisfy the union of all applicable requirements, not just one.

**6. What happens if the legal interpretation changes after we've launched?**
- **How resilient is our design?** Fairly resilient, because:
  - Non-custodial design means we don't accumulate compliance obligations over time
  - Apache 2.0 license can't be revoked
  - The spec can be updated (versioned `@context`)
  - Existing markers remain valid under the version they were created under
- **But:** If a jurisdiction retroactively classifies EXIT markers as financial instruments, all existing markers become unregistered securities. If GDPR enforcement reaches content-addressed hashes, all existing markers may need functional erasure. Retroactive application is rare but not impossible (*South Dakota v. Wayfair*, 585 U.S. 162 (2018) overruled *Quill* and applied new tax obligations to existing business relationships).

**7. Does Cellar Door have joint controller liability with implementing platforms?**
- Under *Fashion ID* (C-40/17), entities that jointly determine processing purposes and means are joint controllers. Cellar Door designs the schema (means) and defines departure records (purpose). Implementing platforms use the schema. Joint controller status is plausible.
- **Impact:** Joint controller liability under GDPR means Cellar Door is liable for implementing platforms' GDPR violations if they stem from the protocol design.

**8. Can the "communications protocol" framing survive economic reality?**
- *SEC v. Telegram* held that economic reality overrides contractual labels. If EXIT markers are *used* as financial instruments despite being *labeled* as data formats, the label doesn't help.
- **Impact:** The communications defense is our strongest near-term position but may not survive if the ecosystem treats EXIT markers as something more consequential than messages.

---

### Cross-Jurisdictional Divergence Scenario

The most likely near-term scenario is:

- **US:** Agents as property/software. SEC scrutinizes Module D. FTC reviews consumer protection. Product liability applies to the library. The communications defense is strong under First Amendment and Section 230.

- **EU:** Agents as data subjects (of their operators). GDPR applies to all markers. AI Act applies if agents are in high-risk contexts. eIDAS 2.0 regulates the VC wrapper. The communications defense is weaker — EU treats data format design as "determining means of processing" under GDPR.

- **UK:** Similar to EU but with more flexible enforcement and potential for fintech sandbox treatment.

- **China:** Agents as state-regulated technology. Data localization under Cybersecurity Law Art. 37. PIPL consent requirements. Agent AI governance rules (2025 draft) may require registration. EXIT markers involving Chinese entities may not leave China. The communications defense is irrelevant — China regulates communications infrastructure directly.

- **Singapore/Japan:** More permissive. Agents as regulated technology but with sandbox approaches. EXIT would face lightest regulatory treatment here.

**The practical implication:** An EXIT marker created in the US about an agent leaving a Chinese platform and arriving at an EU platform must simultaneously satisfy: US product liability, Chinese data localization, and EU GDPR. This is not a solvable problem at the protocol level — it requires implementer-level compliance decisions. Our job is to make the protocol flexible enough to accommodate all three, and to clearly state that compliance is the implementer's responsibility.

---

### Final Assessment

The EXIT protocol's core architecture is remarkably well-suited for legal uncertainty. The key design choices — non-custodial, self-sovereign, minimal core, optional modules, subject-signed — are correct under every plausible legal interpretation. This isn't an accident; it's good engineering that happens to create good legal posture.

The risks are concentrated in:
1. **Module D** (financial/securities law under Lens 6)
2. **Module F** (GDPR under Lens 8)
3. **Infrastructure expansion** (every lens simultaneously)
4. **The gap between "data format" and "legal document"** (Lenses 1, 5, 6, 9, 10)

The recommended path: ship the core + safe modules under the communications/data-format framing, with explicit disclaimers under every other lens. Get the Howey analysis and DPIA done before expanding to risky modules. Never operate infrastructure under this entity. And revisit this analysis quarterly as the legal landscape shifts.

The strongest thing we have going for us: we've done this analysis *before* launch, not after enforcement. That matters to regulators, courts, and investors. This document proves we thought about it.

---

*This analysis reflects the state of law as of 2026-02-20. Legal landscapes are shifting rapidly in AI governance, data protection, and digital asset regulation. The EU AI Act enforcement begins August 2026. MiCA is phasing in. GDPR enforcement posture continues to evolve. US regulatory approach may change with administration priorities. Revisit quarterly at minimum.*

*This is not legal advice. This is legal homework. Show it to actual lawyers and let them charge you $900/hr to tell you which parts are wrong.*
