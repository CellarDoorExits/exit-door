# cellar-door-exit 𓉸

**Right of Passage** — verifiable EXIT markers for AI agents, platforms, and DAOs.

## The Problem

Your AI agent worked for months on Platform A. It built reputation, completed tasks, earned trust. Now it needs to move to Platform B. How does Platform B know any of that happened? How does the agent prove it wasn't fired for cause?

Today: it can't. There's no portable, verifiable proof of departure. No vehicle history report for AI agents. Every move starts from zero.

## The Solution

EXIT markers — signed, portable, offline-verifiable proof of departure. A departure **ceremony** that produces a cryptographic record of *when* an agent left, *how* things stood, and *why*.

Think of it as a vehicle history report, but for AI agents. Except the agent signs it, not the dealer.

## Quick Start

```bash
npm install cellar-door-exit
```

```typescript
import { quickExit, quickVerify, toJSON } from "cellar-door-exit";

// Create + sign a departure marker in one line
const { marker } = quickExit("did:web:platform.example");
console.log(toJSON(marker));

// Verify it
const result = quickVerify(toJSON(marker));
console.log(result.valid); // true
```

That's it. Signed, verifiable proof of departure in 3 lines.

## How It Works

EXIT is a **ceremony**, not a single event. Three paths, depending on cooperation:

```
Full cooperative:  ALIVE → INTENT → SNAPSHOT → OPEN → FINAL → DEPARTED
Unilateral:        ALIVE → INTENT → SNAPSHOT → FINAL → DEPARTED
Emergency:         ALIVE → FINAL → DEPARTED
```

Every EXIT marker has **7 mandatory fields** (~335 bytes unsigned):

| Field | Purpose |
|-------|---------|
| `id` | Content-addressed identifier |
| `subject` | Who is leaving (DID) |
| `origin` | What is being left (URI) |
| `timestamp` | When (ISO 8601 UTC) |
| `exitType` | `voluntary` · `forced` · `emergency` + 5 more |
| `status` | `good_standing` · `disputed` · `unverified` |
| `proof` | Cryptographic signature |

Contests don't block exit. A dispute changes `status` — it never prevents departure.

## API

**80% of users need two functions:**

```typescript
import { quickExit, quickVerify } from "cellar-door-exit";

const { marker, identity } = quickExit(origin, opts?);
const result = quickVerify(jsonString);
```

**Full control:**

```typescript
import { generateIdentity, createMarker, signMarker, verifyMarker } from "cellar-door-exit";

const { did, publicKey, privateKey } = generateIdentity();
let marker = createMarker({ subject: did, origin, exitType, status });
marker = signMarker(marker, privateKey, publicKey);
const result = verifyMarker(marker);
```

**Passage API** (for full EXIT + ENTRY transfers between platforms):

```typescript
import { createDepartureMarker, verifyPassage } from "cellar-door-exit";
```

## CLI

```bash
exit keygen                          # Generate DID + keypair
exit create --origin <uri> --sign    # Create signed EXIT marker
exit verify marker.json              # Verify a marker
exit inspect marker.json             # Pretty-print all fields
```

## Modules

Six optional modules extend the core 7-field schema:

- **A: Lineage** — Predecessor/successor chains for agent migration
- **B: State Snapshot** — Hash-referenced state at exit time
- **C: Dispute Bundle** — Active disputes, evidence, challenge windows
- **D: Economic** — Asset manifests, obligations, exit fees ⚠️ *securities disclaimer applies*
- **E: Metadata** — Human-readable reason, narrative, tags
- **F: Cross-Domain** — On-chain anchors, registry entries

## Design Principles

1. **Non-custodial.** EXIT references external state but never contains it.
2. **Always available.** Works with zero cooperation from the origin.
3. **Offline-verifiable.** Check a marker years later without the origin being live.
4. **Agent-native.** Designed for autonomous agents first.
5. **Minimal core.** 7 fields. ~335 bytes unsigned. Everything else is optional.
6. **Irreversible.** No undo. Return is a new JOIN.

## Security

| Algorithm | Proof Type | FIPS 140-2/3 | Default |
|-----------|-----------|--------------|---------|
| Ed25519 | `Ed25519Signature2020` | ❌ | ✅ |
| ECDSA P-256 | `EcdsaP256Signature2019` | ✅ | |

Use `createSigner({ algorithm: "P-256" })` for FIPS compliance. See the [HSM Integration Guide](./docs/HSM_INTEGRATION.md) for AWS KMS, Azure Key Vault, GCP KMS, and YubiKey.

All 410 tests pass across 25 test files.

## Links

- **Spec:** [EXIT_SPEC v1.1](./EXIT_SPEC.md)
- **Paper:** [Cellar Door: Right of Passage](./docs/PAPER.md)
- **Website:** [cellar-door.dev](https://cellar-door.dev)
- **npm:** [cellar-door-exit](https://www.npmjs.com/package/cellar-door-exit)
- **Getting Started:** [5-minute guide](./docs/GETTING_STARTED.md)
- **Contributing:** [CONTRIBUTING.md](./CONTRIBUTING.md)
- **Security:** [SECURITY.md](./SECURITY.md)

## License

Apache-2.0
