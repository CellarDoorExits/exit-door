# Test & Benchmark Results — cellar-door-exit v0.1.0

> Generated: 2026-02-22  
> Platform: Node.js v22.22.0, linux x64

## Test Breakdown

**291 tests across 18 test files — all passing.**

| Test File | Description |
|-----------|-------------|
| `benchmarks.test.ts` | Performance benchmarks (signing, verification, Merkle) |
| `ceremony-edge-cases.test.ts` | Ceremony state machine edge cases |
| `devex.test.ts` | Developer experience / convenience API |
| `edge-cases.test.ts` | Invalid inputs, boundary conditions |
| `ethics.test.ts` | Coercion labeling, guardrails, sunset dates |
| `integration.test.ts` | End-to-end ceremony flows |
| `keri.test.ts` | KERI interop and key event handling |
| `marker.test.ts` | Core marker creation, signing, verification |
| `modules.test.ts` | Optional modules A–F |
| `properties.test.ts` | Property-based / fuzz testing |
| `sprint3.test.ts` | v1.1 features (pre-rotation, commit-reveal, tenure) |
| `trust.test.ts` | Confidence scoring, tenure attestation, commit-reveal |
| `vc.test.ts` | W3C Verifiable Credentials interop |

All 9 specification test vectors (§17.1–17.9) are covered.

See also: [`../../cellar-door-benchmarks.md`](../../cellar-door-benchmarks.md) for detailed performance numbers.
