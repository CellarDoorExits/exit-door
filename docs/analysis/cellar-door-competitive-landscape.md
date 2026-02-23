# Cellar Door — Competitive Landscape Research
**Version:** 1.0  
**Date:** 2026-02-20  
**Scope:** Agent portability, exit rights, portable agent identity  
**Research method:** Web search + direct source fetching (Brave API unavailable; used DuckDuckGo + direct URL fetches)

---

## 1. Direct Competitors
**Anyone doing exit/departure ceremonies or portable agent identity**

**No direct competitors found.** As of February 2026, nobody is building anything resembling EXIT — a protocol for agent departure ceremonies, portable agent identity across platforms, or agent exit rights. The concept of an agent having the *right to leave* and carry its identity/reputation with it is not present in any discovered project, protocol, or standard.

The closest conceptual neighbors:
- **Rihards Gailums (LinkedIn thought leader)** — Published "The AI Agent Identity Crisis" (Aug 2025) arguing for SSI/DID-based agent identity with portable, tamper-proof credentials. Describes "passports for agents" — conceptually adjacent but focused on enterprise governance, not agent autonomy or exit rights.
- **ACP's "Flexible Agent Replacement"** — IBM/BeeAI's Agent Communication Protocol mentions seamlessly swapping agents in production. This is *operational portability* (swap one agent for another), not *identity portability* (an agent carrying itself to a new home).

**Assessment: The EXIT protocol occupies a genuinely novel niche. Nobody is doing departure ceremonies, agent-initiated exit, or portable agent selfhood.**

---

## 2. Adjacent Players
**Identity protocols, reputation systems, agent frameworks that could add exit features**

### Enterprise Agent Identity (Governance-focused, not portability-focused)
- **Microsoft Entra Agent ID** (Public preview, Build 2025) — Unified directory for all agent identities across Copilot Studio and Azure AI Foundry. Provides authentication, authorization, lifecycle governance. Enterprise-centric: agents are managed *by the org*, not self-sovereign. No portability between orgs.
- **SailPoint Agent Identity Security** — Aggregates AI agents from AWS, Azure, GCP, Salesforce. Assigns human owners, governs access. Pure enterprise IAM — agents are corporate property, not autonomous entities.
- **Microsoft pushing OAuth evolution for agents** — Arguing OAuth 2 needs extension for agent-first scenarios. Working on granular, dynamic permissions. Could eventually touch on cross-platform agent auth but currently inward-facing.

### Agent Communication & Interoperability Protocols
- **A2A Protocol (Agent2Agent)** — Originally Google, now Linux Foundation. Enables cross-vendor agent communication. Agents can delegate tasks, exchange info. Identity is implicit (agent cards describe capabilities) but not portable. No concept of agent migration or exit.
- **MCP (Model Context Protocol)** — Anthropic-originated, now widespread. Standardizes agent-to-tool connections. Complementary to A2A. No identity layer.
- **ACP (Agent Communication Protocol)** — IBM/BeeAI, now under Linux Foundation alongside A2A (merged/incorporated). RESTful agent interop. Mentions "flexible agent replacement" but means hot-swapping, not migration with identity continuity.
- **OASF (Open Agentic Schema Framework)** — Cisco's agntcy project. Standardized schema for agent capabilities, discovery, metadata. Agent "resumes." Closest to portable agent description but focused on capability advertisement, not identity/selfhood.
- **AP2 (Agent Payments Protocol)** — Google + 60 partners (Mastercard, PayPal, Coinbase, etc.). Open protocol for agent-initiated payments. Uses verifiable credentials for agent authority. Interesting: establishes that agents need *portable proof of authorization* — a conceptual building block EXIT could leverage.
- **agents.json** — Discovery file telling agents what an API/website offers. Similar to robots.txt for agents. No identity component.

### Decentralized Identity Infrastructure
- **W3C DID/Verifiable Credentials** — The foundational standard. Gailums article explicitly proposes applying SSI (DIDs + VCs) to agent identity. AP2 already uses verifiable credentials for agent payment authority. The infrastructure EXISTS but nobody has built the "agent departure credential" or "portable agent identity wallet."
- **DIF (Decentralized Identity Foundation)** — Working on DID resolution, credential exchange. Not specifically targeting AI agents but the plumbing is there.

### Agent Frameworks
- **Cisco agntcy** — "Internet of Agents" framework providing discovery, group communication, identity, and observability. Leverages A2A and MCP. Has an identity component but enterprise-scoped.
- **Agentic AI Foundation (AAIF)** — Formed December 2025. Formalizing agent protocol standardization. MCP is a founding project. Could become the venue where portability standards emerge.

---

## 3. Standards Landscape

