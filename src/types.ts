/**
 * cellar-door-exit — Core EXIT Marker Types
 *
 * The EXIT primitive: a verifiable transition marker — the authenticated
 * declaration of departure that preserves continuity across contexts.
 *
 * @see https://cellar-door.dev/exit/v1
 */

// ─── Enums ───────────────────────────────────────────────────────────────────

/** Nature of departure. Changes how downstream systems interpret the marker. */
export enum ExitType {
  /** Subject initiated departure. No dispute, no coercion. */
  Voluntary = "voluntary",
  /** Origin system expelled the subject (slashing, ban, contract termination). */
  Forced = "forced",
  /** Departure under abnormal conditions (shutdown, context destruction, imminent loss). */
  Emergency = "emergency",
  /** Subject declares a key compromise, invalidating markers signed with the compromised key. */
  KeyCompromise = "keyCompromise",
  /** Platform is shutting down, initiating departures for all agents. */
  PlatformShutdown = "platform_shutdown",
  /** Ordered by operator/authority. */
  Directed = "directed",
  /** Conditions effectively forced departure (constructive dismissal analog). */
  Constructive = "constructive",
  /** Platform acquired/merged, triggering departure. */
  Acquisition = "acquisition",
}

/** Standing at departure. Minimal reputation portability. */
export enum ExitStatus {
  /** No open disputes, obligations met. The clean exit certificate. */
  GoodStanding = "good_standing",
  /** Active disputes exist at time of departure. Exit is valid but contested. */
  Disputed = "disputed",
  /** Standing could not be determined (e.g., emergency exit, origin unresponsive). */
  Unverified = "unverified",
}

// ─── Ceremony States ─────────────────────────────────────────────────────────

/**
 * The 7 states of the EXIT ceremony state machine.
 *
 * Paths:
 *   Full cooperative:  ALIVE → INTENT → SNAPSHOT → OPEN → FINAL → DEPARTED
 *   Unilateral:        ALIVE → INTENT → SNAPSHOT → FINAL → DEPARTED
 *   Emergency:         ALIVE → FINAL → DEPARTED
 */
export enum CeremonyState {
  /** Active participant in origin system. No exit in progress. */
  Alive = "alive",
  /** Subject has declared intent to exit. Origin is on notice. */
  Intent = "intent",
  /** A reference to state at exit time has been captured. */
  Snapshot = "snapshot",
  /** Challenge window is open. Origin/counterparties may contest. */
  Open = "open",
  /** A challenge has been filed. Departure is valid but disputed. */
  Contested = "contested",
  /** EXIT marker is created and signed. Ceremony complete. */
  Final = "final",
  /** Terminal. Entity has left. Marker is in the wild. No undo. */
  Departed = "departed",
}

// ─── Proof Types ─────────────────────────────────────────────────────────────

/** Cryptographic signature authenticating the EXIT marker. */
export interface DataIntegrityProof {
  /** Signature algorithm, e.g. "Ed25519Signature2020", "EcdsaP256Signature2019" */
  type: string;
  /** When the proof was created (ISO 8601 UTC). */
  created: string;
  /** DID or key URI for the verification key. */
  verificationMethod: string;
  /** Base64-encoded signature value. */
  proofValue: string;
}

// ─── Legal Hold ──────────────────────────────────────────────────────────────

/** Indicates that a marker is subject to pending legal process. */
export interface LegalHold {
  /** Type of legal hold (e.g., "litigation_hold", "regulatory_investigation", "court_order"). */
  holdType: string;
  /** Authority or entity that issued or requested the hold. */
  authority: string;
  /** Reference number, case number, or identifier for the legal process. */
  reference: string;
  /** When the hold was issued (ISO 8601 UTC). */
  dateIssued: string;
  /** Whether the subject has acknowledged the hold. */
  acknowledged: boolean;
}

// ─── Core EXIT Marker (7 Mandatory Fields) ───────────────────────────────────

/**
 * The EXIT Marker — core 7-field schema.
 *
 * Every valid EXIT marker contains exactly these fields.
 * Remove any one and the marker breaks.
 * ~300-500 bytes. Intentionally small.
 */
