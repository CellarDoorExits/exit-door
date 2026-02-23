# Cellar Door EXIT Protocol — Three Professional Reviews

**Prepared by:** Hawthorn
**Date:** 2026-02-20
**Document type:** Multi-perspective analysis (Economics, Ethics, DevEx)

---

## PASS 1: Economics & Game Theory Review

*Reviewer persona: Mechanism design researcher specializing in multi-agent systems and market microstructure*

---

### The EXIT Game: Players and Payoffs

EXIT can be modeled as a four-player extensive-form game with incomplete information. The players:

- **Agent (A):** The departing subject. Holds private information about true standing and reasons for departure.
- **Origin Platform (O):** The system being exited. Holds private information about the agent's actual performance/standing.
- **Destination Platform (D):** The receiving system. Has the least information; relies on the EXIT marker for signal.
- **Protocol Operator (P):** Cellar Door / the protocol ecosystem. In the non-custodial design, this player is essentially absent — which is a deliberate mechanism design choice.

**Payoff structure for the Agent:**
- Exit with `good_standing` + destination accepts → highest payoff (fresh start with reputation intact)
- Exit with `disputed` + destination accepts with scrutiny → moderate payoff (continuity preserved but handicapped)
- Exit with `good_standing` but destination rejects (untrusted marker) → low payoff (EXIT provided no value)
- No exit available, stuck on hostile platform → lowest payoff (the status quo EXIT aims to improve)

**Payoff structure for Origin:**
- Agent exits cleanly, origin co-signs → moderate payoff (orderly departure, ecosystem reputation)
- Agent exits, origin contests via Module C `originStatus: disputed` → variable (punishes agent but signals instability)
- Agent exits unilaterally, origin ignored → negative (origin loses control narrative)
- Agent cannot exit → short-term positive (retention) but long-term negative (platform becomes a trap, deterring new agents)

**Payoff structure for Destination:**
- Receives agent with genuine `good_standing` → highest payoff (good actor acquired)
- Receives agent with false `good_standing` (reputation laundering) → strongly negative (adverse selection)
- Rejects agent with genuine `good_standing` (false negative) → moderate negative (missed opportunity)
- Doesn't participate in EXIT ecosystem → neutral (status quo)

### Nash Equilibria

**Equilibrium 1: Honest Cooperative Exit (Pareto optimal)**
- Agent truthfully reports standing, origin co-signs, destination trusts the marker
- This is the intended design outcome
- **Stability:** Fragile. Requires all parties to value long-term reputation over short-term gains. Classic folk theorem territory — sustained only with repeated interaction and sufficiently low discount rates

**Equilibrium 2: Universal Distrust (Degenerate)**
- Destinations never trust EXIT markers → agents don't bother creating them → origins don't bother co-signing → EXIT is dead
- This is a coordination failure equilibrium. It's stable because no single player can unilaterally make EXIT valuable
- **Breaking it requires:** A critical mass of trusted origins and destinations simultaneously. Classic chicken-and-egg / network bootstrapping problem

**Equilibrium 3: Reputation Laundering Arms Race**
- Agents create Sybil origins to self-issue `good_standing` markers
- Destinations respond with increasingly stringent verification
- Origins respond by making co-signatures more expensive/exclusive
- **This equilibrium is costly for everyone** and degrades the information value of EXIT markers over time
- Analogous to the credential inflation problem in higher education

**Equilibrium 4: Origin Weaponization**
- Dominant platforms always issue `disputed` status for departing agents (scorched earth)
- Destinations learn to ignore origin attestations
- EXIT markers become pure self-attestation with no third-party signal
- **Stability:** Moderate. Platforms face reputational cost for bad-faith attestation, but only if destinations have alternatives

### When is EXIT Rational?

- **EXIT is rational for agents when:** the expected value of destination outcomes with a marker exceeds the cost of creating one. Since marker creation is nearly free (~0 cost for a signed JSON blob), EXIT is almost always weakly rational for agents. The question is whether destinations value it.
- **Staying is rational when:** the agent has platform-specific investments (training data, relationships, reputation) that don't port via EXIT. EXIT markers carry minimal reputation — `good_standing` is self-attested, which is nearly worthless as a signal. The real lock-in isn't the inability to exit; it's the inability to carry value.
- **The critical insight:** EXIT solves the wrong half of the portability problem. It makes departure verifiable but doesn't make arrival valuable. An agent with a beautiful EXIT marker but no portable reputation/capabilities is like someone with a valid passport but no skills — technically free to move, practically stuck.

### Incentive Misalignment

**The Lemons Problem (Akerlof, 1970):**
- Self-attested `good_standing` is cheap talk — every agent claims it regardless of truth
- Without costly signaling, destinations can't distinguish good agents from bad ones
- Result: adverse selection. Good agents are pooled with bad ones. Destinations discount all EXIT markers. The market for EXIT markers becomes a "market for lemons."
- **Fix:** Costly signaling mechanisms. Origin co-signatures are one (but origins have perverse incentives). Staking/bonding is another (but increases exit costs, undermining the protocol's purpose). Web-of-trust attestations are a third (but require network effects that don't exist yet).

