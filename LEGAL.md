# EXIT Protocol — Legal & Compliance Guide

**Version:** 1.2
**Last Updated:** 2026-03-04
**Applies to:** EXIT Specification v1.2

---

## ⚠️ DISCLAIMER

**This document is not legal advice.** It is a good-faith analysis prepared by protocol designers, not attorneys. It identifies legal risks, provides templates, and suggests compliance strategies — but it does not substitute for qualified legal counsel.

**Consult a licensed attorney in your jurisdiction before deploying EXIT in production.** Regulatory landscapes differ by jurisdiction, and enforcement postures evolve. The analysis below focuses primarily on U.S. federal law and references EU law where relevant; other jurisdictions may impose additional or different requirements.

Nothing in this document creates an attorney-client relationship, constitutes a legal opinion, or should be relied upon as the sole basis for compliance decisions.

---

## Table of Contents

1. [FCRA Considerations](#1-fcra-considerations)
2. [Liability Model](#2-liability-model)
3. [ZK Extension Path](#3-zk-extension-path)
4. [Defamation Considerations](#4-defamation-considerations)
5. [Export Controls](#5-export-controls)
6. [Securities Considerations](#6-securities-considerations)
7. [Antitrust Considerations](#7-antitrust-considerations)

---

## 1. FCRA Considerations

The Fair Credit Reporting Act (15 U.S.C. §1681 et seq.) regulates "consumer reports" — communications bearing on a consumer's character, reputation, or personal characteristics, used or expected to be used for certain "permissible purposes" including employment, credit, and insurance decisions.

EXIT markers can constitute consumer reports depending on **who creates them**, **what they contain**, and **how they are used**.

### 1.1 When FCRA Likely Applies

FCRA likely applies when **all three conditions** are met:

1. **The marker is platform-issued** (not self-attested). A platform co-signing a marker with `originStatus: "forced"` or `originStatus: "voluntary"` is furnishing information about a person's character or general reputation.
2. **The marker pertains to a human operator.** Agent DIDs ultimately represent human operators or entities controlled by humans. Under CFPB's expanding interpretation of "consumer" in the AI context, the human behind the agent is the protected party.
3. **A destination platform uses the marker for an admission decision.** Denying an agent admission, imposing restrictions, or requiring additional verification based on EXIT marker content constitutes a "permissible purpose" use analogous to employment screening.

When these conditions are met, the **origin platform** may be a "furnisher" under FCRA, and any entity **regularly assembling or evaluating** EXIT markers for third-party use may qualify as a Consumer Reporting Agency (CRA).

### 1.2 When FCRA Likely Does NOT Apply

- **Self-attested markers** (`selfAttested: true`): The subject is producing their own record. FCRA regulates third-party reports about consumers, not a consumer's own statements. A self-attested marker is more analogous to a résumé than a background check.
- **Markers used solely for audit or forensic purposes**: If a platform retains EXIT markers only for internal record-keeping, incident investigation, or regulatory compliance — and does not use them to make decisions about the subject — the markers are not "consumer reports."
- **Markers about non-human entities**: If a DID represents a purely autonomous agent with no identifiable human operator, FCRA's consumer protection framework may not apply. This is legally untested.

### 1.3 Template Adverse Action Notice

When a destination platform denies admission or takes adverse action based in whole or in part on information contained in an EXIT marker, it must provide the following notice to the affected operator. This template follows FCRA §1681m(a).

> ---
>
> **NOTICE OF ADVERSE ACTION**
>
> **Date:** [DATE]
>
> **To:** [OPERATOR NAME / DID]
>
> **From:** [DESTINATION PLATFORM NAME]
>
> This notice is to inform you that [DESTINATION PLATFORM] has [denied your admission / imposed restrictions on your account / taken the following action: ___________] based in whole or in part on information obtained from an EXIT departure marker.
>
> **Source of Information:**
> - Marker ID: `[MARKER_CONTENT_ID]`
> - Issuing Platform: [ORIGIN PLATFORM NAME]
> - Marker Date: [ISO 8601 TIMESTAMP]
>
> [DESTINATION PLATFORM] did not make this decision based solely on the EXIT marker. [Describe any additional factors if applicable.]
>
> **Your Rights Under Federal Law:**
>
> 1. You have the right to obtain a free copy of the EXIT marker and any associated dispute bundles that were used in this decision. Contact [ORIGIN PLATFORM] at [CONTACT INFO] to request your file.
>
> 2. You have the right to dispute the accuracy or completeness of any information in the EXIT marker. To initiate a dispute, contact:
>    - [ORIGIN PLATFORM]: [DISPUTE CONTACT METHOD]
>    - [DESTINATION PLATFORM]: [DISPUTE CONTACT METHOD]
>
> 3. You have the right to submit a statement of dispute (up to 100 words) that will be included with the marker in future disclosures.
>
> 4. The information source identified above did not make the adverse decision and cannot explain why the decision was made.
>
> For more information about your rights under the Fair Credit Reporting Act, visit [www.consumerfinance.gov](https://www.consumerfinance.gov).
>
> ---

### 1.4 Dispute Investigation Procedure

Platforms issuing EXIT markers that may be subject to FCRA must implement a dispute resolution process. The following outlines the required procedure under §1681i:

**Day 0 — Dispute Received:**
- Accept disputes via at least two channels (email + web form recommended)
- Acknowledge receipt within 5 business days
- Provide the operator with a copy of the disputed marker

**Days 1–30 — Investigation Period:**
- Conduct a reasonable investigation into the disputed information
- Review all relevant evidence provided by the operator
- Consult internal records (logs, audit trails, incident reports)
- If the origin platform cannot verify the accuracy of the disputed information, it must be deleted or modified

**Day 30 — Resolution:**
- Notify the operator of the results in writing
- If the marker is found to be inaccurate or unverifiable:
  - Issue a `MarkerAmendment` (see spec §6) correcting the record
  - Notify any destination platform known to have received the marker
- If the marker is verified as accurate:
  - Inform the operator of their right to add a statement of dispute
  - The statement must be included in any future disclosure of the marker

**Day 45 — Extended Deadline (if applicable):**
- If the operator provides additional information during the investigation, the deadline extends to 45 days

### 1.5 Maximum Reporting Periods

EXIT marker sunset periods are designed to align with FCRA's maximum reporting limitations:

| Marker Type | Sunset Period | FCRA Analog |
|---|---|---|
| Voluntary departure | 730 days (2 years) | No direct analog; conservative |
| Involuntary / forced departure | 365 days (1 year) | More restrictive than FCRA's 7-year default |

**Critical note on chain-anchored markers:** Markers anchored to a blockchain or immutable ledger may persist indefinitely beyond these sunset periods. **Destination platforms MUST NOT rely on markers whose sunset period has expired**, regardless of whether the underlying data remains technically accessible. Verifier implementations should check `expiresAt` or compute expiration from `timestamp` + sunset duration and reject expired markers.

---

## 2. Liability Model

EXIT distributes responsibility across multiple parties. No single entity bears all liability.

### 2.1 Protocol Designer (Cellar Door Project)

The Cellar Door project provides a **communication format and ceremony specification**. It does not:

- Operate a reporting service
- Verify, endorse, or warrant any attestation
- Store, transmit, or aggregate markers
- Make admission decisions about any agent

**§230 / CDA Analysis:** Whether the protocol specification itself qualifies for §230 immunity as a provider of an "interactive computer service" is legally ambiguous. The protocol is a standard, not a service. §230 was designed for platforms that host third-party content, not for specification authors. However, if the Cellar Door project provides reference implementations, hosted tools, or verification services, the analysis shifts. **This question is unresolved and may require litigation to clarify.**

The protocol's liability posture is analogous to that of a file format specification (e.g., PDF, JSON-LD) — the format enables expression but does not control what is expressed.

### 2.2 Origin Platform (Marker Issuer)

The origin platform bears primary responsibility for:

- **Accuracy** of `originStatus` and any factual assertions in the marker
- **Dispute handling** under FCRA (if applicable) and the EXIT dispute procedure
- **Proportionality** of forced-exit markers — the anti-weaponization clause (§8.6) establishes a duty not to issue markers as retaliation or punishment
- **Data protection compliance** for personal data included in the marker (see GDPR_GUIDE.md)

An origin platform issuing a marker with knowingly false `originStatus` faces potential liability for defamation, FCRA inaccuracy violations, and GDPR accuracy requirements (Art. 5(1)(d)).

### 2.3 Destination Platform (Marker Consumer)

The destination platform bears responsibility for:

- **Admission decisions** — the destination makes the decision, not the marker
- **Adverse action notices** — if FCRA applies, the destination must notify (see §1.3 above)
- **Independent judgment** — relying solely on an EXIT marker without independent evaluation increases liability
- **Expired markers** — using markers beyond their sunset period
- **Proportional response** — denying admission based on a `voluntary` departure marker with a clean `originStatus` may lack justification

### 2.4 Aggregators (Future)

**WARNING:** Any entity that regularly assembles, evaluates, or maintains EXIT markers from multiple sources for the purpose of furnishing them to third parties is almost certainly a Consumer Reporting Agency (CRA) under FCRA §1681a(f). This triggers the full suite of CRA obligations:

- Permissible purpose verification for every disclosure
- Accuracy and dispute procedures
- Annual free file disclosure to consumers
- FTC/CFPB enforcement jurisdiction

EXIT v1.2 does not define an aggregator role. If you are building one, consult FCRA counsel before launch.

---

## 3. ZK Extension Path

A future version of EXIT may support **zero-knowledge (ZK) wrapped attestations** that fundamentally change the FCRA analysis.

### 3.1 How ZK Mitigates FCRA Risk

FCRA regulates the flow of identifiable consumer information from furnishers through CRAs to end users. ZK proofs can break this information chain:

- A ZK proof can verify: *"This agent departed a platform in good standing within the last 365 days"* — without revealing which platform, what the specific departure circumstances were, or who issued the attestation.
- The verifier (destination platform) learns only the boolean result: pass/fail.
- Because the verifier **cannot identify the furnisher**, the traditional FCRA framework — which requires disclosure of sources, dispute rights with identified furnishers, and accuracy obligations on named CRAs — may not apply in its current form.

### 3.2 What ZK Does NOT Solve

- ZK does not eliminate the underlying data. The origin platform still holds the full marker.
- If the ZK circuit is poorly designed, metadata leakage may re-identify the furnisher.
- Regulators may adapt FCRA to cover ZK-obscured reporting. This is speculative but possible.
- ZK proof generation has computational costs that may affect real-time verification.

### 3.3 Status

ZK attestation wrapping is **not implemented** in EXIT v1.2. It is documented as a future roadmap item. The cryptographic primitives (Ed25519, P-256) are compatible with existing ZK circuit libraries (circom, halo2, gnark). Implementation would require:

- A ZK circuit that verifies marker signatures and checks conditions without revealing inputs
- A trusted setup or transparent proof system
- Integration with the existing verification pipeline

---

## 4. Defamation Considerations

EXIT markers — particularly forced-exit markers — make factual assertions about an agent's departure circumstances. False assertions can be defamatory.

### 4.1 Elements of Defamation via EXIT Marker

A defamation claim arising from an EXIT marker would typically require:

1. **A false statement of fact.** An `originStatus: "forced"` marker issued for an agent who departed voluntarily, or a marker falsely characterizing the reason for departure.
2. **Publication.** Transmission of the marker to a destination platform constitutes publication. Each additional recipient may constitute republication.
3. **Fault.** At minimum, negligence; if the subject is a public figure, actual malice (knowledge of falsity or reckless disregard for truth).
4. **Damages.** Economic harm from denied admission, reputational injury, or loss of business opportunities.

### 4.2 Anti-Weaponization Clause (§8.6)

The EXIT specification includes an anti-weaponization clause at §8.6 that:

- Prohibits issuing forced-exit markers as retaliation for legitimate complaints, whistleblowing, or competitive behavior
- Establishes that the protocol designers **anticipated** the potential for marker abuse
- May be used as evidence in litigation to establish that a weaponized marker violated the protocol's own normative requirements

The existence of this clause cuts both ways: it demonstrates awareness of the harm, which could support a plaintiff's argument that the protocol enabled foreseeable defamation.

### 4.3 Qualified Privilege

Platforms issuing EXIT markers may assert **qualified privilege** — a defense available when statements are made in good faith, on a matter of legitimate interest, to a limited audience with a corresponding interest.

Qualified privilege may apply when:
- The origin platform has a legitimate interest in documenting departures
- The destination platform has a legitimate interest in evaluating incoming agents
- The marker is transmitted only to platforms that request it through the EXIT ceremony

Qualified privilege is **defeated** by:
- **Excessive publication** — broadcasting markers publicly rather than transmitting them on request
- **Malice** — knowledge that the marker content is false
- **Reckless disregard** — failure to investigate before issuing a forced-exit marker

### 4.4 Compelled Self-Publication

In some jurisdictions (notably Minnesota, California, Colorado, and others), the **compelled self-publication doctrine** provides a cause of action when:

- A party makes a defamatory statement to the subject
- The subject is compelled by circumstances to repeat ("publish") that statement to third parties
- The original speaker knew or should have known that the subject would be compelled to republish

EXIT creates exactly this dynamic: an agent who receives a forced-exit marker must present it to destination platforms as part of the departure ceremony. If the marker contains false information, the origin platform may be liable under compelled self-publication even though the agent technically transmitted the marker.

---

## 5. Export Controls

EXIT uses cryptographic algorithms subject to U.S. export control regulations under the Export Administration Regulations (EAR), administered by the Bureau of Industry and Security (BIS).

### 5.1 Algorithms Used

| Algorithm | Purpose | Key Length | ECCN |
|---|---|---|---|
| Ed25519 | Digital signatures | 256-bit | 5D002 |
| P-256 (ECDSA) | Digital signatures (FIPS profile) | 256-bit | 5D002 |
| XChaCha20-Poly1305 | Symmetric encryption (privacy tier) | 256-bit | 5D002 |
| AES-256-GCM | Symmetric encryption (FIPS profile) | 256-bit | 5D002 |
| SHA-256 / HKDF-SHA-256 | Hashing / key derivation | 256-bit | 5D002 |

### 5.2 Open-Source Exception

Open-source cryptographic software is generally exempt from EAR export controls under **License Exception TSU** (Technology and Software Unrestricted), codified at **15 CFR §740.13(e)**. This exception applies when:

1. The source code is publicly available (e.g., published on GitHub)
2. No restrictions are placed on further distribution
3. The software is not specifically designed for certain prohibited end-uses (nuclear, missile, chemical/biological weapons)

EXIT's reference implementation meets all three criteria.

### 5.3 BIS Notification

Although the TSU exception removes the licensing requirement, **BIS requests notification** when publicly available encryption source code is made available. This is a ministerial act, not an approval process.

**Template BIS Notification Email:**

> ---
>
> **To:** crypt@bis.doc.gov, enc@nsa.gov
>
> **Subject:** TSU Notification — EXIT Protocol Reference Implementation
>
> **Body:**
>
> This email is a notification pursuant to 15 CFR §740.13(e) regarding the public availability of encryption source code.
>
> **Project Name:** EXIT Protocol (Cellar Door)
> **URL:** [https://github.com/cellar-door/cellar-door-exit]
> **Algorithms Implemented:** Ed25519, ECDSA P-256, XChaCha20-Poly1305, AES-256-GCM, SHA-256, HKDF-SHA-256
> **Key Lengths:** 256-bit
> **Open Source:** Yes — published under [LICENSE] with no restrictions on further distribution
>
> This software implements digital signature and encryption functionality for a decentralized departure attestation protocol. The source code is publicly available at the URL above.
>
> [NAME]
> [TITLE / ORGANIZATION]
> [DATE]
>
> ---

### 5.4 Sanctions Compliance

The TSU exception does not override OFAC sanctions. EXIT implementations must not be knowingly provided to sanctioned persons, entities, or countries. The open-source publication itself is generally permissible, but providing technical support or customized implementations to sanctioned parties is not.

---

## 6. Securities Considerations

### 6.1 Core EXIT Markers Are Not Securities

Applying the *Howey* test (SEC v. W.J. Howey Co., 328 U.S. 293 (1946)), core EXIT markers fail all four prongs:

1. **Investment of money:** No payment is required to create or receive an EXIT marker.
2. **Common enterprise:** EXIT markers do not pool resources or create shared financial outcomes.
3. **Expectation of profit:** EXIT markers are attestations about past events. They have no financial value, yield, or appreciation mechanism.
4. **Efforts of others:** The marker's value (as a trust signal) depends on the subject's own history, not the efforts of a promoter or third party.

EXIT markers are informational records, not financial instruments.

### 6.2 WARNING: Features That Could Create Securities

The following features are **NOT part of EXIT v1.2** and are flagged here because they could transform EXIT-adjacent instruments into securities:

- **Staked attestations** — If witnesses must post economic bonds that are slashed for inaccuracy, the bond functions as an investment with profit/loss based on behavior.
- **Bonding curves** — If marker credibility is priced on a curve, the price token may be a security.
- **Tradeable confidence scores** — If confidence scores are tokenized and traded, they are almost certainly securities.
- **Reputation tokens** — If platforms issue tokens that accrue value based on EXIT history, Howey prong 3 is satisfied.

**Any future implementation of these features must undergo a securities law analysis before deployment.** The SEC has been aggressive in applying Howey to token-based systems, and "utility token" arguments have been largely rejected.

---

## 7. Antitrust Considerations

### 7.1 The Core Risk

EXIT transmits information about agents between competing platforms. This creates antitrust exposure under §1 of the Sherman Act (15 U.S.C. §1), which prohibits agreements in restraint of trade.

The **RealPage precedent** (DOJ v. RealPage, filed 2024) is directly relevant: RealPage provided an algorithmic pricing tool that transmitted rental pricing data between competing landlords, leading to allegations of tacit price-fixing. Similarly, EXIT transmits departure-status data between competing platforms that could be used to coordinate exclusion decisions.

### 7.2 Anti-Coordination Clause

EXIT specification §8 includes an anti-coordination clause that:

- **Prohibits** shared exclusion databases (no platform may maintain a list of "banned agents" derived from EXIT markers and share it with other platforms)
- **Prohibits** coordinated admission policies (platforms may not agree to collectively deny admission to agents with certain EXIT profiles)
- **Requires** independent decision-making (each platform must evaluate EXIT markers using its own criteria)

### 7.3 Recommendations

1. **Default to OPEN_DOOR.** Platforms should adopt a default admission policy that accepts all agents regardless of EXIT marker content. Deviations from this default should be justified by platform-specific risk assessments, not industry-wide standards. This reduces group boycott risk under antitrust law.

2. **No admission agreements.** Platforms must not enter agreements — explicit or tacit — with other platforms regarding how EXIT markers will influence admission decisions.

3. **Independent criteria.** Each platform should develop and document its own admission criteria. If multiple platforms happen to adopt similar criteria independently, that is permissible (conscious parallelism), but coordinated adoption is not.

4. **Transparency.** Platforms should publish their EXIT-based admission policies so that operators can understand and predict how markers affect their access.

5. **No retaliation.** Platforms must not use EXIT markers to punish agents for departing to competitors. This overlaps with the anti-weaponization clause (§8.6) and the defamation analysis above.

### 7.4 Safe Harbor Considerations

If EXIT achieves sufficient adoption that a standards-setting organization (SSO) governs its development, the SSO may qualify for *Noerr-Pennington* protection or the structured rule-of-reason analysis applied to standard-setting activities. This is premature for EXIT v1.2 but relevant for future governance planning.

---

## Revision History

| Date | Version | Changes |
|---|---|---|
| 2026-03-04 | 1.0 | Initial publication with EXIT Spec v1.2 |
