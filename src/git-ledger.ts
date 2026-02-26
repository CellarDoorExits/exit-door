/**
 * cellar-door-exit — Git Ledger Adapter
 *
 * Append-only ledger backed by a local git repository. Each anchor record
 * is stored as a JSON file in `ledger/{hash}.json` on a dedicated orphan
 * branch, committed with a standardised message format, and optionally
 * pushed to a remote.
 */

import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { createAnchorRecord, type AnchorRecord } from "./anchor.js";
import type { ExitMarker } from "./types.js";

const execFile = promisify(execFileCb);

// ─── Types ───────────────────────────────────────────────────────────────────

/** Configuration for the git-backed ledger. */
export interface GitLedgerConfig {
  /** Absolute or relative path to the git repository. */
  repoPath: string;
  /** Branch name for ledger entries. @default 'exit-ledger' */
  branch?: string;
  /** Remote name for push operations. @default 'origin' */
  remoteName?: string;
  /** Whether to automatically push after each commit. @default false */
  autoPush?: boolean;
}

/** A single entry in the ledger. */
export interface LedgerEntry {
  hash: string;
  timestamp: string;
  filePath: string;
  commitHash?: string;
}

/** Full content persisted in each ledger JSON file. */
interface LedgerFileContent extends AnchorRecord {
  committedAt: string;
  commitHash?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function branch(config: GitLedgerConfig): string {
  return config.branch ?? "exit-ledger";
}

function remote(config: GitLedgerConfig): string {
  return config.remoteName ?? "origin";
}

/**
 * Run a git command inside the configured repo.
 */
async function git(config: GitLedgerConfig, ...args: string[]): Promise<string> {
  const { stdout } = await execFile("git", ["-C", config.repoPath, ...args]);
  return stdout.trim();
}

/**
 * Check whether a branch exists locally.
 */
async function branchExists(config: GitLedgerConfig): Promise<boolean> {
  try {
    await git(config, "rev-parse", "--verify", branch(config));
    return true;
  } catch {
    return false;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Initialise the git ledger. Creates the repo (if needed), the orphan branch,
 * and the `ledger/` directory with an initial commit.
 *
 * @param config - Ledger configuration.
 *
 * @example
 * ```ts
 * await initLedger({ repoPath: "/tmp/my-ledger" });
 * ```
 */
export async function initLedger(config: GitLedgerConfig): Promise<void> {
  // Ensure the repo directory exists.
  await mkdir(config.repoPath, { recursive: true });

  // Initialise git repo if not already one.
  try {
    await git(config, "rev-parse", "--git-dir");
  } catch {
    await execFile("git", ["init", config.repoPath]);
  }

  // Configure committer identity for the repo (avoids failures in CI / bare envs).
  try {
    await git(config, "config", "user.email");
  } catch {
    await git(config, "config", "user.email", "exit-ledger@cellar-door.local");
    await git(config, "config", "user.name", "EXIT Ledger");
  }

  if (await branchExists(config)) {
    return; // Already initialised.
  }

  // Create an orphan branch with a single root commit.
  await git(config, "checkout", "--orphan", branch(config));

  // Remove any staged files that may have been inherited.
  try {
    await git(config, "rm", "-rf", "--cached", ".");
  } catch {
    // Ignore — nothing staged.
  }

  const ledgerDir = join(config.repoPath, "ledger");
  await mkdir(ledgerDir, { recursive: true });
  await writeFile(join(ledgerDir, ".gitkeep"), "");
  await git(config, "add", "ledger/.gitkeep");
  await git(config, "commit", "-m", "exit-ledger: init");
}

/**
 * Anchor an EXIT marker into the git ledger.
 *
 * Creates a JSON file at `ledger/{hash}.json`, commits it, and optionally
 * pushes to the configured remote.
 *
 * @param marker - The EXIT marker to anchor.
 * @param config - Ledger configuration.
 * @returns The resulting ledger entry (including commit hash).
 *
 * @example
 * ```ts
 * const entry = await anchorToGit(marker, { repoPath: "/tmp/my-ledger" });
 * console.log(entry.commitHash);
 * ```
 */
export async function anchorToGit(marker: ExitMarker, config: GitLedgerConfig): Promise<LedgerEntry> {
  // Ensure we're on the correct branch.
  await git(config, "checkout", branch(config));

  const record = createAnchorRecord(marker);
  const filePath = join("ledger", `${record.hash}.json`);
  const absPath = join(config.repoPath, filePath);

  const committedAt = new Date().toISOString();
  const content: LedgerFileContent = {
    ...record,
    committedAt,
  };

  await mkdir(join(config.repoPath, "ledger"), { recursive: true });
  await writeFile(absPath, JSON.stringify(content, null, 2) + "\n");
  await git(config, "add", filePath);
  await git(config, "commit", "-m", `exit-ledger: anchor ${record.hash.slice(0, 12)}`);

  const commitHash = await git(config, "rev-parse", "HEAD");

  // Patch the file with the commit hash for completeness.
  content.commitHash = commitHash;
  await writeFile(absPath, JSON.stringify(content, null, 2) + "\n");
  await git(config, "add", filePath);
  await git(config, "commit", "--amend", "--no-edit");

  if (config.autoPush) {
    await git(config, "push", remote(config), branch(config));
  }

  return {
    hash: record.hash,
    timestamp: record.timestamp,
    filePath,
    commitHash,
  };
}

/**
 * Verify that a ledger entry exists and its file is intact.
 *
 * @param hash - The anchor hash to look up.
 * @param config - Ledger configuration.
 * @returns `true` if the entry exists and its stored hash matches.
 *
 * @example
 * ```ts
 * const ok = await verifyLedgerEntry(entry.hash, config);
 * ```
 */
export async function verifyLedgerEntry(hash: string, config: GitLedgerConfig): Promise<boolean> {
  const absPath = join(config.repoPath, "ledger", `${hash}.json`);
  try {
    const raw = await readFile(absPath, "utf-8");
    const data = JSON.parse(raw) as LedgerFileContent;
    return data.hash === hash;
  } catch {
    return false;
  }
}

/**
 * List all ledger entries currently on disk.
 *
 * @param config - Ledger configuration.
 * @returns Array of ledger entries.
 *
 * @example
 * ```ts
 * const entries = await listLedgerEntries(config);
 * ```
 */
export async function listLedgerEntries(config: GitLedgerConfig): Promise<LedgerEntry[]> {
  const ledgerDir = join(config.repoPath, "ledger");
  let files: string[];
  try {
    files = await readdir(ledgerDir);
  } catch {
    return [];
  }

  const entries: LedgerEntry[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(join(ledgerDir, file), "utf-8");
      const data = JSON.parse(raw) as LedgerFileContent;
      entries.push({
        hash: data.hash,
        timestamp: data.timestamp,
        filePath: join("ledger", file),
        commitHash: data.commitHash,
      });
    } catch {
      // Skip corrupt files.
    }
  }

  return entries;
}
