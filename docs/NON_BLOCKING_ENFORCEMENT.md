# Non-Blocking Enforcement: Application-Layer Guide

## Core Principle

EXIT markers are **non-blocking by design**. The protocol itself never prevents an exit — it only records one. Enforcement decisions (whether to accept, reject, or flag a marker) are explicitly **application-layer concerns**.

This is deliberate. A protocol that can block exits is a protocol that can be used for lock-in.

## Why Non-Blocking?

1. **EXIT is a right, not a request.** If the protocol could refuse to create a marker, the right to leave becomes a privilege.
2. **Blocking creates liability.** A protocol that blocks exits takes on the liability of the block decision.
3. **Self-attestation is enough for departure.** You don't need permission to leave. Verification of *claims within* a marker is a separate concern from the marker's existence.

## What Applications Should Do

Applications consuming EXIT markers make their own trust decisions. The protocol provides the data; applications provide the policy.

### Acceptance Policies

| Policy | Description | Risk Level |
|--------|-------------|------------|
| **Accept All** | Any valid marker is accepted. No filtering. | Low security, maximum openness |
| **Require Mutual Status** | Only accept markers where `statusConfirmation` is `mutual` or `witnessed` | Medium — rejects self-only attestations |
| **Require Timestamps** | Only accept markers with `trustEnhancers.timestamps[]` | Medium — proof of time |
| **Require Witnesses** | Only accept markers with `trustEnhancers.witnesses[]` | High — external attestation |
| **Require All** | Timestamps + witnesses + mutual status | Highest trust, lowest throughput |

### Example: Express Middleware

```typescript
import { verifyMarker } from "cellar-door-exit";

function exitAcceptancePolicy(marker) {
  const result = verifyMarker(marker);
  if (!result.valid) return { accept: false, reason: "Invalid marker" };

  // Application-level policy: require mutual status confirmation
  if (marker.statusConfirmation === "self_only") {
    return { accept: false, reason: "Self-attested status not accepted" };
  }

  // Application-level policy: require at least one timestamp
  if (!marker.trustEnhancers?.timestamps?.length) {
    return { accept: false, reason: "Timestamp required" };
  }

  return { accept: true };
}
```

### Example: Graduated Trust

```typescript
function computeTrustLevel(marker) {
  let trust = 0;

  // Base: valid signature
  trust += 1;

  // Mutual status confirmation
  if (["mutual", "witnessed"].includes(marker.statusConfirmation)) trust += 2;

  // External timestamps
  if (marker.trustEnhancers?.timestamps?.length) trust += 1;

  // Witness countersignatures
  if (marker.trustEnhancers?.witnesses?.length) trust += 2;

  // Identity claims (opaque — your app decides what weight to give)
  if (marker.trustEnhancers?.identityClaims?.length) trust += 1;

  // Lineage depth
  if (marker.lineage?.lineageChain?.length > 2) trust += 1;

  return { trust, level: trust >= 6 ? "high" : trust >= 3 ? "medium" : "low" };
}
```

## What Applications Should NOT Do

1. **Don't block marker creation.** Let agents create markers freely. Filter on *consumption*, not *creation*.
2. **Don't modify markers.** Markers are immutable once signed. If you need annotations, store them externally.
3. **Don't aggregate trust scores across markers into a "reputation score."** That creates securities and FCRA risk. Evaluate each marker independently.
4. **Don't block markers by origin platform.** Platforms MAY maintain internal security exclusion lists, but these are outside the scope of this specification.

## The Separation

```
┌─────────────────────────────────┐
│         APPLICATION LAYER       │  ← Your policy decisions live here
│  Acceptance policies            │
│  Trust scoring                  │
│  Filtering / flagging           │
│  Display decisions              │
├─────────────────────────────────┤
│         PROTOCOL LAYER          │  ← EXIT operates here
│  Marker creation (never blocks) │
│  Signature verification         │
│  Schema validation              │
│  Trust-enhancer conduit         │
└─────────────────────────────────┘
```

The protocol guarantees: *anyone can create a valid marker at any time*. The application decides: *what to do with it*.

---

*This guide implements the non-blocking enforcement architecture described in EXIT_SPEC v1.1 §3.1.*
