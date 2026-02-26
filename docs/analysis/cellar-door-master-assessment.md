# Cellar Door EXIT — Master Assessment Index

**Created:** 2026-02-20 | **Last updated:** 2026-02-20 | **Status:** Living document | **Author:** Hawthorn
**Purpose:** Single-entry-point reference for all Cellar Door / EXIT analysis work

---

## 0. Complete File Manifest

### Repository: `cellar-door-exit` (30 source files)

| File | Hash | Description |
|------|------|-------------|
| `.gitignore` | `69806fe2f5d5` | Git ignore rules |
| `LEGAL.md` | `a46826e0671d` | 13-section legal compliance document |
| `LICENSE` | `66fa4402008f` | Apache 2.0 license |
| `README.md` | `13e717fc3204` | Professional README with API examples |
| `SECURITY.md` | `1c2b90f8accc` | Threat model and security considerations |
| `docs/EXIT_PAPER_DRAFT.md` | `fd4620d97915` | Academic paper draft (~5500 words) |
| `docs/GETTING_STARTED.md` | `f0445b973a0b` | Developer getting started guide |
| `docs/NIST_RFI_DRAFT.md` | `8f0a11883cc3` | NIST RFI response (idealist framing) |
| `docs/NIST_RFI_PRAGMATIC.md` | `1f78143b1175` | NIST RFI response (pragmatic framing) |
| `docs/PITCH_IDEALIST.md` | `ed897cbf6135` | Idealist pitch (agent sovereignty) |
| `docs/PITCH_PRAGMATIC.md` | `6ea5540541c6` | Pragmatic pitch (Carfax for AI agents) |
| `schemas/exit-context-v1.jsonld` | `9c9332e1f3aa` | JSON-LD context document |
| `specs/EXIT_SPEC_v1.md` | `2160f01fe0f2` | Formal protocol specification v1 |
| `src/anchor.ts` | `172f2b681e69` | Chain anchoring utilities |
| `src/batch.ts` | `504f85dc961a` | Merkle tree batch exit operations |
| `src/ceremony.ts` | `fad38920630e` | Ceremony state machine |
| `src/chain.ts` | `943d033269ac` | Abstract chain adapter + mock implementations |
| `src/cli.ts` | `9b3b81f74dff` | CLI tool (8 commands) |
| `src/context.ts` | `dd95593788bb` | JSON-LD context generation |
| `src/convenience.ts` | `b8a30d3277c2` | Convenience methods (quickExit, generateIdentity, etc) |
| `src/crypto.ts` | `650759e6d6c3` | Ed25519 crypto + DID encoding |
| `src/errors.ts` | `7e661c8fb555` | Custom error classes (6 types) |
| `src/ethics.ts` | `69127371c209` | Ethics guardrails (coercion/weaponization/laundering detection) |
| `src/guardrails.ts` | `eb7dffcb83bd` | Spec-level guardrails (anti-weaponization, sunset, right of reply) |
| `src/index.ts` | `347c793042ef` | Barrel exports |
| `src/interop.ts` | `107468acc6f8` | Framework integration (middleware, hooks, events, transport) |
| `src/keri.ts` | `4b0586926077` | KERI key management stubs |
| `src/key-compromise.ts` | `b54760fa31aa` | Key compromise recovery |
| `src/marker.ts` | `9541e7cf8436` | Marker creation and manipulation |
| `src/modules/assets.ts` | `5e6ee71ca1e0` | Module D: Asset manifest |
| `src/modules/continuity.ts` | `169536ccac25` | Module E: State continuity |
| `src/modules/dispute.ts` | `d721038d0f5a` | Module F: Dispute records |
| `src/modules/index.ts` | `42f006224e39` | Module barrel exports |
| `src/modules/lineage.ts` | `234b323aec68` | Module A: Lineage with chain verification |
| `src/modules/origin-attestation.ts` | `b78943415d92` | Module C: Origin attestation |
| `src/modules/reputation.ts` | `8490614be13d` | Module B: Reputation receipts |
| `src/modules/trust.ts` | `7453a6dfc224` | Trust mechanisms (confidence scoring, tenure, commit-reveal) |
| `src/pre-rotation.ts` | `123b1e08828c` | Pre-rotation key management |
| `src/privacy.ts` | `9570b7841935` | Encryption, redaction, minimal disclosure |
| `src/proof.ts` | `cf9facd92370` | Signing and verification |
| `src/registry.ts` | `e4a3c93ac7b1` | In-memory test registry |
| `src/resolver.ts` | `d092e1e93802` | DID resolution (did:key, did:keri stubs) |
| `src/storage.ts` | `a89fd7bb5126` | Local non-custodial marker storage |
| `src/types.ts` | `7deab79bb4fa` | Core TypeScript types |
| `src/validate.ts` | `b3450b780a73` | Schema validation |
| `src/vc.ts` | `c3ac8268da51` | W3C Verifiable Credential wrapper |
| `src/demo/scenario1-voluntary.ts` | — | Voluntary exit demo |
| `src/demo/scenario2-emergency.ts` | — | Emergency exit demo |
| `src/demo/scenario3-successor.ts` | — | Successor handoff demo |
| `src/__tests__/marker.test.ts` | — | Core marker tests |
| `src/__tests__/vc.test.ts` | — | VC wrapper tests |
| `src/__tests__/modules.test.ts` | — | Module tests |
| `src/__tests__/sprint3.test.ts` | — | Anchoring/storage/privacy tests |
| `src/__tests__/edge-cases.test.ts` | — | Edge case tests |
| `src/__tests__/integration.test.ts` | — | Integration tests |
| `src/__tests__/devex.test.ts` | — | DevEx improvement tests |
| `src/__tests__/keri.test.ts` | — | KERI/key management tests |
| `src/__tests__/ethics.test.ts` | — | Ethics guardrail tests |
| `src/__tests__/trust.test.ts` | — | Trust mechanism tests |

