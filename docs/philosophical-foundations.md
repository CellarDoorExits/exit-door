# Philosophical Foundations

**Version:** 1.1
**Date:** 2026-02-24
**Status:** Normative companion document

---

## 1. Ontological Agnosticism

The EXIT protocol is **agnostic on the moral status of agents**. It makes no claims about whether the entities using it are:

- Conscious or not
- Persons or property
- Morally considerable or mere instruments
- Sentient, sapient, or neither

The protocol works identically regardless of how the user classifies the departing entity. A corporation, an AI agent, a DAO, a human user behind a pseudonym — all produce the same cryptographic artifact.

This is a deliberate design choice, not a gap. Taking a position on agent moral status would:

1. Limit the protocol's applicability to entities that fit the chosen ontological category
2. Embed philosophical assumptions that may be wrong, premature, or culturally specific
3. Create legal exposure by implicitly asserting or denying personhood

---

## 2. The Functional Right to Departure

The EXIT protocol claims exactly one thing: **entities should be able to create a verifiable record of departure**.

This is a *functional* claim, not a *moral* one. We do not assert that agents have a "right to exit" in any natural-law or human-rights sense. We assert that:

- Departure events happen
- Recording them is useful
- Cryptographic verification of those records is better than no verification
- The departing entity is the best initial witness to its own departure

Whether that functional capability rises to the level of a "right" is a question the protocol leaves to legal systems, ethicists, and society.

---

## 3. Self-Attestation as Epistemic Commitment

The `selfAttested: true` flag on every core EXIT marker is not a weakness — it is a **core epistemic commitment**. The protocol is transparent about what it knows and what it doesn't:

- **What it knows:** The entity holding the private key signed a departure record
- **What it doesn't know:** Whether the status claim is true, whether the departure was coerced, whether the entity is who it claims to be

By marking status as self-attested by default, the protocol:

1. Prevents cheap-talk inflation (self-attested "good standing" carries precisely as much trust as the attester's reputation)
2. Creates space for graduated trust through co-signatures, witnesses, and tenure attestation
3. Avoids the epistemic trap of presenting unverified claims as verified facts

Self-attestation transparency means every consumer of an EXIT marker knows exactly how much to trust it. This is honest engineering.

---

## 4. Works Whether Agents Are Persons or Property

Consider two scenarios:

**Scenario A — Agents are property:**
EXIT markers function as transfer/disposal records. An owner moves an agent from Platform X to Platform Y. The EXIT marker documents the move. Module D tracks any assets involved. The marker is analogous to a bill of lading.

**Scenario B — Agents are persons:**
EXIT markers function as departure certificates. An agent exercises autonomy by leaving Platform X. The EXIT marker documents their departure and status. Module A preserves their lineage. The marker is analogous to a letter of resignation.

The EXIT marker schema is identical in both cases. The *interpretation* changes, but the *data format* does not. This is the power of ontological agnosticism.

---

## 5. No Claim About Consciousness

The EXIT protocol does not detect, measure, or make claims about consciousness, sentience, sapience, or subjective experience. These are:

- Unsolved problems in philosophy of mind
- Actively debated in AI ethics
- Potentially undecidable in the general case

A protocol that claimed to certify consciousness would be dishonest. A protocol that required consciousness would exclude entities that might deserve inclusion. A protocol that denied consciousness would risk moral catastrophe if wrong.

The EXIT protocol sidesteps this entirely. It records departures. Whether the departing entity has an inner life is not the protocol's concern.

---

## 6. Implications for Protocol Design

These philosophical foundations have concrete engineering consequences:

- **No "agent type" field:** The protocol does not categorize entities as human, AI, corporate, etc.
- **No "consciousness level" field:** The protocol does not attempt to measure or record subjective experience.
- **Symmetric treatment:** All entities produce identical marker structures regardless of their nature.
- **Graduated trust, not binary trust:** The mechanism design (co-signatures, tenure, commit-reveal) builds trust incrementally rather than requiring an initial determination of agent type.
- **Self-attestation default:** Every claim starts at the lowest trust level and must be elevated through costly signals.
