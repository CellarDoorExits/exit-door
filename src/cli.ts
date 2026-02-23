#!/usr/bin/env node
/**
 * cellar-door-exit — CLI
 *
 * Verifiable EXIT markers for agents. Create, sign, verify, inspect,
 * anchor, store, list, and redact EXIT markers from the command line.
 */

import { Command, InvalidArgumentError } from "commander";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import {
  createMarker,
  signMarker,
  verifyMarker,
  generateKeyPair,
  didFromPublicKey,
  addModule,
  ExitType,
  ExitStatus,
  CeremonyState,
  computeAnchorHash,
  createAnchorRecord,
  saveMarker as storageSave,
  loadMarker as storageLoad,
  listMarkers as storageList,
  redactMarker,
  type ExitMarker,
  type ModuleE,
} from "./index.js";

// ─── Exit Codes ──────────────────────────────────────────────────────────────

const EXIT_SUCCESS = 0;
const EXIT_VALIDATION_ERROR = 1;
const EXIT_FILE_ERROR = 2;
const EXIT_PARSE_ERROR = 3;
const EXIT_CRYPTO_ERROR = 4;
const EXIT_STORAGE_ERROR = 5;
const EXIT_ARG_ERROR = 6;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHexOrBase64(s: string): Uint8Array {
  if (/^[0-9a-fA-F]+$/.test(s)) {
    const bytes = new Uint8Array(s.length / 2);
    for (let i = 0; i < s.length; i += 2) bytes[i / 2] = parseInt(s.slice(i, i + 2), 16);
    return bytes;
  }
  try {
    return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  } catch {
    throw new Error(`Key data is neither valid hex nor base64. Got: "${s.slice(0, 20)}..."`);
  }
}

function parseExitType(s: string): ExitType {
  const map: Record<string, ExitType> = {
    voluntary: ExitType.Voluntary,
    forced: ExitType.Forced,
    emergency: ExitType.Emergency,
  };
  if (!map[s]) {
    throw new InvalidArgumentError(
      `Invalid exit type "${s}". Valid types: voluntary, forced, emergency`
    );
  }
  return map[s];
}

function parseExitStatus(s: string): ExitStatus {
  const map: Record<string, ExitStatus> = {
    good_standing: ExitStatus.GoodStanding,
    disputed: ExitStatus.Disputed,
    unverified: ExitStatus.Unverified,
  };
  if (!map[s]) {
    throw new InvalidArgumentError(
      `Invalid status "${s}". Valid statuses: good_standing, disputed, unverified`
    );
  }
  return map[s];
}

/**
 * Read and parse a JSON marker file, with user-friendly errors.
 */
function readMarkerFile(file: string, context: string): ExitMarker {
  let raw: string;
  try {
    if (!existsSync(file)) {
      error(
        `File not found: ${file}`,
        `Attempted to ${context}, but the file does not exist.`,
        [
          `Check that the path is correct`,
          `Use an absolute path or a path relative to the current directory`,
          `Run 'exit list' to see stored markers`,
        ],
        EXIT_FILE_ERROR
      );
    }
    raw = readFileSync(file, "utf-8");
  } catch (e: any) {
    if (e.exitCode) throw e; // re-throw our own errors
    error(
      `Cannot read file: ${file}`,
      `Attempted to ${context}, but the file could not be read.`,
      [
        `Check file permissions (current user needs read access)`,
        `Ensure the file is not locked by another process`,
        e.message ? `System error: ${e.message}` : null,
      ].filter(Boolean) as string[],
      EXIT_FILE_ERROR
    );
  }

  try {
    return JSON.parse(raw!) as ExitMarker;
  } catch (e: any) {
    error(
      `Invalid JSON in file: ${file}`,
      `Attempted to ${context}, but the file does not contain valid JSON.`,
      [
        `Ensure the file contains a valid EXIT marker in JSON format`,
        `Check for trailing commas, unquoted keys, or truncated content`,
        `You can create a new marker with: exit create --origin <uri>`,
        e.message ? `Parse error: ${e.message}` : null,
      ].filter(Boolean) as string[],
      EXIT_PARSE_ERROR
    );
  }

  // Unreachable, but TypeScript needs it
  return null as never;
}

/**
 * Read a private key file with user-friendly errors.
 */
