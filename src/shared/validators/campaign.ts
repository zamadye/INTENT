import { CampaignState, CampaignIntent, CampaignArtifact, IntentCategory } from '../types/campaign';
import { validateCaption, FORBIDDEN_CLAIMS } from '../constants/constraints';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Validate intent data
export function validateIntent(intent: Partial<CampaignIntent>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Category validation
  if (intent.category === undefined || intent.category === null) {
    errors.push('Intent category is required');
  } else if (!Object.values(IntentCategory).includes(intent.category)) {
    errors.push('Invalid intent category');
  }
  
  // Target dApps validation
  if (!intent.targetDApps || intent.targetDApps.length < 2) {
    errors.push('At least 2 target dApps are required');
  } else if (intent.targetDApps.length > 5) {
    warnings.push('More than 5 target dApps may dilute focus');
  }
  
  // Action order validation
  if (!intent.actionOrder || intent.actionOrder.length < 3) {
    errors.push('At least 3 actions are required in the action order');
  }
  
  // Time window validation
  const validTimeWindows = ['none', '24h', '1week', '1month'];
  if (intent.timeWindow && !validTimeWindows.includes(intent.timeWindow)) {
    errors.push('Invalid time window');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Validate artifact data
export function validateArtifact(artifact: Partial<CampaignArtifact>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!artifact.caption) {
    errors.push('Caption is required');
  } else {
    const captionValidation = validateCaption(artifact.caption);
    errors.push(...captionValidation.errors);
  }
  
  if (!artifact.imageUrl) {
    warnings.push('Image URL is missing - campaign may have reduced engagement');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Validate state transition
export function validateStateTransition(
  currentState: CampaignState,
  targetState: CampaignState,
  intent?: CampaignIntent,
  artifact?: CampaignArtifact
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check valid transitions
  const validTransitions: Record<CampaignState, CampaignState[]> = {
    [CampaignState.DRAFT]: [CampaignState.GENERATED],
    [CampaignState.GENERATED]: [CampaignState.FINALIZED, CampaignState.DRAFT],
    [CampaignState.FINALIZED]: [CampaignState.SHARED],
    [CampaignState.SHARED]: []
  };
  
  if (!validTransitions[currentState]?.includes(targetState)) {
    errors.push(`Invalid state transition from ${currentState} to ${targetState}`);
    return { valid: false, errors, warnings };
  }
  
  // Additional checks for specific transitions
  if (targetState === CampaignState.FINALIZED) {
    // Must have valid intent for finalization
    if (intent) {
      const intentValidation = validateIntent(intent);
      errors.push(...intentValidation.errors);
      warnings.push(...intentValidation.warnings);
    } else {
      errors.push('Intent data is required for finalization');
    }
    
    // Must have valid artifact for finalization
    if (artifact) {
      const artifactValidation = validateArtifact(artifact);
      errors.push(...artifactValidation.errors);
      warnings.push(...artifactValidation.warnings);
    } else {
      errors.push('Artifact data is required for finalization');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Check if content is safe for publishing
export function validateContentSafety(caption: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const lowerCaption = caption.toLowerCase();
  
  // Check forbidden claims
  for (const forbidden of FORBIDDEN_CLAIMS) {
    if (lowerCaption.includes(forbidden.toLowerCase())) {
      errors.push(`Content contains prohibited claim: "${forbidden}"`);
    }
  }
  
  // Check for potential issues
  if (lowerCaption.includes('nfa') || lowerCaption.includes('not financial advice')) {
    warnings.push('Disclaimer detected - ensure content is not making financial claims');
  }
  
  if (lowerCaption.includes('dyor')) {
    warnings.push('DYOR detected - ensure content is educational, not promotional');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
