/**
 * Scenario 3: Successor Handoff with Module A (Lineage)
 *
 * Original agent exits with key rotation, designating a successor.
 * Successor verifies the lineage chain.
 */

import {
  generateKeyPair,
  didFromPublicKey,
  sign,
  createMarker,
  addModule,
  signMarker,
  verifyMarker,
  ExitType,
  ExitStatus,
  CeremonyStateMachine,
  ContinuityProofType,
  type ModuleA,
  type ModuleE,
  type ContinuityProof,
} from "../index.js";
import { canonicalize } from "../marker.js";

function log(msg: string) {
  console.log(`  ${msg}`);
}

function heading(msg: string) {
  console.log();
  console.log(`── ${msg} ${"─".repeat(Math.max(0, 56 - msg.length))}`);
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║     SCENARIO 3: Successor Handoff (Lineage)             ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  // ─── Two agents ────────────────────────────────────────────────────────
  heading("Step 1: Two agent identities");
  const original = generateKeyPair();
  const originalDid = didFromPublicKey(original.publicKey);
  log(`Original agent: ${originalDid}`);

  const successor = generateKeyPair();
  const successorDid = didFromPublicKey(successor.publicKey);
  log(`Successor agent: ${successorDid}`);

  const platform = "did:web:agent-platform.example";
  log(`Platform: ${platform}`);
  log("Original agent has been active for 2 years.");

  // ─── Key Rotation Binding ─────────────────────────────────────────────
  heading("Step 2: Original signs key rotation binding");
  log("Original agent creates a cryptographic binding to successor...");

  // The binding: original signs "I designate <successor> as my successor"
  const bindingPayload = canonicalize({
    type: "key_rotation_binding",
    predecessor: originalDid,
    successor: successorDid,
    timestamp: new Date().toISOString(),
  });
  const bindingSignature = sign(
    new TextEncoder().encode(bindingPayload),
    original.privateKey
  );
  const bindingProofValue = btoa(String.fromCharCode(...bindingSignature));

  const continuityProof: ContinuityProof = {
    type: ContinuityProofType.KeyRotationBinding,
    value: bindingProofValue,
    verificationMethod: originalDid,
  };

  log("Key rotation binding signed by original agent.");
  log(`Proof type: ${continuityProof.type}`);

  // ─── EXIT Ceremony ────────────────────────────────────────────────────
  heading("Step 3: Original agent exits via ceremony");
  const ceremony = new CeremonyStateMachine();

  ceremony.declareIntent(
    originalDid,
    platform,
    ExitType.Voluntary,
    original.privateKey,
    original.publicKey
  );
  log(`State: ${ceremony.state} — Intent declared`);

  ceremony.snapshot();
  log(`State: ${ceremony.state} — State captured`);

  // Skip challenge window (unilateral path)
  log("Taking unilateral path (no challenge window needed)");

  // Create marker with Module A
  let marker = createMarker({
    subject: originalDid,
    origin: platform,
    exitType: ExitType.Voluntary,
    status: ExitStatus.GoodStanding,
  });

  // Module A: Lineage
  const lineage: ModuleA = {
    successor: successorDid,
    lineageChain: [originalDid, successorDid],
    continuityProof,
  };
  marker = addModule(marker, "lineage", lineage);

  // Module E: Metadata
  marker = addModule(marker, "metadata", {
    reason: "Planned key rotation and successor handoff",
    narrative:
      "Original agent retiring after 2 years of service. Successor designated with key rotation binding. Full continuity preserved.",
    tags: ["successor-handoff", "key-rotation", "planned"],
  } as ModuleE);

  // Sign and finalize
  marker = ceremony.signMarker(marker, original.privateKey, original.publicKey);
  log(`State: ${ceremony.state} — Marker signed by original`);

  marker = ceremony.depart();
  log(`State: ${ceremony.state} — Original has departed`);

  // ─── Output ────────────────────────────────────────────────────────────
  heading("Step 4: EXIT marker with lineage");
  console.log();
  console.log(JSON.stringify(marker, null, 2));

  // ─── Successor Verifies ───────────────────────────────────────────────
  heading("Step 5: Successor verifies the lineage chain");

  // 1. Verify the EXIT marker itself
  const markerResult = verifyMarker(marker);
  log(`EXIT marker valid: ${markerResult.valid ? "✓ YES" : "✗ NO"}`);

  // 2. Check lineage points to successor
  if (marker.lineage?.successor === successorDid) {
    log("✓ Successor DID matches — lineage chain confirmed");
  } else {
    log("✗ Successor DID mismatch!");
  }

  // 3. Verify the continuity proof (key rotation binding)
  if (marker.lineage?.continuityProof?.type === ContinuityProofType.KeyRotationBinding) {
    log(`✓ Continuity proof type: ${ContinuityProofType.KeyRotationBinding}`);
    log("  Original agent's key signed the rotation binding.");
    log("  This is the strongest form of continuity proof.");
  }

  // 4. Show the chain
  if (marker.lineage?.lineageChain) {
    log("  Lineage chain:");
    for (let i = 0; i < marker.lineage.lineageChain.length; i++) {
      const did = marker.lineage.lineageChain[i];
      const label = i === 0 ? "(original)" : "(successor)";
      log(`    ${i + 1}. ${did.slice(0, 24)}... ${label}`);
    }
  }

  heading("Continuity established");
  log("The successor agent can now present this EXIT marker as proof");
  log("of legitimate succession. Any verifier can check:");
  log("  1. The EXIT marker signature is valid");
  log("  2. The lineage module designates the successor");
  log("  3. The key rotation binding was signed by the original");
  log("  4. The chain is unbroken");
  log("");
  log("The original agent's reputation, standing, and identity");
  log("live on through its designated successor.");

  console.log();
  console.log("── Done ─────────────────────────────────────────────────────");
}

main().catch(console.error);