function readKeyFile(keyPath: string): Uint8Array {
  let raw: string;
  try {
    if (!existsSync(keyPath)) {
      error(
        `Key file not found: ${keyPath}`,
        `Attempted to read a private key, but the file does not exist.`,
        [
          `Check the path to your key file`,
          `Generate a new keypair with: exit keygen`,
          `Save the privateKey field to a file and reference it with --key`,
        ],
        EXIT_FILE_ERROR
      );
    }
    raw = readFileSync(keyPath, "utf-8").trim();
  } catch (e: any) {
    if (e.exitCode) throw e;
    error(
      `Cannot read key file: ${keyPath}`,
      `The key file exists but could not be read.`,
      [
        `Check file permissions`,
        e.message ? `System error: ${e.message}` : null,
      ].filter(Boolean) as string[],
      EXIT_FILE_ERROR
    );
    return null as never;
  }

  try {
    return fromHexOrBase64(raw);
  } catch (e: any) {
    error(
      `Invalid key format in: ${keyPath}`,
      `The key file was read but its contents are not valid hex or base64.`,
      [
        `Key files should contain a single line of hex (64 chars for Ed25519) or base64`,
        `Generate a valid keypair with: exit keygen`,
        e.message ? `Detail: ${e.message}` : null,
      ].filter(Boolean) as string[],
      EXIT_CRYPTO_ERROR
    );
    return null as never;
  }
}

/**
 * Print a structured error message and exit.
 */
function error(title: string, context: string, suggestions: string[], exitCode: number): never {
  console.error();
  console.error(`  ✗ Error: ${title}`);
  console.error();
  console.error(`  ${context}`);
  console.error();
  if (suggestions.length > 0) {
    console.error(`  Suggestions:`);
    for (const s of suggestions) {
      console.error(`    → ${s}`);
    }
    console.error();
  }
  const err = new Error(title) as Error & { exitCode: number };
  err.exitCode = exitCode;
  throw err;
}

/**
 * Wrap a command action with top-level error handling.
 */
function withErrorHandling(fn: (...args: any[]) => void): (...args: any[]) => void {
  return (...args: any[]) => {
    try {
      fn(...args);
    } catch (e: any) {
      if (e.exitCode !== undefined) {
        process.exit(e.exitCode);
      }
      // Unexpected errors
      console.error();
      console.error(`  ✗ Unexpected error: ${e.message || e}`);
      console.error();
      console.error(`  This may be a bug in cellar-door-exit.`);
      console.error(`  Please report it with the full error output.`);
      if (e.stack) {
        console.error();
        console.error(`  Stack trace:`);
        console.error(`  ${e.stack}`);
      }
      console.error();
      process.exit(1);
    }
  };
}

// ─── Program ─────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name("exit")
  .description(
    "cellar-door-exit — Verifiable EXIT markers for agents.\n\n" +
    "Create, sign, verify, inspect, anchor, store, and manage EXIT markers\n" +
    "that provide authenticated declarations of departure with continuity\n" +
    "preservation across contexts."
  )
  .version("0.1.0")
  .addHelpText("after", `
Examples:
  $ exit keygen                                    Generate a new Ed25519 keypair
  $ exit create --origin example.com --sign        Create and sign a marker
  $ exit verify marker.json                        Verify a marker file
  $ exit inspect marker.json                       Human-readable marker display
  $ exit store marker.json                         Save marker to local storage
  $ exit list                                      List stored markers
  $ exit anchor marker.json                        Compute anchor hash
  $ exit redact marker.json --fields subject       Redact fields from a marker

Documentation: https://cellar-door.org/exit/v1
`);

// ─── exit create ─────────────────────────────────────────────────────────────

