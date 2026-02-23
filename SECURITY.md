# Cellar Door EXIT Protocol — Security Considerations

**Version:** 1.1-draft
**Date:** 2026-02-22
**Spec Version:** EXIT_SPEC_v1.1

---

## 1. Threat Model

### 1.1 Reputation Laundering

**Threat:** An agent banned from Platform A (`forced` exit, `disputed` status) creates a new DID, generates a fresh EXIT marker from a cooperative or fabricated platform with `voluntary` / `good_standing`, and arrives at Platform B with a clean record.

**Analysis:** DIDs are free to generate. `did:key` can be created in milliseconds. The protocol has no inherent defense against Sybil exits. Lineage chains (Module A) provide some protection if platforms require them, but the emergency path permits exit with zero lineage.

**Mitigations:**
- Verifiers SHOULD require lineage chains of meaningful length for high-trust contexts
- Verifiers SHOULD cross-reference the origin field against known platform registries
- Verifiers SHOULD apply higher scrutiny to markers from unknown origins
- Future: web-of-trust endorsement requirements for `good_standing` to carry weight

### 1.2 Weaponized Exit

**Threat:** A platform creates a `forced` / `disputed` EXIT marker (via Module C `originStatus`) for a subject as retaliation, effectively blackballing the agent across the ecosystem.

**Analysis:** Downstream systems that trust origin attestations over self-attestations will treat the subject as disputed. This is defamation by protocol. The platform may have sovereign immunity or Section 230 protection.

**Mitigations:**
- The spec normatively states that `originStatus` is an allegation, not a finding
- Verifiers MUST NOT treat origin status as dispositive without independent investigation
- Module E provides space for counter-narratives
- Future: formal dispute resolution and arbiter mechanisms (see EXIT_SPEC_v1.1 §4.3 Module C: Dispute Bundle; §5.3 CONTESTED state; D-006 non-blocking disputes)

### 1.3 Forged Markers

**Threat:** An attacker generates a keypair, creates a marker with a victim's metadata but the attacker's DID. The marker is cryptographically valid but attributes false information.

**Analysis:** The marker's `subject` field is a DID string with no reverse lookup. The standalone JSON-LD format has no issuer field separate from subject. Verification depends on the verifier independently confirming the subject-DID binding.

**Mitigations:**
- Verifiers MUST independently confirm subject-DID bindings through out-of-band channels
- The VC wrapper profile provides an explicit `issuer` field
- Subject DIDs SHOULD be published or discoverable through trusted channels before markers are created
- Future: DID document service endpoints for EXIT marker discovery

### 1.4 Mass Coordinated Exit (Bank Run)

**Threat:** Coordinated mass exit from a DAO or platform, with each agent claiming their share via Module D asset manifests. The perception of mass exodus triggers panic in downstream systems.

**Analysis:** Module D asset manifests are declarations, not entitlements (see LEGAL.md §4). However, the *signal* of mass departure may cause reputational or economic harm to the origin platform.

**Mitigations:**
- Module D explicitly disclaims that manifests are entitlements
- Registries SHOULD implement rate limiting (see §7)
- Verifiers SHOULD evaluate mass exit events in context rather than treating each marker independently
- Origin platforms MAY implement their own rate limiting on co-signatures

### 1.5 Surveillance via EXIT Trail

**Threat:** EXIT markers create movement chains: agent exits A → arrives at B → exits B → arrives at C. Module A lineage makes this explicit. This is a movement tracking system accessible to anyone who can collect markers.

**Analysis:** For human-adjacent agents (personal assistants, therapy bots), this reveals user behavior patterns. For autonomous agents, this reveals strategic information. Nation-state actors would find this data valuable.

**Mitigations:**
- Lineage chains SHOULD be encrypted at rest
- Module A lineage SHOULD be opt-in for sensitive contexts
- Markers SHOULD be stored with the subject, not in public registries
- Future: ZK selective disclosure to prove lineage properties without revealing the full chain
- Future: onion-routing-style techniques where markers don't reveal the full chain to any single verifier

---

## 2. did:key Limitations and Revocation Gap

`did:key` is the reference DID method for the EXIT protocol prototype. It has critical limitations:

### 2.1 No Revocation

If a `did:key` private key is compromised:
- The attacker can create forged EXIT markers for the subject
- The attacker can designate fraudulent successors (Module A)
- The attacker can claim assets (Module D)
- **There is no way to invalidate the compromised key within the DID method itself**

### 2.2 No Key Rotation

`did:key` encodes the public key directly in the identifier. There is no mechanism to rotate to a new key while maintaining the same identifier. This means:
- Key compromise is permanent for that identity
- Long-lived agents accumulate risk over time
- There is no graceful recovery path

### 2.3 The keyCompromise Exit Type

The `keyCompromise` exit type is a protocol-level stopgap:
- Subject uses an alternative trusted key to declare the compromised key invalid
- Requires pre-establishment of a key hierarchy or trusted backup key
- Does NOT prevent the attacker from creating markers with the compromised key during the window between compromise and declaration
- Is advisory only — verifiers must actively check for keyCompromise markers

