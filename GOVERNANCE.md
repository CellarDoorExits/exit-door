# Governance

## Current Model: Benevolent Dictator (BDFL)

EXIT Protocol is early-stage (v0.x, pre-1.0). The current governance model reflects this reality honestly.

**Project Lead:** Warren Koch (hawthornhollows@gmail.com)

All design decisions, spec changes, and releases are currently made by the project lead, with AI-assisted development and review (Horus/HOLOS system).

This model is intentionally simple. It will evolve as the contributor base grows.

## Decision Process

| Change Type | Process | Timeline |
|-------------|---------|----------|
| Bug fixes | PR review + merge | Days |
| Non-breaking features | PR + discussion | 1-2 weeks |
| Breaking spec changes | RFC in GitHub Issues, 14-day comment period | 2-4 weeks |
| Algorithm additions | RFC + security analysis, 30-day comment period | 1-2 months |
| Governance changes | Public proposal, 30-day comment period | 1-2 months |

### Spec Versioning

- **v1.2** is designated as the last free breaking change while adoption is zero.
- Post-1.0, breaking changes require a major version bump and 90-day deprecation period.

## Principles

1. **Departure is a right. Admission is a privilege.** This is non-negotiable.
2. **Disputes never block departure.** Protocol invariant.
3. **Anti-weaponization is normative.** Ethical constraints are baked into the spec, not bolted on.
4. **Honest about limitations.** We document what we can't do (self-attestation, TSA verification limits) rather than hide it.
5. **Open specification, open source.** Apache 2.0 license. If this project disappears, anyone can reimplement from the spec.

## Anti-Weaponization Enforcement

Section 8.7 of the EXIT spec contains normative anti-weaponization provisions. Enforcement mechanisms are currently limited to:

- Spec-level MUST/MUST NOT requirements
- Documentation of prohibited uses
- Community reporting via GitHub Issues

We acknowledge this is insufficient for a mature protocol. Future governance should include:
- Independent review board for weaponization complaints
- Arbitration process for anti-retaliation claims
- Formal dispute resolution mechanism

## Roadmap Governance

Priorities are driven by (in order):
1. Security and correctness
2. Standards compliance (NIST, FIPS, GDPR)
3. Developer experience
4. Feature expansion
5. Ecosystem growth

The public roadmap is tracked via GitHub Issues and project milestones.

## Standards Engagement

EXIT Protocol is positioned as a contribution to emerging AI agent standards:

- **NIST AI Agent Standards Initiative** (RFI response submitted March 2026)
- **Open to participation in:** AAIF, W3C Community Groups, IETF, or similar bodies
- **Governance seats:** We welcome standards bodies and established organizations to participate in protocol governance. Contact hawthornhollows@gmail.com.

## Contributing

We welcome contributions of all kinds:

- **Bug reports and security issues** (see [SECURITY.md](./SECURITY.md))
- **Spec feedback** via GitHub Issues
- **Implementation feedback** from real-world usage
- **Framework integrations** (LangChain, Vercel AI SDK, MCP, etc.)
- **Legal/compliance review** of LEGAL.md and GDPR_GUIDE.md

## Related Projects

EXIT Protocol is part of the **Passage Protocol** ecosystem:

| Project | Repository | Status |
|---------|-----------|--------|
| EXIT (departure) | [exit-door](https://github.com/CellarDoorExits/exit-door) | Active (v0.3.x) |
| ENTRY (arrival) | [entry-door](https://github.com/CellarDoorExits/entry-door) | Active (v0.1.x) |
| MCP Server | [mcp-server](https://github.com/CellarDoorExits/mcp-server) | Active |
| Vercel AI SDK | [vercel-ai-sdk](https://github.com/CellarDoorExits/vercel-ai-sdk) | Active |
| LangChain | [langchain](https://github.com/CellarDoorExits/langchain) | Active |

## Contact

- **General:** [GitHub Issues](https://github.com/CellarDoorExits/exit-door/issues)
- **Security:** hawthornhollows@gmail.com (see [SECURITY.md](./SECURITY.md))
- **Governance proposals:** Open a GitHub Issue with the `governance` label
- **Standards/partnership inquiries:** hawthornhollows@gmail.com