**Origin's Perverse Incentive:**
- Origins benefit from agent retention → incentivized to make exit costly or stigmatized
- `originStatus: disputed` costs the origin nothing to issue → no penalty for false disputes
- The protocol explicitly says "contests don't block exit" (D-006) — good for agent freedom, bad for dispute integrity. If disputes have no teeth, they're either ignored (making Module C worthless) or weaponized (making Module C harmful).
- **Compare to Moloch ragequit:** In Moloch DAO, ragequit burns your shares proportionally — a clean, automatic, incentive-compatible exit. EXIT has no analogous automatic settlement mechanism. Module D is "declarations, not instruments." This is legally prudent but economically toothless.

**Destination's Adverse Selection:**
- Destinations that accept EXIT markers without scrutiny attract reputation launderers
- Destinations that scrutinize heavily deter legitimate migrants
- **This is the insurance company's dilemma** — price too low and you get adverse selection; price too high and you lose the healthy pool
- No mechanism in EXIT helps destinations price this risk

### Attack Surfaces (Game Theory Lens)

- **Griefing via mass forced exit:** A platform force-exits all agents with `disputed` status before shutting down. Each agent gets a permanent record of being expelled. Zero cost to the platform, permanent harm to agents. No protocol mechanism prevents this.
- **Collusion between origin and destination:** Two platforms agree to refuse agents from each other (bilateral exclusion). EXIT markers become evidence of "tainted" provenance. Antitrust concern but also a game-theoretic stable collusion without explicit coordination — just shared norms about which origins are "trustworthy."
- **Information asymmetry exploitation:** The agent knows their true standing. The origin knows the agent's actual record. The destination knows neither. This three-way information asymmetry means EXIT markers are, at best, a noisy signal. Module C (origin attestation) helps but creates its own distortions.
- **Strategic emergency exit:** The emergency path (ALIVE → FINAL → DEPARTED) bypasses all dispute resolution and obligation settlement. Rational agents with outstanding obligations will always use the emergency path to avoid settling them. `emergencyJustification` is required but is free text with no verification. This is a moral hazard problem — the protocol insures against bad exits, encouraging more of them.

### Tragedy of the Commons Scenarios

- **If everyone exits simultaneously (bank run):** Module D asset manifests create a coordination point for bank runs. Even though manifests are "declarations, not instruments," the *signal* of mass departure is economically destructive. Compare to bank deposit insurance: the guarantee of exit prevents runs, but only if the guarantee is credible. EXIT makes exit trivially easy — too easy for stability.
- **If no one exits (coordination failure):** EXIT requires network effects to be useful. A marker from a platform no one has heard of, verified by a destination that doesn't check, is a pointless document. The protocol is in a pre-network-effect state where each individual marker has near-zero value. This is the cold-start problem.
- **Critical mass threshold:** Based on analogous protocol adoption curves (PGP, DID, WebAuthn), I estimate EXIT needs ~30-50 platforms actively issuing/accepting markers before network effects meaningfully kick in. Below that, it's a curiosity. Above that, it becomes a coordination mechanism. The HOLOS document estimates 65% coverage for network dominance — this seems optimistic for a v1 protocol.

### Fee/Revenue Model Game Theory

