// =============================================
// INTENT Platform - Badge Evaluation Service
// Event-driven badge unlocking system
// =============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BadgeCriteria {
  min_transactions?: number;
  min_consecutive_days?: number;
  min_protocols?: number;
  verified_on_chain?: boolean;
  first_24h_launch?: boolean;
  mainnet_first_24h?: boolean;
  protocol?: string;
  within_days?: number;
  state_1?: { shares: number };
  state_2?: { shares: number };
  state_3?: { shares: number; engagement: number };
}

interface UserProgress {
  user_id: string;
  wallet_address: string;
  total_transactions: number;
  unique_protocols: number;
  protocols_interacted: string[];
  consecutive_days: number;
  last_active_date: string | null;
  max_consecutive_days: number;
  social_shares: number;
  total_engagement: number;
  voice_state: number;
  intent_score: number;
  current_identity_badge: string | null;
}

interface Badge {
  id: string;
  slug: string;
  name: string;
  layer: string;
  rarity: string;
  criteria: BadgeCriteria;
  is_progression: boolean;
  progression_order: number | null;
  event_window_start: string | null;
  event_window_end: string | null;
}

// Calculate intent score (0-10)
function calculateIntentScore(progress: UserProgress): number {
  let score = 0;
  
  // Transactions (max 2 points)
  score += Math.min(progress.total_transactions / 50, 2);
  
  // Protocols (max 2 points)
  score += Math.min(progress.unique_protocols / 5, 2);
  
  // Consecutive days (max 3 points)
  score += Math.min(progress.consecutive_days / 10, 3);
  
  // Max consecutive (max 2 points)
  score += Math.min(progress.max_consecutive_days / 15, 2);
  
  // Social engagement (max 1 point)
  score += Math.min(progress.social_shares / 10, 1);
  
  return Math.min(score, 10);
}

// Check if user meets badge criteria
function checkBadgeCriteria(badge: Badge, progress: UserProgress): boolean {
  const criteria = badge.criteria;
  
  // Identity badges
  if (criteria.min_transactions && progress.total_transactions < criteria.min_transactions) {
    return false;
  }
  
  if (criteria.min_consecutive_days && progress.consecutive_days < criteria.min_consecutive_days) {
    return false;
  }
  
  if (criteria.min_protocols && progress.unique_protocols < criteria.min_protocols) {
    return false;
  }
  
  // Proof badges
  if (criteria.verified_on_chain && progress.total_transactions < 1) {
    return false;
  }
  
  // Event badges (check time window)
  if (badge.event_window_start && badge.event_window_end) {
    const now = new Date();
    const start = new Date(badge.event_window_start);
    const end = new Date(badge.event_window_end);
    
    if (now < start || now > end) {
      return false;
    }
  }
  
  return true;
}

