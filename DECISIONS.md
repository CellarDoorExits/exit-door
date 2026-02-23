# Cellar Door — Decision Log

Architectural and direction decisions for the EXIT primitive.

---

## D-001: Envelope Format

**Date:** 2026-02-19
**Status:** ✅ Ratified

**Options considered:**
- (A) W3C Verifiable Credential envelope — immediate VC ecosystem interop, but couples to VC Data Model 2.0 early
- (B) Custom JSON-LD context — standalone, flexible, less immediate interop
- (C) Dual format — standalone JSON-LD as canonical, with VC wrapper profile

**Decision:** **(C) Dual format.** The core schema is self-contained JSON-LD at `https://cellar-door.org/exit/v1`. A VC wrapper profile exists from day one for interop. EXIT defines semantics, not packaging — envelope-agnostic by principle.

**Rationale:** Best of both worlds. No hard dependency on the VC ecosystem, but VC-compatible out of the box.

---

## D-002: Verification Model

**Date:** 2026-02-19
**Status:** ✅ Ratified

**Options considered:**
- (A) Subject-signed only — simplest, works with hostile origins, but self-attestation is weak
- (B) Co-signed (subject + origin) — stronger trust, but requires origin cooperation
- (C) Layered — subject signature mandatory, co-signatures optional

**Decision:** **(C) Layered.** Subject signature is always required (core `proof` field). Origin co-signature and witness attestations are optional extensions. Verifiers decide what trust level they require.

**Rationale:** EXIT must work in the worst case — hostile origin, emergency departure, zero cooperation. Co-signatures strengthen trust but can never be mandatory or EXIT only works with cooperative origins.

---

## D-003: Status Field Semantics

**Date:** 2026-02-19
**Status:** ✅ Ratified

**Options considered:**
- (A) Self-attested only — simple but gameable ("I left in good standing" when expelled)
- (B) Origin-attested only — accurate but gives origin veto power over the narrative
- (C) Multi-source — self-attested in core, optional origin perspective in Module C

**Decision:** **(C) Multi-source.** Core `status` is subject-attested. Optional `originStatus` in Module C carries the origin's view. Verifiers see both perspectives.

**Rationale:** Prevents both gaming (subject inflates standing) and retaliation (origin downgrades as punishment). Downstream systems set their own trust policies.

---

## D-004: Implementation Language

**Date:** 2026-02-19
**Status:** ✅ Ratified

**Options considered:**
- TypeScript first, Rust later
- Rust first, TypeScript bindings
- Both simultaneously

**Decision:** **TypeScript first, Rust binding later.** The `cellar-door-exit` package is TypeScript/Node.js. Rust bindings will follow once the schema stabilizes.

**Rationale:** Faster iteration in TS. Agent ecosystem is heavily JS/TS. Rust comes when we need performance-critical signing/verification or WASM targets.

---

## D-005: Repository Structure

**Date:** 2026-02-19
**Status:** ✅ Ratified

**Options considered:**
- Monorepo (EXIT code inside Cellar-Door)
- Standalone package with git submodule reference
- Fully separate, no linking

**Decision:** **Standalone `cellar-door-exit` package, referenced as a git submodule in the Cellar-Door parent repo.**

**Rationale:** EXIT is a primitive — it should be independently publishable and versionable. The submodule link keeps the parent repo aware of it without coupling.

---

## D-006: Contests Don't Block Exit

**Date:** 2026-02-19
**Status:** ✅ Ratified

**Options considered:**
- Disputes can block exit until resolved
- Disputes delay exit (time-bounded)
- Disputes never block exit — they change metadata only

**Decision:** **Exits always go through regardless of disputes.** A contest changes the `status` field to `disputed` but never prevents the EXIT marker from being created.

**Rationale:** If disputes could prevent departure, filing a dispute becomes a denial-of-exit attack. Origins could contest every exit to trap participants. This violates the fundamental principle: EXIT must always be available. Disputes are recorded alongside the exit, not as gatekeepers of it.

---

## D-007: License — Apache 2.0

**Date:** 2026-02-19
**Status:** ✅ Ratified

**Decision:** Switch from MIT to Apache 2.0 license.

**Rationale:** MIT covers copyright but provides zero patent protection. Apache 2.0 includes an explicit patent grant (§3) and patent retaliation clause. The ecosystem compatibility cost is near-zero (Apache 2.0 is compatible with virtually everything MIT is). IBM, Microsoft, and others hold broad patents in identity and credential systems — the patent protection is material. Per red team recommendation §2.1.

---

## D-008: Legal Hold Mechanism

**Date:** 2026-02-19
**Status:** ✅ Ratified