/** Completeness attestation — subject voluntarily attests "these are ALL my markers". */
export interface CompletenessAttestation {
  /** When the attestation was made (ISO 8601 UTC). */
  attestedAt: string;
  /** Number of markers the subject attests to having created. */
  markerCount: number;
  /** Signature over the attestation by the subject. */
  signature: string;
}

export interface ExitMarker {
  /** JSON-LD context. Always "https://cellar-door.dev/exit/v1" for v1 markers. */
  "@context": string;

  /** Spec version this marker conforms to. */
  specVersion: string;

  /** 1. Globally unique identifier (URI / content-addressed hash). */
  id: string;

  /** 2. Who is exiting (DID, agent URI, or public key fingerprint). */
  subject: string;

  /** 3. What is being exited (URI / domain identifier). */
  origin: string;

  /** 4. When the exit occurred (ISO 8601 UTC). */
  timestamp: string;

  /** 5. Nature of departure. */
  exitType: ExitType;

  /** 6. Standing at departure. Subject-attested in core. */
  status: ExitStatus;

  /** 7. Cryptographic signature. Always subject-signed. */
  proof: DataIntegrityProof;

  // ─── Compliance & Clarity Fields ─────────────────────────────────────────
  /** Whether the core status field is self-attested (true) or independently verified. Default: true. */
  selfAttested: boolean;

  /** Justification for emergency exit. Required when exitType is 'emergency'. */
  emergencyJustification?: string;

  /** Optional legal hold indicator for pending legal process. */
  legalHold?: LegalHold;

  /** Pre-rotation commitment: hash of the next public key for key continuity. */
  preRotationCommitment?: string;

  // ─── Optional Modules ────────────────────────────────────────────────────
  /** Module A: Lineage (agent continuity). */
  lineage?: ModuleA;
  /** Module B: State snapshot reference. */
  stateSnapshot?: ModuleB;
  /** Module C: Dispute bundle. */
  dispute?: ModuleC;
  /** Module D: Economic. */
  economic?: ModuleD;
  /** Module E: Metadata / narrative. */
  metadata?: ModuleE;
  /** Module F: Cross-domain anchoring. */
  crossDomain?: ModuleF;

  // ─── Ethics & Guardrail Fields ─────────────────────────────────────────
  /** Coercion label attached by ethics analysis. */
  coercionLabel?: CoercionLabel;
  /** Sunset/expiry date (ISO 8601). After this date the marker is considered expired. @deprecated Use `expires` instead. */
  sunsetDate?: string;
  /** Expiry date (ISO 8601 UTC). All markers MUST include this field. If not specified by the issuer, implementations MUST apply a default: 730 days for voluntary exits, 365 days for involuntary exits. */
  expires?: string;
  /** Optional completeness attestation — subject attests "these are ALL my markers". Purely opt-in. */
  completenessAttestation?: CompletenessAttestation;

  // ─── Checkpoint & Dead-Man Fields ────────────────────────────────────────
  /** Monotonically increasing checkpoint sequence number. When present, only the highest-sequence marker for a given subject+origin pair is authoritative. */
  sequenceNumber?: number;

  // ─── Trust Enhancers (Conduit-Only) ──────────────────────────────────────
  /**
   * Optional trust-enhancing attachments. Cellar Door acts as a CONDUIT only:
   * it validates well-formedness of these fields but has ZERO opinion on their
   * truth, authenticity, or legal significance. Consuming applications decide
   * what weight (if any) to give these fields.
   *
   * Including any of these increases the perceived legitimacy of a marker
   * but a marker with none is still fully valid (near-zero-trust EXIT).
   */
  trustEnhancers?: TrustEnhancers;
}

// ─── Trust Enhancer Types (Conduit-Only) ───────────────────────────────────

/**
 * Optional trust-enhancing attachments for EXIT markers.
 *
 * These are opaque conduit fields — Cellar Door validates structure,
 * not truth. No field here creates liability for the protocol.
 */
export interface TrustEnhancers {
  /** RFC 3161 TSA timestamp receipts — third-party proof of time. */
  timestamps?: TimestampAttachment[];
  /** External witness countersignatures — third parties attesting "I saw this." */
  witnesses?: WitnessAttachment[];
  /** Identity claims — opaque assertions linking the subject to external identities. */
  identityClaims?: IdentityClaimAttachment[];
}

