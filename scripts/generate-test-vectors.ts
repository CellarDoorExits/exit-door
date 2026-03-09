/**
 * Generate cross-language test vectors for EXIT Protocol.
 *
 * Outputs a JSON file with deterministic markers and hashes
 * that Python (and other language) implementations must reproduce exactly.
 *
 * Usage: npx tsx scripts/generate-test-vectors.ts > test-vectors.json
 */

import {
  createMarker,
  computeId,
  canonicalize,
  addModule,
  ExitType,
} from "../src/index.js";

function main() {
  const vectors: Record<string, unknown> = {
    _meta: {
      generator: "cellar-door-exit (TypeScript)",
      version: "0.2.2",
      specVersion: "1.2",
      generated: new Date().toISOString(),
      description: "Cross-language test vectors for EXIT Protocol implementations",
    },
  };

  // === 1. Canonicalization vectors ===
  vectors.canonicalization = [
    {
      description: "Simple object — keys sorted",
      input: { b: "2", a: "1" },
      expected: canonicalize({ b: "2", a: "1" }),
    },
    {
      description: "Nested object — recursive sort",
      input: { z: { b: 2, a: 1 }, a: "first" },
      expected: canonicalize({ z: { b: 2, a: 1 }, a: "first" }),
    },
    {
      description: "Unicode characters",
      input: { emoji: "🚪", name: "café" },
      expected: canonicalize({ emoji: "🚪", name: "café" }),
    },
    {
      description: "Number types",
      input: { int: 42, float: 3.14, neg: -1, zero: 0 },
      expected: canonicalize({ int: 42, float: 3.14, neg: -1, zero: 0 }),
    },
    {
      description: "Null and boolean",
      input: { n: null, t: true, f: false },
      expected: canonicalize({ n: null, t: true, f: false }),
    },
    {
      description: "Array values",
      input: { arr: [3, 1, 2], key: "val" },
      expected: canonicalize({ arr: [3, 1, 2], key: "val" }),
    },
    {
      description: "Empty object and array",
      input: { obj: {}, arr: [] },
      expected: canonicalize({ obj: {}, arr: [] }),
    },
  ];

  // === 2. Marker creation vectors ===
  const fixedTimestamp = "2026-01-15T12:00:00.000Z";
  const subject = "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK";
  const origin = "did:web:platform.example.com";

  const voluntaryMarker = createMarker({
    subject,
    origin,
    exitType: ExitType.Voluntary,
    timestamp: fixedTimestamp,
  });

  const forcedMarker = createMarker({
    subject,
    origin,
    exitType: ExitType.Forced,
    timestamp: fixedTimestamp,
  });

  const emergencyMarker = createMarker({
    subject,
    origin,
    exitType: ExitType.Emergency,
    timestamp: fixedTimestamp,
    emergencyJustification: "Key material compromised via supply chain attack",
  });

  // Helper: extract hashable content (no proof, no id)
  function hashableContent(m: any) {
    const { proof: _p, id: _i, ...rest } = m;
    return rest;
  }

  vectors.markers = {
    voluntary: {
      input: { subject, origin, exitType: "voluntary", timestamp: fixedTimestamp },
      expected: {
        id: voluntaryMarker.id,
        context: voluntaryMarker["@context"],
        specVersion: voluntaryMarker.specVersion,
        status: voluntaryMarker.status,
        selfAttested: voluntaryMarker.selfAttested,
        expires: voluntaryMarker.expires,
      },
      contentHash: computeId(voluntaryMarker),
      canonicalized: canonicalize(hashableContent(voluntaryMarker)),
      fullMarker: voluntaryMarker,
    },
    forced: {
      input: { subject, origin, exitType: "forced", timestamp: fixedTimestamp },
      expected: {
        id: forcedMarker.id,
        status: forcedMarker.status,
        expires: forcedMarker.expires,
      },
      contentHash: computeId(forcedMarker),
      canonicalized: canonicalize(hashableContent(forcedMarker)),
    },
    emergency: {
      input: {
        subject,
        origin,
        exitType: "emergency",
        timestamp: fixedTimestamp,
        emergencyJustification: "Key material compromised via supply chain attack",
      },
      expected: {
        id: emergencyMarker.id,
        status: emergencyMarker.status,
        expires: emergencyMarker.expires,
      },
      contentHash: computeId(emergencyMarker),
    },
  };

  // === 3. Module attachment — ID recomputation ===
  const withLineage = addModule(voluntaryMarker, "lineage", {
    previousMarker: "urn:exit:abc123",
    lineageHash: "sha256:deadbeef",
    sequenceNumber: 1,
  });

  vectors.modules = {
    lineage: {
      description: "addModule recomputes content-addressed ID",
      baseMarkerId: voluntaryMarker.id,
      withModuleId: withLineage.id,
      idsAreDifferent: voluntaryMarker.id !== withLineage.id,
      module: {
        previousMarker: "urn:exit:abc123",
        lineageHash: "sha256:deadbeef",
        sequenceNumber: 1,
      },
      contentHash: computeId(withLineage),
    },
  };

  // === 4. Content-addressing edge cases ===
  vectors.contentAddressing = {
    description: "Same inputs produce same ID (deterministic)",
    marker1Id: voluntaryMarker.id,
    marker2Id: createMarker({
      subject,
      origin,
      exitType: ExitType.Voluntary,
      timestamp: fixedTimestamp,
    }).id,
    areEqual: voluntaryMarker.id === createMarker({
      subject,
      origin,
      exitType: ExitType.Voluntary,
      timestamp: fixedTimestamp,
    }).id,
  };

  console.log(JSON.stringify(vectors, null, 2));
}

main();