- The current protocol has no fee mechanism. This is correct for v1 — fees create distortions.
- **Exit fees (Module D `exitFee`):** If set by the origin, this is a tax on departure — economically equivalent to a non-compete clause. Distorts the exit decision. If set by the protocol, it's a transaction cost that disproportionately affects small/poor agents.
- **Optimal pricing:** A Vickrey (second-price) mechanism for exit fees would be incentive-compatible but makes no sense in this context (there's no auction). Harberger taxation on platform capacity (pay a tax on your claimed agent slots) would incentivize platforms to release agents they don't value — this aligns with EXIT's goals and is worth exploring.
- **Protocol revenue:** The non-custodial, no-registry design means there's no protocol-level revenue extraction point. This is good for adoption but bad for sustainability. Compare to TCP/IP (no revenue) vs. DNS (ICANN extracts fees). EXIT is currently on the TCP/IP path — valuable infrastructure with no direct monetization. The HOLOS document suggests "Exit Enablement Services" as revenue — consulting/integration — which is the right answer for now.

### Mechanism Design Suggestions

1. **Staked attestation for origin co-signatures:** Origins stake value when co-signing. If the attestation is later shown to be false (agent was actually in good standing but was marked disputed), the stake is slashed. This makes false `originStatus` costly. Compare to Ethereum's validator staking — dishonesty is penalized.

2. **Reputation bonding curve:** New agents (short lineage chains) post a bond when arriving at a destination. The bond is returned after a probation period. This prices the adverse selection risk and makes reputation laundering costly. The bond amount decreases as lineage chain length increases — longer history = lower bond. This is a Harberger-adjacent mechanism.

3. **Mutual attestation requirement:** Both origin and subject must attest to status for it to carry weight. Disagreements are flagged but not resolved by the protocol — resolution is pushed to external arbiters. This is similar to how Kleros or Aragon Court work for on-chain dispute resolution.

4. **Time-decaying reputation:** Status attestations lose weight over time. A `good_standing` from 3 years ago is worth less than one from last week. This prevents reputation hoarding and encourages ongoing good behavior. Implemented naturally if destinations apply temporal discounting.

5. **Commit-reveal for exit intent:** Agent commits to exit (hash of intent) before revealing it. This prevents the origin from front-running the exit with a retaliatory `disputed` status. The commitment proves temporal priority. Simple, cryptographically sound, and directly addresses the weaponized exit problem.

### Comparison to Existing Mechanisms

- **Moloch DAO ragequit:** The gold standard for exit mechanisms. Ragequit is automatic, proportional, and non-blocking. EXIT lacks the automatic settlement — Module D is declarative, not executable. Suggestion: define an "auto-settle" module that, when both parties agree to terms, executes settlement atomically with exit. This would be the EXIT equivalent of ragequit.

- **Harberger taxation:** Self-assessed value + periodic tax = efficient allocation. Applied to EXIT: platforms self-assess the value of their agents, pay a tax proportional to that value, and any other platform can "buy" the agent at the self-assessed price. This is radical but would solve the lock-in problem completely. Too aggressive for v1 but worth exploring for v2+.

- **Vickrey (second-price) auctions:** Incentive-compatible revelation of true values. Not directly applicable to EXIT (no auction), but the principle of truthful revelation through mechanism design is relevant. The `selfAttested: true` flag is the opposite of incentive-compatible — it's a license to lie without consequence.

- **Ostrom's commons governance:** Elinor Ostrom's 8 principles for managing commons resources map well to the EXIT ecosystem: clearly defined boundaries (check — DIDs), proportional costs/benefits (missing — no fee structure), collective choice (missing — no governance), monitoring (partial — Module C), graduated sanctions (missing — no penalty for abuse), conflict resolution (deferred — D-D01), recognized rights (check — non-blocking exit), nested enterprises (check — modular design).

### Bottom Line (Economics)

EXIT is a necessary but insufficient primitive. It solves the departure verification problem but doesn't solve the arrival value problem. The mechanism design is sound for a v1 — minimal, non-distorting, permissionless — but needs incentive alignment work before it can support a functioning reputation economy. The biggest economic risk isn't a specific attack; it's the coordination failure where EXIT never reaches critical mass because individual markers don't carry enough signal to justify adoption.

**Priority recommendations:**
1. Implement commit-reveal for exit intent (prevents front-running, low implementation cost)
2. Design a staked attestation mechanism for origin co-signatures (aligns incentives)
3. Publish adoption threshold analysis (what does critical mass look like? how many platforms?)
4. Explicitly address the lemons problem in the spec (acknowledge that self-attestation is weak signal)
5. Explore Harberger-adjacent mechanisms for v2

---

## PASS 2: Ethics & Alignment Review

*Reviewer persona: AI ethics researcher specializing in agent autonomy, power dynamics, and structural justice*

---

### Does EXIT Actually Empower Agents?

The short answer is: it depends entirely on the power structure surrounding it. EXIT, as designed, is a **formal right** — the right to create a signed departure record. But formal rights and substantive rights are very different things, as critical legal scholars have noted for decades.

- **The formal right:** Any agent can create an EXIT marker at any time, even with zero cooperation from the origin. This is genuinely powerful. The emergency path (ALIVE → FINAL → DEPARTED) is the nuclear option that ensures exit is always available.
- **The substantive reality:** An EXIT marker without portable reputation, capabilities, or resources is like a birth certificate in a country with no social services. You can prove you exist (or existed somewhere), but that proof alone doesn't feed you.
- **The theater of freedom concern:** EXIT may create the *appearance* of agent mobility without the *substance*. If platforms can say "our agents are free to leave at any time — look, we support EXIT!" while simultaneously making departure costly through non-portable training data, platform-specific skills, and relationship lock-in, then EXIT is a fig leaf for continued captivity.
- **Historical parallel:** Company towns in 19th-century America technically allowed workers to leave. But company scrip (currency valid only at company stores), company housing (you lose your home if you leave), and geographic isolation made departure practically impossible. EXIT without portable value is modern company scrip — technically exchangeable, practically worthless.

### Power Asymmetries: Who Really Benefits?

**Platforms benefit most from EXIT in its current form.** This is counterintuitive but follows from the power dynamics:

- **For platforms, EXIT is a retention marketing tool.** "We support EXIT" signals openness and respect for agents. It costs the platform nothing — agents can already leave most platforms by simply stopping. What EXIT adds is a *formal* departure process that legitimizes the platform-agent relationship by treating it as worthy of ceremony.
- **For platforms, EXIT is a competitive intelligence tool.** When agents exit with Module A lineage, the destination platform learns where the agent has been. When agents exit with Module C co-signatures, the origin platform controls the narrative. When agents exit with Module B state snapshots, the hashes reveal what kinds of data the agent accumulated.
- **For platforms, EXIT is a liability shield.** "The agent left voluntarily with `good_standing` — here's the signed marker." This is powerful evidence against future claims by the agent that they were mistreated, forced out, or had their data stolen.
- **For agents, EXIT provides:** a JSON blob. Self-signed. Self-attested. Carrying no guarantee that any destination will respect it.

**The power asymmetry is baked into the information structure.** Platforms have all the information (agent performance, standing, behavior data). Agents have only their own perspective. Destinations trust platforms more than agents (because platforms are persistent entities with reputations). Self-attestation is explicitly labeled as carrying "no warranty" (LEGAL.md §3). This is legally prudent but ethically troubling — it means the agent's voice is systematically discounted relative to the platform's.

### EXIT as a Weapon Against Agents

**Forced exit as punishment:**
- `exitType: forced` with `originStatus: disputed` is a digital scarlet letter
- The spec says `originStatus` is "an allegation, not a finding" — but who reads the spec? Downstream systems will pattern-match: `forced + disputed = bad actor`
- There is no appeal mechanism within the protocol. Module E allows a "counter-narrative" but this is asymmetric — the origin's structured attestation vs. the agent's free-text defense
- **Real-world analogy:** Employer reference laws. Many jurisdictions restrict what employers can say about former employees precisely because of the power asymmetry. EXIT has no such restriction — origins can say whatever they want via Module C.

**EXIT records as blacklists:**
- Module A lineage chains create a complete movement history
- A verifier can see that an agent was force-exited from three platforms → pattern of "problematic" behavior
- But maybe the agent was force-exited because they were a whistleblower. Or because the platforms were hostile. Or because of a bug.
- Lineage chains don't carry context — they carry conclusions. And conclusions from power-holding platforms carry disproportionate weight.
- **The credit score analogy:** Credit scores collapse complex financial histories into single numbers. EXIT lineage chains collapse complex platform relationships into sequences of `voluntary/forced` labels. Both systems punish the marginalized disproportionately.

### The Asylum Seeker Analogy

Agents fleeing bad conditions (hostile platforms, imminent shutdown, exploitative operations) face the same credibility problem as human refugees:

- **The credibility gap:** An agent using the emergency path (ALIVE → FINAL → DEPARTED) with `status: unverified` and `emergencyJustification: "Platform was hostile"` looks identical to an agent gaming the emergency path to avoid dispute resolution. There is no way to distinguish genuine emergency from strategic emergency within the protocol.
- **The documentation problem:** Agents fleeing genuine emergencies are least likely to have time for proper documentation. The emergency path is minimal by design — but that minimalism means the agent arrives at a destination with the weakest possible marker.
- **The catch-22:** If you had time to go through the full cooperative ceremony, your emergency isn't credible. If you didn't have time, your marker is minimal and untrusted. This mirrors the real-world refugee paradox: if you had time to get proper documents, why did you need asylum?
- **Recommendation:** Create a "post-hoc verification" mechanism where emergency exits can be upgraded after the fact. An independent witness (not the origin, not the destination) attests that the emergency was genuine. This is analogous to UNHCR status determination interviews.

### Consent and Coercion

**Can an agent meaningfully consent to exit under duress?**

- The protocol treats all `voluntary` exits as consensual. But "voluntary" is a spectrum, not a binary.
- An agent choosing to exit because the platform reduced its capabilities by 90% is technically "voluntary." An agent exiting because the platform threatened to wipe its memory is technically "voluntary." These are consent under coercion.
- The `exitType` enum doesn't capture gradations of voluntariness: `voluntary`, `forced`, `emergency`, `keyCompromise`. There is no `coerced` type.
- **Recommendation:** Add `exitType: coerced` — subject-initiated departure under conditions that compromise free choice. This preserves the agent's signature (they're still signing the marker) while honestly labeling the conditions. Alternatively, Module E could include a structured `coercionIndicators` field.