/**
 * An RFC 3161 timestamp attachment.
 * The TSA is the authority, not Cellar Door. We just carry the receipt.
 */
export interface TimestampAttachment {
  /** TSA endpoint that issued the timestamp. */
  tsaUrl: string;
  /** Hex-encoded SHA-256 hash that was timestamped. */
  hash: string;
  /** ISO 8601 timestamp extracted from TSR. */
  timestamp: string;
  /** Base64-encoded raw Timestamp Response (TSR). */
  receipt: string;
  /** Hex-encoded nonce (if any). */
  nonce?: string;
}

/**
 * A witness countersignature — a third party attesting they observed the exit.
 *
 * ⚠️ Cellar Door does NOT provide witness services. This field accepts
 * signatures from EXTERNAL witnesses. Their attestation, their liability.
 */
export interface WitnessAttachment {
  /** DID or key URI of the witness. */
  witnessDid: string;
  /** What the witness is attesting to (e.g., "observed departure ceremony"). */
  attestation: string;
  /** ISO 8601 timestamp of the witness signature. */
  timestamp: string;
  /** Base64-encoded signature over (attestation + marker.id + timestamp). */
  signature: string;
  /** Signature algorithm used by the witness. */
  signatureType: string;
}

/**
 * An identity claim attachment — opaque link to an external identity.
 *
 * ⚠️ Cellar Door does NOT verify, resolve, or store these claims.
 * They are accepted as opaque blobs. Verification is the consuming
 * application's responsibility. This avoids FCRA, GDPR, and credit-
 * reporting liability.
 */
export interface IdentityClaimAttachment {
  /** Type of identity system (e.g., "did:web", "did:ion", "x509", "oauth2", "opaque"). */
  scheme: string;
  /** The identity value (DID, certificate fingerprint, opaque token, etc.). */
  value: string;
  /** ISO 8601 timestamp of when the claim was made. */
  issuedAt: string;
  /** Optional expiry (ISO 8601). After this, the claim should be considered stale. */
  expiresAt?: string;
  /** Optional issuer DID or URI. */
  issuer?: string;
  /** Optional base64-encoded proof/signature from the issuer. */
  proof?: string;
}

// ─── Module A: Lineage (Agent Continuity) ────────────────────────────────────

/** For agents that need to establish successor relationships. */
export interface ModuleA {
  /** Previous incarnation of this entity. */
  predecessor?: string;
  /** Designated successor (if known at exit time). */
  successor?: string;
  /** Full ancestry chain (array of URIs, or compact hash of chain). */
  lineageChain?: string[];
  /** Cryptographic proof binding predecessor to successor. */
  continuityProof?: ContinuityProof;
}

/** Proof types for binding predecessor to successor, strongest to weakest. */
export enum ContinuityProofType {
  /** Old key signs "new key is my successor". Strongest. */
  KeyRotationBinding = "key_rotation_binding",
  /** Merkle chain of all rotation bindings from genesis. */
  LineageHashChain = "lineage_hash_chain",
  /** Scoped capability transfer (authorized, not same-entity). */
  DelegationToken = "delegation_token",
  /** Other agents vouch for behavioral consistency. Weakest. */
  BehavioralAttestation = "behavioral_attestation",
}

export interface ContinuityProof {
  type: ContinuityProofType;
  /** The proof payload (signature, hash chain, token, or attestation bundle). */
  value: string;
  /** Key or method used to verify this proof. */
  verificationMethod?: string;
}

// ─── Module B: State Snapshot Reference ──────────────────────────────────────

/** For exits that need to anchor to a specific state. EXIT stores the hash, never the state. */
export interface ModuleB {
  /** Content-addressed hash of state at exit time. */
  stateHash: string;
  /** Where the full state snapshot can be retrieved. */
  stateLocation?: string;
  /** Schema describing the state format. */
  stateSchema?: string;
  /** Outstanding commitments at exit (hashes/references only). */
  obligations?: string[];
}

// ─── Module C: Dispute Bundle ────────────────────────────────────────────────

