// Campaign State Machine
export enum CampaignState {
  DRAFT = 'draft',
  GENERATED = 'generated',
  FINALIZED = 'finalized',
  SHARED = 'shared'
}

// Intent Categories (on-chain enum mapping)
export enum IntentCategory {
  Builder = 0,
  DeFi = 1,
  Social = 2,
  Infrastructure = 3
}

export interface CampaignArtifact {
  caption: string;
  imageUrl: string | null;
  captionHash: string;
  artifactHash: string;
  finalizedAt: string | null;
}

export interface CampaignIntent {
  category: IntentCategory;
  targetDApps: string[];
  actionOrder: string[];
  timeWindow: 'none' | '24h' | '1week' | '1month';
  fingerprint: string;
}

export interface Campaign {
  id: string;
  walletAddress: string;
  state: CampaignState;
  intent: CampaignIntent;
  artifact: CampaignArtifact;
  createdAt: string;
  updatedAt: string;
}

export interface IntentProof {
  campaignId: string;
  userAddress: string;
  campaignHash: string;
  timestamp: number;
  txHash: string | null;
}

// Validation helpers
export function isStateTransitionValid(from: CampaignState, to: CampaignState): boolean {
  const validTransitions: Record<CampaignState, CampaignState[]> = {
    [CampaignState.DRAFT]: [CampaignState.GENERATED],
    [CampaignState.GENERATED]: [CampaignState.FINALIZED, CampaignState.DRAFT],
    [CampaignState.FINALIZED]: [CampaignState.SHARED],
    [CampaignState.SHARED]: []
  };
  
  return validTransitions[from]?.includes(to) ?? false;
}

export function canEditArtifact(state: CampaignState): boolean {
  return state === CampaignState.GENERATED;
}

export function canRegenerate(state: CampaignState): boolean {
  return state === CampaignState.DRAFT || state === CampaignState.GENERATED;
}

export function canFinalize(state: CampaignState): boolean {
  return state === CampaignState.GENERATED;
}

export function canShare(state: CampaignState): boolean {
  return state === CampaignState.FINALIZED || state === CampaignState.SHARED;
}
