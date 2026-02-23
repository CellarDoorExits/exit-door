export { createLineageModule, verifyLineageChain, bindSuccessor } from "./lineage.js";
export type { CreateLineageOpts } from "./lineage.js";

export { createReputationModule, signEndorsement } from "./reputation.js";
export type { ReputationModule, Endorsement, CreateReputationOpts } from "./reputation.js";

export { createOriginAttestation, signAttestation } from "./origin-attestation.js";
export type { OriginAttestationModule, CreateOriginAttestationOpts } from "./origin-attestation.js";

export { createAssetManifest } from "./assets.js";
export type { AssetManifestModule, Asset, AssetType, CreateAssetOpts } from "./assets.js";

export { createContinuityModule } from "./continuity.js";
export type { ContinuityModule, CreateContinuityOpts } from "./continuity.js";
export type { ContinuityProofType as ContinuityModuleProofType } from "./continuity.js";

export { createDisputeModule } from "./dispute.js";
export type { DisputeModule, DisputeType, ResolutionStatus, CreateDisputeOpts } from "./dispute.js";

export {
  computeStatusConfirmation,
  createTenureAttestation,
  verifyTenureAttestation,
  parseDurationToDays,
  createCommitment,
  verifyCommitment,
  isRevealWindowOpen,
  extractConfidenceFactors,
  computeConfidence,
} from "./trust.js";