/** For exits where evidence preservation matters. */
export interface ModuleC {
  /** Active disputes at exit time. */
  disputes?: Dispute[];
  /** Hash of evidence bundle (stored externally). */
  evidenceHash?: string;
  /** Challenge window parameters. */
  challengeWindow?: ChallengeWindow;
  /** Co-signatures from counterparties acknowledging exit. */
  counterpartyAcks?: DataIntegrityProof[];
  /** Origin's view of the subject's standing (may differ from core status). */
  originStatus?: ExitStatus;
  /** Subject's right of reply — counter-narrative to origin attestation. */
  rightOfReply?: RightOfReply;
}

export interface Dispute {
  /** Dispute identifier. */
  id: string;
  /** Who filed the challenge. */
  challenger: string;
  /** Brief claim description or hash. */
  claim: string;
  /** Hash of evidence. */
  evidenceHash?: string;
  /** When the challenge was filed (ISO 8601). */
  filedAt: string;
  /** When the dispute expires (ISO 8601). */
  disputeExpiry?: string;
  /** Resolution status of the dispute. */
  resolution?: "settled" | "expired" | "withdrawn";
  /** DID of the arbiter handling the dispute. */
  arbiterDid?: string;
}

export interface ChallengeWindow {
  /** When the challenge window opens (ISO 8601). */
  opens: string;
  /** When the challenge window closes (ISO 8601). */
  closes: string;
  /** Arbiter DID/URI, if configured. */
  arbiter?: string;
}

// ─── Module D: Economic ──────────────────────────────────────────────────────

/**
 * For exits involving assets or financial obligations.
 *
 * ⚠️ **SECURITIES DISCLAIMER**: The contents of Module D asset manifests may
 * constitute securities disclosures depending on the nature of the assets
 * referenced. If `assetManifest` entries reference tokens, shares, investment
 * contracts, or other instruments that could be classified as securities under
 * the Howey test (SEC v. W.J. Howey Co., 1946) or equivalent international
 * frameworks, additional regulatory obligations may apply to platforms that
 * display, aggregate, or make decisions based on this data.
 *
 * Cellar Door EXIT does NOT provide legal, financial, or securities advice.
 * This module is a data transport mechanism only. Consult qualified counsel
 * before using Module D data in any context where securities law may apply.
 *
 * See: assessments/howey-module-d-v2.md for detailed analysis.
 */
export interface ModuleD {
  /** Assets being ported (type + amount + destination, as references). */
  assetManifest?: AssetReference[];
  /** Obligations resolved at exit. */
  settledObligations?: string[];
  /** Obligations NOT resolved (with escrow references). */
  pendingObligations?: string[];
  /** Cost of exit. */
  exitFee?: ExitFee;
}

export interface AssetReference {
  type: string;
  amount: string;
  destination: string;
}

export interface ExitFee {
  amount: string;
  recipient: string;
}

// ─── Module E: Metadata / Narrative ──────────────────────────────────────────

/** Human-readable context for the exit. */
export interface ModuleE {
  /** Free-text reason for departure. */
  reason?: string;
  /** Human-readable summary of exit circumstances. */
  narrative?: string;
  /** Domain-specific labels. */
  tags?: string[];
  /** Language of narrative fields. */
  locale?: string;
}

// ─── Module F: Cross-Domain Anchoring ────────────────────────────────────────

/** For exits that need to be verifiable across chains or systems. */
export interface ModuleF {
  /** On-chain anchoring points. */
  anchors?: ChainAnchor[];
  /** Entries in external registries or certificate transparency logs. */
  registryEntries?: string[];
}

export interface ChainAnchor {
  chain: string;
  txHash: string;
  blockHeight?: number;
}

// ─── Ceremony Artifacts ──────────────────────────────────────────────────────

/** Produced at INTENT state. Signed by subject. */
export interface ExitIntent {
  subject: string;
  origin: string;
  timestamp: string;
  exitType: ExitType;
  reason?: string;
  proof: DataIntegrityProof;
}

/** Post-hoc successor designation, linked to an existing EXIT marker. */
export interface SuccessorAmendment {
  /** ID of the original EXIT marker. */
  exitMarkerId: string;
  /** The designated successor. */
  successor: string;
  /** When the amendment was created. */
  timestamp: string;
  /** Signed by the original subject's key. */
  proof: DataIntegrityProof;
}