// Get current voice state based on progress
function getVoiceState(progress: UserProgress): number {
  if (progress.social_shares >= 10 && progress.total_engagement >= 100) {
    return 3;
  }
  if (progress.social_shares >= 5) {
    return 2;
  }
  if (progress.social_shares >= 1) {
    return 1;
  }
  return 0;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { action, userId, walletAddress, eventData } = await req.json();
    
    if (!userId || !walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or walletAddress' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[badge-service] Processing ${action} for wallet ${walletAddress}`);
    
    // Get or create user progress
    let { data: progress, error: progressError } = await supabase
      .from('user_badge_progress')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (progressError && progressError.code === 'PGRST116') {
      // Create new progress record
      const { data: newProgress, error: createError } = await supabase
        .from('user_badge_progress')
        .insert({
          user_id: userId,
          wallet_address: walletAddress,
        })
        .select()
        .single();
      
      if (createError) throw createError;
      progress = newProgress;
    } else if (progressError) {
      throw progressError;
    }
    
    // Handle different event types
    switch (action) {
      case 'transaction': {
        // Update transaction stats
        const { protocol, txHash } = eventData || {};
        
        const protocols = progress.protocols_interacted || [];
        if (protocol && !protocols.includes(protocol)) {
          protocols.push(protocol);
        }
        
        // Update consecutive days
        const today = new Date().toISOString().split('T')[0];
        const lastActive = progress.last_active_date;
        let consecutiveDays = progress.consecutive_days || 0;
        
        if (lastActive !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          
          if (lastActive === yesterdayStr) {
            consecutiveDays += 1;
          } else if (lastActive !== today) {
            consecutiveDays = 1;
          }
        }
        
        const maxConsecutive = Math.max(progress.max_consecutive_days || 0, consecutiveDays);
        
        const { error: updateError } = await supabase
          .from('user_badge_progress')
          .update({
            total_transactions: (progress.total_transactions || 0) + 1,
            unique_protocols: protocols.length,
            protocols_interacted: protocols,
            consecutive_days: consecutiveDays,
            last_active_date: today,
            max_consecutive_days: maxConsecutive,
          })
          .eq('user_id', userId);
        
        if (updateError) throw updateError;
        
        // Refresh progress
        progress = {
          ...progress,
          total_transactions: (progress.total_transactions || 0) + 1,
          unique_protocols: protocols.length,
          protocols_interacted: protocols,
          consecutive_days: consecutiveDays,
          last_active_date: today,
          max_consecutive_days: maxConsecutive,
        };
        break;
      }
      
      case 'social_share': {
        // Update social stats
        const { engagement } = eventData || {};
        
        const { error: updateError } = await supabase
          .from('user_badge_progress')
          .update({
            social_shares: (progress.social_shares || 0) + 1,
            total_engagement: (progress.total_engagement || 0) + (engagement || 0),
            voice_state: getVoiceState({
              ...progress,
              social_shares: (progress.social_shares || 0) + 1,
              total_engagement: (progress.total_engagement || 0) + (engagement || 0),
            }),
          })
          .eq('user_id', userId);
        
        if (updateError) throw updateError;
        
        progress = {
          ...progress,
          social_shares: (progress.social_shares || 0) + 1,
          total_engagement: (progress.total_engagement || 0) + (engagement || 0),
        };
        break;
      }
    }
    
    // Get all active badges
    const { data: badges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .eq('is_active', true);
    
    if (badgesError) throw badgesError;
    
    // Get user's existing unlocks
    const { data: unlocks, error: unlocksError } = await supabase
      .from('badge_unlocks')
      .select('badge_id')
      .eq('user_id', userId);
    
    if (unlocksError) throw unlocksError;
    
    const unlockedBadgeIds = new Set(unlocks?.map(u => u.badge_id) || []);
    const newUnlocks: string[] = [];
    
    // Check each badge
    for (const badge of badges || []) {
      if (unlockedBadgeIds.has(badge.id)) continue;
      
      if (checkBadgeCriteria(badge, progress as UserProgress)) {
        // Unlock the badge
        const { error: unlockError } = await supabase
          .from('badge_unlocks')
          .insert({
            user_id: userId,
            wallet_address: walletAddress,
            badge_id: badge.id,
            trigger_event: action,
            trigger_tx_hash: eventData?.txHash || null,
          });
        
        if (!unlockError) {
          newUnlocks.push(badge.slug);
          console.log(`[badge-service] Unlocked badge: ${badge.name} for ${walletAddress}`);
        }
      }
    }
    
    // Update intent score and current identity badge
    const intentScore = calculateIntentScore(progress as UserProgress);
    
    // Find highest unlocked identity badge
    const identityBadges = (badges || [])
      .filter(b => b.layer === 'identity' && b.is_progression)
      .sort((a, b) => (b.progression_order || 0) - (a.progression_order || 0));
    
    let currentIdentityBadge = null;
    for (const badge of identityBadges) {
      if (unlockedBadgeIds.has(badge.id) || newUnlocks.includes(badge.slug)) {
        currentIdentityBadge = badge.slug;
        break;
      }
    }
    
    await supabase
      .from('user_badge_progress')
      .update({
        intent_score: intentScore,
        current_identity_badge: currentIdentityBadge,
      })
      .eq('user_id', userId);
    
    return new Response(
      JSON.stringify({
        success: true,
        newUnlocks,
        intentScore,
        currentIdentityBadge,
        progress: {
          totalTransactions: progress.total_transactions,
          uniqueProtocols: progress.unique_protocols,
          consecutiveDays: progress.consecutive_days,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[badge-service] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});