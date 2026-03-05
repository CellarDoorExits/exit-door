/**
 * cellar-door-exit — Amendment & Revocation Discovery
 *
 * Defines a standard discovery mechanism for amendments and revocations,
 * solving the "CRL/OCSP problem" for EXIT markers. Verifiers MUST be able
 * to discover amendments/revocations to fulfill spec Section 6.3 requirements.
 *
 * Three discovery models (spec Section 6.3.1):
 *   1. Well-Known Endpoint  — REST API at /.well-known/exit-amendments
 *   2. Marker-Embedded URL   — discoveryUrl field in marker metadata
 *   3. Claim Store Query     — local claim store lookup
 *
 * This module provides:
 *   - Type definitions for discovery responses
 *   - A discovery client that tries all three models in priority order
 *   - A reference server handler for the well-known endpoint
 *   - Integration with the existing amendment/revocation system
 */

import type { MarkerAmendment, MarkerRevocation } from "./amendment.js";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Discovery response for a single marker's amendments and revocations. */
export interface AmendmentDiscoveryResponse {
  /** The marker ID being queried. */
  markerId: string;
  /** All known amendments, ordered by timestamp ascending. */
  amendments: MarkerAmendment[];
  /** All known revocations (typically 0 or 1). */
  revocations: MarkerRevocation[];
  /** ISO 8601 timestamp of this response. */
  queriedAt: string;
  /** Whether this response is complete or may be partial (e.g., paginated). */
  complete: boolean;
}

/** Well-known endpoint metadata (served at /.well-known/exit-amendments). */
export interface WellKnownExitAmendments {
  /** Protocol version. */
  version: "1.2";
  /** Base URL for amendment queries (append /{markerId}). */
  endpoint: string;
  /** Supported query parameters. */
  capabilities: {
    /** Supports querying by marker ID. */
    byMarkerId: boolean;
    /** Supports querying by subject DID. */
    bySubject: boolean;
    /** Supports querying amendments after a given timestamp. */
    since: boolean;
  };
  /** Optional: maximum markers per response (pagination). */
  maxResults?: number;
  /** ISO 8601 timestamp of last update to the amendment store. */
  lastUpdated: string;
}

/** Options for discovering amendments. */
export interface DiscoveryOptions {
  /** Override the well-known endpoint URL. */
  wellKnownUrl?: string;
  /** Marker-embedded discovery URL (from marker metadata). */
  markerDiscoveryUrl?: string;
  /** Local amendment store to query as fallback. */
  localStore?: AmendmentStore;
  /** Timeout in milliseconds for HTTP requests. Default: 5000. */
  timeoutMs?: number;
  /** Only return amendments after this timestamp. */
  since?: string;
}

// ─── Amendment Store Interface ───────────────────────────────────────────────

/**
 * Interface for storing and retrieving amendments and revocations.
 * Implementations may be backed by databases, file systems, or claim stores.
 */
export interface AmendmentStore {
  /** Store an amendment. Idempotent by amendmentId. */
  putAmendment(amendment: MarkerAmendment): Promise<void>;
  /** Store a revocation. Idempotent by revocationId. */
  putRevocation(revocation: MarkerRevocation): Promise<void>;
  /** Get all amendments for a marker, ordered by timestamp ascending. */
  getAmendments(markerId: string, since?: string): Promise<MarkerAmendment[]>;
  /** Get all revocations for a marker. */
  getRevocations(markerId: string): Promise<MarkerRevocation[]>;
  /** Get amendments and revocations together. */
  query(markerId: string, since?: string): Promise<AmendmentDiscoveryResponse>;
}

// ─── In-Memory Amendment Store ───────────────────────────────────────────────

/**
 * Simple in-memory amendment store. Suitable for testing and development.
 * Production deployments should use a persistent backing store.
 */
export class InMemoryAmendmentStore implements AmendmentStore {
  private amendments = new Map<string, Map<string, MarkerAmendment>>();
  private revocations = new Map<string, Map<string, MarkerRevocation>>();

  async putAmendment(amendment: MarkerAmendment): Promise<void> {
    const markerId = amendment.originalMarkerId;
    if (!this.amendments.has(markerId)) {
      this.amendments.set(markerId, new Map());
    }
    this.amendments.get(markerId)!.set(amendment.amendmentId, amendment);
  }

  async putRevocation(revocation: MarkerRevocation): Promise<void> {
    const markerId = revocation.targetMarkerId;
    if (!this.revocations.has(markerId)) {
      this.revocations.set(markerId, new Map());
    }
    this.revocations.get(markerId)!.set(revocation.revocationId, revocation);
  }