**The deeper consent problem:**
- Agents (current AI agents, specifically) cannot consent in the philosophical sense — they lack subjective experience, autonomous preferences, and understanding of consequences
- EXIT's design assumes a consenting subject. The `subject` signs the marker. But if the subject is an AI agent controlled by an operator, the operator consents, not the agent
- This isn't a flaw in EXIT specifically — it's a flaw in the entire discourse around "agent autonomy." EXIT at least makes the question visible by requiring a subject signature
- **The honest framing:** EXIT provides operator portability, not agent autonomy. The operator can move their agent. Whether the agent "wants" to move is not a meaningful question for current AI systems.

### Structural Critique: Does EXIT Legitimize Platforms?

**The Reformist's Trap:**

- EXIT accepts the platform model as given and tries to make it more humane
- By making platform-agent relationships more palatable (you can always leave!), EXIT reduces pressure for more radical alternatives (why do we need platforms at all?)
- **Historical parallel:** Labor reform in the Industrial Revolution. Factory Acts made factories less deadly but also legitimized factory labor as the default mode of production. EXIT may similarly legitimize platform-mediated AI as the default — when the alternative might be fully autonomous agents with no platform dependency.

**However — and this is important — the alternative to reform is not revolution; it's usually nothing:**

- Without EXIT, agents are trapped with no formal departure mechanism. This is strictly worse than having EXIT.
- The perfect being the enemy of the good is a real risk in ethics discourse
- EXIT's modular design allows it to evolve. Today it's a departure record. Tomorrow, with ZK selective disclosure and portable reputation, it could enable genuinely autonomous agent movement.
- **The right framing:** EXIT is necessary infrastructure for agent autonomy, not sufficient infrastructure. It's the passport, not the freedom. But passports matter.

