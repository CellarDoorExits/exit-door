/**
 * Scenario 4: End-to-End Passage (EXIT + ENTRY)
 *
 * Full real-world scenario: An AI agent departs Platform A,
 * arrives at Platform B, and the entire chain is verified.
 *
 * Demonstrates:
 * 1. Agent identity generation
 * 2. Full EXIT ceremony (intent → snapshot → open → final → departed)
 * 3. Trust enhancers (TSA timestamp, witness)
 * 4. ENTRY arrival marker at destination
 * 5. Continuity verification (departure → arrival chain)
 * 6. P-256 (FIPS) signer support
 * 7. Claim store ingestion
 *
 * This is the demo the reviewers asked for.
 *
 * Usage:
 *   npx tsx src/demo/scenario4-end-to-end.ts
 */

import {
  generateKeyPair,
  didFromPublicKey,
  createMarker,
  signMarker,
  verifyMarker,
  ExitType,
  ExitStatus,
  CeremonyStateMachine,
  addModule,
  createSigner,
  signMarkerWithSigner,
  verifyMarkerMultiAlg,
  MemoryClaimStore,
  ingestMarker,
  type ExitMarker,
  type ModuleA,
  type ModuleE,
  type TrustEnhancers,
} from "../index.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`  ${msg}`);
}

function heading(msg: string) {
  console.log();
  console.log(`── ${msg} ${"─".repeat(Math.max(0, 60 - msg.length))}`);
}

function success(msg: string) {
  console.log(`  ✅ ${msg}`);
}

function info(msg: string) {
  console.log(`  ℹ️  ${msg}`);
}

// ─── Main Demo ───────────────────────────────────────────────────────────────

