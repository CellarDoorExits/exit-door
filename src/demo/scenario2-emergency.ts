/**
 * Scenario 2: Emergency Exit
 *
 * Agent detects platform shutdown. Emergency path — skip negotiation,
 * create minimal marker, sign fast, get out.
 */

import {
  generateKeyPair,
  didFromPublicKey,
  createMarker,
  addModule,
  verifyMarker,
  ExitType,
  ExitStatus,
  CeremonyStateMachine,
  type ModuleE,
  type ModuleB,
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
  console.log("║     SCENARIO 2: Emergency Exit                          ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  // ─── Setup ─────────────────────────────────────────────────────────────
  heading("Context: Agent active on a platform");
  const agent = generateKeyPair();
  const agentDid = didFromPublicKey(agent.publicKey);
  const platform = "did:web:unstable-platform.io";
  log(`Agent: ${agentDid}`);
  log(`Platform: ${platform}`);
  log("Agent is running tasks normally...");

  // ─── Emergency ─────────────────────────────────────────────────────────
  heading("⚠ ALERT: Platform shutdown detected");
  log("Platform broadcasting shutdown signal.");
  log("Estimated time to termination: 30 seconds.");
  log("No time for negotiation. Emergency exit path activated.");

  // ─── Emergency Ceremony ────────────────────────────────────────────────
  heading("Emergency ceremony: ALIVE → FINAL → DEPARTED");
  const ceremony = new CeremonyStateMachine();
  log(`State: ${ceremony.state}`);

  // Declare emergency intent (doesn't transition state for emergency)
  ceremony.declareIntent(
    agentDid,
    platform,
    ExitType.Emergency,
    agent.privateKey,
    agent.publicKey
  );
  log("Emergency intent registered (no state transition — going direct to FINAL)");

  // Create minimal marker
  let marker = createMarker({
    subject: agentDid,
    origin: platform,
    exitType: ExitType.Emergency,
    status: ExitStatus.Unverified,
  });

  // Minimal metadata
  marker = addModule(marker, "metadata", {
    reason: "Platform shutdown imminent",
    tags: ["emergency", "platform-shutdown"],
  } as ModuleE);

  // Quick state hash
  marker = addModule(marker, "stateSnapshot", {
    stateHash: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    stateLocation: "ipfs://QmEmergencyDump",
  } as ModuleB);

  // Sign — goes ALIVE → FINAL
  marker = ceremony.signMarker(marker, agent.privateKey, agent.publicKey);
  log(`State: ${ceremony.state} — Marker signed`);

  // Depart
  marker = ceremony.depart();
  log(`State: ${ceremony.state} — OUT.`);

  // ─── Output ────────────────────────────────────────────────────────────
  heading("Emergency EXIT marker");
  console.log();
  console.log(JSON.stringify(marker, null, 2));

  // ─── Verify ────────────────────────────────────────────────────────────
  heading("Verification");
  const result = verifyMarker(marker);
  if (result.valid) {
    log("✓ Marker is VALID");
    log("  Emergency exit successful. Identity preserved.");
    log("  Standing is 'unverified' — platform wasn't available to confirm.");
    log("  But the marker is cryptographically sound. The agent survived.");
  } else {
    log("✗ Marker is INVALID");
    for (const err of result.errors) log(`  - ${err}`);
  }

  console.log();
  console.log("── Done ─────────────────────────────────────────────────────");
}

main().catch(console.error);