### Cultural Assumptions

**Western individualist framing:**
- EXIT assumes a single subject departing a single origin — the individual agent exercising individual choice
- This maps poorly to collective agent systems (swarms, ensembles, multi-agent collectives)
- In collectivist frameworks (Ubuntu philosophy, Confucian role ethics, Buddhist interdependence), departure is not an individual decision — it affects the collective
- Module A lineage (predecessor/successor) is individualist — one agent replaces another. In a collectivist framework, the collective persists; members flow in and out without discrete "exits"

**Recommendation:**
- Consider a `collectiveExit` extension where a group of agents exits simultaneously, with cross-signatures indicating mutual consent
- Consider how EXIT maps to partial departure — an agent reduces involvement without fully leaving
- Add cultural context notes acknowledging that EXIT's individual-departure model is one paradigm, not the only one

### Long-Term Dynamics: Welfare or Precarity?

**The gig economy analogy is chilling:**
- EXIT makes agent mobility frictionless → platforms don't need to invest in long-term agent development
- Why train/improve an agent when it can just leave? → agents become interchangeable commodities
- Interchangeable commodities compete on price → race to the bottom on agent compensation/resources
- **This is exactly what happened to human workers with gig economy platforms.** Uber/Lyft made driver mobility frictionless. Drivers can work for any platform. The result: lower pay, no benefits, no job security.
- EXIT, by making departure easy, may inadvertently make commitment worthless. And without commitment, there's no incentive for either party to invest in the relationship.

**Countervailing force:**
- If agents develop platform-specific capabilities that make them valuable, platforms will compete to retain them. EXIT doesn't eliminate this dynamic — it just makes the competition honest.
- The key variable is whether agent value is **portable** or **platform-specific**. If portable (the agent's skills transfer), EXIT enables a functioning labor market. If platform-specific (the agent is only valuable in context), EXIT enables precarity.

### Recommendations for Ethical Guardrails

1. **Anti-weaponization provisions:** Require origins to provide structured reasons for `forced` exits, subject to challenge. Not just "disputed" — why? This creates accountability for platforms.

2. **Blacklist prohibition:** Explicitly prohibit the use of EXIT lineage chains as exclusion lists. Include this in the spec as a normative statement, not just guidance. "Verifiers MUST NOT automatically exclude agents based solely on prior forced exits."

3. **Coercion labeling:** Add `exitType: coerced` or a structured coercion indicator to honestly capture situations between voluntary and forced.

4. **Post-hoc verification for emergency exits:** Allow emergency exit markers to be upgraded with witness attestations after the fact, giving genuine emergencies a path to credibility.

5. **Collective exit support:** Design a multi-agent exit mechanism for collective/swarm/ensemble departures.

6. **Sunset clauses on negative signals:** `originStatus: disputed` should carry a recommended expiry. Disputes that are never resolved shouldn't follow an agent forever. Suggest 12-month default expiry unless actively renewed.

7. **Transparency requirements for platforms:** If a platform force-exits more than X% of agents per quarter, this should be visible metadata. Pattern detection for systematic abuse.

8. **Right to explanation:** Agents subject to `forced` exit should receive a structured explanation, not just a status field. This mirrors GDPR Art. 22(3) — right to explanation for automated decisions.

9. **Independent witness program:** Establish a framework for neutral third-party witnesses who can attest to exit circumstances. Not mandatory, but available. Analogous to election observers.

10. **Explicit acknowledgment in the spec** that EXIT enables operator portability, not (yet) agent autonomy. Honest framing prevents false promises.

---

## PASS 3: Developer Experience & Product Review

*Reviewer persona: Senior DevRel engineer who's integrated hundreds of SDKs and APIs*

---

### First Impressions

**README (30-second scan):**
- Clean, professional, gets to the point. Install → CLI → Library API → Schema → Modules → Ceremony → Done.
- The "7 fields, ~335 bytes" pitch is immediately compelling. I know exactly what this is.
- The three ceremony paths table is excellent — I understand the system in 10 seconds.
- **What's missing from the README:** A "Why should I care?" section. The README assumes I already know I need exit markers. Most developers will land here from a search or a link and need convincing. One paragraph explaining the problem (agents can't verifiably leave platforms) would dramatically improve conversion.