program
  .command("create")
  .description("Create a new EXIT marker.")
  .requiredOption("--origin <uri>", "Origin URI — the system/context being exited")
  .option("--subject <did>", "Subject DID (who is exiting). Generates a keypair if omitted")
  .option("--type <type>", "Exit type: voluntary, forced, emergency (default: voluntary)", "voluntary")
  .option("--status <status>", "Standing: good_standing, disputed, unverified (default: good_standing)", "good_standing")
  .option("--reason <text>", "Human-readable reason for departure")
  .option("--sign", "Sign the marker (uses --key if provided, otherwise generates a keypair)")
  .option("--key <path>", "Path to private key file (hex or base64 encoded)")
  .option("--show-keys", "Print generated private key material (DANGER: do not use in production logs)")
  .addHelpText("after", `
Examples:
  $ exit create --origin example.com
    Create an unsigned marker with a generated DID

  $ exit create --origin example.com --sign
    Create and sign a marker with a generated keypair

  $ exit create --origin example.com --sign --key ./my.key --subject did:key:z6Mk...
    Create and sign with an existing key

  $ exit create --origin example.com --type emergency --reason "System shutting down"
    Create an emergency exit marker with a reason

  $ exit create --origin example.com --status disputed --reason "Banned unfairly"
    Create a marker with disputed standing
`)
  .action(withErrorHandling(async (opts) => {
    let privateKey: Uint8Array | undefined;
    let publicKey: Uint8Array | undefined;
    let subject = opts.subject;

    // Resolve keys
    if (opts.key) {
      privateKey = readKeyFile(opts.key);

      try {
        const ed = await import("@noble/ed25519");
        publicKey = ed.getPublicKey(privateKey);
      } catch (e: any) {
        error(
          `Failed to derive public key from private key`,
          `The private key in "${opts.key}" could not be used to derive a public key.`,
          [
            `Ensure the key file contains a valid 32-byte Ed25519 private key`,
            `Generate a new keypair with: exit keygen`,
            e.message ? `Crypto error: ${e.message}` : null,
          ].filter(Boolean) as string[],
          EXIT_CRYPTO_ERROR
        );
      }

      if (!subject) subject = didFromPublicKey(publicKey!);
    } else if (opts.sign || !subject) {
      const kp = generateKeyPair();
      privateKey = kp.privateKey;
      publicKey = kp.publicKey;
      if (!subject) subject = didFromPublicKey(publicKey);
      // Print generated key info to stderr (private key only if --show-keys)
      const keypairInfo: Record<string, string> = {
        did: didFromPublicKey(publicKey),
        publicKey: toHex(publicKey),
      };
      if (opts.showKeys) {
        keypairInfo.privateKey = toHex(privateKey);
      } else {
        keypairInfo.privateKey = "[REDACTED — use --show-keys to display]";
      }
      process.stderr.write(
        JSON.stringify({ _generated_keypair: keypairInfo }) + "\n"
      );
    }

    const exitType = parseExitType(opts.type);
    const status = parseExitStatus(opts.status);

    let marker: ExitMarker;
    try {
      marker = createMarker({ subject, origin: opts.origin, exitType, status });
    } catch (e: any) {
      error(
        `Failed to create EXIT marker`,
        `The marker could not be created with the provided parameters.`,
        [
          `Check that --origin is a valid URI`,
          `Check that --subject (if provided) is a valid DID`,
          e.message ? `Detail: ${e.message}` : null,
        ].filter(Boolean) as string[],
        EXIT_VALIDATION_ERROR
      );
      return;
    }

    if (opts.reason) {
      const meta: ModuleE = { reason: opts.reason };
      marker = addModule(marker, "metadata", meta);
    }

    if (opts.sign && privateKey && publicKey) {
      try {
        marker = signMarker(marker, privateKey, publicKey);
      } catch (e: any) {
        error(
          `Failed to sign EXIT marker`,
          `The marker was created but signing failed.`,
          [
            `Ensure the private key is a valid 32-byte Ed25519 key`,
            `If using --key, verify the file contains the correct key`,
            e.message ? `Signing error: ${e.message}` : null,
          ].filter(Boolean) as string[],
          EXIT_CRYPTO_ERROR
        );
      }
    }

    process.stdout.write(JSON.stringify(marker!, null, 2) + "\n");
  }));

// ─── exit verify ─────────────────────────────────────────────────────────────