**Decision:** Add an optional `legalHold` field to the EXIT marker schema containing `holdType`, `authority`, `reference`, `dateIssued`, and `acknowledged`.

**Rationale:** The protocol must acknowledge legal reality without enforcing court orders. D-006 ("contests don't block exit") remains intact — the `legalHold` field is informational metadata that doesn't prevent exit. It creates a record that the exiting party is aware of pending legal process, threading the needle between "exit is always available" and "we don't actively resist judicial authority." This is the difference between Tornado Cash (designed to be judicially unrestrainable) and a responsible protocol. Per red team recommendation §5.1.

---

## D-009: Self-Attestation Clarity

**Date:** 2026-02-19
**Status:** ✅ Ratified

**Decision:** Add a `selfAttested: boolean` field to the core EXIT marker (default `true`). Add specification-level normative language that core status fields are always self-attested and carry no warranty.

**Rationale:** Self-attested `good_standing` is legally similar to a self-certification. Without explicit marking, courts and lay users will treat it as an independent verification. The boolean makes the nature unmistakable in both human and machine-readable form. Per red team recommendation §5.2.

---

## D-010: Emergency Justification

**Date:** 2026-02-19
**Status:** ✅ Ratified

**Decision:** Add `emergencyJustification: string` field, required when `exitType` is `emergency`. Enforced by schema validation.

**Rationale:** The emergency path (ALIVE → FINAL → DEPARTED) bypasses all safeguards. Without a justification requirement, it's trivially abusable — agents can skip dispute resolution by claiming "emergency" when the platform is clearly operational. The justification creates accountability without blocking exit. Per red team recommendation §5.4.

---

## D-011: Key Compromise Marker Type

**Date:** 2026-02-19
**Status:** ✅ Ratified

**Decision:** Add `keyCompromise` as a valid `exitType` enum value for declaring compromised signing keys.

**Rationale:** `did:key` has no revocation mechanism. If a private key is compromised, the attacker can forge markers, designate fraudulent successors, and claim assets — with no way to invalidate the key. The `keyCompromise` exit type is a protocol-level stopgap allowing subjects to declare compromise using a different trusted key. Not a complete solution (requires pre-established key hierarchy), but better than nothing until `did:keri` is the default. Per red team recommendation §5.3.

---

## D-012: No Public Registry

**Date:** 2026-02-19
**Status:** ✅ Ratified

**Decision:** EXIT markers are non-custodial by design. No public registry is required or recommended. Optional registries are convenience layers operated independently.

**Rationale:** A registry operator becomes a custodian subject to subpoenas, preservation orders, and cross-border data conflicts (US CLOUD Act vs. GDPR Art. 48). The protocol should not require any single entity to be a necessary custodian. This eliminates an entire class of legal exposure. The Phase 4 public registry concept from the original plan is abandoned. Per red team recommendation §1.4.

---

## D-013: Status Field Authoritative Language

**Date:** 2026-02-19
**Status:** ✅ Ratified

**Decision:** The specification includes a normative statement that neither self-attested status (core `status`) nor origin-attested status (Module C `originStatus`) is authoritative. Verifiers MUST apply their own trust policies.

**Rationale:** Two competing status fields will confuse courts. A judge will ask "which one is true?" The answer "both are perspectives" must be in the spec as normative language, not just implied by architecture. This also prevents the "weaponized exit" attack from being legally effective — if the spec says origin status is non-authoritative, a platform can't use it as a blackball mechanism with the protocol's blessing. Per red team recommendation §5.2, §4.2.

---

## Deferred Decisions

### D-D01: DID Method Recommendation
**Status:** ⏳ Deferred — pending research spike cd-48g (DID method catalog for agent key rotation)

Which DID method(s) to recommend for the `subject` field. Candidates: `did:key`, `did:peer`, `did:web`, `agent://` URI. Need spike results on agent key rotation patterns.

### D-D02: Partial Exit Scoping
**Status:** ⏳ Deferred — pending research spike cd-1zc.6

Can you exit *part* of a context? (e.g., leave one channel of a DAO but stay in others.) Requires defining what "origin" granularity means.

### D-D03: VC Envelope Fit Details
**Status:** ⏳ Deferred — pending research spike cd-1jg

Exact mapping of EXIT fields into VC Data Model 2.0 `credentialSubject`. The dual-format decision (D-001) is made; the specific VC profile schema is not.

### D-D04: On-Chain Anchoring Strategy
**Status:** ⏳ Deferred

Which chains, what anchoring format, cost considerations for Module F. Low priority until core is stable.

### D-D05: Agent Memory Persistence Integration
**Status:** ⏳ Deferred — pending research spike cd-1zc.7

How EXIT markers integrate with agent memory/RECORD systems. The EXIT marks the transition; how memory systems consume that marker.