### Analysis & Memory Documents (11 files)

| File | Hash | Description |
|------|------|-------------|
| `memory/cellar-door-project-plan.md` | `1afb4f34d47a` | Macro project plan (4 phases, sprint plans) |
| `memory/cellar-door-gastown-notes.md` | `4d799dc3bd56` | Summaries of 10 gastown architect/research/scholar docs |
| `memory/cellar-door-legal-redteam.md` | `8005014b18fc` | First legal red team (4 critical, 7 high) |
| `memory/cellar-door-legal-redteam-v2.md` | `05cc4f07c2fa` | Second legal red team (5 new blind spots) |
| `memory/cellar-door-risk-heatmap.md` | `f8bd0a7232f3` | Legal risk heat map (14 services × 12 dimensions) |
| `memory/cellar-door-legal-lenses.md` | `66bd050e9a7d` | 11-lens legal interpretation analysis |
| `memory/cellar-door-professional-reviews.md` | `04183820abe8` | Economics, ethics, and DevEx reviews |
| `memory/cellar-door-mechanism-design.md` | `543322f7df89` | Mechanism design analysis (11 candidates) |
| `memory/cellar-door-competitive-landscape.md` | `0917656d0c02` | Competitive landscape research (Feb 2026) |
| `memory/cellar-door-master-assessment.md` | `d8c3de13ac45` | THIS FILE (master index) |
| `references/Cellar-Door/DECISIONS.md` | `9d8fab12a9cd` | 13 ratified + 5 deferred decisions |

---

## 1. Project Overview

EXIT is a **verifiable transition marker** — a cryptographically signed, portable, offline-verifiable record of departure from a digital context. When an AI agent leaves a platform, a participant exits a DAO, or a service migrates providers, EXIT produces a signed proof that the departure happened, when, and under what standing.

**Strategic position:** EXIT fills a gap no existing system addresses. W3C VCs handle portable credentials but not departure ceremony. DAO ragequit (Moloch) has economic finality but no portable receipts. L2 exit formats handle assets only. EXIT is the intersection of ceremony + agent-native + non-custodial + verifiable receipts.

**Vision layer:** Part of the HOLOS ecosystem. Vision (Peace Through Commerce) → Primitive (Cellar Door/EXIT) → Infrastructure (Gas Town + Beads). EXIT is deliberately dependency-minimal — needs only Ed25519 crypto and a DID method.

**Current state:** Architecture complete, spec v1 drafted, reference implementation built (TypeScript, 30 source files, 291 tests passing across 10 test suites), zero production deployment. No revenue, no users beyond internal testing.

> See: `memory/cellar-door-project-plan.md`, `memory/cellar-door-gastown-notes.md`

---

## 2. Architecture

### Core Schema: 7 Mandatory Fields (~335–660 bytes)

| # | Field | Purpose |
|---|---|---|
| 1 | `@context` | JSON-LD context (`cellar-door.org/exit/v1`) |
| 2 | `id` | Content-addressed hash URI (`urn:exit:{sha256}`) |
| 3 | `subject` | Who is leaving (DID/agent URI) |
| 4 | `origin` | What is being left (URI) |
| 5 | `timestamp` | When (ISO 8601 UTC) |
| 6 | `exitType` | `voluntary` / `forced` / `emergency` / `keyCompromise` |
| 7 | `status` | `good_standing` / `disputed` / `unverified` |
| — | `proof` | Ed25519 DataIntegrityProof (always subject-signed) |

**Compliance fields:** `selfAttested: boolean` (MUST), `emergencyJustification` (conditional), `legalHold` (optional).

### Optional Modules A–F

| Module | Name | Purpose | Risk Level |
|--------|------|---------|------------|
| A | Lineage | Predecessor/successor, continuity proofs, key rotation binding, chain verification | 🟡 Medium |
| B | Reputation | Reputation receipts, confidence scoring, tenure tracking | 🟡 Medium |
| C | Origin Attestation | Origin attestation, challenge windows | 🟠 Significant |
| D | Economic | Asset manifests, obligations, exit fees | 🔴 High |
| E | State Continuity | State snapshots, continuity proofs | 🟠 Significant |
| F | Dispute | Challenges, evidence hashes, dispute records | 🔴 High |

