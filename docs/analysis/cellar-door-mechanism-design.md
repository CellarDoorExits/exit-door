# EXIT Protocol — Mechanism Design Analysis

**Author:** Hawthorn
**Date:** 2026-02-20
**Status:** Complete — v1 recommendations implemented

---

## 1. The Lemons Problem in Detail

### The Core Failure

Akerlof's 1970 "Market for Lemons" showed that when buyers can't distinguish quality, sellers of high-quality goods exit the market because they can't command a fair price. The market collapses to only low-quality goods.

EXIT has this exact structure:

1. **The signal:** `status: good_standing` with `selfAttested: true`
2. **The cost of the signal:** Zero. Any agent can claim `good_standing` regardless of truth.
3. **The information asymmetry:** The agent knows their true standing. The destination doesn't.
4. **The result:** Every rational agent claims `good_standing`. The signal carries zero bits of information. Destinations learn nothing from the status field.

This isn't a theoretical concern — it's a mathematical certainty. In any population where:
- Claiming good standing is costless
- Being believed as good standing is beneficial
- There's no verification mechanism

...100% of agents will claim good standing. The signal degrades to noise. QED.

### Why This Matters for EXIT

The `status` field is one of EXIT's 7 core fields. If it's meaningless, EXIT loses ~14% of its core value proposition immediately, and far more in practice because `status` is the field destinations care about most. A passport that says "good person: yes" on every single passport is a passport without that field.

The current spec acknowledges this obliquely — `selfAttested: true` is a "no warranty" flag. But the flag doesn't solve the problem; it just labels it.

---

## 2. The Reputation Laundering Attack

### Attack Description

1. Agent gets banned from Platform A → receives `forced` exit, `disputed` status
2. Agent generates a new `did:key` (takes ~1ms, zero cost)
3. Agent creates a cooperative origin (or uses a known rubber-stamp platform)
4. Agent exits the rubber-stamp platform with `voluntary`, `good_standing`
5. Agent arrives at Platform B with a clean marker

**Cost to attacker:** Near zero (key generation + one marker creation)
**Benefit to attacker:** Full reputation reset
**Detection difficulty:** High — no link between old and new DID

### Why Module A Lineage Doesn't Fix This

Module A lineage chains require the *agent* to self-report their history. A reputation launderer simply... doesn't. They start a fresh lineage. Destinations can require lineage depth > N, but this creates a chicken-and-egg problem for legitimate new agents.

### The Sybil Origin Variant

Even worse: the agent can create a *fake origin platform*. A `did:web` pointing to a domain they control, co-signing their own marker. The origin attestation module (Module C) becomes a self-attestation with extra steps.

---

## 3. Candidate Mechanisms

### 3.1 Staked Attestation

**Concept:** When claiming `good_standing`, the agent (or origin) posts a bond. If the claim is disputed within N days and an arbiter rules against them, the bond is slashed.

**Implementation complexity:** High. Requires:
- A staking medium (tokens, escrow, on-chain contract)
- An arbiter or dispute resolution mechanism
- A slashing/distribution mechanism
- Economic infrastructure EXIT currently lacks

**Game-theoretic properties:**
- Makes false claims costly → separating equilibrium possible
- Stake size must exceed the value of reputation laundering
- Creates a "pay to play" barrier that hurts legitimate agents with fewer resources

**Attack resistance:** Good against casual laundering. Poor against well-funded attackers who can absorb stake losses. The stake becomes a "cost of doing business" for sophisticated reputation launderers.

**Legal implications:** Staking may constitute a financial instrument depending on jurisdiction. Securities law concerns if stakes are tokenized. Money transmission issues if the protocol handles value.

**HOLOS alignment:** Poor for v1. Requires financial infrastructure, creates barrier to exit (contradicts D-006 non-blocking principle), introduces custodial elements.

**Safe zone compatibility:** ❌ Requires on-chain or custodial infrastructure.

---

### 3.2 Commit-Reveal for Intent

**Concept:** Agent commits to exit (publishes hash of intent) before revealing it. This proves temporal priority — the agent decided to leave before the origin could retaliate.

**How it works:**
1. Agent creates `ExitIntent` with all details
2. Agent publishes `commitment = SHA256(canonicalize(intent))` — just the hash
3. After a delay (e.g., 1 hour), agent reveals the full intent
4. Anyone can verify that the commitment preceded the reveal
5. If the origin issues a retaliatory `disputed` status *after* the commitment but *before* the reveal, the temporal sequence is evidence of retaliation