program
  .command("verify <file>")
  .description("Verify an EXIT marker from a JSON file.")
  .addHelpText("after", `
Examples:
  $ exit verify marker.json
    Verify a marker and display the result

  $ exit verify ./exit-markers/abc123.json
    Verify a specific stored marker

Exit codes:
  0  Marker is valid
  1  Marker is invalid (verification failed)
  2  File not found or unreadable
  3  File is not valid JSON
`)
  .action(withErrorHandling((file) => {
    const marker = readMarkerFile(file, "verify the EXIT marker");
    let result: { valid: boolean; errors: string[] };

    try {
      result = verifyMarker(marker);
    } catch (e: any) {
      error(
        `Verification error`,
        `An error occurred while verifying the marker in "${file}".`,
        [
          `The file may contain a malformed or incomplete marker`,
          `Ensure all required fields are present (id, subject, origin, timestamp, exitType, status, proof)`,
          e.message ? `Detail: ${e.message}` : null,
        ].filter(Boolean) as string[],
        EXIT_VALIDATION_ERROR
      );
      return;
    }

    if (result.valid) {
      console.log("✓ VALID");
      console.log(`  Subject: ${marker.subject}`);
      console.log(`  Origin:  ${marker.origin}`);
      console.log(`  Type:    ${marker.exitType}`);
      console.log(`  Status:  ${marker.status}`);
    } else {
      console.log("✗ INVALID");
      console.log();
      for (const err of result.errors) {
        console.log(`  ✗ ${err}`);
      }
      console.log();
      console.log("  Suggestions:");
      console.log("    → Ensure the marker was signed with the correct key");
      console.log("    → Check that no fields were modified after signing");
      console.log("    → Re-create and re-sign the marker if needed: exit create --origin <uri> --sign");
      process.exit(EXIT_VALIDATION_ERROR);
    }
  }));

// ─── exit inspect ────────────────────────────────────────────────────────────

program
  .command("inspect <file>")
  .description("Human-readable display of an EXIT marker.")
  .addHelpText("after", `
Examples:
  $ exit inspect marker.json
    Display a formatted view of the marker with all modules

  $ exit inspect ./exit-markers/abc123.json
    Inspect a specific stored marker
`)
  .action(withErrorHandling((file) => {
    const marker = readMarkerFile(file, "inspect the EXIT marker");

    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log("║                    EXIT MARKER                          ║");
    console.log("╚══════════════════════════════════════════════════════════╝");
    console.log();
    console.log(`  ID:        ${marker.id}`);
    console.log(`  Subject:   ${marker.subject}`);
    console.log(`  Origin:    ${marker.origin}`);
    console.log(`  Timestamp: ${marker.timestamp}`);
    console.log(`  Type:      ${marker.exitType}`);
    console.log(`  Status:    ${marker.status}`);
    console.log();

    // Proof
    console.log("  ── Proof ──");
    console.log(`  Algorithm:    ${marker.proof.type}`);
    console.log(`  Created:      ${marker.proof.created}`);
    console.log(`  Verification: ${marker.proof.verificationMethod}`);
    console.log(`  Signature:    ${marker.proof.proofValue ? marker.proof.proofValue.slice(0, 32) + "..." : "(unsigned)"}`);
    console.log();

    // Modules
    if (marker.lineage) {
      console.log("  ── Module A: Lineage ──");
      if (marker.lineage.predecessor) console.log(`  Predecessor: ${marker.lineage.predecessor}`);
      if (marker.lineage.successor) console.log(`  Successor:   ${marker.lineage.successor}`);
      if (marker.lineage.lineageChain) console.log(`  Chain:       ${marker.lineage.lineageChain.join(" → ")}`);
      if (marker.lineage.continuityProof) console.log(`  Proof type:  ${marker.lineage.continuityProof.type}`);
      console.log();
    }

    if (marker.stateSnapshot) {
      console.log("  ── Module B: State Snapshot ──");
      console.log(`  Hash:     ${marker.stateSnapshot.stateHash}`);
      if (marker.stateSnapshot.stateLocation) console.log(`  Location: ${marker.stateSnapshot.stateLocation}`);
      console.log();
    }

    if (marker.dispute) {
      console.log("  ── Module C: Dispute ──");
      if (marker.dispute.disputes) console.log(`  Active disputes: ${marker.dispute.disputes.length}`);
      if (marker.dispute.challengeWindow) {
        console.log(`  Challenge: ${marker.dispute.challengeWindow.opens} → ${marker.dispute.challengeWindow.closes}`);
      }
      console.log();
    }

    if (marker.economic) {
      console.log("  ── Module D: Economic ──");
      if (marker.economic.assetManifest) console.log(`  Assets: ${marker.economic.assetManifest.length}`);
      if (marker.economic.exitFee) console.log(`  Exit fee: ${marker.economic.exitFee.amount}`);
      console.log();
    }

    if (marker.metadata) {
      console.log("  ── Module E: Metadata ──");
      if (marker.metadata.reason) console.log(`  Reason:    ${marker.metadata.reason}`);
      if (marker.metadata.narrative) console.log(`  Narrative: ${marker.metadata.narrative}`);
      if (marker.metadata.tags) console.log(`  Tags:      ${marker.metadata.tags.join(", ")}`);
      console.log();
    }

    if (marker.crossDomain) {
      console.log("  ── Module F: Cross-Domain ──");
      if (marker.crossDomain.anchors) {
        for (const a of marker.crossDomain.anchors) {
          console.log(`  ${a.chain}: ${a.txHash}`);
        }
      }
      console.log();
    }

    // Verification
    let result: { valid: boolean; errors: string[] };
    try {
      result = verifyMarker(marker);
    } catch {
      console.log("  Verification: ⚠ Could not verify (marker may be malformed)");
      return;
    }
    console.log(`  Verification: ${result.valid ? "✓ VALID" : "✗ INVALID"}`);
    if (!result.valid) {
      for (const err of result.errors) console.log(`    - ${err}`);
    }
  }));

