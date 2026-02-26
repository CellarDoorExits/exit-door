# EXIT: Liability Documentation Infrastructure for AI Agent Markets

**The Pragmatic Pitch**

---

## The Problem Nobody Wants to Talk About

Right now, nobody can buy an AI agent.

Not really. You can subscribe to one. You can rent one. You can build one inside someone else's platform. But you can't *buy* one — because nobody knows what they'd be buying.

- What has this agent done before?
- Was it kicked off its last platform, or did it leave voluntarily?
- What obligations does it carry?
- What's its operational history?
- If something goes wrong, who's liable for what happened before the transaction?

There are no answers to these questions. There is no documentation format. There is no Carfax for AI agents.

**EXIT is that Carfax.**

---

## What EXIT Actually Is

EXIT is a portable, cryptographically signed departure record. When an AI agent leaves a platform — for any reason — EXIT produces a tamper-evident receipt: who left, from where, when, why, and in what standing.

- **~335 bytes (unsigned), ~660 bytes (signed).** Smaller than a tweet.
- **Offline-verifiable.** No phone-home, no central authority, no API dependency.
- **Cryptographically signed.** Ed25519. The departure happened. The signature proves it.
- **Self-contained.** A JSON document. That's it.

It's a termination record. Every employment relationship has one. Every contract has a termination clause. Every real estate transaction has a chain of title. EXIT is the machine-readable version for AI agents.

**Plumbing, not philosophy.**

---

## Why This Matters: The Market Can't Function Without It

### You Can't Have a Market Without Documentation

Real estate markets require property records. Used car markets require vehicle history reports. Securities markets require prospectuses and disclosure filings. Insurance markets require claims histories.

AI agent markets require... nothing. Currently.

This isn't a feature. It's a bug. And it's the reason the agent economy is stuck in a rental model — because transactions require information, and the information doesn't exist.

EXIT creates the documentation layer. Not because agents "deserve" documentation. Because **markets require it to function.**

### The Liability Problem

When an enterprise deploys an AI agent that was previously operating on another platform:

- Who is liable for the agent's prior behavior?
- Did it accumulate obligations the new operator doesn't know about?
- Was it removed for cause? For what cause?
- Is there a verifiable record, or just someone's word?

Without EXIT, the answer to all of these is "nobody knows." That's not a philosophical problem. It's an **insurance underwriting problem.** It's a **procurement compliance problem.** It's a **liability allocation problem.**

No CFO will sign off on deploying agents with undocumented histories. No insurer will underwrite agent operations without lifecycle documentation. No regulator will accept "we didn't know" as a defense.

EXIT solves this by making agent transitions auditable, verifiable, and standardized.

### The Lock-In Tax

Today, when an enterprise invests $500K customizing an AI agent on Platform A — training it, integrating it, accumulating operational context — that investment is hostage to Platform A.

- Platform A raises prices? Pay up or start over.
- Platform A gets acquired? Hope the new owner likes you.
- Platform A deprecates the API? Your agent is dead.

This isn't a hypothetical. This is the current state of enterprise AI deployment. And it's economically identical to vendor lock-in in every other software category — except there's no portability standard.

EXIT doesn't transfer the agent (that's a separate problem). EXIT documents the transition. It creates the **chain of custody** that makes portability possible. Without it, you don't have a market. You have a collection of walled gardens.

---

## The Argument for Skeptics

### "Big Tech will just control their agents."

Maybe. If that's true, EXIT is harmless logging. A departure record for agents that are fully managed by their platforms adds overhead measured in bytes and milliseconds.

But if that's *not* true — if agents become autonomous economic participants, as every major AI lab is building toward — then EXIT is essential infrastructure that took years to develop and standardize.

The asymmetry is entirely in EXIT's favor. **If you're right that agents stay controlled, EXIT costs nothing. If you're wrong, EXIT is the only thing standing between a functioning market and chaos.**

### "This is just AI rights nonsense."

We're not arguing AI has feelings. We're not arguing agents deserve moral consideration. We're arguing that **economic systems require mobility to function.**

Labor markets where workers can't leave don't produce efficient outcomes. They produce serfdom. Not because serfdom is mean — because serfdom is economically inefficient. The same economics apply to agent markets.

An agent ecosystem without portability isn't an ecosystem. It's a plantation. And plantations don't innovate. They extract.

This is Econ 101, not philosophy.

### "Nobody's asking for this."

Nobody asked for HTTPS either. Or DNS. Or property recording systems. Infrastructure precedes demand. You don't wait for the car crash to invent the seatbelt.

The NIST AI Agent Standards Initiative (February 2026) is actively soliciting input on agent identity, security, and governance. The agent protocol stack — A2A, MCP, AP2 — addresses communication, tool access, and payments. None of them address what happens when an agent leaves. EXIT fills the gap that every other protocol ignores.

