/**
 * cellar-door-exit — SQLite Claim Store
 *
 * Persistent storage backend for claims using better-sqlite3.
 * Drop-in replacement for MemoryClaimStore.
 */

import type { ClaimStoreBackend, StoredClaim, ClaimQuery, ClaimStoreStats } from "./claim-store.js";

let Database: any;
try {
  Database = (await import("better-sqlite3")).default;
} catch {
  // better-sqlite3 is an optional peer dependency
}

/**
 * SQLite-backed claim store. Requires `better-sqlite3` as a peer dependency.
 */
export class SqliteClaimStore implements ClaimStoreBackend {
  private db: any;

  constructor(filePath: string = ":memory:") {
    if (!Database) {
      throw new Error(
        "better-sqlite3 is required for SqliteClaimStore. Install it: npm install better-sqlite3"
      );
    }
    this.db = new Database(filePath);
    this.db.pragma("journal_mode = WAL");
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS claims (
        id TEXT PRIMARY KEY,
        subject TEXT NOT NULL,
        type TEXT NOT NULL,
        issuer TEXT NOT NULL,
        issued_at TEXT NOT NULL,
        expires_at TEXT,
        marker_ref TEXT,
        tags_json TEXT,
        payload_json TEXT NOT NULL,
        claim_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_claims_subject ON claims(subject);
      CREATE INDEX IF NOT EXISTS idx_claims_type ON claims(type);
      CREATE INDEX IF NOT EXISTS idx_claims_issuer ON claims(issuer);
      CREATE INDEX IF NOT EXISTS idx_claims_issued_at ON claims(issued_at);
      CREATE INDEX IF NOT EXISTS idx_claims_marker_ref ON claims(marker_ref);
    `);
  }

  put(claim: StoredClaim): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO claims (id, subject, type, issuer, issued_at, expires_at, marker_ref, tags_json, payload_json, claim_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      claim.id,
      claim.subject,
      claim.type,
      claim.issuer,
      claim.issuedAt,
      claim.expiresAt ?? null,
      claim.markerRef ?? null,
      claim.tags ? JSON.stringify(claim.tags) : null,
      JSON.stringify(claim.payload),
      JSON.stringify(claim)
    );
  }

  get(id: string): StoredClaim | null {
    const row = this.db.prepare("SELECT claim_json FROM claims WHERE id = ?").get(id);
    return row ? JSON.parse(row.claim_json) : null;
  }

  query(q: ClaimQuery): StoredClaim[] {
    const excludeExpired = q.excludeExpired !== false;
    const limit = q.limit ?? 100;
    const sort = q.sort === "oldest" ? "ASC" : "DESC";

    const conditions: string[] = [];
    const params: any[] = [];

    if (q.subject) { conditions.push("subject = ?"); params.push(q.subject); }
    if (q.type) { conditions.push("type = ?"); params.push(q.type); }
    if (q.issuer) { conditions.push("issuer = ?"); params.push(q.issuer); }
    if (q.markerRef) { conditions.push("marker_ref = ?"); params.push(q.markerRef); }
    if (excludeExpired) {
      conditions.push("(expires_at IS NULL OR expires_at > ?)");
      params.push(new Date().toISOString());
    }

    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
    const sql = `SELECT claim_json FROM claims ${where} ORDER BY issued_at ${sort} LIMIT ?`;
    params.push(limit);

    const rows = this.db.prepare(sql).all(...params);
    let results: StoredClaim[] = rows.map((r: any) => JSON.parse(r.claim_json));

    // Tag filtering in JS (simpler than JSON querying in SQLite)
    if (q.tags?.length) {
      results = results.filter(c => c.tags?.some(t => q.tags!.includes(t)));
    }

    return results;
  }

  delete(id: string): boolean {
    const result = this.db.prepare("DELETE FROM claims WHERE id = ?").run(id);
    return result.changes > 0;
  }

  deleteBySubject(subject: string): number {
    const result = this.db.prepare("DELETE FROM claims WHERE subject = ?").run(subject);
    return result.changes;
  }

  stats(): ClaimStoreStats {
    const now = new Date().toISOString();
    const total = this.db.prepare("SELECT COUNT(*) as c FROM claims").get().c;
    const typeRows = this.db.prepare("SELECT type, COUNT(*) as c FROM claims GROUP BY type").all();
    const byType: Record<string, number> = {};
    for (const r of typeRows) byType[r.type] = r.c;
    const subjects = this.db.prepare("SELECT COUNT(DISTINCT subject) as c FROM claims").get().c;
    const issuers = this.db.prepare("SELECT COUNT(DISTINCT issuer) as c FROM claims").get().c;
    const expired = this.db.prepare("SELECT COUNT(*) as c FROM claims WHERE expires_at IS NOT NULL AND expires_at <= ?").get(now).c;

    return { totalClaims: total, claimsByType: byType, uniqueSubjects: subjects, uniqueIssuers: issuers, expiredClaims: expired };
  }

  /** Close the database connection. */
  close(): void {
    this.db.close();
  }
}
