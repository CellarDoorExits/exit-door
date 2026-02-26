/**
 * Performance benchmarks for cellar-door-exit
 */
import { describe, test } from "vitest";
import {
  generateIdentity,
  generateKeyPair,
  createMarker,
  signMarker,
  verifyMarker,
  CeremonyStateMachine,
  ExitType,
  ExitStatus,
} from "../index.js";

function bench(name: string, fn: () => void, iterations = 1): number {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = performance.now() - start;
  return elapsed;
}

function formatTable(rows: [string, string, string][]) {
  const header = ["Benchmark", "Iterations", "Time (ms)"];
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map(r => r[i].length)));
  const sep = widths.map(w => "-".repeat(w)).join("-+-");
  const fmt = (r: string[]) => r.map((c, i) => c.padEnd(widths[i])).join(" | ");
  console.log("\n" + fmt(header));
  console.log(sep);
  rows.forEach(r => console.log(fmt(r)));
  console.log("");
}

function makeMarker(did: string) {
  return createMarker({
    subject: did,
    origin: "https://bench.example.com",
    exitType: ExitType.Voluntary,
    status: ExitStatus.Final,
  });
}

describe("Performance Benchmarks", () => {
  const results: [string, string, string][] = [];
  const identity = generateIdentity();
  const marker = makeMarker(identity.did);
  const signed = signMarker(marker, identity.privateKey, identity.publicKey);

  test("Ceremony creation latency", () => {
    const n = 1000;
    const ms = bench("CeremonyStateMachine creation", () => { new CeremonyStateMachine(); }, n);
    results.push(["Ceremony creation", String(n), ms.toFixed(3)]);
  });

  test("State transitions", async () => {
    const n = 1000;
    // Full cooperative path: Alive→Intent→Snapshot→Open→Final→Departed
    const start1 = performance.now();
    for (let i = 0; i < n; i++) {
      const { privateKey, publicKey, did } = generateIdentity();
      const c = new CeremonyStateMachine();
      await c.declareIntent(did, "https://bench.example.com", ExitType.Voluntary, privateKey, publicKey);
      c.snapshot();
      c.openChallenge();
      const m = makeMarker(did);
      await c.signMarker(m, privateKey, publicKey);
      c.depart();
    }
    const ms = performance.now() - start1;
    results.push(["Full ceremony path (×" + n + ")", String(n), ms.toFixed(3)]);

    // Emergency path
    const start2 = performance.now();
    for (let i = 0; i < n; i++) {
      const { privateKey, publicKey, did } = generateIdentity();
      const c = new CeremonyStateMachine();
      await c.declareIntent(did, "https://bench.example.com", ExitType.Emergency, privateKey, publicKey);
      const m = createMarker({
        subject: did,
        origin: "https://bench.example.com",
        exitType: ExitType.Emergency,
        status: ExitStatus.Final,
        emergencyJustification: "benchmark test",
      });
      await c.signMarker(m, privateKey, publicKey);
      c.depart();
    }
    const ms2 = performance.now() - start2;
    results.push(["Emergency path (×" + n + ")", String(n), ms2.toFixed(3)]);
  });

  test("signIntent latency (via declareIntent)", async () => {
    const n = 1000;
    const { privateKey, publicKey, did } = identity;
    const start = performance.now();
    for (let i = 0; i < n; i++) {
      const c = new CeremonyStateMachine();
      await c.declareIntent(did, "https://bench.example.com", ExitType.Voluntary, privateKey, publicKey);
    }
    const ms = performance.now() - start;
    results.push(["Intent signing (declareIntent)", String(n), ms.toFixed(3)]);
  });

  test("signMarker latency", () => {
    const n = 1000;
    const ms = bench("signMarker", () => {
      signMarker(marker, identity.privateKey, identity.publicKey);
    }, n);
    results.push(["Marker signing", String(n), ms.toFixed(3)]);
  });

  test("verifyMarker latency", () => {
    const n = 1000;
    const ms = bench("verifyMarker", () => {
      verifyMarker(signed);
    }, n);
    results.push(["Marker verification", String(n), ms.toFixed(3)]);
  });

  test("Batch: create + sign 100 markers", () => {
    const n = 100;
    const ms = bench("Batch 100 markers", () => {
      const id = generateIdentity();
      for (let i = 0; i < n; i++) {
        const m = makeMarker(id.did);
        signMarker(m, id.privateKey, id.publicKey);
      }
    });
    results.push(["Batch create+sign 100 markers", "1", ms.toFixed(3)]);

    // Also measure batch verify
    const id = generateIdentity();
    const batch = Array.from({ length: n }, () => {
      const m = makeMarker(id.did);
      return signMarker(m, id.privateKey, id.publicKey);
    });
    const ms2 = bench("Batch verify 100", () => {
      for (const m of batch) verifyMarker(m);
    });
    results.push(["Batch verify 100 markers", "1", ms2.toFixed(3)]);
  });

  test("Print results table", () => {
    formatTable(results);
  });
});
