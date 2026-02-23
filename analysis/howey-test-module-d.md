# Howey Test Analysis: EXIT Protocol Module D

> **📊 Risk Scale Reference:** This document uses Negligible/Low/Moderate/High ratings. See [../docs/analysis/risk-scale-mapping.md](../docs/analysis/risk-scale-mapping.md) for how this maps to scales used in other analysis documents.

> **⚠️ Reconciliation Note:** v1 of this analysis rated Module D as Low risk under constrained assumptions. The Howey v2 analysis (assessments/howey-module-d-v2.md) rates unconstrained Module D as Critical. The reconciled position: Module D risk depends entirely on what's in the asset manifest. Pure service records = Low. Financial instruments = Critical. See howey-module-d-v2.md for the authoritative assessment.

## Economic & Reputation Attestation Features — Securities Risk Assessment

**Date:** 2026-02-22
**Status:** Draft — Not Legal Advice
**Purpose:** Legal strategy analysis for EXIT protocol design decisions

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [The Howey Test Framework](#the-howey-test-framework)
3. [Module D Feature Inventory](#module-d-feature-inventory)
4. [Prong-by-Prong Analysis](#prong-by-prong-analysis)
5. [Relevant SEC Guidance](#relevant-sec-guidance)
6. [Case Law Precedents](#case-law-precedents)
7. [Risk Assessment Matrix](#risk-assessment-matrix)
8. [Design Constraints & Recommendations](#design-constraints--recommendations)
9. [Conclusion](#conclusion)

---

## 1. Executive Summary

EXIT Protocol's Module D provides optional economic attestations — reputation scores, service history, and economic track records — that agents carry when departing a platform. This analysis evaluates whether any Module D features could be classified as "investment contracts" (i.e., securities) under the Howey test established in *SEC v. W.J. Howey Co.*, 328 U.S. 293 (1946).

**Bottom line:** Module D features, as described, are unlikely to constitute securities *if designed correctly*. The primary risks arise not from the attestation data itself but from any mechanisms that could make attestations tradeable, appreciable in value, or dependent on a promoter's efforts. The analysis below identifies specific design choices that push features safely outside Howey classification and flags those that require caution.

---

## 2. The Howey Test Framework

Under *SEC v. W.J. Howey Co.*, a transaction is an "investment contract" (and therefore a security) if it involves:

1. **An investment of money** — A person commits capital, assets, or something of value
2. **In a common enterprise** — The investor's fortunes are tied to those of other investors or the promoter
3. **With a reasonable expectation of profits** — The investor anticipates financial returns
4. **Derived primarily from the efforts of others** — Returns depend on the promoter or third party, not the investor's own efforts

All four prongs must be satisfied. The test examines **economic reality over form** — labels don't matter; substance does. Post-Howey jurisprudence has expanded "solely" (from the original holding) to "primarily" or "substantially" (*SEC v. Glenn W. Turner Enterprises*, 474 F.2d 476 (9th Cir. 1973)).

### Key Principle: Substance Over Form

The Supreme Court emphasized that courts should look at the "economic reality" of a transaction. Calling something a "utility token," "attestation," or "reputation score" provides no safe harbor if the economic substance meets all four prongs.

---

## 3. Module D Feature Inventory

Module D encompasses several categories of economic attestation. For this analysis, we classify them as:

| Feature | Description |
|---------|-------------|
| **D1: Reputation Scores** | Numeric or categorical ratings reflecting an agent's trustworthiness, reliability, or quality of service on a platform |
| **D2: Service History Records** | Verifiable logs of work completed, tasks fulfilled, contracts honored |
| **D3: Economic Track Records** | Financial performance data — earnings history, transaction volumes, payment reliability |
| **D4: Skill/Competency Attestations** | Verified claims about capabilities demonstrated on-platform |
| **D5: Portable Credentials** | Bundled attestation packages that agents carry to new platforms |
| **D6: Attestation Metadata** | Timestamps, issuer signatures, verification proofs |

Each feature is analyzed independently against the four Howey prongs below.

---

## 4. Prong-by-Prong Analysis

### Prong 1: Investment of Money

**Legal Standard:** The investor must commit money, assets, or something of value. Courts have interpreted "money" broadly to include cryptocurrency (*SEC v. Shavers*, No. 4:13-CV-416, E.D. Tex. 2014), labor (*International Brotherhood of Teamsters v. Daniel*, 439 U.S. 551 (1979) — though narrowly), and other forms of consideration.

**Application to Module D:**

- **D1–D4 (Reputation, History, Track Records, Skills):** These attestations are *generated as byproducts of activity*, not purchased. An agent earns a reputation score by performing work — they don't invest capital to acquire it. This is analogous to a LinkedIn endorsement or an eBay seller rating.
  - **Risk level: LOW.** No affirmative investment of money occurs. The agent's labor generated the underlying data, but courts have generally held that labor alone (absent additional investment characteristics) does not constitute "investment of money" for Howey purposes. See *International Brotherhood of Teamsters v. Daniel* (compulsory pension contributions via labor did not meet investment-of-money prong in the specific context).

- **D5 (Portable Credentials):** If bundled attestation packages are **free to generate and carry**, this prong fails. However, if the protocol charges fees to mint, verify, or port credentials, those fees could be construed as an investment of money.
  - **Risk level: LOW–MODERATE.** Fees for services (like notarization) are generally not "investments" — they're consumption. But if fees are framed as purchasing an asset that appreciates, risk increases.

- **D6 (Metadata):** Pure technical data. No investment involved.
  - **Risk level: NEGLIGIBLE.**

**Prong 1 Assessment:** Module D features generally fail to satisfy this prong because attestations are earned through activity rather than purchased through capital deployment. **This is the strongest defense.**

---

### Prong 2: Common Enterprise

**Legal Standard:** Courts apply three tests depending on the circuit:

- **Horizontal commonality** (most circuits): Pooling of investor funds with returns tied to the pool's success
- **Broad vertical commonality** (minority): Investor fortunes tied to the promoter's fortunes
- **Narrow vertical commonality** (some circuits): Investor fortunes tied to the promoter's efforts

**Application to Module D:**

- **D1–D4:** Reputation scores and service records are **individual** to each agent. There is no pooling of resources, no shared fund, and no common pot. Agent A's reputation score is independent of Agent B's. This fundamentally breaks horizontal commonality.
  - For vertical commonality: EXIT Protocol (the "promoter") does not profit or lose based on any individual agent's reputation score. The protocol's value may increase as more agents use it, but this is a network effect, not a common enterprise in the Howey sense.
  - **Risk level: LOW.**

- **D5 (Portable Credentials):** If portable credentials become a *class* of assets whose value rises and falls together based on the protocol's success, horizontal or vertical commonality could emerge. For example, if "EXIT-verified" credentials command a market premium tied to EXIT's brand value, an argument for broad vertical commonality exists.
  - **Risk level: MODERATE** — depends entirely on whether credentials become fungible, tradeable units.

- **D6:** No enterprise relationship. Pure data.
  - **Risk level: NEGLIGIBLE.**

**Prong 2 Assessment:** The individualized, non-pooled nature of reputation attestations generally defeats the common enterprise prong. Risk increases if attestations become fungible or their value becomes collectively tied to EXIT's success.

---

### Prong 3: Reasonable Expectation of Profits

**Legal Standard:** The investor must anticipate financial returns — either capital appreciation or participation in earnings. *United Housing Foundation v. Forman*, 421 U.S. 837 (1975) established that the expectation must be of *profits*, not merely a useful product or service. The SEC's 2019 Framework for "Investment Contract" Analysis of Digital Assets emphasizes examining marketing materials, economic structure, and whether purchasers would reasonably expect profits.

**Application to Module D:**

- **D1 (Reputation Scores):** A reputation score's purpose is **functional** — it helps an agent get hired, trusted, or onboarded elsewhere. This is utility, not profit. It's analogous to a credit score: valuable, but not a profit-generating investment.
  - **Critical caveat:** If reputation scores become tradeable on secondary markets, or if the protocol markets them as appreciating assets ("Build your reputation now — it'll be worth more later!"), the profit expectation prong activates.
  - **Risk level: LOW** if non-transferable and utility-framed; **HIGH** if tradeable or marketed as appreciating.

- **D2–D3 (Service History, Economic Track Records):** These are records of past performance. They have informational value but do not generate returns. No reasonable person would "invest" in their own service history expecting financial profits from the history itself.
  - **Risk level: LOW.**

- **D4 (Skill Attestations):** Comparable to certifications or diplomas. Functional value only.
  - **Risk level: LOW.**

- **D5 (Portable Credentials):** The key question: can credential bundles be sold? If yes, and if the market prices them based on speculative value rather than intrinsic utility, the profit expectation prong is satisfied.
  - **Risk level: LOW–HIGH** depending on transferability design.

**Prong 3 Assessment:** As long as Module D features serve a **consumptive/functional purpose** (getting hired, proving reliability) rather than a **speculative/investment purpose** (appreciating in value, generating returns), this prong fails. This is the prong most sensitive to design choices and marketing.

---

### Prong 4: Efforts of Others

**Legal Standard:** Profits must derive primarily from the managerial or entrepreneurial efforts of the promoter or third party. The more an investor's own efforts determine returns, the less likely this prong is satisfied. See *SEC v. Glenn W. Turner Enterprises* (broadened "solely" to "primarily").

**Application to Module D:**

- **D1–D4:** The value of a reputation score, service record, or skill attestation derives from **the agent's own work**. The agent performed the services, built the track record, and demonstrated the skills. EXIT Protocol merely records and attests to these facts — it does not generate the underlying value.
  - This is a strong defense. The protocol is a *mirror*, not a *manager*. It reflects the agent's efforts, not its own.
  - **Risk level: LOW.**

- **D5 (Portable Credentials):** If EXIT Protocol curates, enhances, or adds value to credential bundles through its own efforts (e.g., algorithmic scoring, brand certification, quality guarantees), an argument exists that the credential's value derives partly from EXIT's efforts.
  - **Risk level: LOW–MODERATE.** The more EXIT does to the data beyond attestation, the higher the risk.

**Prong 4 Assessment:** Agent-generated attestations strongly favor the agent's own efforts, not EXIT's. This prong generally fails for Module D.

---

## 5. Relevant SEC Guidance

### SEC Framework for "Investment Contract" Analysis of Digital Assets (April 2019)

The SEC's Strategic Hub for Innovation and Financial Technology (FinHub) published a framework that, while not binding law, signals enforcement priorities. Key factors relevant to Module D:

**Factors suggesting a security:**
- Asset is transferable/tradeable on secondary markets
- Marketed with emphasis on potential for appreciation
- Purchasers have no use for the asset's functionality
- Promoter retains a stake that would benefit from appreciation
- Availability is limited, creating scarcity dynamics

**Factors suggesting NOT a security:**
- Token/asset has immediate consumptive use
- Holders acquire it to use, not to profit
- Value correlates to the utility provided, not speculative demand
- Non-transferable or transfer-restricted
- Designed to remain stable in value

**Application to Module D:** Attestations designed for consumptive use (getting hired on a new platform) with transfer restrictions align strongly with "not a security" factors.

### SEC Staff Statement on "Framework" (2019 onward)

The SEC has repeatedly emphasized that the analysis is facts-and-circumstances. No single factor is dispositive. The totality of the economic reality governs.

### SEC Enforcement Shift (2024–2025)

Following the change in SEC leadership and political dynamics, the SEC has shown a more nuanced approach to digital assets. Commissioner Hester Peirce's "Token Safe Harbor Proposal" (revised multiple times) would have provided a 3-year grace period for token projects — reflecting internal acknowledgment that not all digital assets are securities. While not enacted, this signals regulatory openness to non-security digital asset classifications for utility-focused projects.

---

## 6. Case Law Precedents

### SEC v. W.J. Howey Co., 328 U.S. 293 (1946)
**Foundation case.** Citrus grove investors who purchased land + service contracts were investing money in a common enterprise with profit expectations from Howey's management. All four prongs satisfied. Key takeaway: substance over form.

**Module D relevance:** EXIT attestations lack the capital investment and profit-from-management structure of Howey's orange groves.

### SEC v. Ripple Labs (S.D.N.Y. 2023)
**Key holding by Judge Torres:**
- **Institutional sales of XRP = securities.** Ripple sold XRP directly to institutional investors with implied promises of future value. Investors expected profits from Ripple's efforts to build the ecosystem. All four Howey prongs met.
- **Programmatic sales on exchanges ≠ securities.** Secondary market buyers purchasing XRP on exchanges didn't know if they were buying from Ripple. No "investment of money" directed to the promoter; no reasonable expectation of profits from Ripple's efforts specifically.
- **Other distributions (employee compensation, grants) ≠ securities.** Recipients didn't invest money.

**Module D relevance:** The Ripple distinction between direct sales (securities) and secondary/distributed acquisitions (not securities) is highly favorable. Module D attestations are *earned through work*, not purchased from EXIT. This aligns with the "other distributions" category that Judge Torres found were not securities. The lack of a direct investment-to-promoter flow is a strong structural defense.

**Note:** The Ripple ruling was partially reversed and settled in 2024-2025, with Ripple paying a reduced penalty. The institutional/programmatic distinction remains influential but is a district court opinion, not binding precedent.

### SEC v. LBRY, Inc. (D.N.H. 2022)
**Key holding:** LBRY Credits (LBC) were securities when sold by LBRY to fund development, because purchasers invested money in a common enterprise expecting profits from LBRY's efforts. The court rejected LBRY's argument that LBC had utility (paying for content, tipping creators) — utility did not negate securities status because purchasers *also* expected profits.

**Module D relevance — CRITICAL WARNING:** The LBRY case establishes that **utility alone is not a defense** if there is *also* a profit expectation. Module D must not merely have utility; it must lack the other Howey prongs (investment of money, common enterprise, profit expectation). This is why design constraints on transferability and non-speculation are essential, not optional.

### SEC v. Telegram Group Inc. (S.D.N.Y. 2020)
**Key holding:** Telegram's planned Gram tokens were securities because the pre-sale raised $1.7B from investors who expected profits from Telegram's ecosystem development. Even though Grams were intended to function as a medium of exchange on the TON network, the pre-sale structure created an investment contract.

**Module D relevance:** Telegram's mistake was selling tokens *before the network launched* to fund development — a classic investment contract pattern. Module D attestations are post-hoc records of completed work, not pre-sale instruments. No capital raise is involved. This distinguishes Module D favorably.

### SEC v. Kik Interactive (S.D.N.Y. 2020)
**Key holding:** Kin token sales were unregistered securities offerings. Despite utility claims, the court found that purchasers invested money expecting profits from Kik's development efforts.

**Module D relevance:** Reinforces the LBRY lesson — if you sell something to raise capital, it looks like a security regardless of utility claims.

### United Housing Foundation v. Forman, 421 U.S. 837 (1975)
**Key holding:** Shares in a housing cooperative were not securities because purchasers were motivated by the desire to acquire housing (consumption), not profits. The "stock" was non-transferable and paid no dividends.

**Module D relevance — HIGHLY FAVORABLE:** This is the strongest analogical precedent. Module D attestations are "consumed" (used for reputation portability), not held for profit. Like Forman's housing shares, they serve a practical purpose. Non-transferability strengthens this defense enormously.

### Gary Plastic Packaging Corp. v. Merrill Lynch, 756 F.2d 153 (2d Cir. 1985)
**Key holding:** CDs (normally not securities) became securities when Merrill Lynch's secondary market and representations created profit expectations.

**Module D relevance:** Demonstrates that creating a secondary market can transform a non-security into a security. If EXIT or third parties create a marketplace for trading attestations, this precedent becomes dangerous.

---

## 7. Risk Assessment Matrix

| Feature | Prong 1 (Money) | Prong 2 (Common Enterprise) | Prong 3 (Profit Expectation) | Prong 4 (Others' Efforts) | Overall Risk | Notes |
|---------|:---:|:---:|:---:|:---:|:---:|-------|
| **D1: Reputation Scores** | ❌ Fail | ❌ Fail | ⚠️ Conditional | ❌ Fail | **LOW** | Safe if non-transferable, non-tradeable |
| **D2: Service History** | ❌ Fail | ❌ Fail | ❌ Fail | ❌ Fail | **VERY LOW** | Pure records; no appreciable value dynamics |
| **D3: Economic Track Records** | ❌ Fail | ❌ Fail | ❌ Fail | ❌ Fail | **VERY LOW** | Historical data; no investment structure |
| **D4: Skill Attestations** | ❌ Fail | ❌ Fail | ❌ Fail | ❌ Fail | **VERY LOW** | Equivalent to certifications |
| **D5: Portable Credentials** | ⚠️ Conditional | ⚠️ Conditional | ⚠️ Conditional | ⚠️ Conditional | **MODERATE** | Risk depends entirely on design choices |
| **D6: Attestation Metadata** | ❌ Fail | ❌ Fail | ❌ Fail | ❌ Fail | **NEGLIGIBLE** | Technical infrastructure data |

**Legend:** ❌ Fail = prong is NOT satisfied (favorable); ⚠️ Conditional = could go either way depending on implementation

### Features Requiring Caution

**D5 (Portable Credentials)** is the only feature with meaningful securities risk, and only if:
- Credentials are fungible and tradeable
- A secondary market emerges
- EXIT markets credentials as appreciating assets
- EXIT's ongoing efforts drive credential value

**D1 (Reputation Scores)** has conditional risk if:
- Scores become tradeable or transferable
- The protocol introduces staking, bonding, or economic mechanics tied to scores
- Scores are marketed as investments

---

## 8. Design Constraints & Recommendations

### MUST-HAVE Constraints (Non-Negotiable)

1. **Non-transferability.** Module D attestations MUST be non-transferable. They should be bound to the agent that earned them. This is the single most important design decision. Non-transferable tokens (soulbound tokens) cannot be traded on secondary markets, eliminating Prong 1 (no one invests money to acquire them) and Prong 3 (no profit mechanism).

2. **No secondary markets.** EXIT must not build, facilitate, endorse, or enable any marketplace for trading attestations. Per *Gary Plastic Packaging*, creating a market can transform non-securities into securities.

3. **No capital raise via attestations.** Module D must never be used to raise funds. Attestations must not be sold by EXIT or by platforms. They are generated as byproducts of agent activity.

4. **Consumptive use framing.** All documentation, marketing, and technical specifications must frame attestations as functional tools for reputation portability — never as investments, assets that appreciate, or stores of value.

### SHOULD-HAVE Constraints (Strongly Recommended)

5. **No scarcity mechanics.** Do not limit the supply of attestations, create tiers of rarity, or introduce any artificial scarcity. Scarcity invites speculation.

6. **Value stability by design.** Attestations should not have a "price" that fluctuates. They are records, not assets. If any fee is charged for minting/verification, it should be a flat, cost-recovery fee — not a dynamic, market-driven price.

7. **Agent effort primacy.** The protocol specification should explicitly state that attestation value derives from the agent's own labor and track record, not from EXIT's development, marketing, or operational efforts.

8. **No staking or bonding.** Do not allow agents to "stake" reputation scores, "bond" attestations, or use them as collateral. These mechanics create financial characteristics that invite Howey scrutiny.

9. **No governance rights.** Attestations should not confer voting rights, governance participation, or decision-making power over the protocol. Governance tokens have faced heightened SEC scrutiny.

10. **Decay/expiration.** Consider building in natural decay or expiration of attestations (e.g., "this service record covers the period 2024–2025"). Time-limited records are harder to frame as investments because they lose value over time by design — the opposite of an investment.

### MARKETING & COMMUNICATIONS Constraints

11. **Never use investment language.** Avoid terms like "value," "appreciation," "returns," "yield," "growth potential," "early adopter advantage," or "increasing worth" in any context related to attestations.

12. **Emphasize utility in all materials.** "Carry your reputation to your next platform" — not "Build a valuable reputation asset."

13. **No price references.** Never reference the "price" or "market value" of an attestation. They are records, not priced assets.

### TECHNICAL ARCHITECTURE Constraints

14. **On-chain immutability without tokenization.** If attestations are stored on-chain, use non-fungible, non-transferable records (soulbound/account-bound) rather than ERC-20 or ERC-721 tokens. Even ERC-721 (NFT) format is risky because NFTs are tradeable by default.

15. **No liquidity pools or DEX integration.** The protocol must not interface with any DeFi mechanism that could create liquidity for attestations.

16. **Credential verification, not credential trading.** Third-party platforms should be able to *verify* an attestation (read-only) but not *acquire* it.

---

## 9. Conclusion

### The Core Defense

EXIT Module D is fundamentally different from the instruments that have been classified as securities in prior cases. The critical distinctions:

| Securities Cases | Module D Attestations |
|---|---|
| Capital invested to purchase tokens | Attestations earned through labor |
| Funds pooled with other investors | Each attestation is individual |
| Expectation of profit from appreciation | Expectation of utility (getting hired) |
| Profits from promoter's development efforts | Value from agent's own track record |
| Fungible, tradeable on secondary markets | Non-transferable, bound to agent |
| Purchased before utility exists | Generated after work is completed |

### The Vulnerability

The defense holds **only if** the design constraints above are followed. The most dangerous failure modes:

1. **Making attestations transferable** — instantly creates a potential market, activating Prongs 1 and 3
2. **Marketing attestations as appreciating assets** — activates Prong 3 regardless of technical design
3. **Using attestation sales to fund protocol development** — creates a classic investment contract (Telegram, Kik, LBRY pattern)
4. **Building economic mechanics around attestations** (staking, bonding, collateral) — transforms records into financial instruments

### The Forman Analogy

The strongest legal position for Module D is the *Forman* analogy: attestations are "purchased" (earned) for consumption (reputation portability), not profit. They are the digital equivalent of a professional reference letter or a credit report — valuable, but not a security.

### Residual Risk

Even with perfect design, regulatory risk is never zero. The SEC has shown willingness to pursue novel theories, and the Howey test's flexibility means determined regulators can construct arguments. The recommendations above minimize attack surface but cannot eliminate all risk.

**Recommended next steps:**
1. Engage securities counsel to review Module D specification against this analysis
2. Prepare a "Howey defense memo" documenting consumptive use and non-investment structure
3. Consider requesting SEC no-action letter if Module D involves any on-chain components
4. Monitor ongoing litigation (particularly any appeals from Ripple settlement terms) for evolving precedent

---

*This analysis is for strategic planning purposes only and does not constitute legal advice. Consult qualified securities counsel before making final design decisions.*