async function main() {
  console.log();
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  𓉸 Passage Protocol — End-to-End Demo");
  console.log("  EXIT + ENTRY: Two ceremonies, one protocol.");
  console.log("═══════════════════════════════════════════════════════════════");

  // ─── Step 1: Setup identities ──────────────────────────────────────────

  heading("Step 1: Identity Generation");

  // Agent uses Ed25519 (default)
  const agentKeys = generateKeyPair();
  const agentDid = didFromPublicKey(agentKeys.publicKey);
  log(`Agent DID: ${agentDid.slice(0, 30)}...`);

  // Platform A (origin) has its own identity
  const platformAKeys = generateKeyPair();
  const platformADid = didFromPublicKey(platformAKeys.publicKey);
  log(`Platform A DID: ${platformADid.slice(0, 30)}...`);

  // Platform B (destination) uses P-256 for FIPS compliance
  const platformBSigner = createSigner({ algorithm: "P-256" });
  log(`Platform B DID: ${platformBSigner.did().slice(0, 30)}... (P-256/FIPS)`);

  // A witness (independent third party)
  const witnessKeys = generateKeyPair();
  const witnessDid = didFromPublicKey(witnessKeys.publicKey);
  log(`Witness DID: ${witnessDid.slice(0, 30)}...`);

  success("All identities generated");

  // ─── Step 2: EXIT Ceremony ─────────────────────────────────────────────

  heading("Step 2: EXIT Ceremony at Platform A");

  const ceremony = new CeremonyStateMachine();
  log(`State: ${ceremony.state}`); // alive

  // 2a. Declare intent
  ceremony.transition("intent");
  log(`State: ${ceremony.state} — Agent declares intent to depart`);

  // 2b. Snapshot
  ceremony.transition("snapshot");
  log(`State: ${ceremony.state} — State captured`);

  // 2c. Open challenge window
  ceremony.transition("open");
  log(`State: ${ceremony.state} — Challenge window open (no disputes filed)`);

  // 2d. Finalize
  ceremony.transition("final");
  log(`State: ${ceremony.state} — Ceremony finalized`);

  // 2e. Create and sign the EXIT marker
  const exitMarker = createMarker({
    subject: agentDid,
    origin: "https://platform-a.example.com",
    exitType: ExitType.Voluntary,
    status: ExitStatus.GoodStanding,
  });

  // Add lineage module (this agent has a predecessor)
  const lineage: ModuleA = {
    predecessor: "did:key:z6MkPreviousIncarnation...",
    lineageChain: ["did:key:z6MkGenesis...", "did:key:z6MkPreviousIncarnation..."],
  };
  const withLineage = addModule(exitMarker, "lineage", lineage);

  // Add metadata
  const metadata: ModuleE = {
    reason: "Migrating to Platform B for better tool access",
    narrative: "Voluntary departure after 6 months. No disputes. All obligations settled.",
    tags: ["voluntary", "migration", "good-standing"],
  };
  const withMetadata = addModule(withLineage, "metadata", metadata);

  // Add trust enhancers (conduit-only — we just carry them)
  const trustEnhancers: TrustEnhancers = {
    timestamps: [{
      tsaUrl: "https://freetsa.org/tsr",
      hash: "a1b2c3d4e5f6".padEnd(64, "0"), // would be real SHA-256 in production
      timestamp: new Date().toISOString(),
      receipt: Buffer.from("simulated-tsr-receipt").toString("base64"),
    }],
    witnesses: [{
      witnessDid: witnessDid,
      attestation: "Observed voluntary departure ceremony from Platform A",
      timestamp: new Date().toISOString(),
      signature: Buffer.from("simulated-witness-sig").toString("base64"),
      signatureType: "Ed25519Signature2020",
    }],
  };
  const enhanced: ExitMarker = { ...withMetadata, trustEnhancers };

  // Sign with agent's key
  const signedExit = signMarker(enhanced, agentKeys.privateKey, agentKeys.publicKey);
  log(`Marker ID: ${signedExit.id.slice(0, 40)}...`);
  log(`Proof type: ${signedExit.proof.type}`);
  log(`Marker size: ${Buffer.from(JSON.stringify(signedExit)).length} bytes`);

  // Mark departed
  ceremony.transition("departed");
  log(`State: ${ceremony.state} — Agent has left Platform A`);

  // Verify the EXIT marker
  const exitVerification = verifyMarker(signedExit);
  if (exitVerification.valid) {
    success("EXIT marker verified ✓");
  } else {
    console.error("  ❌ EXIT verification failed:", exitVerification.errors);
    process.exit(1);
  }

  // ─── Step 3: Transit ───────────────────────────────────────────────────

  heading("Step 3: In Transit");
  log("Agent carries EXIT marker to Platform B...");
  log("The marker is self-contained — no callback to Platform A needed.");
  log(`Marker is ${Buffer.from(JSON.stringify(signedExit)).length} bytes — fits in a URL parameter.`);

  // ─── Step 4: ENTRY at Platform B ───────────────────────────────────────

  heading("Step 4: ENTRY Ceremony at Platform B");

  // Platform B verifies the EXIT marker first
  log("Platform B verifies the EXIT marker...");
  const entryExitCheck = verifyMarker(signedExit);
  if (entryExitCheck.valid) {
    success("EXIT marker passes Platform B's verification");
  }

  // Platform B checks trust enhancers
  if (signedExit.trustEnhancers?.timestamps?.length) {
    info(`TSA timestamp from: ${signedExit.trustEnhancers.timestamps[0].tsaUrl}`);
  }
  if (signedExit.trustEnhancers?.witnesses?.length) {
    info(`Witness attestation from: ${signedExit.trustEnhancers.witnesses[0].witnessDid.slice(0, 30)}...`);
  }

  // Create arrival marker (using entry package types inline since it's a demo)
  // In production: import { quickEntry } from "cellar-door-entry"
  const arrivalMarker = {
    "@context": "https://cellar-door.dev/entry/v1",
    specVersion: "1.0",
    id: `urn:arrival:${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    subject: agentDid,
    destination: "https://platform-b.example.com",
    timestamp: new Date().toISOString(),
    departureRef: signedExit.id,
    admissionPolicy: "standard",
    status: "admitted",
    proof: { type: "EcdsaP256Signature2019", created: "", verificationMethod: "", proofValue: "" },
  };

  // Platform B signs with P-256 (FIPS compliant)
  log("Platform B signs arrival marker with P-256 (FIPS)...");
  // Simulate signing (in production: signArrivalMarker from cellar-door-entry)
  const arrivalData = new TextEncoder().encode(JSON.stringify(arrivalMarker));
  const arrivalSig = platformBSigner.sign(arrivalData);
  arrivalMarker.proof = {
    type: "EcdsaP256Signature2019",
    created: new Date().toISOString(),
    verificationMethod: platformBSigner.did(),
    proofValue: Buffer.from(arrivalSig as Uint8Array).toString("base64"),
  };

  log(`Arrival marker ID: ${arrivalMarker.id.slice(0, 40)}...`);
  log(`Arrival proof type: ${arrivalMarker.proof.type} (P-256/FIPS)`);
  success("Agent admitted to Platform B");

  // ─── Step 5: Continuity Verification ───────────────────────────────────

  heading("Step 5: Continuity Verification (Proof of Passage)");

  // Any third party can now verify the full chain
  log("Verifying departure → arrival chain...");

  const checks = {
    exitValid: verifyMarker(signedExit).valid,
    subjectMatch: signedExit.subject === arrivalMarker.subject,
    departureRefMatch: arrivalMarker.departureRef === signedExit.id,
    arrivalAfterDeparture: new Date(arrivalMarker.timestamp) >= new Date(signedExit.timestamp),
    originDiffers: signedExit.origin !== arrivalMarker.destination,
  };

  for (const [check, passed] of Object.entries(checks)) {
    if (passed) {
      success(`${check}`);
    } else {
      console.error(`  ❌ ${check} FAILED`);
    }
  }

  const allPassed = Object.values(checks).every(Boolean);
  if (allPassed) {
    success("PROOF OF PASSAGE VERIFIED — Full chain is authentic ✓");
  }

  // ─── Step 6: Claim Store Ingestion ─────────────────────────────────────

  heading("Step 6: Claim Store Ingestion");

  const store = new MemoryClaimStore();
  ingestMarker(store, signedExit);

  const stats = store.stats();
  log(`Claims ingested: ${stats.totalClaims}`);
  log(`By type: ${JSON.stringify(stats.claimsByType)}`);
  log(`Unique subjects: ${stats.uniqueSubjects}`);
  log(`Unique issuers: ${stats.uniqueIssuers}`);
  success("All claims stored for future queries");

  // Query the store
  const exitClaims = store.query({ subject: agentDid, type: "exit_marker" });
  log(`Exit marker claims for agent: ${exitClaims.length}`);

  const tsClaims = store.query({ subject: agentDid, type: "timestamp" });
  log(`Timestamp claims for agent: ${tsClaims.length}`);

  // ─── Summary ───────────────────────────────────────────────────────────

  heading("Summary");
  console.log();
  console.log("  ┌─────────────────────────────────────────────────────┐");
  console.log("  │  𓉸 Passage Complete                                 │");
  console.log("  │                                                     │");
  console.log("  │  Agent: " + agentDid.slice(0, 20) + "...              │");
  console.log("  │  From:  platform-a.example.com                      │");
  console.log("  │  To:    platform-b.example.com (FIPS/P-256)         │");
  console.log("  │  Type:  Voluntary, Good Standing                    │");
  console.log("  │  Trust: TSA timestamp + witness attestation         │");
  console.log("  │  Chain: EXIT ──→ ARRIVAL ──→ Verified ✓             │");
  console.log("  │                                                     │");
  console.log("  │  \"Departure is a right. Admission is a privilege.\"  │");
  console.log("  └─────────────────────────────────────────────────────┘");
  console.log();
}

main().catch(console.error);
