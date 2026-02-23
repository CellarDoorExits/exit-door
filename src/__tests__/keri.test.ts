import { describe, it, expect } from "vitest";
import { generateKeyPair, didFromPublicKey } from "../crypto.js";
import {
  createInception,
  createRotation,
  verifyKeyState,
  isKeyCompromised,
  digestKey,
  KeyEventLog,
} from "../keri.js";
import {
  generatePreRotatedKeys,
  commitNextKey,
  verifyNextKeyCommitment,
  rotateKeys,
} from "../pre-rotation.js";
import {
  createCompromiseMarker,
  verifyCompromiseRecovery,
  linkCompromisedMarkers,
} from "../key-compromise.js";
import { resolveDidKeri, createDidKeri } from "../resolver.js";
import type { ExitMarker } from "../types.js";
import { ExitType, ExitStatus, EXIT_CONTEXT_V1 } from "../types.js";

describe("KERI Key Management", () => {
  it("creates and verifies an inception event", () => {
    const kp = generateKeyPair();
    const nextKp = generateKeyPair();
    const nextDigest = digestKey(nextKp.publicKey);

    const inception = createInception({
      keys: [kp.publicKey],
      nextKeyDigests: [nextDigest],
      signingKey: kp.privateKey,
    });

    expect(inception.type).toBe("inception");
    expect(inception.identifier).toMatch(/^did:keri:/);
    expect(inception.keys).toHaveLength(1);
    expect(inception.signature).toBeTruthy();

    const state = verifyKeyState([inception]);
    expect(state.did).toBe(inception.identifier);
    expect(state.sequenceNumber).toBe(0);
    expect(state.currentKeys).toHaveLength(1);
  });

  it("rotates keys and verifies new state", () => {
    const kp1 = generateKeyPair();
    const kp2 = generateKeyPair();
    const kp3 = generateKeyPair();

    const inception = createInception({
      keys: [kp1.publicKey],
      nextKeyDigests: [digestKey(kp2.publicKey)],
      signingKey: kp1.privateKey,
    });

    const state0 = verifyKeyState([inception]);
    const rotation = createRotation(
      state0,
      [kp2.publicKey],
      [digestKey(kp3.publicKey)],
      kp1.privateKey
    );

    const state1 = verifyKeyState([inception, rotation]);
    expect(state1.sequenceNumber).toBe(1);
    expect(state1.nextKeyDigests).toEqual([digestKey(kp3.publicKey)]);
  });

  it("pre-rotation commitment and verification", () => {
    const kp = generateKeyPair();
    const commitment = commitNextKey(kp.publicKey);

    expect(verifyNextKeyCommitment(kp.publicKey, commitment)).toBe(true);

    const other = generateKeyPair();
    expect(verifyNextKeyCommitment(other.publicKey, commitment)).toBe(false);
  });

  it("generates pre-rotated keys", () => {
    const pre = generatePreRotatedKeys();
    expect(pre.currentKeyPair.publicKey).toBeTruthy();
    expect(pre.nextKeyPair.publicKey).toBeTruthy();
    expect(
      verifyNextKeyCommitment(pre.nextKeyPair.publicKey, pre.nextKeyDigest)
    ).toBe(true);
  });

  it("key event log: append and walk", () => {
    const kp1 = generateKeyPair();
    const kp2 = generateKeyPair();
    const kp3 = generateKeyPair();

    const log = new KeyEventLog();

    const inception = createInception({
      keys: [kp1.publicKey],
      nextKeyDigests: [digestKey(kp2.publicKey)],
      signingKey: kp1.privateKey,
    });
    log.append(inception);
    expect(log.length).toBe(1);

    const state0 = log.getCurrentState();
    const rotation = createRotation(
      state0,
      [kp2.publicKey],
      [digestKey(kp3.publicKey)],
      kp1.privateKey
    );
    log.append(rotation);
    expect(log.length).toBe(2);

    const state1 = log.getCurrentState();
    expect(state1.sequenceNumber).toBe(1);
  });

  it("compromise marker creation and verification", () => {
    const kp1 = generateKeyPair();
    const kp2 = generateKeyPair();
    const kp3 = generateKeyPair();

    const log = new KeyEventLog();
    const inception = createInception({
      keys: [kp1.publicKey],
      nextKeyDigests: [digestKey(kp2.publicKey)],
      signingKey: kp1.privateKey,
    });
    log.append(inception);

    const state0 = log.getCurrentState();
    const rotation = createRotation(
      state0,
      [kp2.publicKey],
      [digestKey(kp3.publicKey)],
      kp1.privateKey
    );
    log.append(rotation);

    const compromisedDid = didFromPublicKey(kp1.publicKey);
    const newDid = didFromPublicKey(kp2.publicKey);

    const marker = createCompromiseMarker(
      compromisedDid,
      rotation,
      newDid,
      kp2.privateKey
    );

    expect(marker.exitType).toBe(ExitType.KeyCompromise);
    expect(marker.subject).toBe(compromisedDid);
    expect(marker.lineage?.successor).toBe(newDid);
  });

  it("compromise recovery: proves same entity across rotation", () => {
    const kp1 = generateKeyPair();
    const kp2 = generateKeyPair();
    const kp3 = generateKeyPair();

    const log = new KeyEventLog();
    const inception = createInception({
      keys: [kp1.publicKey],
      nextKeyDigests: [digestKey(kp2.publicKey)],
      signingKey: kp1.privateKey,
    });
    log.append(inception);

    const state0 = log.getCurrentState();
    const rotation = createRotation(
      state0,
      [kp2.publicKey],
      [digestKey(kp3.publicKey)],
      kp1.privateKey
    );
    log.append(rotation);

    const compromisedDid = didFromPublicKey(kp1.publicKey);
    const newDid = didFromPublicKey(kp2.publicKey);
    const marker = createCompromiseMarker(
      compromisedDid,
      rotation,
      newDid,
      kp2.privateKey
    );

    expect(verifyCompromiseRecovery(marker, log)).toBe(true);
  });

  it("detects use of compromised key (rotated out)", () => {
    const kp1 = generateKeyPair();
    const kp2 = generateKeyPair();
    const kp3 = generateKeyPair();

    const log = new KeyEventLog();
    const inception = createInception({
      keys: [kp1.publicKey],
      nextKeyDigests: [digestKey(kp2.publicKey)],
      signingKey: kp1.privateKey,
    });
    log.append(inception);

    const state0 = log.getCurrentState();
    const rotation = createRotation(
      state0,
      [kp2.publicKey],
      [digestKey(kp3.publicKey)],
      kp1.privateKey
    );
    log.append(rotation);

    const state1 = log.getCurrentState();

    // A marker signed with the OLD key (kp1) should be detected as compromised
    const oldMarker = {
      proof: { verificationMethod: didFromPublicKey(kp1.publicKey) },
    } as ExitMarker;
    expect(isKeyCompromised(state1, oldMarker)).toBe(true);

    // A marker signed with the CURRENT key (kp2) should NOT be compromised
    const currentMarker = {
      proof: { verificationMethod: didFromPublicKey(kp2.publicKey) },
    } as ExitMarker;
    expect(isKeyCompromised(state1, currentMarker)).toBe(false);
  });

  it("rejects invalid rotation (wrong signer)", () => {
    const kp1 = generateKeyPair();
    const kp2 = generateKeyPair();
    const kpRogue = generateKeyPair();

    const inception = createInception({
      keys: [kp1.publicKey],
      nextKeyDigests: [digestKey(kp2.publicKey)],
      signingKey: kp1.privateKey,
    });

    const state0 = verifyKeyState([inception]);

    // Sign rotation with a rogue key (not the current key)
    const badRotation = createRotation(
      state0,
      [kp2.publicKey],
      [digestKey(generateKeyPair().publicKey)],
      kpRogue.privateKey
    );

    expect(() => verifyKeyState([inception, badRotation])).toThrow(
      /Invalid rotation signature/
    );
  });

  it("did:keri resolution from key event log", () => {
    const kp1 = generateKeyPair();
    const kp2 = generateKeyPair();

    const log = new KeyEventLog();
    const inception = createInception({
      keys: [kp1.publicKey],
      nextKeyDigests: [digestKey(kp2.publicKey)],
      signingKey: kp1.privateKey,
    });
    log.append(inception);

    const did = createDidKeri(inception);
    expect(did).toBe(inception.identifier);

    const resolved = resolveDidKeri(did, log);
    expect(resolved.method).toBe("keri");
    expect(resolved.publicKey).toEqual(kp1.publicKey);
  });

  it("linkCompromisedMarkers creates a proper record", () => {
    const marker = {
      id: "urn:exit:abc123",
      exitType: ExitType.KeyCompromise,
    } as ExitMarker;

    const link = linkCompromisedMarkers(marker, [
      "urn:exit:old1",
      "urn:exit:old2",
    ]);
    expect(link.compromiseMarkerId).toBe("urn:exit:abc123");
    expect(link.affectedMarkerIds).toEqual(["urn:exit:old1", "urn:exit:old2"]);
    expect(link.timestamp).toBeTruthy();
  });

  it("rotateKeys via pre-rotation module", () => {
    const pre = generatePreRotatedKeys();
    const kp3 = generateKeyPair();

    const inception = createInception({
      keys: [pre.currentKeyPair.publicKey],
      nextKeyDigests: [pre.nextKeyDigest],
      signingKey: pre.currentKeyPair.privateKey,
    });

    const state0 = verifyKeyState([inception]);
    const newNextDigest = commitNextKey(kp3.publicKey);

    const { newState, rotationEvent } = rotateKeys(
      state0,
      pre.nextKeyPair,
      newNextDigest,
      pre.currentKeyPair.privateKey
    );

    expect(newState.sequenceNumber).toBe(1);
    expect(newState.nextKeyDigests).toEqual([newNextDigest]);
    expect(rotationEvent.type).toBe("rotation");
  });
});