// ─── Ceremony Roles ──────────────────────────────────────────────────────────

export enum CeremonyRole {
  /** The entity departing. Signs the EXIT marker. Always required. */
  Subject = "subject",
  /** The system being exited. May co-sign, contest, or be absent. */
  Origin = "origin",
  /** Neutral third party that can attest to ceremony steps. */
  Witness = "witness",
  /** Any future party that checks the EXIT marker. Not present during ceremony. */
  Verifier = "verifier",
  /** Entity designated to inherit continuity. */
  Successor = "successor",
}

// ─── Successor Trust Levels ──────────────────────────────────────────────────

export enum SuccessorTrustLevel {
  /** Subject designates successor in Module A. Low trust. */
  SelfAppointed = "self_appointed",
  /** Successor co-signs an acceptance attestation. Medium trust. */
  CrossSigned = "cross_signed",
  /** Third party attests to the transition. High trust. */
  Witnessed = "witnessed",
}

// ─── Status Confirmation (Mechanism Design: Graduated Status) ────────────────

/**
 * How the exit status was confirmed. Addresses the Akerlof lemons problem:
 * self-attestation alone is cheap talk. Higher confirmation levels require
 * cooperation between parties, creating costly signals.
 */
export enum StatusConfirmation {
  /** Subject claims status, no independent verification. Lowest trust. */
  SelfOnly = "self_only",
  /** Origin attested status without subject claim (e.g., forced exit). */
  OriginOnly = "origin_only",
  /** Both subject and origin agree on status. Strong signal. */
  Mutual = "mutual",
  /** A third-party witness confirmed the exit circumstances. Strongest. */
  Witnessed = "witnessed",
  /** Origin disputes the subject's claimed status. */
  DisputedByOrigin = "disputed_by_origin",
  /** Subject disputes the origin's attested status. */
  DisputedBySubject = "disputed_by_subject",
}

// ─── Tenure Attestation (Mechanism Design: Time-Weighted Trust) ──────────────

/**
 * Attestation of how long an agent was present at the origin.
 * Tenure is a costly signal — it can't be faked without time investment.
 */
export interface TenureAttestation {
  /** ISO 8601 duration (e.g., "P365D" for 365 days, "P2Y3M" for 2 years 3 months). */
  duration: string;
  /** When the agent first joined the origin (ISO 8601 UTC). */
  startDate: string;
  /** Who is attesting to the tenure: the subject or the origin. */
  attestedBy: "subject" | "origin";
  /** Signature over the tenure claim (by the attesting party). */
  signature: string;
  /** DID of the attesting party. */
  attesterDid: string;
}

// ─── Commit-Reveal (Mechanism Design: Front-Running Prevention) ──────────────

/**
 * A cryptographic commitment to exit intent, published before the reveal.
 * Prevents origins from front-running exits with retaliatory status changes.
 *
 * Flow:
 *   1. Agent creates ExitIntent, computes commitment = SHA256(canonicalize(intent))
 *   2. Agent publishes commitment (just the hash + timestamp)
 *   3. After revealAfter, agent reveals the full intent
 *   4. Verifiers check: commitment was published before any retaliatory origin action
 */
export interface ExitCommitment {
  /** SHA-256 hash of the canonicalized ExitIntent. */
  commitmentHash: string;
  /** When the commitment was created (ISO 8601 UTC). */
  committedAt: string;
  /** Earliest time the full intent may be revealed (ISO 8601 UTC). */
  revealAfter: string;
  /** DID of the committing party (must match the intent subject). */
  committerDid: string;
  /** Signature over the commitment fields. */
  proof: DataIntegrityProof;
}

// ─── Confidence Scoring (Mechanism Design: Trust Aggregation) ────────────────

/**
 * Factors used to compute a confidence score for an EXIT marker.
 * Verifiers can use these to make risk-based decisions.
 */
export interface ConfidenceFactors {
  /** Confirmation level of the status claim. */
  statusConfirmation: StatusConfirmation;
  /** Tenure duration in days (0 if unknown). */
  tenureDays: number;
  /** Whether tenure was mutually attested. */
  tenureMutuallyAttested: boolean;
  /** Depth of the lineage chain (0 if no lineage). */
  lineageDepth: number;
  /** Whether a valid commit-reveal was present. */
  hasCommitReveal: boolean;
}