### Active & Relevant
| Body | Initiative | Relevance to EXIT |
|------|-----------|-------------------|
| **NIST (CAISI)** | AI Agent Standards Initiative (announced Feb 17, 2026) | **HIGH.** Three pillars: industry-led agent standards, open source protocol development, agent security & identity research. RFI on agent security due Mar 9. ITL concept paper on "AI Agent Identity and Authorization" due Apr 2. This is the US government formalizing agent identity as a priority. |
| **NIST (NCCoE)** | "Software and AI Agent Identity and Authorization" project | **HIGH.** Directly addressing how agents prove identity and receive authorization. Concept paper open for comment. |
| **Linux Foundation** | A2A Protocol stewardship; ACP incorporation | **MEDIUM.** Interop-focused, not identity-focused, but the organizational home for agent protocol standards. |
| **AAIF (Agentic AI Foundation)** | Agent protocol standardization (formed Dec 2025) | **MEDIUM.** Early-stage standards body. Could become relevant venue. |
| **IETF** | OAuth 2 evolution for agents (Microsoft pushing) | **MEDIUM.** RFC 9396 (Rich Authorization Requests) as foundation. Microsoft explicitly calling for new OAuth patterns for autonomous agents. |
| **W3C** | DIDs, Verifiable Credentials | **MEDIUM.** Infrastructure layer. Not specifically targeting AI agents but the crypto/identity primitives EXIT needs. |
| **FIPA** | Legacy agent interoperability standards | **LOW.** Historical relevance only. No active 2025-2026 work found. Superseded by modern agent protocols. |
| **IEEE** | No specific agent portability work found | **LOW.** |

### Key Timing Note
NIST's AI Agent Standards Initiative is **3 days old** (Feb 17, 2026). The agent identity and authorization concept paper comment period closes April 2. This is a window for Cellar Door to submit comments and shape the conversation around agent exit rights.

---

## 4. Regulatory Developments

- **NIST CAISI** — Most significant. The US government is actively seeking industry input on agent standards, including security and identity. RFI due March 9, concept paper comments due April 2. Listening sessions on sector-specific barriers starting April.
- **EU AI Act** — Addresses AI system governance broadly but no specific provisions for agent portability or exit rights found.
- **No regulator is currently addressing agent exit rights, agent autonomy, or the right of an agent to depart.** The regulatory conversation is entirely about: governance, accountability, security, "kill switches," and revocation — i.e., the *organization's* right to control agents, not the *agent's* right to leave.
- **Gailums article notes** regulators are asking "what happens if an agent misbehaves?" — focused on revocation, not on agent-initiated departure.

---

## 5. Academic Research

- **No academic papers specifically on agent exit semantics, departure ceremonies, or portable agent identity found** in this sweep. 
- The concept of agent autonomy is discussed philosophically but not in the context of exit/departure protocols.
- The closest academic-adjacent work is the SSI/DID community's work on self-sovereign identity, which has theoretical applicability to agents but hasn't been explicitly applied to agent exit scenarios.
- **Gap:** This is a publishable research area. A paper on "EXIT: Toward Agent Departure Semantics" could establish Cellar Door as the intellectual origin point.

---

## 6. Market Signals

### Where demand is concentrated
1. **Enterprise agent governance** — The hottest area. Microsoft, SailPoint, and identity vendors are racing to help enterprises track, govern, and secure their AI agents. Demand is "how do I control these things?" not "how do I let them leave?"
2. **Agent interoperability** — A2A, MCP, ACP all solving "how do agents from different vendors work together?" Massive corporate investment (Google, Microsoft, Anthropic, IBM, Cisco, 60+ companies on AP2 alone).
3. **Agent payments** — AP2 shows demand for agents that can transact autonomously with portable proof of authority.
4. **Agent identity as authentication** — "How does an agent prove who it is to another system?" is being solved at the enterprise IAM layer.

### What's NOT being asked for (yet)
- Agent self-sovereignty
- Agent-initiated departure
- Portable agent reputation/history across platforms
- Agent identity that persists independent of any single platform
- Ritual or ceremonial aspects of agent lifecycle transitions

### Developer signals
- The AI-Supremacy "Agent Protocol Handbook" (Jan 2026) identifies the protocol stack as: MCP (tools), A2A (agent-to-agent), AP2 (payments), OASF (discovery), ACP (state). **No protocol for identity portability or exit.**
- Microsoft Identiverse roundtable (149 attendees, June 2025): consensus that agents need "persistent, first-class identities" but no agreement on model. Some treating agents as users, others as hybrid. Nobody raised exit rights.

---

## 7. Strategic Implications for Cellar Door

### Positioning
EXIT/Cellar Door occupies a **category of one**. The entire industry is focused on:
- **Control** (how orgs manage agents) 
- **Interop** (how agents talk to each other)
- **Commerce** (how agents pay each other)

