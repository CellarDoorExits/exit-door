# Preservation Considerations

**Version:** 1.1
**Date:** 2026-02-24
**Status:** Informative companion document

---

## 1. Periodic Re-Signing

EXIT markers are signed using cryptographic algorithms that have finite security lifetimes. As computational power increases and new attacks are discovered, signatures that were secure at creation time may become forgeable.

**Recommendation:** Implementers SHOULD periodically re-sign markers with current-generation algorithms. A re-signed marker includes:

- The original marker (unchanged)
- A new proof with a current algorithm
- A timestamp indicating when re-signing occurred

Re-signing does not alter the original marker content or its content-addressed ID. It adds an additional layer of temporal proof.

**Suggested cadence:** Re-sign markers every 5 years, or whenever the signing algorithm is deprecated by NIST or equivalent authority.

---

## 2. Inline JSON-LD Context

EXIT markers reference a JSON-LD context via URL (`https://cellar-door.org/exit/v1`). If this URL becomes unreachable, markers become harder to interpret.

**Recommendation:** For long-term preservation, embed the JSON-LD context inline within the marker or alongside it in the storage format. This ensures the marker remains self-describing even if the context URL goes offline.

```json
{
  "@context": {
    "exit": "https://cellar-door.org/exit/v1#",
    "subject": "exit:subject",
    "origin": "exit:origin"
  }
}
```

Alternatively, store a copy of the context document alongside the marker in any archival system.

---

## 3. Algorithm Obsolescence Risk

The reference implementation uses Ed25519 (EdDSA over Curve25519). This algorithm is currently considered secure, but:

- **Quantum computing** may eventually break elliptic curve cryptography
- **New classical attacks** may reduce the effective security level
- **Standards bodies** may deprecate the algorithm

**Recommendation:**
- Monitor NIST post-quantum cryptography standardization
- Plan migration paths to post-quantum signature schemes (e.g., ML-DSA/Dilithium, SLH-DSA/SPHINCS+)
- Use the `proof.type` field to identify the algorithm, enabling verifiers to apply algorithm-specific trust policies

---

## 4. Industry-Wide Concern

Algorithm obsolescence and long-term preservation are not unique to EXIT markers. They affect all cryptographically signed documents, including:

- X.509 certificates
- Verifiable Credentials (W3C VC)
- Bitcoin/Ethereum transactions
- Code signing certificates
- Legal e-signatures

The EXIT protocol does not attempt to solve this industry-wide problem. It follows established best practices (algorithm agility via the `proof.type` field) and recommends that implementers stay current with cryptographic standards.

---

## 5. Storage Recommendations

For markers intended to persist beyond 10 years:

1. Store in at least two independent systems (e.g., local + cloud + blockchain anchor)
2. Use content-addressed storage (IPFS, Git, or equivalent) for integrity verification
3. Include the JSON-LD context inline
4. Re-sign on the recommended cadence
5. Maintain a record of algorithm migrations
