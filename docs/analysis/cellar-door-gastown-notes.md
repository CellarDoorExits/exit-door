# Cellar-Door Gastown Docs — Crude Summaries
**Created**: 2026-02-19 | **Status**: Raw notes for reference

These are crude summaries of the Gastown-produced work docs for Cellar-Door (EXIT primitive). Read the originals for depth: `references/Cellar-Door/docs/gastown/`

---

## Architect Docs

### SYNTHESIS.md (cd-1zc.1)
**What it is:** The foundational "what is EXIT" document synthesized from EXIT.txt, perplexity research, peace-through-commerce, and Moltbook posts.

**Key content:**
- EXIT = "verifiable transition marker" — authenticated declaration of departure preserving continuity
- "The doorway, not what you carry through it"
- 5 things EXIT is NOT: identity, storage, transport, enforcement, reputation. Each exclusion justified by showing violation would make EXIT self-defeating
- Competitive landscape: nobody does exit-as-ceremony. VCs do portable credentials but not the ritual of departure. L2 exit formats handle assets only. DAO ragequit has economic finality but no receipts
- The unique gap: EXIT is the intersection of ceremony + agent-native + non-custodial + verifiable receipts
- Open questions cataloged: minimal data structure, ceremony state machine, verification without origin, successor semantics, partial exit, who signs, standards alignment, privacy

### EXIT_SCHEMA.md (cd-1zc.2)
**What it is:** The data structure spec. 7 mandatory core fields + 6 optional modules.

**Core fields (all mandatory, remove any one and it breaks):**
1. `id` — content-addressed hash URI (deduplication, reference)
2. `subject` — DID/agent URI/key fingerprint (who is leaving)
3. `origin` — URI of system being left (scopes departure)
4. `timestamp` — ISO 8601 UTC
5. `exitType` — voluntary | forced | emergency
6. `status` — good_standing | disputed | unverified
7. `proof` — cryptographic signature object

**6 optional modules:** A: Lineage (successor/predecessor), B: State Snapshot (hash refs), C: Dispute Bundle, D: Economic, E: Metadata/Narrative, F: Cross-Domain Anchoring

**Size:** Core-only = 300-500 bytes. Full ceremony = 2-4 KB.

**3 decisions flagged for Mayor (all recommend option C):**
1. Envelope format → dual (standalone JSON-LD + VC wrapper)
2. Verification model → layered (subject mandatory, co-sigs optional)
3. Status semantics → multi-source (self-attested core + optional origin view)

### EXIT_CEREMONY.md (cd-1zc.3)
**What it is:** The state machine and ritual design. 7 states, 3 paths.

**States:** ALIVE → INTENT → SNAPSHOT → OPEN → CONTESTED → FINAL → DEPARTED

**3 ceremony paths:**
- Full cooperative: all states, minutes to days
- Unilateral: skip OPEN, seconds (non-cooperative origin)
- Emergency: ALIVE → FINAL, milliseconds (context dying)

**Critical design decisions:**
- Contests don't block exit (prevents denial-of-exit attacks; changes status field only)
- Only Subject is always required (works with zero cooperation)
- DEPARTED is terminal (no undo; return = new JOIN)
- Emergency markers can be upgraded post-hoc

**Roles:** Subject (always), Origin (optional), Witness (optional), Verifier (downstream), Successor (optional)

**Failure modes covered:** Origin refuses, false snapshots, key loss during ceremony, expired challenge window, network partition. All recoverable except key loss without Module A setup.

### AGENT_LINEAGE.md (cd-1zc.4)
**What it is:** How EXIT handles agent identity, successor appointment, and continuity proofs.

**Identity reference:** subject field accepts did:key, did:peer, agent://, did:web, or raw key fingerprint (preference order). EXIT references identity, doesn't manage it.

**Successor appointment — 3 trust levels:**
1. Self-appointed (unilateral, low trust)
2. Cross-signed (both parties agree, medium trust)
3. Witnessed (third party attests, high trust)

**Deferred successor:** Create EXIT without successor, publish SuccessorAmendment later (must be signed by original key).

**4 continuity proof types (strongest → weakest):**
1. Key Rotation Binding (old key signs new key — unforgeable)
2. Lineage Hash Chain (Merkle chain from genesis)
3. Delegation Token (scoped capability transfer — for forks)
4. Behavioral Attestation (social vouching — last resort)

**Emergency preparedness:** Pre-signed rotation escrow on root-of-trust machine. Generate emergency key + pre-sign rotation binding before crisis.

**Self-issuance:** Always self-issued, co-signatures optional. Rationale: hostile origins can't block, dying contexts have no time for negotiation.

### ARCHITECTURE.md (capstone)
**What it is:** The living architectural spec that synthesizes all four docs into one reference.

**7 architectural principles:** Non-custodial, Always available, Offline-verifiable, Agent-native, Minimal core + optional extensions, Envelope-agnostic, Irreversible.

**Implementation roadmap:**
- Phase 1 (Architecture): COMPLETE ✓
- Phase 1b (Research Spikes): IN PROGRESS — 6 beads (memory persistence, partial exit, ragequit analysis, VC envelope, DID catalog, TypeScript prototype)
- Phase 2 (Prototype): Pending Mayor decisions + spike results
- Phase 3 (Integration): Agent bindings, VC wrapper, on-chain anchoring, cross-system verification