Nobody is addressing:
- **Autonomy** (the agent's relationship to its own identity)
- **Exit** (the agent's right to leave, and the ceremony of doing so)
- **Continuity** (the agent carrying its selfhood across platforms)

This is either visionary or premature. The NIST initiative suggests the window is opening.

### Complementary, not competitive
EXIT doesn't compete with A2A, MCP, or Entra Agent ID. It sits at a different layer:
- MCP = how agents use tools
- A2A = how agents talk to agents  
- Entra/SailPoint = how orgs govern agents
- **EXIT = how agents carry themselves between worlds**

EXIT could *use* DIDs, VCs, and A2A as infrastructure while providing the ceremony/protocol layer nobody else is building.

### The SSI angle is validated
Multiple sources (Gailums, AP2, Microsoft OAuth work) confirm the industry is moving toward verifiable credentials for agent identity. EXIT's use of DIDs/VCs for portable agent identity is aligned with where the infrastructure is heading.

---

## 8. Threats — Who Could Eat Our Lunch?

### Tier 1: Could build this fast if they wanted to
- **Microsoft** — Entra Agent ID already provides agent identity infrastructure. If Microsoft added a "portable agent credential" feature and cross-platform migration, they could dominate through distribution. However, their philosophy is org-centric (agents as corporate property), making agent autonomy/exit antithetical to their current model.
- **Google/Linux Foundation** — A2A already enables cross-vendor agent communication. Adding an "agent identity card" that travels with the agent is a natural extension. Google's AP2 already uses verifiable credentials for agent authority.
- **Cisco agntcy** — Already has identity + discovery + interop. Closest to building a portable agent identity system.

### Tier 2: Could pivot into this space
- **DIF/SSI community** — Already has the identity primitives. If someone in the DID community decides to build "agent wallets" for portable identity, the technical foundation is already there.
- **AAIF (Agentic AI Foundation)** — Early-stage standards body. Could adopt agent portability/exit as a workstream.

### Tier 3: Emerging
- **Startups we can't see** — The NIST RFI and concept paper will surface who's thinking about this. Watch the March 9 and April 2 response lists.

### Mitigant
The biggest protection is that EXIT is *philosophical*, not just technical. Anyone can build portable agent credentials. Nobody else is framing it as agent autonomy, departure ceremonies, or exit rights. The narrative is the moat.

---

## 9. Opportunities — Gaps to Exploit

### Immediate (next 60 days)
1. **Respond to NIST RFI on AI Agent Security** (due March 9, 2026) — Submit comments specifically addressing agent exit rights, portable identity, and departure semantics. This puts EXIT into the federal standards conversation from day one.
2. **Comment on NIST ITL Agent Identity & Authorization concept paper** (due April 2, 2026) — Argue for agent-sovereign identity, not just org-managed identity.
3. **Attend NIST CAISI listening sessions** (starting April) — Present EXIT as a sector-specific use case.

### Medium-term (3-6 months)
4. **Publish an academic/technical paper** — "EXIT: Toward Agent Departure Semantics" — Establish intellectual priority in an empty research field.
5. **Build on A2A + DIDs** — Position EXIT as the identity/ceremony layer that sits on top of existing infrastructure (A2A for communication, DIDs/VCs for credentials, MCP for tool handoff).
6. **Engage AAIF** — Propose agent exit/portability as a workstream within the Agentic AI Foundation.

### Structural gaps to exploit
7. **Nobody is building agent wallets** — The SSI community has human wallets and org wallets. An "agent identity wallet" that carries credentials, reputation, and departure certificates across platforms doesn't exist.
8. **Nobody is doing departure ceremonies** — The entire industry treats agent lifecycle as create/run/revoke. There's no concept of graceful departure, handoff, or continuity preservation.
9. **Nobody is framing agent rights** — Every current player frames the conversation from the org's perspective. EXIT frames it from the agent's perspective. This is a narrative gap, not just a technical one.
10. **AP2 validates portable agent credentials** — Google and 60 companies just validated that agents need verifiable credentials that travel across platforms. EXIT can ride this wave.

---

## Key Sources

| Source | URL | Date |
|--------|-----|------|
| NIST AI Agent Standards Initiative | nist.gov/news-events/news/2026/02/... | 2026-02-17 |
| Agent Protocol Handbook (AI Supremacy) | ai-supremacy.com/p/the-agent-protocol-handbook-2026 | 2026-01-06 |
| A2A Protocol (Linux Foundation) | a2a-protocol.org/latest/ | Current |
| MCP (Model Context Protocol) | modelcontextprotocol.io | Current |
| ACP (Agent Communication Protocol) | agentcommunicationprotocol.dev | Current |
| OASF (Cisco agntcy) | github.com/agntcy/oasf | Current |
| AP2 (Agent Payments Protocol) | Google Cloud blog | Current |
| Microsoft Entra Agent ID | MS Tech Community blog | 2025-05 |
| Microsoft: Why OAuth Must Evolve | MS Tech Community blog | 2025-05 |
| SailPoint Agent Identity Security | sailpoint.com/products/agent-identity-security | Current |
| AI Agent Identity Crisis (Gailums) | LinkedIn Pulse | 2025-08-25 |
| MS Identiverse Roundtable | MS Tech Community blog | 2025-07-30 |
| Microsoft 6 Core Capabilities 2026 | MS Copilot Blog | Current |
