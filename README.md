# cellar-door-exit

**Verifiable EXIT markers for agents, platforms, and DAOs.**

EXIT is a cryptographic primitive: the authenticated declaration of departure. When an agent leaves a context, a user leaves a platform, or a participant leaves a DAO — EXIT produces a signed, portable, offline-verifiable proof that the departure happened, when it happened, and how things stood.

## Install

```bash
npm install cellar-door-exit
```

Or clone and build:

```bash
git clone <repo>
cd cellar-door-exit
npm install
npm run build
```

## CLI

The `exit` command-line tool creates, signs, verifies, and inspects EXIT markers.

### Generate a keypair

```bash
exit keygen
```

```json
{
  "did": "did:key:z6Mk...",
  "publicKey": "98175d...",
  "privateKey": "7aeee1..."
}
```

### Create a signed EXIT marker

```bash
# Auto-generate identity and sign
exit create --origin "did:web:platform.example" --sign

# With explicit subject and reason
exit create --origin "did:web:platform.example" \
  --subject "did:key:z6Mk..." \
  --type voluntary \
  --status good_standing \
  --reason "Moving on" \
  --sign --key ./my-private-key.hex
```

Options:
- `--origin <uri>` — What is being exited (required)
- `--subject <did>` — Who is exiting (auto-generated if omitted)
- `--type <voluntary|forced|emergency>` — Nature of departure (default: voluntary)
- `--status <good_standing|disputed|unverified>` — Standing (default: good_standing)
- `--reason <text>` — Human-readable reason
- `--sign` — Cryptographically sign the marker
- `--key <path>` — Private key file (hex or base64)

### Verify a marker

```bash
exit verify marker.json
```

```
✓ VALID
  Subject: did:key:z6Mk...
  Origin:  did:web:platform.example
  Type:    voluntary
  Status:  good_standing
```

### Inspect a marker

```bash
exit inspect marker.json
```

Pretty-prints all fields, modules, proof details, and verification status.

## Quick Start

**→ [Getting Started Guide](docs/GETTING_STARTED.md)** — 5-minute walkthrough from zero to verified marker.

## Library API

### One-liner (convenience)

```typescript
import { quickExit, quickVerify, toJSON } from "cellar-door-exit";

// Create identity + marker + sign in one call
const { marker, identity } = quickExit("did:web:platform.example");
console.log(toJSON(marker));

// Verify from JSON string
const result = quickVerify(jsonString);
console.log(result.valid); // true
```

### Step-by-step (full control)

```typescript
import {
  generateIdentity, createMarker, signMarker, verifyMarker,
  ExitType, ExitStatus,
} from "cellar-door-exit";

// Generate identity (DID + keypair in one call)
const { did, publicKey, privateKey } = generateIdentity();

// Create and sign a marker
let marker = createMarker({
  subject: did,
  origin: "did:web:platform.example",
  exitType: ExitType.Voluntary,
  status: ExitStatus.GoodStanding,
});
marker = signMarker(marker, privateKey, publicKey);

// Verify
const result = verifyMarker(marker);
console.log(result.valid); // true
```

## Core Schema: 7 Fields

| Field | What | Why mandatory |
|-------|------|---------------|
| `id` | Globally unique marker identifier | Reference, deduplication |
| `subject` | Who is leaving (DID / agent URI) | An exit with no subject is meaningless |
| `origin` | What is being left (URI) | Scopes the departure |
| `timestamp` | When (ISO 8601 UTC) | Ordering, replay detection |
| `exitType` | `voluntary` · `forced` · `emergency` | Interpretation depends on why |
| `status` | `good_standing` · `disputed` · `unverified` | Minimal reputation portability |
| `proof` | Cryptographic signature | Without it, it's just an unsigned log entry |

## Optional Modules

- **A: Lineage** — Predecessor, successor, continuity proofs (agent migration)
- **B: State Snapshot** — Hash-referenced state at exit time
- **C: Dispute Bundle** — Active disputes, evidence, challenge windows
- **D: Economic** — Asset manifests, obligations, exit fees
- **E: Metadata** — Human-readable reason, narrative, tags
- **F: Cross-Domain** — On-chain anchors, registry entries

## The Ceremony

EXIT is a ceremony, not a single event. Three paths:

| Path | Steps | When |
|------|-------|------|
| **Full cooperative** | ALIVE → INTENT → SNAPSHOT → OPEN → FINAL → DEPARTED | Both parties cooperate |
| **Unilateral** | ALIVE → INTENT → SNAPSHOT → FINAL → DEPARTED | Subject exits alone |
| **Emergency** | ALIVE → FINAL → DEPARTED | No time for negotiation |

Contests don't block exit. A dispute changes the `status` field — it never prevents the marker from being created.

## Demo Scenarios

Three scripted scenarios demonstrate EXIT in action:

### Scenario 1: Voluntary Exit

An agent registers with a platform, decides to leave, and goes through the full cooperative ceremony.

```bash
npm run demo:voluntary
```

Shows: identity generation → intent → negotiation → signing → departure → verification.

### Scenario 2: Emergency Exit

An agent detects platform shutdown and triggers the emergency path — ALIVE → FINAL → DEPARTED in milliseconds.

```bash
npm run demo:emergency
```

Shows: emergency detection → minimal marker → fast signing → survival.

### Scenario 3: Successor Handoff

An original agent exits with key rotation, designating a successor via Module A (Lineage). The successor verifies the chain.

```bash
npm run demo:successor
```

Shows: key rotation binding → lineage module → unilateral exit → successor verification → continuity proof.

## Design Principles

1. **Non-custodial.** EXIT references external state but never contains it.
2. **Always available.** Works with zero cooperation from the origin.
3. **Offline-verifiable.** Check a marker years later without the origin being live.
4. **Agent-native.** Designed for autonomous agents first.
5. **Minimal core.** 7 fields. ~335 bytes (unsigned). Everything else is optional.
6. **Irreversible.** No undo. Return is a new JOIN.

## Implementation Status

The following mechanism design features from EXIT_SPEC v1.1 are **implemented** in `src/modules/trust.ts`:

| Feature | Status | Location |
|---------|--------|----------|
| Commit-reveal scheme | ✅ Implemented | `createCommitment()`, `verifyReveal()` |
| Confidence scoring | ✅ Implemented | `computeConfidenceScore()` |
| Tenure weight / attestation | ✅ Implemented | `createTenureAttestation()`, `verifyTenureAttestation()` |
| Coercion labeling | ✅ Implemented | `src/ethics.ts` |
| Guardrails module | ✅ Implemented | `src/guardrails.ts` |
| Pre-rotation | ✅ Implemented | `src/pre-rotation.ts` |

All 205 tests pass across 13 test files, covering all 9 specification test vectors.

## License

MIT