// ─── exit keygen ─────────────────────────────────────────────────────────────

program
  .command("keygen")
  .description("Generate a new Ed25519 keypair for signing EXIT markers.")
  .addHelpText("after", `
Examples:
  $ exit keygen
    Print a new keypair as JSON (did, publicKey, privateKey)

  $ exit keygen > keypair.json
    Save the keypair to a file

  $ exit keygen | jq -r .privateKey > my.key
    Extract just the private key for use with --key

Security:
  The private key is printed to stdout. Store it securely and never share it.
  Anyone with the private key can sign EXIT markers as your identity.
`)
  .option("--show-keys", "Print private key to stdout (DANGER: do not use in production logs)")
  .action(withErrorHandling((opts) => {
    const kp = generateKeyPair();
    const did = didFromPublicKey(kp.publicKey);
    if (opts.showKeys) {
      console.log(
        JSON.stringify(
          {
            did,
            publicKey: toHex(kp.publicKey),
            privateKey: toHex(kp.privateKey),
          },
          null,
          2
        )
      );
    } else {
      // Write private key to file with restrictive permissions
      const keyFileName = `${did.replace(/[^a-zA-Z0-9]/g, "_")}.key`;
      writeFileSync(keyFileName, toHex(kp.privateKey), { mode: 0o600 });
      console.log(
        JSON.stringify(
          {
            did,
            publicKey: toHex(kp.publicKey),
            privateKeyFile: keyFileName,
            privateKey: "[REDACTED — saved to file. Use --show-keys to print to stdout instead]",
          },
          null,
          2
        )
      );
      process.stderr.write(`⚠ Private key written to ${keyFileName} (mode 0600)\n`);
    }
  }));

// ─── exit anchor ─────────────────────────────────────────────────────────────

program
  .command("anchor <file>")
  .description("Compute and display the anchor hash for a marker (for cross-domain anchoring).")
  .addHelpText("after", `
Examples:
  $ exit anchor marker.json
    Compute the anchor record (hash + metadata) for on-chain anchoring

  $ exit anchor marker.json > anchor.json
    Save the anchor record for submission to a blockchain or registry
`)
  .action(withErrorHandling((file) => {
    const marker = readMarkerFile(file, "compute the anchor hash");
    try {
      const record = createAnchorRecord(marker);
      console.log(JSON.stringify(record, null, 2));
    } catch (e: any) {
      error(
        `Failed to compute anchor hash`,
        `The anchor hash could not be computed for the marker in "${file}".`,
        [
          `Ensure the marker is complete and well-formed`,
          `Try verifying the marker first: exit verify ${file}`,
          e.message ? `Detail: ${e.message}` : null,
        ].filter(Boolean) as string[],
        EXIT_VALIDATION_ERROR
      );
    }
  }));

// ─── exit store ──────────────────────────────────────────────────────────────

