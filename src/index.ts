export {
  // Enums
  ExitType,
  ExitStatus,
  CeremonyState,
  CeremonyRole,
  ContinuityProofType,
  SuccessorTrustLevel,

  // Core types
  type ExitMarker,
  type DataIntegrityProof,
  type LegalHold,

  // Mechanism design types
  StatusConfirmation,
  type TenureAttestation,
  type ExitCommitment,
  type ConfidenceFactors,
  type ConfidenceScore,

  // Module types
  type ModuleA,
  type ModuleB,
  type ModuleC,
  type ModuleD,
  type ModuleE,
  type ModuleF,

  // Module subtypes
  type CompletenessAttestation,
  type ContinuityProof,
  type Dispute,
  type ChallengeWindow,
  type AssetReference,
  type ExitFee,
  type ChainAnchor,

  // Ceremony artifacts
  type ExitIntent,
  type SuccessorAmendment,

  // KERI types
  type KeyState,
  type KeyRotationEvent,
  type InceptionEvent,
  type KeyEvent,
  type CompromiseLink,

  // Trust enhancer types (conduit-only)
  type TrustEnhancers,
  type TimestampAttachment,
  type WitnessAttachment,
  type IdentityClaimAttachment,

  // Ethics & guardrail types
  CoercionLabel,
  type RightOfReply,
  type CoercionSignals,
  type WeaponizationSignals,
  type LaunderingSignals,
  type SunsetPolicy,
  type EthicsReport,

  // Constants
  EXIT_CONTEXT_V1,
  EXIT_SPEC_VERSION,
} from "./types.js";

export {
  generateKeyPair,
  sign,
  verify,
  didFromPublicKey,
  publicKeyFromDid,
  generateP256KeyPair,
  signP256,
  verifyP256,
  didFromP256PublicKey,
  publicKeyFromP256Did,
  algorithmFromDid,
} from "./crypto.js";

// Signer abstraction
export {
  type SignatureAlgorithm,
  type Signer,
  type SignerOptions,
  Ed25519Signer,
  P256Signer,
  createSigner,
  createVerifier,
  generateKeyPairForAlgorithm,
  proofTypeForAlgorithm,
  algorithmFromProofType,
} from "./signer.js";

export {
  createMarker,
  computeId,
  canonicalize,
  addModule,
} from "./marker.js";

/** @deprecated Use `signDepartureMarker` from passage API instead */
export { signMarker, verifyMarker, signMarkerWithSigner, verifyMarkerMultiAlg, verifyTrustEnhancers, type VerificationResult } from "./proof.js";

export { validateMarker, type ValidationResult } from "./validate.js";

export { CeremonyStateMachine, getValidTransitions } from "./ceremony.js";

// Errors
export {
  ExitError,
  ValidationError,
  SigningError,
  VerificationError,
  CeremonyError,
  StorageError,
} from "./errors.js";

// Convenience
export {
  generateIdentity,
  quickExit,
  quickVerify,
  fromJSON,
  toJSON,
  type Identity,
  type QuickExitOpts,
  type QuickExitResult,
} from "./convenience.js";

// Sprint 2: Context
export { EXIT_CONTEXT, getContext } from "./context.js";

// Sprint 2: VC Wrapper
export { wrapAsVC, unwrapVC, isVC, VC_CONTEXT, type ExitVerifiableCredential } from "./vc.js";

// Sprint 2: Modules
export * from "./modules/index.js";

// Sprint 3: Anchoring
export {
  computeAnchorHash,
  createAnchorRecord,
  verifyAnchorRecord,
  createMinimalAnchor,
  type MinimalAnchorRecord,
  type AnchorRecord,
} from "./anchor.js";

// Sprint 3: Storage
export {
  saveMarker,
  loadMarker,
  listMarkers,
  exportMarker,
  importMarker,
} from "./storage.js";

// Sprint 3: Chain Adapters
export {
  type ChainAdapter,
  type AnchorMetadata,
  type AnchorResult,
  MockChainAdapter,
  FileChainAdapter,
} from "./chain.js";

// Sprint 3: Privacy
export {
  encryptMarker,
  decryptMarker,
  redactMarker,
  createMinimalDisclosure,
  type EncryptedMarkerBlob,
} from "./privacy.js";

// Sprint 4: DID Resolution
export {
  resolveDid,
  isDid,
  didMethod,
  createDidDocument,
  resolveDidKeri,
  createDidKeri,
  type ResolvedDid,
  type DidMethod,
  type DidDocument,
} from "./resolver.js";