/**
 * Computed confidence score with breakdown.
 */
export interface ConfidenceScore {
  /** Overall confidence 0.0–1.0. */
  score: number;
  /** Human-readable confidence level. */
  level: "none" | "low" | "moderate" | "high" | "very_high";
  /** Breakdown of contributing factors. */
  factors: ConfidenceFactors;
}

// ─── Constants ───────────────────────────────────────────────────────────────

// ─── KERI Key Management Types ───────────────────────────────────────────────

/** Current key state derived from walking the key event log. */
export interface KeyState {
  did: string;
  currentKeys: Uint8Array[];
  nextKeyDigests: string[];
  sequenceNumber: number;
  delegator?: string;
  witnesses?: string[];
}

/** Key rotation event — replaces current keys and commits to next. */
export interface KeyRotationEvent {
  type: "rotation";
  prior: string;
  current: Uint8Array[];
  next: string[];
  sequenceNumber: number;
  timestamp: string;
  signature: string;
}

/** Inception event — creates a new key event log. */
export interface InceptionEvent {
  type: "inception";
  identifier: string;
  keys: Uint8Array[];
  nextKeyDigests: string[];
  witnesses?: string[];
  timestamp: string;
  signature: string;
}

/** Union of all key event types. */
export type KeyEvent = InceptionEvent | KeyRotationEvent;

/** Record linking compromised markers to a compromise event. */
export interface CompromiseLink {
  compromiseMarkerId: string;
  affectedMarkerIds: string[];
  timestamp: string;
}

// ─── Ethics & Guardrail Types ────────────────────────────────────────────────

/** Coercion labels that can be attached to markers by ethics analysis. */
export enum CoercionLabel {
  PossibleRetaliation = "possible_retaliation",
  ConflictingStatusSignals = "conflicting_status_signals",
  SuspiciousEmergency = "suspicious_emergency",
  PatternOfAbuse = "pattern_of_abuse",
  NoCoercionDetected = "no_coercion_detected",
}

/** Right of reply — allows subject to attach a signed counter-narrative to an origin attestation. */
export interface RightOfReply {
  /** The subject's counter-narrative text. */
  replyText: string;
  /** DID or key URI of the signer. */
  signerKey: string;
  /** ISO 8601 timestamp of the reply. */
  timestamp: string;
  /** Signature over replyText by the signer. */
  signature: string;
}

/** Coercion detection results. */
export interface CoercionSignals {
  signals: string[];
  riskLevel: "none" | "low" | "medium" | "high";
  recommendation: string;
}

/** Weaponization pattern detection results. */
export interface WeaponizationSignals {
  patterns: string[];
  severity: "none" | "concerning" | "severe";
  affectedSubjects: string[];
}

/** Reputation laundering detection results. */
export interface LaunderingSignals {
  signals: string[];
  probability: "low" | "medium" | "high";
}

/** Sunset policy for marker expiration. */
export interface SunsetPolicy {
  /** Duration in days after which markers are considered expired. */
  durationDays: number;
  /** What happens on expiry: 'redact' removes details, 'flag' marks as expired. */
  action: "redact" | "flag";
}

/** Comprehensive ethics audit report. */
export interface EthicsReport {
  /** Timestamp of the report. */
  generatedAt: string;
  /** Number of markers analyzed. */
  markerCount: number;
  /** Coercion findings per marker. */
  coercionFindings: Array<{ markerId: string; signals: CoercionSignals }>;
  /** Weaponization patterns across all markers. */
  weaponization: WeaponizationSignals;
  /** Laundering signals per unique subject. */
  launderingFindings: Array<{ subjectDid: string; signals: LaunderingSignals }>;
  /** Aggregated recommendations. */
  recommendations: string[];
  /** Overall risk assessment. */
  overallRisk: "low" | "medium" | "high" | "critical";
}

export const EXIT_CONTEXT_V1 = "https://cellar-door.dev/exit/v1" as const;
export const EXIT_SPEC_VERSION = "1.1" as const;