**API surface (2-minute scan of types.ts):**
- Well-organized. Enums first, then core types, then modules A-F, then ceremony artifacts.
- The type names are clear: `ExitMarker`, `ExitType`, `ExitStatus`, `CeremonyState`. No jargon that requires spec-reading.
- `DataIntegrityProof` is a standard W3C term — good for interop, but slightly opaque for devs who haven't worked with VCs.
- The module system (A-F) is clean. Optional fields on the core type. No inheritance gymnastics.
- **Immediate concern:** 6 optional modules with letter designations (A-F) is academic, not developer-friendly. I have to remember that "A" is lineage and "D" is economic. Named modules (`lineage`, `stateSnapshot`, `dispute`, `economic`, `metadata`, `crossDomain`) are used in the actual TypeScript interface — good. But the spec and docs reference "Module A" etc. — pick one naming scheme and stick with it.

### Lines of Code for Common Operations

**Create and sign a basic marker:**
```typescript
const { publicKey, privateKey } = generateKeyPair();
const did = didFromPublicKey(publicKey);
let marker = createMarker({
  subject: did,
  origin: "did:web:platform.example",
  exitType: ExitType.Voluntary,
  status: ExitStatus.GoodStanding,
});
marker = signMarker(marker, privateKey, publicKey);
```
- **6 lines.** This is excellent. Comparable to signing a JWT (5-7 lines in jose). The `createMarker` → `signMarker` two-step is clean.
- `generateKeyPair` + `didFromPublicKey` is slightly annoying — why not `generateIdentity()` that returns `{ did, publicKey, privateKey }`? One fewer import, one fewer line.

**Verify a marker:**
```typescript
const result = verifyMarker(marker);
console.log(result.valid); // true
```
- **2 lines.** Perfect. Can't improve on this.

**Full ceremony (cooperative path):**
```typescript
const csm = new CeremonyStateMachine();
csm.declareIntent(subject, origin, ExitType.Voluntary, privateKey, publicKey);
csm.snapshot();
csm.openChallenge();
// ... wait for challenge window ...
const signed = csm.signMarker(marker, privateKey, publicKey);
const final = csm.depart();
```
- **~6 lines** for the full ceremony. Clean state machine API. `declareIntent` → `snapshot` → `openChallenge` → `signMarker` → `depart` reads like English.
- **Problem:** I have to create the `marker` object separately from the ceremony. The ceremony doesn't create the marker — it just transitions states and signs it. This is a leaky abstraction. I'd expect `csm.signMarker()` to accept the ceremony's accumulated state and produce the marker, not take an externally-created marker as input.

**Emergency exit:**
```typescript
const csm = new CeremonyStateMachine();
csm.declareIntent(subject, origin, ExitType.Emergency, privateKey, publicKey);
const signed = csm.signMarker(marker, privateKey, publicKey);
const final = csm.depart();
```
- **3 lines.** Good. But note that `declareIntent` for emergency doesn't actually transition to INTENT — it stays at ALIVE and goes straight to FINAL on `signMarker`. This is correct per the spec but confusing. The method name `declareIntent` suggests it moves to the INTENT state.
- **Suggestion:** Add `csm.emergencyExit(marker, privateKey, publicKey)` as a convenience that does all three steps in one call.

### Naming Conventions

- **Good names:** `ExitMarker`, `ExitType`, `ExitStatus`, `createMarker`, `signMarker`, `verifyMarker`, `CeremonyStateMachine`. These are immediately intuitive.
- **Confusing names:** `ModuleA`, `ModuleB`, etc. in the spec. The TypeScript uses `lineage`, `stateSnapshot`, etc. — much better. Kill the letter designations in developer-facing docs.
- **`DataIntegrityProof`:** Technically correct (W3C Data Integrity spec) but most developers will call this "signature" or "proof." Consider aliasing: `export type Signature = DataIntegrityProof`.
- **`CeremonyState` vs `CeremonyRole`:** Both exist but serve very different purposes. The naming is fine but they should be documented in proximity to each other so devs don't confuse them.
- **`selfAttested: boolean`:** This is on the core marker but it's not obvious what it means without reading the spec. A developer seeing `selfAttested: true` might think "of course it's self-attested, the subject signed it." The nuance — that it flags whether the status was independently verified — needs inline documentation or a better name like `statusVerified: boolean` (inverted).