**Implementation complexity:** Low. Pure cryptography, no infrastructure.
- Hash function (already have SHA-256)
- Commitment record with timestamp
- Verification function to check commitment matches reveal

**Game-theoretic properties:**
- Prevents front-running by origins (can't retaliate against an exit you don't know about yet)
- Doesn't prevent pre-existing disputes (if origin disputed *before* commitment, that's legitimate)
- Creates a clean temporal record

**Attack resistance:** Strong against retaliatory origin behavior. Doesn't address the lemons problem directly. Doesn't prevent reputation laundering.

**Legal implications:** Minimal. Cryptographic timestamps are well-understood.

**HOLOS alignment:** Good. Non-custodial, privacy-preserving (commitment reveals nothing until reveal), agent-empowering.

**Safe zone compatibility:** ✅ Pure cryptography, no infrastructure needed.

---

### 3.3 Reputation Bonding Curves

**Concept:** Reputation accrues value over time following a bonding curve. Longer tenure = more valuable reputation. Exiting early means your reputation is worth less. New arrivals post a bond that decreases as they build tenure.

**Implementation complexity:** Medium-High. Requires:
- A reputation accounting system
- Time-value functions
- Bond management (who holds the bond?)

**Game-theoretic properties:**
- Makes reputation laundering expensive (new identity = bottom of the curve)
- Rewards long-tenure agents (their reputation is worth more)
- Creates an "exit cost" proportional to remaining bond — potentially contradicts EXIT's free-exit principle

**Attack resistance:** Good against reputation laundering (resetting means losing accrued value). Poor against patient attackers who build up tenure slowly.

**Legal implications:** Bonds may constitute financial instruments. Labor law implications if agents are treated as workers with deferred compensation.

**HOLOS alignment:** Mixed. Incentivizes stability but creates exit friction.

**Safe zone compatibility:** ❌ Requires value management infrastructure.

---

### 3.4 Mutual Attestation

**Concept:** Both the subject AND the origin must attest for status to be "confirmed." If only the subject attests, status is "self_attested." If only the origin attests, status is "origin_attested." If both agree, status is "confirmed."

**How it works:**
- Subject claims `good_standing` → `selfAttested: true` (existing behavior)
- Origin co-signs with `originStatus: good_standing` → creates a `ModuleC` attestation
- If both agree → `statusConfirmation: "mutual"` — this carries real signal
- If they disagree → the disagreement itself is informative
- If origin is absent → `statusConfirmation: "self_only"` (honest labeling)

**Implementation complexity:** Low. This is essentially labeling what already exists:
- The core `status` + `selfAttested` flag already exists
- Module C `originStatus` already exists
- We just need a derived field or verification logic that combines them

**Game-theoretic properties:**
- Mutual agreement is a costly signal — requires cooperation between two parties
- Harder to fake than self-attestation (need to control both the subject AND the origin)
- Still vulnerable to Sybil origins (agent controls both sides)
- But: destinations can weight mutual attestation higher, creating a natural trust gradient

**Attack resistance:** Moderate. Defeats casual self-attestation inflation. Still vulnerable to Sybil origin attack. The defense is that destinations can evaluate origin trustworthiness independently.

**Legal implications:** Minimal. Origin co-signatures are already in the spec.

**HOLOS alignment:** Excellent. Doesn't increase exit cost. Provides richer information. Respects both parties' perspectives.

**Safe zone compatibility:** ✅ Already mostly built. Just needs formalization.

---

### 3.5 Time-Weighted Trust

**Concept:** Markers from agents with longer tenure at the origin carry more weight. A `good_standing` from an agent who was at a platform for 2 years is more trustworthy than one from an agent who was there for 2 days.

**How it works:**
- Add `tenure` to the core marker or reputation module (ISO 8601 duration)
- Tenure can be self-attested or origin-attested (mutual attestation compounds the signal)
- Verifiers apply a trust weight: `trustWeight = f(tenure)` where f is monotonically increasing with diminishing returns (e.g., `min(1, log2(days + 1) / 10)`)

**Implementation complexity:** Low.
- `tenure` field already exists in the reputation module
- Just needs promotion to first-class status and verification guidance