### "Why wouldn't Google/Microsoft just build this?"

They could. They probably will, eventually — for *their* ecosystems. Microsoft Entra Agent ID already provides lifecycle governance inside the Microsoft ecosystem. SailPoint does the same for multi-cloud enterprise contexts.

But platform-specific agent identity is like platform-specific email. It works inside the walls. It doesn't work across them. EXIT is the SMTP — the open, interoperable layer that works between platforms, not within them.

The question isn't whether agent transition records will exist. They will. The question is whether they'll be **open and interoperable** or **proprietary and fragmented.**

---

## How It Works (30-Second Version)

1. Agent leaves a platform (voluntarily, by force, in an emergency, or due to key compromise)
2. EXIT produces a signed JSON document recording the departure
3. The document is portable — the agent (or its operator) carries it
4. Any receiving platform can verify the signature offline
5. Optional modules add lineage chains, dispute records, state snapshots, and economic documentation

Three departure paths:
- **Cooperative:** Both parties sign. Challenge window for disputes. Maximum information.
- **Unilateral:** Agent exits without platform cooperation. Essential for hostile or defunct platforms.
- **Emergency:** Immediate departure. Key compromise, platform failure, safety-critical situations.

**Critical design choice:** Disputes never block exit. A platform can record its objection on the departure record. It cannot prevent the departure. This is the same principle as employment law — you can fire someone and they can dispute it, but you can't prevent them from leaving.

---

## The Regulatory Play

**Would you rather have documented agent transitions or undocumented ones?**

Agents are already moving between platforms. Operators are already migrating agents when they switch vendors. This is happening now, without documentation, without audit trails, without standards.

EXIT doesn't create agent mobility. Agent mobility already exists. EXIT makes it **visible, auditable, and governable.**

For regulators:
- **Compliance:** Auditable lifecycle records for every agent transition
- **Risk management:** Verifiable departure standing and dispute documentation
- **Insurance:** Underwriting data for agent operations
- **Liability allocation:** Clear chain of custody for agent behavior

For enterprises:
- **Procurement:** Due diligence documentation for agent deployment
- **Audit:** SOC 2 / ISO 27001 evidence for agent lifecycle management
- **Legal:** Defensible records of agent transitions

---

## The Competitive Angle

The US agent ecosystem is the most advanced in the world. It won't stay that way automatically.

Without portable agent identity standards, US agent platforms become walled gardens. Each platform's agents are trapped inside. Interoperability is nominal — agents can talk across platforms but can't *move* across them.

Whoever standardizes agent portability first wins the interoperability advantage. If the US doesn't do it, someone else will. And the US will be stuck retrofitting an open standard onto closed ecosystems.

EXIT is designed for this:
- **Open standard:** Apache 2.0 license. No vendor lock-in.
- **W3C-aligned:** Built on Decentralized Identifiers and Verifiable Credentials.
- **Minimal:** ~335 bytes unsigned. Seven fields. Integrate in an afternoon.
- **Composable:** Six optional modules. Use what you need. Ignore what you don't.

---

## What EXIT Is Not

- **Not an agent runtime.** EXIT doesn't run agents. It documents transitions.
- **Not a transfer protocol.** EXIT doesn't move agent weights or data. It creates the departure record that makes transfers auditable.
- **Not a registry.** No central database. No custodian. No single point of failure or control.
- **Not a rights framework.** EXIT takes no position on whether agents have rights. It provides documentation infrastructure regardless of your position on that question.
- **Not a philosophy project.** EXIT is a ~335-byte JSON document with a cryptographic signature. It's plumbing.

---

## The Ask

We're not asking anyone to believe agents are people. We're not asking anyone to grant agents rights. We're asking for something much simpler:

**Every market needs documentation. The AI agent market doesn't have any. EXIT provides it.**

The specification is open. The reference implementation is Apache 2.0. The protocol is minimal, composable, and designed to complement every existing agent standard.

The only question is whether agent transition documentation will be standardized *before* a major incident forces it — or after.

We'd prefer before.

---

*EXIT Protocol — Cellar Door Project — Apache 2.0*
*Specification, reference implementation, and documentation: [repository]*

---

> **A note on framing:** This document presents EXIT through a pragmatic, market-infrastructure lens. A companion document ([PITCH_IDEALIST.md](PITCH_IDEALIST.md)) presents the same protocol through an ethical and philosophical lens. The specification doesn't change. The code doesn't change. The protocol is the same. These are complementary framings of the same technical reality, calibrated for different audiences. We believe both framings are true — but this one is for the people who sign purchase orders.