// Sprint 4: Registry
export { MarkerRegistry } from "./registry.js";

// Sprint 4: Batch Operations
export {
  createBatchExit,
  verifyBatchMembership,
  computeMerkleRoot,
  computeMerkleProof,
  createShutdownBatch,
  type BatchExit,
  type BatchShutdownCeremony,
  type MerkleProof,
} from "./batch.js";

// Sprint 4: Interop
export {
  createExitMiddleware,
  createExitHook,
  ExitEventEmitter,
  serializeForTransport,
  deserializeFromTransport,
  type ExitMiddlewareOpts,
  type ExitHookCallbacks,
  type ExitHook,
  type ExitEvent,
} from "./interop.js";

// Sprint 5: KERI Key Management
export {
  createInception,
  createRotation,
  verifyKeyState,
  isKeyCompromised,
  digestKey,
  KeyEventLog,
  type InceptionOpts,
} from "./keri.js";

// Sprint 5: Pre-Rotation
export {
  generatePreRotatedKeys,
  commitNextKey,
  verifyNextKeyCommitment,
  rotateKeys,
  type PreRotatedKeys,
  type RotationResult,
} from "./pre-rotation.js";

// Ethics & Guardrails
export {
  detectCoercion,
  detectWeaponization,
  detectReputationLaundering,
  generateEthicsReport,
} from "./ethics.js";

export {
  ANTI_WEAPONIZATION_CLAUSE,
  COERCION_LABELS,
  addCoercionLabel,
  addRightOfReply,
  validateEthicalCompliance,
  applySunset,
  isExpired,
  type EthicalComplianceResult,
} from "./guardrails.js";

// Sprint 6: Git Ledger
export {
  initLedger,
  anchorToGit,
  verifyLedgerEntry,
  listLedgerEntries,
  type GitLedgerConfig,
  type LedgerEntry,
} from "./git-ledger.js";

// Sprint 6: RFC 3161 Timestamp Authority
export {
  requestTimestamp,
  anchorWithTSA,
  verifyTSAReceipt,
  buildTimestampRequest,
  extractTimestampFromTSR,
  checkTSRStatus,
  type TSAReceipt,
} from "./tsa.js";

// Full Service
export {
  departAndAnchor,
  departAndVerify,
  type AnchorConfig,
  type PublicIdentity,
  type FullExitResult,
  type FullExitOpts,
  type TrustLevel,
  type VerifyResult,
} from "./full-service.js";

// Sprint 5: Key Compromise Recovery
export {
  createCompromiseMarker,
  verifyCompromiseRecovery,
  linkCompromisedMarkers,
  flagCompromisedPlatformMarkers,
  type PlatformCompromiseDeclaration,
} from "./key-compromise.js";

// Dispute Resolution
export {
  createDispute,
  resolveDispute,
  verifyDisputeResolution,
  isDisputed,
  getDisputeStatus,
  type DisputeRecord,
  type DisputeResolution,
  type DisputeState,
} from "./dispute.js";

// Visual — Door Hash visualization
export {
  renderDoorASCII,
  hashToColors,
  renderDoorSVG,
  shortHash,
} from "./visual.js";

// Passage API (v0.2.0 renamed surface)
export {
  createDepartureMarker,
  signDepartureMarker,
  signDepartureWithSigner,
  verifyDeparture,
  verifyDepartureMultiAlg,
  quickDeparture,
  quickPassageVerify,
  generatePassageIdentity,
  createPassage,
  verifyPassage,
  type DepartureMarker,
  type PassageProof,
  type PassageVerificationResult,
} from "./passage.js";

// Claim Store
export {
  MemoryClaimStore,
  ClaimType,
  claimFromMarker,
  claimsFromTrustEnhancers,
  ingestMarker,
  type StoredClaim,
  type ClaimQuery,
  type ClaimStoreStats,
  type ClaimStoreBackend,
} from "./claim-store.js";

// Telemetry (OpenTelemetry integration)
export {
  initTelemetry,
  resetTelemetry,
  startExitSpan,
  withSpan,
  withSpanAsync,
  instrumentedSignMarker,
  instrumentedVerifyMarker,
  instrumentedSignDepartureMarker,
  instrumentedVerifyDeparture,
  startCeremonySpan,
  type Tracer,
  type Span,
  type SpanOptions,
  type TelemetryConfig,
} from "./telemetry.js";
