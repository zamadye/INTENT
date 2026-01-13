// AI Generation Constraints - Backend enforces these, AI never decides them

export const MANDATORY_MENTIONS = ['@ArcFlowFinance'] as const;

export const MANDATORY_TOPICS = [
  'Arc Network',
  'USDC gas'
] as const;

export const FORBIDDEN_CLAIMS = [
  'airdrop guaranteed',
  'profit',
  'price increase',
  'guaranteed returns',
  'financial advice',
  '10x',
  '100x',
  'moon',
  'lambo',
  'rich',
  'free money',
  'investment advice'
] as const;

export const TONE_LIMITS = {
  maxHype: 0.6,
  minHumanNoise: 0.4
} as const;

export const MANDATORY_LINKS = {
  arcNetwork: 'https://arc.network',
  arcFlowFinance: 'https://arcflow.finance',
  testnet: 'https://testnet.arcscan.app'
} as const;

export const CAPTION_CONSTRAINTS = {
  maxLength: 280,
  minHashtags: 2,
  maxHashtags: 3,
  requiredHashtags: ['#ArcNetwork'],
  allowedHashtags: [
    '#ArcNetwork',
    '#USDC',
    '#Stablecoins',
    '#DeFi',
    '#Web3',
    '#Blockchain',
    '#Crypto',
    '#Fintech',
    '#Layer1',
    '#EVM'
  ]
} as const;

// Validation function for captions
export function validateCaption(caption: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (caption.length > CAPTION_CONSTRAINTS.maxLength) {
    errors.push(`Caption exceeds ${CAPTION_CONSTRAINTS.maxLength} characters`);
  }
  
  // Check for forbidden claims
  const lowerCaption = caption.toLowerCase();
  for (const forbidden of FORBIDDEN_CLAIMS) {
    if (lowerCaption.includes(forbidden.toLowerCase())) {
      errors.push(`Caption contains forbidden claim: "${forbidden}"`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Function to inject mandatory content (backend only)
export function injectMandatoryContent(
  rawCaption: string,
  targetDApps: string[]
): string {
  let enrichedCaption = rawCaption;
  
  // Add mandatory mention if not present
  if (!enrichedCaption.includes('@ArcFlowFinance')) {
    enrichedCaption = enrichedCaption.replace(/\n\n$/, '\n\n@ArcFlowFinance');
  }
  
  // Ensure Arc Network is mentioned
  if (!enrichedCaption.toLowerCase().includes('arc network') && 
      !enrichedCaption.toLowerCase().includes('#arcnetwork')) {
    enrichedCaption += '\n\n#ArcNetwork';
  }
  
  return enrichedCaption;
}
