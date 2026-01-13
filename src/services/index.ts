/**
 * Service layer exports
 * All backend interactions go through these services
 */

export { campaignService, CampaignState, IntentCategory } from './campaignService';
export type { Campaign, CreateCampaignParams, TransitionCampaignParams } from './campaignService';

export { artifactService } from './artifactService';
export type { Artifact, SharePayload, GenerateArtifactParams, FinalizeArtifactParams } from './artifactService';

export { proofService } from './proofService';
export type { IntentProof, ProofStats, RecordProofParams } from './proofService';