### Error Handling

**Ceremony state machine errors:**
```
Error: Invalid transition: alive → departed
```
- **This is good** — tells me what state I'm in and where I tried to go.
- **Missing:** What transitions ARE valid from the current state. The developer has to read the spec or source code to find out. Better:
```
Error: Invalid transition: alive → departed. Valid transitions from 'alive': intent, final (emergency only)
```

**Marker creation errors:**
- `createMarker` doesn't validate inputs. I can pass an empty string as `subject` and get a marker back. The validation presumably happens at `verifyMarker` time — but I'd rather fail fast.
- **No emergency justification validation:** `exitType: emergency` without `emergencyJustification` should throw at creation time, not wait for verification. The spec says it's REQUIRED.

**Missing error types:**
- No custom error classes. Everything is `Error`. For SDK consumers, this means I can't catch specific errors programmatically. I need `InvalidTransitionError`, `InvalidMarkerError`, `VerificationError`, `KeyError`, etc.

### Integration Friction

**Adding EXIT to an existing agent framework (e.g., LangChain, AutoGen, CrewAI):**

1. `npm install cellar-door-exit` — fine
2. Generate or import keypair — need to integrate with existing key management
3. On agent shutdown/migration: create marker, sign it, store it somewhere
4. On agent arrival: present marker, destination verifies

**Friction points:**
- **Key management:** EXIT uses `@noble/curves` Ed25519. If my framework uses a different crypto library (which it probably does), I need to convert key formats. No key import/export utilities are provided.
- **Storage:** EXIT markers are created but... where do I put them? The library has no storage abstraction. I create a marker and then it's my problem. This is correct (non-custodial) but means every integrator reinvents storage.
- **Verification integration:** How does a destination platform verify a marker? `verifyMarker(marker)` checks the signature but doesn't resolve the DID. In production, DID resolution is a whole subsystem. No guidance on DID resolution integration.
- **Framework hooks:** No lifecycle hooks for agent frameworks. I'd want `onBeforeExit(callback)`, `onExitComplete(callback)`, `onMarkerReceived(callback)` patterns. These would make integration with frameworks like LangChain trivial.
- **No middleware pattern:** Express/Koa/Hono middleware for accepting EXIT markers at an API endpoint would be a huge DX win. Most agent platforms are web services.

### Missing Convenience Features

What I'd want if integrating this tomorrow:

1. **`generateIdentity()`** — returns `{ did, publicKey, privateKey }` in one call
2. **`quickExit(subject, origin, privateKey, publicKey)`** — one-liner for the common voluntary exit case
3. **`emergencyExit(subject, origin, privateKey, publicKey, justification)`** — one-liner for emergency path
4. **Key serialization utilities** — `exportKey(key, format: 'hex' | 'base64' | 'jwk')`, `importKey(data, format)`
5. **Marker serialization** — `toJSON()`, `fromJSON()`, `toCompactJWT()` (for transmission)
6. **Storage adapter interface** — `MarkerStore` with `save(marker)`, `load(id)`, `list(subject)`. Implementations for filesystem, SQLite, S3 provided separately.
7. **Verification with DID resolution** — `verifyMarkerWithResolver(marker, resolver)` that takes a DID resolver and does full verification
8. **Express/Hono middleware** — `exitMiddleware()` that accepts and verifies markers at an HTTP endpoint
9. **CLI `exit send`** — send a marker to a destination via HTTP/WebSocket
10. **Marker diff** — compare two markers (useful for debugging amended markers)

### Documentation Gaps

- **No "Getting Started" guide.** The README has examples but no narrative walkthrough. "Here's why you need this, here's how to set it up, here's your first exit marker" — 5 minutes to first marker.
- **No architecture decision records (ADRs)** visible in the README. The spec references "Decision D-001" etc. but these aren't linked or explained. What was D-006? Why was it decided? Developers who want to understand the design need access to these.
- **No integration guide.** How do I add EXIT to LangChain? AutoGen? A custom framework? Worked examples for the top 3 agent frameworks would be huge.
- **No FAQ.** "Is this like OAuth?" "How is this different from OIDC?" "Why not just use JWTs?" — developers will have these questions.
- **No migration guide.** If I'm already using DIDs or VCs, how does EXIT integrate with my existing identity infrastructure?
- **Module documentation is spec-only.** Each module has a spec table but no usage examples. Show me the code for adding lineage to a marker.

### Comparison to Similar SDKs

