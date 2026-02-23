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
} from "./types.js";

export {
  generateKeyPair,
  sign,
  verify,
  didFromPublicKey,
  publicKeyFromDid,
} from "./crypto.js";

export {
  createMarker,
  computeId,
  canonicalize,
  addModule,
} from "./marker.js";

export { signMarker, verifyMarker } from "./proof.js";

export { validateMarker } from "./validate.js";

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
  type BatchExit,
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

// Sprint 5: Key Compromise Recovery
export {
  createCompromiseMarker,
  verifyCompromiseRecovery,
  linkCompromisedMarkers,
} from "./key-compromise.js";