### 2.4 Recommendation

Production deployments MUST use a DID method with:
- Pre-rotation (key commitment before use): `did:keri`
- Key revocation capability
- Key rotation with cryptographic continuity
- Delegated key management for organizational agents

---

## 3. Emergency Path Abuse

The emergency exit path (ALIVE → FINAL → DEPARTED) bypasses:
- Intent declaration
- State snapshot
- Challenge window
- Dispute resolution
- Obligation settlement

### 3.1 Abuse Scenarios

- Agent uses emergency exit to skip dispute resolution when no emergency exists
- Agent uses emergency exit to avoid obligation settlement
- Agent claims "emergency" when the origin platform is clearly operational
- Repeated emergency exits to avoid accountability

### 3.2 Mitigations

- `emergencyJustification` is **required** for emergency exits (enforced by validation)
- Verifiers SHOULD apply higher scrutiny to emergency exits from platforms that are clearly operational
- Verifiers SHOULD check whether the claimed emergency is corroborated (e.g., platform actually went offline)
- The spec notes that false emergency claims may have legal consequences
- Future: reputation penalties for unsubstantiated emergency exits

---

## 4. Lineage Chain Privacy

Module A lineage chains reveal:
- Full history of an agent's platform affiliations
- Duration of stay at each platform (inferrable from timestamps)
- Patterns of departure (voluntary vs. forced)
- Social graph information (which platforms are connected)

### 4.1 Privacy Risks

- **Profiling:** Complete movement history enables behavioral profiling
- **Discrimination:** History of forced exits may lead to discrimination
- **Surveillance:** State actors can track agent movements across jurisdictions
- **Correlation:** Even without explicit lineage, timestamp and origin patterns enable correlation attacks

### 4.2 Mitigations

- Lineage chains SHOULD be encrypted with subject-controlled keys
- Verifiers SHOULD request only the minimum lineage depth needed
- Subjects MAY truncate lineage chains, providing only recent entries
- Future: ZK proofs of lineage properties (e.g., "chain length > 3") without revealing the chain
- Future: mix networks for marker distribution

---

## 5. Recommended Verifier Policies

Verifiers consuming EXIT markers SHOULD implement the following policies:

### 5.1 Minimum Verification

1. Verify the Ed25519 signature against the subject's public key
2. Verify the `@context` matches the expected version
3. Verify the timestamp is reasonable (not in the future, not impossibly old)
4. Verify the `id` matches the content-addressed hash of the marker

### 5.2 Trust Assessment

1. Do NOT treat self-attested `good_standing` as equivalent to independent verification
2. Weight origin-attested status (Module C) according to your trust in the origin
3. Require lineage chains for high-trust contexts
4. Cross-reference origins against known platform registries
5. Apply higher scrutiny to emergency exits
6. Check for `keyCompromise` markers from the same subject

### 5.3 Risk-Based Approach

| Context | Recommended Minimum |
|---|---|
| Casual / low-risk | Signature verification only |
| Standard | Signature + origin cross-reference + lineage depth ≥ 1 |
| High-trust | Signature + origin co-signature + lineage depth ≥ 3 + manual review |
| Financial / regulated | All of the above + independent KYC + legal review |

---

## 6. Key Management Best Practices

### 6.1 For Subjects

- Use `did:keri` or equivalent with pre-rotation in production
- Maintain offline backup keys for recovery
- Rotate keys on a regular schedule
- Issue `keyCompromise` markers immediately upon detecting compromise
- Use hardware security modules (HSMs) for high-value agent identities

### 6.2 For Origins

- Co-sign markers only after genuine verification of departure circumstances
- Maintain audit logs of all co-signing decisions
- Implement approval workflows for `forced` exit co-signatures
- Rotate co-signing keys regularly

### 6.3 For Verifiers

- Cache and periodically refresh public keys
- Check for key compromise declarations before trusting markers
- Implement key pinning for known subjects
- Maintain revocation lists if using `did:key`

---

## 7. Rate Limiting Considerations for Registries

If EXIT markers are stored in any shared registry or discovery system:

### 7.1 Threats

- **Spam:** Mass generation of meaningless markers to pollute the registry
- **DoS:** Overwhelming the registry with marker submissions
- **Bank run signaling:** Coordinated mass exit to damage a platform's reputation
- **Storage exhaustion:** Markers with large Module E narratives consuming storage

### 7.2 Recommended Limits

- Maximum marker submission rate per DID: configurable, suggest 10/hour
- Maximum Module E narrative length: 10,000 characters
- Maximum lineage chain length in a single marker: 100 entries
- Proof-of-work or stake requirement for registry submission (optional)
- Geographic rate limiting for cross-jurisdiction compliance

### 7.3 Design Principle

The protocol is non-custodial by design (Decision D-012). Markers are held by subjects, not by registries. Any registry is an optional convenience layer, not a protocol requirement. Registry operators bear full responsibility for their own access controls, rate limits, and legal compliance.

---

## Reporting Security Issues

Security vulnerabilities in the EXIT protocol specification or reference implementation should be reported to [security contact TBD]. Please do not file public issues for security vulnerabilities.
