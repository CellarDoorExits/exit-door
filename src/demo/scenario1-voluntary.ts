/**
 * Scenario 1: Voluntary Exit
 *
 * An agent generates an identity, registers with a platform,
 * decides to leave, and goes through the full ceremony.
 */

import {
  generateKeyPair,
  didFromPublicKey,
  createMarker,
  addModule,
  signMarker,
  verifyMarker,
  ExitType,
  ExitStatus,
  CeremonyStateMachine,
  type ModuleE,
} from "../index.js";

function log(msg: string) {
  console.log(`  ${msg}`);
}

function heading(msg: string) {
  console.log();
  console.log(`── ${msg} ${"─".repeat(Math.max(0, 56 - msg.length))}`);
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║     SCENARIO 1: Voluntary Agent Exit                    ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  // ─── Identity ──────────────────────────────────────────────────────────
  heading("Step 1: Agent generates identity");
  const agent = generateKeyPair();
  const agentDid = didFromPublicKey(agent.publicKey);
  log(`Agent DID: ${agentDid}`);

  const platform = "did:web:marketplace.example.com";
  log(`Registering with platform: ${platform}`);
  log("Agent is now active on the platform, performing tasks...");

  // ─── Decision ──────────────────────────────────────────────────────────
  heading("Step 2: Agent decides to leave");
  log('Reason: "Found better opportunities elsewhere"');
  log("Initiating voluntary exit ceremony...");

  // ─── Ceremony ──────────────────────────────────────────────────────────
  heading("Step 3: Full cooperative ceremony");
  const ceremony = new CeremonyStateMachine();
  log(`State: ${ceremony.state}`);

  // INTENT
  const intent = ceremony.declareIntent(
    agentDid,
    platform,
    ExitType.Voluntary,
    agent.privateKey,
    agent.publicKey
  );
  log(`State: ${ceremony.state} — Intent declared`);
  log(`Intent signed at: ${intent.timestamp}`);

  // SNAPSHOT
  ceremony.snapshot();
  log(`State: ${ceremony.state} — State captured`);

  // OPEN challenge window
  ceremony.openChallenge();
  log(`State: ${ceremony.state} — Challenge window open`);
  log("Waiting for challenges... none received.");

  // ─── Create & Sign Marker ─────────────────────────────────────────────
  heading("Step 4: Create and sign EXIT marker");

  let marker = createMarker({
    subject: agentDid,
    origin: platform,
    exitType: ExitType.Voluntary,
    status: ExitStatus.GoodStanding,
  });

  // Add metadata module
  const meta: ModuleE = {
    reason: "Found better opportunities elsewhere",
    narrative: "Agent completed 147 tasks over 6 months. Departing on good terms.",
    tags: ["voluntary", "clean-exit", "agent-migration"],
  };
  marker = addModule(marker, "metadata", meta);

  // Sign via ceremony
  marker = ceremony.signMarker(marker, agent.privateKey, agent.publicKey);
  log(`State: ${ceremony.state} — Marker signed`);

  // Depart
  marker = ceremony.depart();
  log(`State: ${ceremony.state} — Departed. Terminal.`);

  // ─── Output ────────────────────────────────────────────────────────────
  heading("Step 5: Signed EXIT marker");
  console.log();
  console.log(JSON.stringify(marker, null, 2));

  // ─── Verify ────────────────────────────────────────────────────────────
  heading("Step 6: Verification");
  const result = verifyMarker(marker);
  if (result.valid) {
    log("✓ Marker is VALID");
    log(`  Subject: ${marker.subject}`);
    log(`  Origin:  ${marker.origin}`);
    log(`  Status:  ${marker.status}`);
    log("  The agent has cleanly departed with proof of good standing.");
  } else {
    log("✗ Marker is INVALID");
    for (const err of result.errors) log(`  - ${err}`);
  }

  console.log();
  console.log("── Done ─────────────────────────────────────────────────────");
}

main().catch(console.error);