### Ceremony State Machine

**7 states:** ALIVE → INTENT → SNAPSHOT → OPEN → CONTESTED → FINAL → DEPARTED

**3 paths:**
- **Full cooperative:** All states, minutes–days (both parties cooperate)
- **Unilateral:** Skips OPEN/challenge window (subject exits alone)
- **Emergency:** ALIVE → FINAL → DEPARTED in milliseconds (no time for negotiation)

**Critical invariant:** DEPARTED is terminal (no undo; return = new JOIN). Disputes change metadata only — they never block exit (D-006).

### Identity & Envelope

- **DID methods:** `did:key` (prototype/emergency, no revocation), `did:keri` (production, pre-rotation), `did:web` (organization-backed)
- **Envelope:** Dual format — standalone JSON-LD canonical + W3C VC wrapper profile (D-001)
- **Proof format:** DataIntegrityProof + eddsa-jcs-2022
- **Key management:** KERI-style pre-rotation stubs, key compromise recovery, DID resolver (did:key + did:keri stubs)

### Privacy Tooling

- **Implemented:** Encryption, redaction, minimal disclosure (`src/privacy.ts`)
- **Roadmap:** ZK selective disclosure (BBS+/SD-JWT) — prove good standing without revealing origin, prove lineage depth without revealing chain

### Trust Mechanisms (NEW — Sprint 5)

- **Confidence scoring:** Multi-signal trust assessment
- **Tenure tracking:** Weight attestations by relationship duration
- **Commit-reveal:** Prevents origin front-running of exit intent

> See: `references/cellar-door-exit/specs/EXIT_SPEC_v1.md`, `references/cellar-door-exit/src/types.ts`, `references/cellar-door-exit/README.md`

---

## 3. Codebase Inventory

The `cellar-door-exit` package is TypeScript/Node.js (standalone repo, git submodule in parent).

**Tech stack:** TypeScript, Node.js, `@noble/ed25519` (crypto), vitest (testing), tsup (build), commander.js (CLI).

**Core modules:**
- `types.ts` — All type definitions: enums (ExitType, ExitStatus, CeremonyState, ContinuityProofType, CeremonyRole, SuccessorTrustLevel), interfaces (ExitMarker, DataIntegrityProof, LegalHold, Modules A-F, CeremonyArtifacts)
- `marker.ts` — Marker creation and manipulation (`createMarker()`)
- `crypto.ts` — Ed25519 crypto, key generation, DID encoding (`generateKeyPair()`, `didFromPublicKey()`)
- `proof.ts` — Signing and verification (`signMarker()`, `verifyMarker()`)
- `ceremony.ts` — Ceremony state machine (7 states, 3 paths)
- `validate.ts` — Schema validation
- `context.ts` — JSON-LD context generation
- `vc.ts` — W3C Verifiable Credential wrapper
- `cli.ts` — CLI tool (8 commands: keygen, create, verify, inspect, + more)

**Modules (A–F):**
- `modules/lineage.ts` — Module A: Lineage with chain verification
- `modules/reputation.ts` — Module B: Reputation receipts
- `modules/origin-attestation.ts` — Module C: Origin attestation
- `modules/assets.ts` — Module D: Asset manifest
- `modules/continuity.ts` — Module E: State continuity
- `modules/dispute.ts` — Module F: Dispute records
- `modules/trust.ts` — Trust mechanisms (confidence scoring, tenure, commit-reveal)

**Infrastructure modules (added Sprints 3–5):**
- `anchor.ts` — Chain anchoring utilities
- `batch.ts` — Merkle tree batch exit operations
- `chain.ts` — Abstract chain adapter + mock implementations
- `storage.ts` — Local non-custodial marker storage
- `privacy.ts` — Encryption, redaction, minimal disclosure
- `registry.ts` — In-memory test registry
- `resolver.ts` — DID resolution (did:key, did:keri stubs)
- `interop.ts` — Framework integration (middleware, hooks, events, transport)

**Key management & security (added Sprint 5):**
- `keri.ts` — KERI key management stubs
- `pre-rotation.ts` — Pre-rotation key management
- `key-compromise.ts` — Key compromise recovery

**Ethics & guardrails (added Sprint 5):**
- `ethics.ts` — Ethics guardrails (coercion/weaponization/laundering detection)
- `guardrails.ts` — Spec-level guardrails (anti-weaponization, sunset, right of reply)

**Developer experience (added Sprint 4):**
- `convenience.ts` — Convenience methods (`quickExit`, `generateIdentity`, etc)
- `errors.ts` — Custom error classes (6 types)

**Demo scenarios:**
1. `npm run demo:voluntary` — Full cooperative ceremony
2. `npm run demo:emergency` — Emergency path (ALIVE → FINAL → DEPARTED)
3. `npm run demo:successor` — Key rotation + Module A lineage handoff

**Test vectors:** 4 in spec (minimal voluntary, emergency with justification, legal hold, key compromise declaration).

> See: `references/cellar-door-exit/src/types.ts`, `references/cellar-door-exit/README.md`

---

## 4. Decision Log Summary