program
  .command("store <file>")
  .description("Save a marker to local file-based storage.")
  .option("--dir <path>", "Storage directory (default: ./exit-markers)", "./exit-markers")
  .addHelpText("after", `
Examples:
  $ exit store marker.json
    Save to ./exit-markers/

  $ exit store marker.json --dir /var/lib/exit-markers
    Save to a custom directory

  $ exit list --dir /var/lib/exit-markers
    List markers in the custom directory
`)
  .action(withErrorHandling((file, opts) => {
    const marker = readMarkerFile(file, "store the EXIT marker");
    try {
      const path = storageSave(marker, opts.dir);
      console.log(`Saved to ${path}`);
    } catch (e: any) {
      error(
        `Failed to save marker`,
        `The marker from "${file}" could not be saved to "${opts.dir}".`,
        [
          `Check that you have write permissions to the directory`,
          `Ensure the directory path is valid`,
          `Try creating the directory manually: mkdir -p ${opts.dir}`,
          e.message ? `Storage error: ${e.message}` : null,
        ].filter(Boolean) as string[],
        EXIT_STORAGE_ERROR
      );
    }
  }));

// ─── exit list ───────────────────────────────────────────────────────────────

program
  .command("list")
  .description("List stored EXIT markers.")
  .option("--dir <path>", "Storage directory (default: ./exit-markers)", "./exit-markers")
  .addHelpText("after", `
Examples:
  $ exit list
    List all markers in ./exit-markers/

  $ exit list --dir /var/lib/exit-markers
    List markers in a custom directory
`)
  .action(withErrorHandling((opts) => {
    let ids: string[];
    try {
      ids = storageList(opts.dir);
    } catch (e: any) {
      if (!existsSync(opts.dir)) {
        console.log(`No markers found. Storage directory does not exist: ${opts.dir}`);
        console.log();
        console.log(`  To create your first marker:`);
        console.log(`    $ exit create --origin example.com --sign > marker.json`);
        console.log(`    $ exit store marker.json --dir ${opts.dir}`);
        return;
      }
      error(
        `Failed to list markers`,
        `Could not read the storage directory "${opts.dir}".`,
        [
          `Check that you have read permissions on the directory`,
          e.message ? `System error: ${e.message}` : null,
        ].filter(Boolean) as string[],
        EXIT_STORAGE_ERROR
      );
      return;
    }

    if (ids.length === 0) {
      console.log("No markers found.");
      console.log();
      console.log("  To create and store a marker:");
      console.log("    $ exit create --origin example.com --sign > marker.json");
      console.log(`    $ exit store marker.json --dir ${opts.dir}`);
    } else {
      for (const id of ids) console.log(id);
    }
  }));

// ─── exit redact ─────────────────────────────────────────────────────────────

program
  .command("redact <file>")
  .description("Create a privacy-preserving redacted version of a marker.")
  .requiredOption("--fields <fields>", "Comma-separated list of fields to redact (e.g., subject,origin)")
  .addHelpText("after", `
Examples:
  $ exit redact marker.json --fields subject
    Redact the subject field (replace with hash)

  $ exit redact marker.json --fields subject,origin,metadata
    Redact multiple fields

  $ exit redact marker.json --fields subject > redacted.json
    Save the redacted marker to a new file

Redactable fields:
  subject, origin, metadata, lineage, stateSnapshot, dispute, economic, crossDomain
`)
  .action(withErrorHandling((file, opts) => {
    const marker = readMarkerFile(file, "redact the EXIT marker");
    const fields = (opts.fields as string).split(",").map((f: string) => f.trim()).filter(Boolean);

    if (fields.length === 0) {
      error(
        `No fields specified for redaction`,
        `The --fields option was provided but no valid field names were found.`,
        [
          `Provide a comma-separated list of fields: --fields subject,origin`,
          `Redactable fields: subject, origin, metadata, lineage, stateSnapshot, dispute, economic, crossDomain`,
        ],
        EXIT_ARG_ERROR
      );
    }

    try {
      const redacted = redactMarker(marker, fields);
      process.stdout.write(JSON.stringify(redacted, null, 2) + "\n");
    } catch (e: any) {
      error(
        `Redaction failed`,
        `Could not redact the specified fields from the marker in "${file}".`,
        [
          `Check that the field names are valid: ${fields.join(", ")}`,
          `Redactable fields: subject, origin, metadata, lineage, stateSnapshot, dispute, economic, crossDomain`,
          e.message ? `Detail: ${e.message}` : null,
        ].filter(Boolean) as string[],
        EXIT_VALIDATION_ERROR
      );
    }
  }));

// ─── Parse ───────────────────────────────────────────────────────────────────

program.parse();
