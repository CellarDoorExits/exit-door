import { describe, it, expect } from "vitest";
import {
  departAndAnchor,
  departAndVerify,
  quickExit,
  toJSON,
  ExitType,
  ExitStatus,
  computeAnchorHash,
} from "../index.js";

// ─── departAndAnchor ─────────────────────────────────────────────────────────

describe("departAndAnchor", () => {
  it("returns marker, identity, and anchor hash with no optional deps", async () => {
    const result = await departAndAnchor("twitter.com");

    expect(result.marker).toBeDefined();
    expect(result.marker.origin).toBe("twitter.com");
    expect(result.marker.proof).toBeDefined();
    expect(result.identity).toBeDefined();
    expect(result.identity.did).toMatch(/^did:key:z6Mk/);
    expect(result.anchorHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("anchor hash matches computeAnchorHash", async () => {
    const result = await departAndAnchor("github.com");
    const expected = computeAnchorHash(result.marker);
    expect(result.anchorHash).toBe(expected);
  });

  it("passes QuickExitOpts through", async () => {
    const result = await departAndAnchor("discord.com", {
      exitType: ExitType.Emergency,
      status: ExitStatus.Unverified,
      reason: "server shutting down",
      emergencyJustification: "imminent data loss",
    });

    expect(result.marker.exitType).toBe(ExitType.Emergency);
    expect(result.marker.status).toBe(ExitStatus.Unverified);
  });

  it("gracefully handles missing TSA module", async () => {
    const result = await departAndAnchor("example.com", {
      anchor: { tsa: {} },
    });

    // Should succeed — TSA is optional
    expect(result.marker).toBeDefined();
    expect(result.anchorHash).toBeDefined();
    // tsaReceipt may or may not be present depending on module availability
  });

  it("gracefully handles missing git-ledger module", async () => {
    const result = await departAndAnchor("example.com", {
      anchor: { git: { repoPath: "/tmp/fake-repo" } },
    });

    expect(result.marker).toBeDefined();
    expect(result.anchorHash).toBeDefined();
  });

  it("gracefully handles missing visual module", async () => {
    const result = await departAndAnchor("example.com", {
      visual: true,
    });

    expect(result.marker).toBeDefined();
    expect(result.anchorHash).toBeDefined();
  });

  it("runs all optional enhancements without error", async () => {
    const result = await departAndAnchor("example.com", {
      anchor: {
        tsa: { url: "https://freetsa.org/tsr" },
        git: { repoPath: "/tmp/fake", branch: "main", autoPush: false },
      },
      visual: true,
    });

    expect(result.marker).toBeDefined();
    expect(result.anchorHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces unique markers for different origins", async () => {
    const a = await departAndAnchor("alpha.com");
    const b = await departAndAnchor("beta.com");

    expect(a.anchorHash).not.toBe(b.anchorHash);
    expect(a.identity.did).not.toBe(b.identity.did);
  });
});

// ─── departAndVerify ─────────────────────────────────────────────────────────

describe("departAndVerify", () => {
  it("verifies a valid marker from JSON string", async () => {
    const { marker } = await departAndAnchor("twitter.com");
    const json = toJSON(marker);

    const result = await departAndVerify(json);

    expect(result.valid).toBe(true);
    expect(result.signatureValid).toBe(true);
    expect(result.trustLevel).toBe("medium"); // no TSA
    expect(result.anchorHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("verifies a valid marker object directly", async () => {
    const { marker } = await departAndAnchor("github.com");

    const result = await departAndVerify(marker);

    expect(result.valid).toBe(true);
    expect(result.signatureValid).toBe(true);
    expect(result.trustLevel).toBe("medium");
  });

  it("rejects invalid JSON", async () => {
    const result = await departAndVerify("not valid json {{{");

    expect(result.valid).toBe(false);
    expect(result.trustLevel).toBe("none");
    expect(result.signatureValid).toBe(false);
  });

  it("anchor hash matches between depart and verify", async () => {
    const exitResult = await departAndAnchor("example.com");
    const verifyResult = await departAndVerify(exitResult.marker);

    expect(verifyResult.anchorHash).toBe(exitResult.anchorHash);
  });

  it("handles TSA receipt when module is not available", async () => {
    const { marker } = await departAndAnchor("example.com");
    const fakeReceipt = { token: "fake" };

    const result = await departAndVerify(marker, fakeReceipt);

    expect(result.valid).toBe(true);
    // TSA module not loaded, so tsaVerified is undefined
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining("TSA module not available"),
      ]),
    );
  });

  it("full round-trip: depart then verify", async () => {
    const exit = await departAndAnchor("mastodon.social", {
      exitType: ExitType.Voluntary,
      reason: "exploring alternatives",
    });

    const json = toJSON(exit.marker);
    const verify = await departAndVerify(json);

    expect(verify.valid).toBe(true);
    expect(verify.anchorHash).toBe(exit.anchorHash);
    expect(verify.trustLevel).toBe("medium");
  });
});
