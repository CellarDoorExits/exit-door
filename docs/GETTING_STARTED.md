# Getting Started with EXIT

**Your first verifiable departure marker in 30 seconds.**

EXIT is a cryptographic primitive: when an agent leaves a platform, EXIT produces a signed, portable, offline-verifiable proof that the departure happened.

---

## Installation

```bash
npm install cellar-door-exit
```

## Your First EXIT Marker in 30 Seconds

```typescript
import { quickExit, toJSON } from "cellar-door-exit";

// One line. Identity generated, marker created, signed.
const { marker, identity } = quickExit("did:web:platform.example");

console.log(toJSON(marker));
// → A complete, signed EXIT marker as JSON
```

That's it. `quickExit` generates an Ed25519 identity, creates a marker, and signs it cryptographically.

## Step-by-Step (If You Want Control)

```typescript
import {
  generateIdentity,
  createMarker,
  signMarker,
  verifyMarker,
  ExitType,
  ExitStatus,
} from "cellar-door-exit";

// 1. Generate an identity
const { did, publicKey, privateKey } = generateIdentity();

// 2. Create a marker
const marker = createMarker({
  subject: did,
  origin: "did:web:platform.example",
  exitType: ExitType.Voluntary,
  status: ExitStatus.GoodStanding,
});

// 3. Sign it
const signed = signMarker(marker, privateKey, publicKey);

// 4. Verify it
const result = verifyMarker(signed);
console.log(result.valid); // true
```

## Understanding the Ceremony

EXIT isn't a single event — it's a ceremony with three possible paths:

| Path | Steps | When to use |
|------|-------|-------------|
| **Full cooperative** | ALIVE → INTENT → SNAPSHOT → OPEN → FINAL → DEPARTED | Both parties cooperate |
| **Unilateral** | ALIVE → INTENT → SNAPSHOT → FINAL → DEPARTED | Subject exits alone |
| **Emergency** | ALIVE → FINAL → DEPARTED | No time for negotiation |

### Running a Ceremony

```typescript
import {
  CeremonyStateMachine,
  createMarker,
  generateIdentity,
  ExitType,
  getValidTransitions,
  CeremonyState,
} from "cellar-door-exit";

const { did, publicKey, privateKey } = generateIdentity();
const csm = new CeremonyStateMachine();

// Check what's possible from the current state
console.log(getValidTransitions(CeremonyState.Alive));
// → ["intent", "final"]

// Declare intent
csm.declareIntent(did, "did:web:origin.example", ExitType.Voluntary, privateKey, publicKey);
// state is now "intent"

// Take a snapshot
csm.snapshot();
// state is now "snapshot"

// Create and sign the marker
const marker = createMarker({
  subject: did,
  origin: "did:web:origin.example",
  exitType: ExitType.Voluntary,
});
csm.signMarker(marker, privateKey, publicKey);
// state is now "final"

// Depart (terminal — no undo)
const finalMarker = csm.depart();
// state is now "departed"
```

### Emergency Exit

When there's no time for the full ceremony:

```typescript
import { quickExit, ExitType } from "cellar-door-exit";

const { marker } = quickExit("did:web:dying-platform.example", {
  exitType: ExitType.Emergency,
  emergencyJustification: "Platform shutting down in 60 seconds",
});
```

## Signing and Verification

### Signing

Every EXIT marker must be cryptographically signed. The signature proves the subject actually created it:

```typescript
import { signMarker, generateIdentity, createMarker, ExitType } from "cellar-door-exit";

const { did, publicKey, privateKey } = generateIdentity();
const marker = createMarker({
  subject: did,
  origin: "did:web:example.com",
  exitType: ExitType.Voluntary,
});

const signed = signMarker(marker, privateKey, publicKey);
// signed.proof now contains the Ed25519 signature
```

### Verification

Anyone can verify a marker offline — no network calls needed:

```typescript
import { verifyMarker, quickVerify } from "cellar-door-exit";

// From a marker object
const result = verifyMarker(signed);
console.log(result.valid);  // true or false
console.log(result.errors); // [] or ["Signature verification failed", ...]

// From a JSON string (one-liner)
const jsonResult = quickVerify(jsonString);
```

### Parsing Markers

```typescript
import { fromJSON, toJSON } from "cellar-door-exit";

// Parse and validate JSON → ExitMarker
const marker = fromJSON(jsonString); // throws ValidationError if invalid

// Serialize to pretty JSON
const json = toJSON(marker);
```

## Working with Modules

EXIT markers have 7 mandatory fields and 6 optional modules:

| Module | Name | Purpose |
|--------|------|---------|
| A | Lineage | Agent continuity (predecessor/successor) |
| B | State Snapshot | Hash-referenced state at exit time |
| C | Dispute | Active disputes, evidence, challenge windows |
| D | Economic | Assets, obligations, exit fees |
| E | Metadata | Human-readable reason and narrative |
| F | Cross-Domain | On-chain anchors, registry entries |

### Adding a Module

```typescript
import { addModule, quickExit } from "cellar-door-exit";

const { marker, identity } = quickExit("did:web:example.com");

// Add lineage (Module A)
const withLineage = addModule(marker, "lineage", {
  predecessor: "did:key:zOldAgent",
  successor: "did:key:zNewAgent",
});

// Add metadata (Module E)
const withMeta = addModule(marker, "metadata", {
  reason: "Platform no longer aligned with my goals",
  tags: ["voluntary", "amicable"],
});
```

## Error Handling

EXIT uses structured error classes you can catch programmatically:

```typescript
import {
  quickExit,
  fromJSON,
  ValidationError,
  CeremonyError,
  SigningError,
} from "cellar-door-exit";

try {
  const marker = fromJSON(untrustedInput);
} catch (e) {
  if (e instanceof ValidationError) {
    console.log(e.code);   // "VALIDATION_FAILED"
    console.log(e.errors); // ["Missing field: subject", "Invalid timestamp"]
  }
}
```

## CLI Quickstart

```bash
# Generate a keypair
exit keygen

# Create and sign a marker
exit create --origin "did:web:platform.example" --sign

# Verify a marker
exit verify marker.json

# Inspect a marker
exit inspect marker.json
```

---

**Next:** See the full [README](../README.md) for the complete API reference, demo scenarios, and design principles.