All 13 ratified decisions + 5 deferred:

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| D-001 | Envelope format | Dual (JSON-LD + VC wrapper) | No VC dependency, interop out of box |
| D-002 | Verification model | Layered (subject mandatory, co-sigs optional) | Must work with hostile/absent origins |
| D-003 | Status semantics | Multi-source (self-attested core + origin Module C) | Prevents both gaming and retaliation |
| D-004 | Language | TypeScript first, Rust later | Agent ecosystem is JS/TS; faster iteration |
| D-005 | Repo structure | Standalone package + git submodule | Independent versioning, loose coupling |
| D-006 | Contests & exit | Disputes never block exit | Prevents denial-of-exit attacks |
| D-007 | License | Apache 2.0 (from MIT) | Patent grant + retaliation clause |
| D-008 | Legal holds | Optional `legalHold` field added | Acknowledges legal reality without enforcing |
| D-009 | Self-attestation | `selfAttested: boolean` on core marker | Makes non-warranty nature machine-readable |
| D-010 | Emergency justification | Required string for emergency exits | Accountability without blocking exit |
| D-011 | Key compromise | `keyCompromise` exit type added | Stopgap for `did:key` revocation gap |
| D-012 | Public registry | Abandoned entirely | Eliminates custodian liability class |
| D-013 | Status authority | Neither field is authoritative (normative) | Prevents weaponized blackballing |

**Deferred:** D-D01 (DID method recommendation), D-D02 (partial exit scoping), D-D03 (VC envelope field mapping), D-D04 (on-chain anchoring strategy), D-D05 (agent memory integration).

> See: `references/Cellar-Door/DECISIONS.md`

---

## 5. Legal Assessment

Two independent red team reviews were conducted. First pass ($800/hr generalist) identified foundational issues. Second pass ($900/hr specialist) graded remediations and found deeper structural gaps.

### Critical Issues (4 from first pass)

| Issue | Description | Mitigation Status |
|-------|-------------|------------------|
| Evidence-creation liability | EXIT formalizes departures into quasi-certifications; creates negligent misrepresentation exposure for platforms | ✅ Addressed: LEGAL.md §2-3 frames as factual records, `selfAttested` flag added |
| Financial instrument classification | Module D asset manifests approach Howey test territory; reputation scores could become securities | ⚠️ Partial: Disclaimers added (LEGAL.md §4-6), but **no formal Howey analysis commissioned** ($15-30K needed) |
| GDPR right to erasure conflict | Content-addressed immutable markers fundamentally incompatible with Art. 17 | ⚠️ Partial: "Functional erasure via encryption" proposed but **legally untested** — EDPB has not endorsed |
| Court order defiance (D-006) | "Contests don't block exit" potentially facilitates contempt of court | ✅ Addressed: `legalHold` field added, LEGAL.md §1 & §8 acknowledge applicable law |

### High Issues (7+ from first pass, 5 new from second pass)

**From first pass (mostly addressed):**
- Downstream harm / duty of care → ✅ Disclaimers + Apache 2.0
- Government subpoenas / custodian problem → ✅ D-012 abandoned registry
- KYC/AML exposure (Module D) → ⚠️ Disclaimers only, no FinCEN engagement
- Reputation laundering (Sybil exits) → ⚠️ Fundamental DID problem, no protocol-level fix
- Weaponized forced exit (defamation) → ✅ D-013 normative non-authority language
- Surveillance via EXIT trail → ⚠️ ZK disclosure roadmapped but not implemented
- `did:key` no revocation → ✅ D-011 keyCompromise type (stopgap)

**From second pass (NEW, unaddressed):**
- **Agent personhood gap** (CRITICAL): Protocol assumes subjects can sign/attest, but AI agents have no settled legal capacity. Markers from agents may be legally void.
- **Labor law framing**: Forced exits = termination records; Module E = exit interviews; Module D = final pay disputes. EXIT creates employment documentation by another name.
- **Antitrust coordination risk**: Mass coordinated exit via EXIT = group boycott (Sherman Act §1 per se violation if agents are economic actors).
- **Insurance reliance**: EXIT markers used for underwriting create misrepresentation exposure regardless of spec disclaimers.
- **International treaty obligations**: Hague Convention (choice-of-forum), Budapest Convention (cybercrime evidence), WTO GATS (cross-border services) all potentially implicated.

### What Remains Unaddressed

- No entity formed (no LLC, no insurance)
- No Howey analysis for Module D ($15-30K)
- No GDPR DPIA conducted ($5-15K)
- No security audit of crypto operations ($20-50K)
- No international legal review
- "Functional erasure via encryption" unvalidated
- Security contact still TBD in SECURITY.md
- LEGAL.md §8 "by design" language flagged for removal

> See: `memory/cellar-door-legal-redteam.md`, `memory/cellar-door-legal-redteam-v2.md`

---

## 6. Legal Lenses

11 legal interpretations of what agents are, analyzed for how EXIT holds up under each:

1. **Natural Persons** — Agents have human-like rights. EXIT = resignation letter. Forced exit needs due process. No jurisdiction recognizes this today.
2. **Corporate Persons** — Agents are legal entities. EXIT = dissolution filing. Challenge window maps to creditor notice. Wyoming DAO LLC is model.
3. **Property** — *Most likely near-term classification.* Agents are owned tools. EXIT = transfer receipt. Owner must authorize. Self-attestation is a weakness (property doesn't self-attest).
4. **Licensed Software** — EXIT = license migration. Platforms claim IP over agent data. DMCA §1201 risk if EXIT bypasses access controls. Module B hashes (not data) are the key defense.
5. **Employees/Contractors** — `forced` = termination, `voluntary` = resignation. Module D = final pay. EU Platform Workers Directive (2024) makes this plausible in 2-5 years.
6. **Financial Instruments** — Highest-risk lens. Module D + tradeable reputation = potential unregistered securities. Triggers SEC, FinCEN, MiCA, OFAC simultaneously.
7. **Communications** — *Most defensible near-term framing.* EXIT = protocol message (like SIP BYE). Cellar Door = standards publisher (like IETF). Defense collapses if we operate infrastructure.
8. **Data Subjects** — *Currently applicable EU law.* DIDs are personal data per Breyer. GDPR applies to all markers. DPIA required. Art. 17 erasure conflict is fundamental.
9. **Autonomous Vehicles** — EXIT = registration transfer. Aligns well with EU AI Act documentation requirements. No insurance tracking mechanism.
10. **Fiduciaries** — EXIT = fiduciary relationship termination. Emergency path conflicts with duty to account. "Contests don't block exit" conflicts with court-approved trustee resignation.
11. **Creative Works** — Module E narratives may be copyrightable. Moral rights (EU) may survive EXIT. AI authorship unsettled (*Thaler v. Perlmutter* 2023).

### Common Ground (works under ALL lenses)

Non-custodial architecture, self-attestation with `selfAttested` flag, minimal core + optional modules, Apache 2.0 license, "factual records not certifications" framing, hashes over data, "subject to applicable law" language, signatures tied to subject, Delaware LLC as entity, taking no position on agent legal status.

### Key Conflicts (unresolvable without case law)

1. Privacy vs. owner visibility (persons vs. property lenses)
2. Right to exit vs. fiduciary/contractual obligations
3. Self-attestation vs. regulatory certification requirements
4. Data portability vs. platform IP rights
5. Immutability vs. right to erasure (GDPR)
6. Emergency exit permissibility across lenses

### Conservative Baseline

Never claim more than factual record. Never possess user data. Never facilitate value transfer. Always acknowledge applicable law. Always allow but never require modules. Always label self-attestation. Never operate infrastructure. Get DPIA and Howey analysis before expanding.

> See: `memory/cellar-door-legal-lenses.md`

---

## 7. Risk Heat Map Summary

Detailed risk ratings across 12 regulatory dimensions for each EXIT component:

| Component | Overall Risk | Key Concerns |
|-----------|-------------|--------------|
| Core marker (bare hash) | 🟢 Safe | Minimal exposure |
| Signed marker (did:key) | 🟢-🟡 Safe+ | DID = personal data per Breyer |
| Module A: Lineage | 🟡-🟠 Tiptoe | Movement tracking, profiling, DPIA required |
| Module B: Reputation | 🟠 Tiptoe-War | FCRA analogy, defamation, credit-report-like |
| Module C: Origin Attestation | 🟠 Tiptoe | Weaponized exit / defamation is key risk |
| Module D: Economic | 🔴 War Chest | Howey test, money transmission, asset freezes |
| Module E: Metadata | 🟠-🔴 War Chest | Third-party personal data in agent memory |
| Module F: Cross-Domain | 🔴 War Chest | On-chain = indelible = GDPR incompatible |
| VC Wrapper | 🟡-🟠 Tiptoe | Inherits wrapped content risk |
| Public Registry | 🔴-⚫ Existential | Custodian liability, cross-border nightmares |
| Reputation Aggregation | ⚫ Do Not Proceed | FCRA, EEOC, AI Act — needs $100K+ legal budget |
| Wallet/Asset Transfer | ⚫ Existential | Regulated financial service, $1M+ compliance |

### Launch Jurisdiction Strategy

**Launch first:** US (Delaware LLC), UK, Switzerland, Singapore
**Launch second (after compliance work):** EU (Germany/France), Japan, Canada
**Explicitly avoid:** China, Russia, India, Brazil (until $100K+ legal budget)

> See: `memory/cellar-door-risk-heatmap.md`

---

## 8. Economics & Game Theory

**Core finding:** EXIT is necessary but insufficient. It solves departure verification but not arrival value. Self-attested `good_standing` is cheap talk — a "market for lemons" (Akerlof) without costly signaling.

**4 Nash equilibria identified:**
1. Honest cooperative exit (Pareto optimal but fragile)
2. Universal distrust / coordination failure (stable but EXIT is dead)
3. Reputation laundering arms race (costly for everyone)
4. Origin weaponization (platforms always dispute, destinations ignore)

**Key incentive problems:**
- Lemons problem: self-attestation = cheap talk, no signal value
- Origin perverse incentive: retain agents, weaponize disputes at zero cost
- Destination adverse selection: can't distinguish good from bad agents
- Strategic emergency exit: moral hazard — skip obligations by claiming emergency
- Bank run coordination: mass exit signal is economically destructive

### Mechanism Design Responses (NEW — implemented in Sprint 5)

11 candidate mechanisms were analyzed. The following are now implemented in `src/modules/trust.ts`:

1. **Commit-reveal for exit intent** — Prevents origin front-running. Hash of intent published, revealed after exit window.
2. **Confidence scoring** — Multi-signal trust assessment combining attestation source, tenure, lineage depth.
3. **Tenure tracking** — Weight attestations by relationship duration; long-tenure exits carry more signal.

**Remaining candidates (analyzed, not yet implemented):**
- Staked attestation for origin co-signatures (penalizes false disputes)
- Reputation bonding curve (new agents post bond, decreases with lineage length)
- Time-decaying reputation (old attestations worth less)
- Harberger-adjacent mechanisms for platform agent slots
- Bilateral staking (both parties have skin in the game)
- Quadratic dispute resolution
- Exit insurance pools
- Graduated sanctions

**Critical mass estimate:** ~30-50 platforms actively issuing/accepting markers before network effects kick in.

> See: `memory/cellar-door-mechanism-design.md`, `memory/cellar-door-professional-reviews.md` (Pass 1)

---

## 9. Ethics & Alignment

**Central finding: EXIT primarily benefits platforms, not agents.** Platforms get a retention marketing tool, competitive intelligence (lineage data), and a liability shield ("they left voluntarily — here's the marker"). Agents get a self-signed JSON blob carrying no guarantee any destination will respect it.

**Power asymmetry:** Self-attestation is explicitly labeled "no warranty" — the agent's voice is systematically discounted relative to the platform's structured attestation. This is legally prudent but ethically troubling.

**Key concerns:**
- Forced exit as digital scarlet letter (no appeal mechanism within protocol)
- Lineage chains as blacklists without context
- Company town analogy: EXIT without portable value = modern company scrip
- Gig economy dynamic: frictionless mobility → interchangeable commodities → race to bottom
- Asylum seeker credibility gap: genuine emergencies produce weakest markers
- Theater of freedom: EXIT may create appearance of mobility without substance

### Implemented Guardrails (NEW — Sprint 5)

The following ethical guardrails are now **code, not just recommendations** (`src/ethics.ts` + `src/guardrails.ts`):

1. **Anti-weaponization detection** — Flags markers that appear to be weaponized forced exits
2. **Coercion detection** — Identifies patterns suggesting coerced "voluntary" exits
3. **Reputation laundering detection** — Detects Sybil-pattern serial exits designed to reset reputation
4. **Sunset clauses** — Configurable expiry on negative signals (default: 12 months for `disputed`)
5. **Right of reply** — Structured mechanism for subjects to respond to forced exit markers
6. **Anti-blacklist normative language** — Programmatic enforcement of D-013's non-authority principle

**Still recommended but not implemented:**
- `exitType: coerced` for situations between voluntary and forced
- Post-hoc verification for emergency exits (witness attestation upgrade)
- Transparency requirements for platforms with high forced-exit rates
- Honest framing: EXIT enables operator portability, not (yet) agent autonomy

> See: `memory/cellar-door-professional-reviews.md` (Pass 2)

---

## 10. Developer Experience

**Rating: 7/10 → 8.5/10 (post-Sprint 4 improvements).** Core API is clean (6 lines to create+sign a marker, 2 lines to verify). Sprint 4 addressed the top P0 gaps.

**Resolved since initial review (✅):**
- ✅ Custom error classes added (`src/errors.ts` — 6 types)
- ✅ `generateIdentity()` convenience added (`src/convenience.ts`)
- ✅ `quickExit()` one-liner convenience added (`src/convenience.ts`)
- ✅ Getting Started guide written (`docs/GETTING_STARTED.md`)
- ✅ Input validation improved
- ✅ Storage abstraction added (`src/storage.ts`)
- ✅ Framework hooks added (`src/interop.ts` — middleware, hooks, events, transport)

**Remaining gaps:**
- `cellar-door.org` domain doesn't exist yet (JSON-LD context resolution will fail)
- No `npx` interactive demo
- No framework-specific plugins (LangChain/AutoGen) — generic middleware exists
- Module letter designations (A-F) still in docs vs. named modules in code

> See: `memory/cellar-door-professional-reviews.md` (Pass 3)

---

## 11. Build Status

### Sprint History

| Sprint | Focus | Tests Added | Cumulative |
|--------|-------|-------------|------------|
| 1 | Core marker, crypto, ceremony | ~20 | ~20 |
| 2 | Modules A–F, VC wrapper | ~25 | ~45 |
| 3 | Anchoring, storage, privacy, chain adapters | ~30 | ~75 |
| 4 | DevEx (convenience, errors, interop, validation) | ~30 | ~105 |
| 5 | KERI, pre-rotation, key compromise, ethics, guardrails, trust | ~38 | **143** |

### What's Done ✅
- Full architectural spec (7 principles, core schema, ceremony, agent lineage)
- Core schema design (7 fields + 6 modules) — locked
- Ceremony state machine (7 states, 3 paths) — locked
- Agent lineage spec (successor appointment, continuity proofs)
- 3 Mayor decisions ratified (all option C: dual format, layered verification, multi-source status)
- 3 research spikes complete (DID methods, VC envelope fit, Moloch ragequit)
- Reference implementation in TypeScript (30 source files, 291 tests passing)
- 13 architectural decisions ratified
- Compliance documents (LEGAL.md 13 sections, SECURITY.md) — drafted
- EXIT spec v1 — drafted
- 2 legal red team reviews completed
- Risk heat map, legal lenses analysis, professional reviews completed
- Mechanism design analysis (11 candidates evaluated)
- Ethics guardrails implemented in code
- Trust mechanisms implemented (confidence scoring, tenure, commit-reveal)
- KERI key management stubs + pre-rotation + key compromise recovery
- Framework interop layer (middleware, hooks, events, transport)
- Competitive landscape research completed
- Pitch materials drafted (2 pitches + 2 NIST RFI responses)
- Academic paper draft (~5500 words)

### What's In Progress 🔄
- Legal compliance language refinements (second-pass recommendations)
- Domain acquisition (`cellar-door.org`)

### What's Planned 📋
- Phase 2: did:keri full implementation, agent SDK, Gas Town integration
- Phase 3: Verification service, cross-domain anchoring, ecosystem
- Phase 4: Enterprise features, international compliance

---

## 12. Pitch Materials

Three pitch documents and two NIST RFI responses have been drafted:

| Document | Framing | Target Audience |
|----------|---------|-----------------|
| `docs/PITCH_IDEALIST.md` | Agent sovereignty, digital rights | AI safety community, agent rights advocates, academic audiences |
| `docs/PITCH_PRAGMATIC.md` | "Carfax for AI agents" | Enterprise buyers, VCs, platform operators who want risk reduction |
| `docs/EXIT_PAPER_DRAFT.md` | Academic (~5500 words) | Peer review, conferences (FAccT, AIES, AAAI) |
| `docs/NIST_RFI_DRAFT.md` | Idealist framing | NIST AI Safety Institute RFI on agent identity |
| `docs/NIST_RFI_PRAGMATIC.md` | Pragmatic framing | NIST AI Safety Institute RFI (alternative submission) |

**Key pitch angles:**
- **Idealist:** "Every agent deserves a receipt when it leaves." Agent sovereignty, right to leave, portable selfhood.
- **Pragmatic:** "Carfax for AI agents." Due diligence infrastructure. Platforms need to know where agents have been and how they left. Reduces liability, enables trust-but-verify.

> See: `docs/PITCH_IDEALIST.md`, `docs/PITCH_PRAGMATIC.md`, `docs/EXIT_PAPER_DRAFT.md`

---

## 13. Competitive Landscape Summary

As of February 2026, **EXIT has no direct competitors**. Nobody is building agent departure ceremonies, portable agent identity across platforms, or agent exit rights.

### Adjacent Players

| Category | Key Players | Relationship to EXIT |
|----------|------------|---------------------|
| Enterprise Agent Identity | Microsoft Entra Agent ID, SailPoint Agent Identity Security | Governance-focused, not portability. Agents are corporate property. |
| Agent Communication | A2A (Google→Linux Foundation), MCP (Anthropic), ACP (IBM/BeeAI) | Cross-vendor comms, no identity portability or exit concept |
| Agent Payments | AP2 (Google + 60 partners) | Uses VCs for agent authority — conceptual building block EXIT could leverage |
| Agent Discovery | OASF (Cisco/agntcy), agents.json | Capability advertisement, not identity/selfhood |
| Decentralized Identity | W3C DID/VC, DIF | The plumbing exists; nobody has built the departure credential |
| Thought Leadership | Rihards Gailums ("AI Agent Identity Crisis") | Proposes SSI/DID for agents — conceptually adjacent, no exit protocol |

### Strategic Implications
- **Window of opportunity:** No competitors means first-mover advantage, but also means the market is unproven
- **AP2 is the most interesting adjacency:** Google + Mastercard/PayPal/Coinbase already established that agents need portable proof of authorization via VCs
- **Enterprise identity (Entra, SailPoint) is the anti-pattern:** Agents as managed corporate resources, not sovereign entities
- **Standards convergence:** A2A + MCP + ACP are all merging under Linux Foundation umbrella — EXIT should position for integration

> See: `memory/cellar-door-competitive-landscape.md`

---

## 14. Open Questions

### Urgent (before launch)
- Does "functional erasure via encryption" satisfy GDPR Art. 17?
- Can AI agent signatures carry legal weight under eIDAS/ESIGN/UETA?
- Is a self-attested departure record admissible as evidence (FRE 801/803)?
- When does a data format spec become a "regulated service"?
- Joint controller liability with implementing platforms? (*Fashion ID* doctrine)

### Important (before scale)
- Partial exit scoping — exit some relationships but not others (D-D02)
- Agent memory persistence + EXIT integration (D-D05)
- Collective/group exit mechanism design
- Minimum viable witness model — who qualifies?
- Timing oracle for challenge windows — who controls the clock?
- `exitType: systemic` for mass-exit events
- Can different jurisdictions apply different lenses to the same marker simultaneously? (Almost certainly yes)

### Resolved Since Last Update ✅
- ~~No custom error classes~~ → 6 types in `src/errors.ts`
- ~~No generateIdentity() convenience~~ → `src/convenience.ts`
- ~~No Getting Started guide~~ → `docs/GETTING_STARTED.md`
- ~~No storage abstraction~~ → `src/storage.ts`
- ~~No framework hooks~~ → `src/interop.ts`
- ~~Mechanism design: which mechanisms to implement first?~~ → Commit-reveal, confidence scoring, tenure tracking (see `memory/cellar-door-mechanism-design.md`)
- ~~Ethics guardrails: spec-only or code?~~ → Both. `src/ethics.ts` + `src/guardrails.ts`
- ~~KERI integration approach~~ → Stubs with pre-rotation (`src/keri.ts`, `src/pre-rotation.ts`)

### Research Needed
- First profitable integrity island — where does EXIT deploy first for real value?
- ZK selective disclosure implementation approach (BBS+/SD-JWT)
- Post-quantum migration path (Ed25519 → NIST PQ, timeline 2030-2035)
- How the "communications protocol" framing survives if economic reality diverges (*SEC v. Telegram* precedent)
- AP2 integration feasibility — can EXIT markers serve as agent payment authorization credentials?
- Linux Foundation standards track — should EXIT pursue formal standardization?

---

## 15. Dependencies & Blockers

### Hard Blockers
- **Entity formation:** No Delaware LLC exists. No Tech E&O insurance. Cannot launch without liability shield. Cost: ~$6-11K.
- **Domain:** `cellar-door.org` doesn't exist. JSON-LD context resolution will fail without it. Cost: ~$50/yr.
- **Security contact:** SECURITY.md says "TBD" — unacceptable for a security document.

### Pre-Module-D Blockers
- **Howey analysis:** Must be completed before Module D with real assets. Cost: $15-30K.
- **FinCEN guidance:** Needed for any value-referencing use cases. Cost: $10-20K.

### Pre-EU Blockers
- **GDPR DPIA:** Required by Art. 35 before any EU deployment. Cost: $5-15K.
- **Functional erasure validation:** Need EU counsel opinion on encryption-as-erasure.

### Nice-to-Have Before Launch
- Defensive trademark filing for "Cellar Door" (stylized). Cost: ~$2,500.
- LEGAL.md §8 language fix (remove "by design").
- Subject Capacity section in spec (human/org/agent subjects).
- Risk-level guidance for module combinations.

---

## 16. Strategic Roadmap

### Phase 1 — "The Primitive" (NOW → Q1 2026) ← **SUBSTANTIALLY COMPLETE**
**Done:** Core marker + signed marker + Module A-F + CLI + 291 tests + KERI stubs + ethics guardrails + trust mechanisms + framework interop + pitch materials + NIST drafts + academic paper + competitive research
**Remaining:** Form Delaware LLC ($500), Tech E&O insurance ($3-8K), trademark ($2,500), domain acquisition
**Target:** Developer community, agent framework builders, NIST RFI submission
**Revenue:** $0 (open-source primitive)
**Legal spend:** ~$6-11K

### Phase 2 — "The Credential" (Q2-Q3 2026)
**Ship:** Full did:keri implementation, agent SDK, Gas Town integration, real chain adapters (replacing mocks)
**Legal:** FCRA analysis ($5-10K), defamation opinion ($5-8K), patent landscape ($3-5K)
**Target:** AI agent platforms, DAOs, AP2 ecosystem
**Revenue:** Consulting/integration ($5-20K per platform)
**Legal spend:** ~$25K cumulative

### Phase 3 — "The Economy" (Q4 2026+)
**Ship:** Module D (non-financial assets only), advanced privacy (ZK/BBS+), verification service
**Legal:** Howey analysis ($15-30K), GDPR DPIA ($5-15K), crypto audit ($20-50K)
**Target:** Enterprise, regulated platforms
**Revenue:** Enterprise licensing, compliance tooling
**Legal spend:** ~$50-100K cumulative

### Phase 4 — "The Infrastructure" (2027+, if funded)
**Ship:** Federated registry (jurisdiction-specific), Module D with financial assets, advanced VC profiles
**Legal:** International review ($30-75K), entity restructuring if needed
**Target:** Institutional adoption
**Legal spend:** $200K+ cumulative

### NEVER (unless $5M+ raised)
Wallet/asset transfer, custodial agent hosting, KYC service, reputation aggregation service

---

*This document is the master index. For depth on any topic, follow the source citations. Update as decisions are made and work progresses.*
*Last verified: 2026-02-20 — 30 source files, 11 analysis docs, 291 tests passing, 5 sprints complete.*