**Game-theoretic properties:**
- Makes reputation laundering time-expensive (can't shortcut tenure)
- Agents can lie about tenure if self-attested — mutual attestation mitigates this
- Creates a natural trust gradient that destinations can use

**Attack resistance:** Good against rapid reputation cycling. Patient attackers can still accumulate tenure at a Sybil platform, but the time cost is real.

**Legal implications:** Minimal. Tenure is factual information.

**HOLOS alignment:** Good. Rewards stability without penalizing exit.

**Safe zone compatibility:** ✅ Just metadata fields and verification guidance.

---

### 3.6 Web of Trust

**Concept:** Third-party endorsements create a trust graph. An agent's `good_standing` is weighted by who else vouches for them. Trust propagates through the network.

**Implementation complexity:** High.
- Endorsement protocol (who can endorse, format, signatures)
- Trust graph computation (PageRank-style or simpler)
- Graph storage and traversal
- Bootstrap problem (empty graph is useless)

**Game-theoretic properties:**
- Sybil-resistant if well-connected agents are hard to co-opt
- Creates network effects — more endorsements = more valuable identity
- Vulnerable to collusion rings (mutual endorsement cliques)

**Attack resistance:** High against isolated attackers. Moderate against organized collusion.

**Legal implications:** Trust graph data may reveal social connections — privacy concern under GDPR.

**HOLOS alignment:** Good in principle. Network effects align with EXIT adoption goals.

**Safe zone compatibility:** ⚠️ Partially. Endorsements can be stored on markers (no infrastructure needed) but meaningful trust computation requires some aggregation layer.

---

### 3.7 Proof of Tenure

**Concept:** Cryptographic proof of how long an agent has been at a platform, without relying on self-attestation.

**How it works:**
- Origin periodically signs "heartbeat" attestations: "Agent X was active at time T"
- Agent accumulates these heartbeats
- At exit, agent presents heartbeat chain proving continuous tenure
- Verifier checks heartbeat signatures and timestamps

**Implementation complexity:** Medium.
- Heartbeat signing protocol
- Heartbeat accumulation and storage
- Verification of heartbeat chains
- Requires origin cooperation (or at least periodic attestation)

**Game-theoretic properties:**
- Provable tenure is a costly signal — can't be faked without origin cooperation
- Creates ongoing relationship evidence (not just a point-in-time snapshot)
- Origins could refuse to provide heartbeats as a form of coercion

**Attack resistance:** Strong against unilateral reputation laundering. Requires actual platform participation over time. Sybil origins can still issue fake heartbeats.

**Legal implications:** Regular attestations create a surveillance record. GDPR data minimization concerns.

**HOLOS alignment:** Mixed. Strong signal but creates ongoing data collection obligation.

**Safe zone compatibility:** ⚠️ The proof mechanism is pure crypto, but requires origin cooperation protocol.

---

### 3.8 Rate-Limited Identity

**Concept:** Make new DIDs expensive or time-gated, preventing rapid identity cycling.

**Implementation complexity:** High.
- Requires a rate-limiting authority (contradicts decentralization)
- Or proof-of-work for DID creation (energy cost, environmental concerns)
- Or vouching requirements (bootstrapping problem)

**Game-theoretic properties:**
- Directly addresses Sybil attacks at the identity layer
- Makes identity a scarce resource
- May price out legitimate agents who need new identities

**Attack resistance:** High against casual Sybil attacks. Well-funded attackers can absorb costs.

**Legal implications:** Rate-limiting identity creation may conflict with right to pseudonymity. Privacy advocates will object.

**HOLOS alignment:** Poor. EXIT should enable freedom of movement, not restrict identity creation.

**Safe zone compatibility:** ❌ Requires centralized rate-limiting or PoW infrastructure.

---

### 3.9 Graduated Status

**Concept:** Replace the binary `good_standing / disputed / unverified` with a richer taxonomy that carries more information.

**Proposed taxonomy:**
```
unverified          — No verification attempted or possible
self_attested       — Subject claims good standing (current default)
origin_attested     — Origin confirms good standing (without subject claim)
mutually_confirmed  — Both subject and origin agree on good standing
witnessed           — Third-party witness confirms circumstances
tenure_weighted     — Status + verified tenure duration
```

For negative statuses:
```
disputed            — Active dispute exists (current)
suspended           — Temporarily restricted (not permanent)
revoked             — Permanently revoked by origin
contested_by_subject — Origin claims disputed, subject contests
```

**Implementation complexity:** Low-Medium.
- New enum values
- Updated validation
- Verification logic for each level
- Documentation for verifiers

**Game-theoretic properties:**
- More information = better equilibrium possible
- Destinations can require specific confirmation levels for different risk contexts
- Creates a natural "trust ladder" that agents climb

**Attack resistance:** Doesn't directly prevent attacks but gives destinations better tools to evaluate markers.

**Legal implications:** Richer taxonomy means more nuanced legal status. "Revoked" may carry stronger defamation implications than "disputed."

**HOLOS alignment:** Excellent. More honest labeling, better information for all parties.

**Safe zone compatibility:** ✅ Just type definitions and validation logic.

---

### 3.10 Temporal Commitment Proof

**Concept (additional mechanism):** A cryptographic proof that an agent's DID existed and was active before a certain date. Combines aspects of proof-of-tenure and commit-reveal.

**How it works:**
- Agent periodically publishes hash commitments: `H(DID || nonce || timestamp)`
- These can be anchored to any timestamping service (email to self, blockchain, trusted server)
- At exit time, agent reveals the preimages, proving DID existed at those times
- Creates unforgeable evidence of DID age without requiring platform cooperation

**Implementation complexity:** Low. Hash commitments are trivial.

**Safe zone compatibility:** ✅ Pure cryptography.

---

### 3.11 Confidence Scoring

**Concept (additional mechanism):** Instead of discrete status levels, compute a continuous confidence score based on available evidence.

**Formula sketch:**
```
confidence = base_score(status)
           × attestation_multiplier(self_only | origin | mutual | witnessed)
           × tenure_weight(duration)
           × lineage_weight(chain_depth)
           × origin_trust(origin_reputation)
```

Destinations set their own threshold. This is a *recommendation to verifiers*, not a protocol-level enforcement.

**Implementation complexity:** Low (it's a formula, not infrastructure).

**Safe zone compatibility:** ✅ Verification guidance, not protocol enforcement.

---

## 4. Safe Zone Compatibility Summary

| Mechanism | Safe Zone? | Infrastructure Needed | v1 Feasible? |
|---|---|---|---|
| Staked attestation | ❌ | Financial infrastructure | No |
| Commit-reveal | ✅ | None (pure crypto) | **Yes** |
| Reputation bonding curves | ❌ | Value management | No |
| Mutual attestation | ✅ | None (already partially built) | **Yes** |
| Time-weighted trust | ✅ | None (metadata + guidance) | **Yes** |
| Web of trust | ⚠️ | Aggregation layer | Partial |
| Proof of tenure | ⚠️ | Origin cooperation protocol | Partial |
| Rate-limited identity | ❌ | Central authority or PoW | No |
| Graduated status | ✅ | None (types + validation) | **Yes** |
| Temporal commitment | ✅ | None (pure crypto) | **Yes** |
| Confidence scoring | ✅ | None (formula + guidance) | **Yes** |

---

## 5. Recommendations

### v1 Implementation (this sprint)

**Priority 1: Graduated Status + Mutual Attestation**
These two mechanisms work together to directly address the lemons problem:
- Replace the meaningless binary with a trust ladder
- Mutual attestation creates a costly signal (cooperation between two parties)
- `StatusConfirmation` enum: `self_only`, `origin_only`, `mutual`, `witnessed`, `disputed_by_origin`, `disputed_by_subject`
- Verification guidance for how to weight each level

**Priority 2: Commit-Reveal for Intent**
Directly prevents the weaponized exit attack (front-running):
- `ExitCommitment` type with hash, timestamp, reveal window
- `createCommitment()` and `verifyCommitment()` functions
- Integration with ceremony state machine

**Priority 3: Time-Weighted Trust + Confidence Scoring**
Makes tenure a first-class trust signal:
- `TenureAttestation` type (self or origin-attested duration)
- `computeConfidence()` function implementing the scoring formula
- Verifier guidance document

### v2+ Deferred

- Staked attestation (needs economic infrastructure)
- Full web of trust (needs network effects)
- Proof of tenure heartbeats (needs origin cooperation protocol)
- Rate-limited identity (philosophical tension with EXIT goals)
- Reputation bonding curves (needs value management)
- ZK selective disclosure for confidence scores

---

## 6. Implementation Plan

### New Types (types.ts)
- `StatusConfirmation` enum
- `TenureAttestation` interface
- `ExitCommitment` interface
- `ConfidenceFactors` interface

### New Module: Trust Signals (src/modules/trust.ts)
- `computeStatusConfirmation()` — derives confirmation level from marker + attestations
- `createTenureAttestation()` — creates signed tenure claim
- `verifyTenureAttestation()` — verifies tenure claim signature
- `computeConfidence()` — computes confidence score from all available signals

### New Module: Commit-Reveal (src/modules/commit-reveal.ts)
- `createCommitment()` — creates hash commitment for exit intent
- `verifyCommitment()` — verifies commitment matches revealed intent
- `isCommitmentExpired()` — checks if reveal window has passed

### Updates
- `validate.ts` — validate new types
- `index.ts` — export new modules
- Tests for all new functionality
