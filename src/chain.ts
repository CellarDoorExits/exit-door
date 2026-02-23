/**
 * cellar-door-exit — Abstract Chain Adapter
 *
 * Interface for on-chain anchoring + mock implementations for testing.
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AnchorMetadata {
  [key: string]: unknown;
}

export interface AnchorResult {
  hash: string;
  timestamp: string;
  txId?: string;
}

/** Abstract chain adapter. Implement for any ledger. */
export interface ChainAdapter {
  /** Anchor a hash on-chain with optional metadata. */
  anchor(hash: string, metadata?: AnchorMetadata): Promise<AnchorResult>;
  /** Verify a hash exists on-chain. */
  verify(hash: string): Promise<boolean>;
  /** Get the timestamp when a hash was anchored. */
  getTimestamp(hash: string): Promise<string | null>;
}

// ─── Mock Chain Adapter (in-memory) ──────────────────────────────────────────

/**
 * In-memory mock chain adapter for testing. Stores anchors in a `Map`.
 *
 * @example
 * ```ts
 * const chain = new MockChainAdapter();
 * const result = await chain.anchor("abc123");
 * const exists = await chain.verify("abc123"); // true
 * ```
 */
export class MockChainAdapter implements ChainAdapter {
  private ledger = new Map<string, { timestamp: string; metadata?: AnchorMetadata }>();

  async anchor(hash: string, metadata?: AnchorMetadata): Promise<AnchorResult> {
    const timestamp = new Date().toISOString();
    this.ledger.set(hash, { timestamp, metadata });
    return { hash, timestamp, txId: `mock-tx-${Date.now()}` };
  }

  async verify(hash: string): Promise<boolean> {
    return this.ledger.has(hash);
  }

  async getTimestamp(hash: string): Promise<string | null> {
    const entry = this.ledger.get(hash);
    return entry?.timestamp ?? null;
  }
}

// ─── File Chain Adapter (append-only local file) ─────────────────────────────

interface FileEntry {
  hash: string;
  timestamp: string;
  metadata?: AnchorMetadata;
}

/**
 * Append-only file-based chain adapter. Each anchor is a newline-delimited JSON entry.
 *
 * @example
 * ```ts
 * const chain = new FileChainAdapter("./anchors.jsonl");
 * await chain.anchor(hash, { exitType: "voluntary" });
 * ```
 */
export class FileChainAdapter implements ChainAdapter {
  /**
   * @param filePath - Path to the append-only JSONL file for storing anchors.
   */
  constructor(private filePath: string) {}

  private readEntries(): FileEntry[] {
    if (!existsSync(this.filePath)) return [];
    const raw = readFileSync(this.filePath, "utf-8").trim();
    if (!raw) return [];
    return raw.split("\n").map((line) => JSON.parse(line) as FileEntry);
  }

  async anchor(hash: string, metadata?: AnchorMetadata): Promise<AnchorResult> {
    const timestamp = new Date().toISOString();
    const entry: FileEntry = { hash, timestamp, metadata };
    appendFileSync(this.filePath, JSON.stringify(entry) + "\n", "utf-8");
    return { hash, timestamp };
  }

  async verify(hash: string): Promise<boolean> {
    return this.readEntries().some((e) => e.hash === hash);
  }

  async getTimestamp(hash: string): Promise<string | null> {
    const entry = this.readEntries().find((e) => e.hash === hash);
    return entry?.timestamp ?? null;
  }
}