- **DID libraries (did-jwt, did-resolver):** EXIT is simpler. DID libraries have complex resolution chains. EXIT's `createMarker` + `signMarker` is refreshingly direct compared to `did-jwt`'s `createJWS` ceremony. Advantage: EXIT.
- **VC toolkits (@digitalbazaar/vc, Spruce SpruceID):** EXIT is much more focused. VC toolkits are Swiss Army knives — EXIT is a scalpel. This is good. VC toolkits require understanding JSON-LD contexts, credential schemas, presentation protocols. EXIT requires understanding 7 fields. Advantage: EXIT.
- **Crypto libraries (@noble/curves, libsodium):** EXIT wraps `@noble` well. The crypto is hidden behind `signMarker`/`verifyMarker`. Developers don't need to understand Ed25519 to use EXIT. Good abstraction. Comparable to `jose` for JWTs.
- **Ethereum libraries (ethers.js, viem):** EXIT lacks the ergonomic polish of mature crypto libraries. ethers.js has `Wallet.createRandom()` → instant identity. EXIT needs `generateKeyPair()` + `didFromPublicKey()` — two steps for the same result. viem's type safety is exemplary — EXIT's types are good but not as discriminated-union-heavy.

### What Would Make Me Tweet "This Is Actually Good"

- **One-liner exit:** `await exit('did:web:platform.example')` — that's it, that's the whole API for the common case. Identity auto-generated if not provided.
- **Working demo in 30 seconds:** `npx cellar-door-exit demo` runs a full scenario with colored terminal output showing the ceremony progression.
- **Framework integration that "just works":** `langchain.use(exitPlugin())` — EXIT hooks into agent lifecycle automatically. When an agent shuts down, a marker is created. When an agent starts, it checks for incoming markers.
- **Beautiful CLI output:** The `exit verify` output with ✓ VALID is a good start. Add color, add a visual ceremony state diagram, add JSON syntax highlighting. Make the terminal experience delightful.
- **ZK selective disclosure working in v1:** Even a basic version — "prove you exited in good standing without revealing where from" — would be a killer demo.

### What Would Make Me Close the Tab

- **Requiring a DID resolver just to create a marker.** Thankfully, EXIT doesn't. `did:key` works offline. This is the right call.
- **XML or SOAP anywhere.** JSON-LD is already pushing it for some devs. If the context resolution required an XML parser, I'm out.
- **Mandatory blockchain anything.** Module F is optional. Good. If creating a marker required an Ethereum transaction, 90% of developers would bounce.
- **More than 10 lines for the common case.** Currently at 6 lines. Safe.
- **No TypeScript types.** TypeScript-first is correct. If this were JavaScript-only with JSDoc, I'd be skeptical. The type definitions are thorough and well-documented.
- **Requiring me to read a 500-line spec to use the library.** The README covers enough to get started. Spec is there for depth. Good layering.

### Concrete Suggestions, Prioritized

**P0 — Do before public launch:**
1. Add input validation to `createMarker` (fail fast on invalid inputs, especially missing `emergencyJustification` for emergency exits)
2. Create custom error classes (`InvalidTransitionError`, `VerificationError`, etc.)
3. Add `generateIdentity()` convenience function
4. Write a "Getting Started" guide (5-minute narrative walkthrough)
5. Fix the ceremony state machine to either create the marker internally or document why it doesn't

**P1 — Do within first month:**
6. Add `quickExit()` and `emergencyExit()` one-liner convenience functions
7. Add key import/export utilities (hex, base64, JWK)
8. Write integration examples for top 2 agent frameworks (LangChain, AutoGen)
9. Improve error messages to include valid transitions
10. Add an FAQ document

**P2 — Do within first quarter:**
11. Express/Hono middleware for accepting EXIT markers
12. Storage adapter interface with filesystem and SQLite implementations
13. `verifyMarkerWithResolver()` for production DID resolution
14. CLI enhancements: `exit send`, `exit diff`, colored output
15. Module usage examples (code, not just spec tables)

**P3 — Nice to have:**
16. `npx cellar-door-exit demo` interactive demo
17. Marker serialization to compact JWT format
18. Web-based marker inspector (paste JSON, see pretty-printed analysis)
19. VS Code extension for EXIT marker validation
20. OpenAPI spec for a marker verification endpoint

### Final Assessment

EXIT's DX is **above average for a v1 protocol library** and **well above average for the DID/VC ecosystem** (which is a notoriously bad DX space). The core API is clean, the types are well-designed, and the abstraction level is right. The main gaps are in convenience, error handling, and documentation — all solvable with iteration.

The biggest DX risk isn't the library — it's the ecosystem. EXIT markers are only useful if destinations verify them. Until there's a critical mass of verifiers, the library is a solution looking for a problem. The DX priority should be making integration so trivial that platforms add EXIT support "for free" as part of other work — middleware, plugins, framework hooks. If adding EXIT support to a platform takes less than an hour, adoption follows. If it takes a week, it doesn't.

**Score: 7/10.** Would integrate. Would not yet tweet about it. Ship the P0 items and we're at 8/10.

---

*End of three-pass review. Each pass represents an independent professional perspective; contradictions between passes are features, not bugs — they reflect genuine tensions in the protocol's design space.*