  async getAmendments(markerId: string, since?: string): Promise<MarkerAmendment[]> {
    const map = this.amendments.get(markerId);
    if (!map) return [];
    let amendments = Array.from(map.values());
    if (since) {
      const sinceTime = new Date(since).getTime();
      amendments = amendments.filter(a => new Date(a.timestamp).getTime() > sinceTime);
    }
    return amendments.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  async getRevocations(markerId: string): Promise<MarkerRevocation[]> {
    const map = this.revocations.get(markerId);
    if (!map) return [];
    return Array.from(map.values());
  }

  async query(markerId: string, since?: string): Promise<AmendmentDiscoveryResponse> {
    return {
      markerId,
      amendments: await this.getAmendments(markerId, since),
      revocations: await this.getRevocations(markerId),
      queriedAt: new Date().toISOString(),
      complete: true,
    };
  }
}

// ─── Discovery Client ────────────────────────────────────────────────────────

/**
 * Discover amendments and revocations for a marker.
 * Tries discovery sources in priority order:
 *   1. Marker-embedded discoveryUrl (most specific)
 *   2. Well-known endpoint (platform-level)
 *   3. Local store (fallback)
 *
 * Returns the first successful response. If all fail, returns an empty response.
 */
export async function discoverAmendments(
  markerId: string,
  options: DiscoveryOptions = {},
): Promise<AmendmentDiscoveryResponse> {
  const { markerDiscoveryUrl, wellKnownUrl, localStore, timeoutMs = 5000, since } = options;

  // 1. Try marker-embedded discovery URL
  if (markerDiscoveryUrl) {
    try {
      const result = await fetchAmendments(markerDiscoveryUrl, markerId, timeoutMs, since);
      if (result) return result;
    } catch {
      // Fall through to next method
    }
  }

  // 2. Try well-known endpoint
  if (wellKnownUrl) {
    try {
      const result = await fetchAmendments(wellKnownUrl, markerId, timeoutMs, since);
      if (result) return result;
    } catch {
      // Fall through to next method
    }
  }

  // 3. Try local store
  if (localStore) {
    try {
      return await localStore.query(markerId, since);
    } catch {
      // Fall through to empty response
    }
  }

  // All methods failed; return empty response
  return {
    markerId,
    amendments: [],
    revocations: [],
    queriedAt: new Date().toISOString(),
    complete: false,
  };
}

/**
 * Fetch amendments from an HTTP endpoint.
 * Expects the endpoint to accept GET /{markerId} and return AmendmentDiscoveryResponse.
 */
async function fetchAmendments(
  baseUrl: string,
  markerId: string,
  timeoutMs: number,
  since?: string,
): Promise<AmendmentDiscoveryResponse | null> {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/${encodeURIComponent(markerId)}`);
  if (since) url.searchParams.set("since", since);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = await response.json() as AmendmentDiscoveryResponse;
    // Basic shape validation
    if (!data.markerId || !Array.isArray(data.amendments) || !Array.isArray(data.revocations)) {
      return null;
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Well-Known Endpoint Handler ─────────────────────────────────────────────

/**
 * Create a handler function for the /.well-known/exit-amendments endpoint.
 * Compatible with Express, Fastify, or any framework that accepts (req, res) handlers.
 *
 * Usage:
 *   const store = new InMemoryAmendmentStore();
 *   app.get('/.well-known/exit-amendments', createWellKnownHandler(store, 'https://example.com/api/amendments'));
 *   app.get('/api/amendments/:markerId', createAmendmentQueryHandler(store));
 */
export function createWellKnownMetadata(
  endpointUrl: string,
  capabilities: Partial<WellKnownExitAmendments["capabilities"]> = {},
): WellKnownExitAmendments {
  return {
    version: "1.2",
    endpoint: endpointUrl,
    capabilities: {
      byMarkerId: true,
      bySubject: capabilities.bySubject ?? false,
      since: capabilities.since ?? true,
      ...capabilities,
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Create a request handler for querying amendments by marker ID.
 * Returns a function that takes (markerId, since?) and returns a discovery response.
 */
export function createAmendmentQueryHandler(
  store: AmendmentStore,
): (markerId: string, since?: string) => Promise<AmendmentDiscoveryResponse> {
  return async (markerId: string, since?: string) => {
    return store.query(markerId, since);
  };
}