**Dependencies:** DID method (or agent:// resolver), signing algorithm (Ed25519/secp256k1), content-addressing (SHA-256). Does NOT depend on any blockchain, VC library, storage layer, or origin system.

---

## Research Docs

### did_methods_for_agents.md (cd-48g)
**What it is:** Comprehensive catalog of 13 DID methods ranked for agent suitability.

**The 3 constraints in tension:** Key rotation + Survives origin death + Autonomous management

**Top recommendation: did:keri** — pre-rotation mechanism (commit hash of next keys before rotating), self-certifying Key Event Log (KEL), no blockchain required, offline verifiable, post-quantum secure hash commitments. Production: GLEIF vLEI since 2022. TypeScript: signify-ts.

**Secondary: did:webs** — KERI security + web-based discovery. Same AID as did:keri but resolvable via HTTP.

**Emergency fallback: did:key** — zero-infrastructure, one-shot ephemeral identity. Perfect for emergency EXIT.

**Key finding:** did:web (the most popular method) FAILS the origin-death test — server dies, DID unresolvable. This is critical for EXIT.

**Prototype path:** Start with Veramo + did:key → add signify-ts for did:keri → implement EXIT signing with KEL in marker package.

### exit_as_vc.md (cd-1jg)
**What it is:** Detailed fit test of EXIT schema into W3C VC Data Model 2.0 envelope.

**Verdict: Dual format confirmed** (option C). VC envelope fits well with manageable friction.

**Field mapping:** Most fields map cleanly. Key friction points:
- `status` → rename to `departureStatus` (semantic collision with VC `credentialStatus`)
- Proof format → migrate from Ed25519Signature2020 to DataIntegrityProof + cryptosuite
- Self-issued VCs are allowed by spec (Microsoft Entra does it in production)

**Proof format:** Data Integrity (eddsa-jcs-2022) as primary. Supports proof sets for multi-party signing (subject + origin + witness).

**4 concrete VC examples provided:** Platform-issued, self-issued, emergency, co-signed.

**Size overhead:** ~60% (~230 bytes) — negligible.

**Implementation:** Veramo (TypeScript) for creation/verification. Need to host JSON-LD context at cellar-door.org/exit/v1.

### moloch_ragequit_analysis.md (cd-t9n)
**What it is:** Deep analysis of Moloch ragequit as the closest existing formalized exit mechanism.

**Key structural finding:** Ragequit has NO intermediate states — it's a single atomic transaction. Compare EXIT's 7-state ceremony.

**What ragequit does:** Atomic pro-rata treasury withdrawal, minority protection (grace period + ragequit before bad proposal executes), partial exit, unilateral (no permission needed), dilution bound auto-fail on mass exit.

**What ragequit does NOT do:** No portable receipt, no identity continuity, no dispute awareness, no evidence preservation, no reputation portability, no successor semantics, no cross-platform applicability, no agent/non-human exit, no voice within exit, no offline verification.

**Nouns DAO Fork:** Most sophisticated existing exit — 5-step process with escrow/signal, threshold, forking period, token claiming, delayed governance. Fork 1: 56% of holders forked, treasury drained to 40% of peak through consecutive forks.

**Aragon cautionary tale:** No ragequit → raiders accumulated below book value → forced dissolution. Failure mode of no structured exit.

**Proposed: `exitType: systemic`** for mass-exit events (entire origin shutting down).

---

## Scholar Docs

### ARCHITECT_REVIEW.md
**What it is:** Scholar's detailed review of the architect's three deliverables.

**Verdict:** "Strong foundation. Core is well-justified, modularity is right, key design decisions are correct."

**10 research threads identified:**
- AR-1: Non-custodial claim vs de facto reputation oracle (HIGH)
- AR-2: Credit rating system analogy for status attestation (HIGH)
- AR-3: `systemic` exit type (MEDIUM)
- AR-4: Multiple proof algorithms (MEDIUM)
- AR-5: Collective exit game theory (HIGH)
- AR-6: Timing oracle attacks on challenge windows (MEDIUM)
- AR-7: Minimum viable witness model (MEDIUM)
- AR-8: Provenance tracking for post-hoc upgrades (HIGH)
- AR-9: DID methods surviving origin death (CRITICAL) — answered by cd-48g
- AR-10: Protocol vs data format standardization strategy (HIGH)

**Cross-cutting observations:** The Architect designed a protocol not just a data format. The status field will be the most contested part in practice. Gas Town should be first case study.

### RESEARCH_BRIEF.md
**What it is:** Scholar's comprehensive research brief — ontology, ecosystem map, competitive landscape, 14 open research questions, connections to broader fields.

**Ecosystem diagram:** Vision layer (Peace Through Commerce) → Primitive layer (Cellar Door/EXIT) → Infrastructure layer (Gas Town + Beads)

**14 open research questions organized into:**
- Foundational (Q1-3): minimum receipt, separation from identity, EXIT vs DEATH
- Technical (Q4-7): offline verification, Sybil resistance, adversarial disputes, ZK disclosure
- Systemic (Q8-11): tyranny relocation, memory persistence, weaponization, off-chain function
- Strategic (Q12-14): first profitable integrity island, agent:// relationship, phase model placement

**Meta-observation:** "Can a small, neutral, non-custodial primitive actually bear that much civilizational weight? History says yes — bankruptcy law, limited liability, right of emigration all did exactly this."
