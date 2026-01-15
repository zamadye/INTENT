// Daily Task Generation System
// Uses wallet address + date as seed for deterministic randomization per user per day

import { arcDapps, ArcDApp, DAppCategory } from '@/data/arcDapps';

export interface DailyTask {
  id: string;
  dapp: ArcDApp;
  action: string;
  actionVerb: string;
  minAmount?: number;
  completed: boolean;
  verificationStatus: 'pending' | 'verified' | 'failed';
  verifiedAt?: string;
  txHash?: string;
}

export interface DailyTaskSet {
  date: string; // YYYY-MM-DD
  walletAddress: string;
  tasks: DailyTask[];
  allCompleted: boolean;
  seed: number;
}

// Action types per category
const CATEGORY_ACTIONS: Record<string, { action: string; verb: string }[]> = {
  [DAppCategory.DEFI]: [
    { action: 'Lend USDC', verb: 'lend' },
    { action: 'Borrow against collateral', verb: 'borrow' },
    { action: 'Supply liquidity', verb: 'supply' },
  ],
  [DAppCategory.YIELD]: [
    { action: 'Stake for yield', verb: 'stake' },
    { action: 'Deposit into vault', verb: 'deposit' },
    { action: 'Claim rewards', verb: 'claim' },
  ],
  [DAppCategory.BRIDGE]: [
    { action: 'Bridge USDC', verb: 'bridge' },
    { action: 'Cross-chain transfer', verb: 'transfer' },
  ],
  [DAppCategory.EXCHANGE]: [
    { action: 'Swap tokens', verb: 'swap' },
    { action: 'Trade USDC', verb: 'trade' },
  ],
  [DAppCategory.ECOSYSTEM]: [
    { action: 'Swap on ArcFlow', verb: 'swap' },
    { action: 'Add liquidity', verb: 'provide_lp' },
    { action: 'Bridge via ArcFlow', verb: 'bridge' },
  ],
  [DAppCategory.LIQUIDITY]: [
    { action: 'Provide liquidity', verb: 'provide_lp' },
    { action: 'Market make', verb: 'trade' },
  ],
  [DAppCategory.PAYMENT]: [
    { action: 'Make payment', verb: 'pay' },
    { action: 'Transfer USDC', verb: 'transfer' },
  ],
  [DAppCategory.WALLET]: [
    { action: 'Connect wallet', verb: 'connect' },
  ],
  [DAppCategory.INFRASTRUCTURE]: [
    { action: 'Deploy contract', verb: 'deploy' },
  ],
  [DAppCategory.REGIONAL]: [
    { action: 'Convert stablecoin', verb: 'convert' },
  ],
};

// Simple hash function for seeding
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Seeded random number generator
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

// Shuffle array with seed
function shuffleWithSeed<T>(array: T[], random: () => number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get today's date string
export function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Generate deterministic daily tasks for a wallet
export function generateDailyTasks(
  walletAddress: string,
  date: string = getTodayDateString(),
  taskCount: number = 3
): DailyTaskSet {
  // Create seed from wallet + date
  const seedString = `${walletAddress.toLowerCase()}-${date}`;
  const seed = hashCode(seedString);
  const random = seededRandom(seed);

  // Filter to verified dApps with app links
  const eligibleDapps = arcDapps.filter(
    dapp => dapp.verified && dapp.links.app && dapp.category !== DAppCategory.WALLET
  );

  // Shuffle and pick
  const shuffled = shuffleWithSeed(eligibleDapps, random);
  const selectedDapps = shuffled.slice(0, taskCount);

  // Generate tasks
  const tasks: DailyTask[] = selectedDapps.map((dapp, index) => {
    const categoryActions = CATEGORY_ACTIONS[dapp.category] || [
      { action: 'Interact with', verb: 'interact' }
    ];
    const actionIndex = Math.floor(random() * categoryActions.length);
    const selectedAction = categoryActions[actionIndex];

    return {
      id: `${date}-${walletAddress.slice(0, 8)}-${index}`,
      dapp,
      action: `${selectedAction.action} on ${dapp.name}`,
      actionVerb: selectedAction.verb,
      minAmount: dapp.category === DAppCategory.DEFI || 
                 dapp.category === DAppCategory.BRIDGE ? 10 : undefined,
      completed: false,
      verificationStatus: 'pending' as const,
    };
  });

  return {
    date,
    walletAddress,
    tasks,
    allCompleted: false,
    seed,
  };
}

// Check if all tasks are completed
export function areAllTasksCompleted(taskSet: DailyTaskSet): boolean {
  return taskSet.tasks.every(task => task.verificationStatus === 'verified');
}

// Get task context for caption generation
export function getTaskContextForCaption(taskSet: DailyTaskSet): {
  dapps: string[];
  actions: string[];
  categories: string[];
} {
  const verifiedTasks = taskSet.tasks.filter(t => t.verificationStatus === 'verified');
  
  return {
    dapps: verifiedTasks.map(t => t.dapp.name),
    actions: verifiedTasks.map(t => t.actionVerb),
    categories: [...new Set(verifiedTasks.map(t => t.dapp.category))],
  };
}

// Storage key for persisting task state
export function getTaskStorageKey(walletAddress: string, date: string): string {
  return `daily-tasks-${walletAddress.toLowerCase()}-${date}`;
}

// Save task state to localStorage
export function saveTaskState(taskSet: DailyTaskSet): void {
  const key = getTaskStorageKey(taskSet.walletAddress, taskSet.date);
  localStorage.setItem(key, JSON.stringify(taskSet));
}

// Load task state from localStorage
export function loadTaskState(walletAddress: string, date: string = getTodayDateString()): DailyTaskSet | null {
  const key = getTaskStorageKey(walletAddress, date);
  const saved = localStorage.getItem(key);
  if (!saved) return null;
  
  try {
    const parsed = JSON.parse(saved);
    // Regenerate dapp references from IDs
    const regenerated = generateDailyTasks(walletAddress, date);
    
    // Merge saved verification states
    parsed.tasks.forEach((savedTask: DailyTask, idx: number) => {
      if (regenerated.tasks[idx]) {
        regenerated.tasks[idx].completed = savedTask.completed;
        regenerated.tasks[idx].verificationStatus = savedTask.verificationStatus;
        regenerated.tasks[idx].verifiedAt = savedTask.verifiedAt;
        regenerated.tasks[idx].txHash = savedTask.txHash;
      }
    });
    
    regenerated.allCompleted = areAllTasksCompleted(regenerated);
    return regenerated;
  } catch {
    return null;
  }
}
