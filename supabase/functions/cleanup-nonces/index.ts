import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Dedicated nonce cleanup edge function
 * Replaces probabilistic cleanup with deterministic execution
 * Should be called via scheduled job or cron
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Verify service role authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${supabaseServiceKey}`) {
      console.warn('[CleanupNonces] Unauthorized access attempt');
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Delete expired nonces
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('siwe_nonces')
      .delete()
      .lt('expires_at', now)
      .select('nonce');

    if (error) {
      console.error('[CleanupNonces] Deletion error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to cleanup nonces' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const deletedCount = data?.length || 0;
    console.log(`[CleanupNonces] Successfully cleaned up ${deletedCount} expired nonces`);

    // Get table health stats
    const { count: totalNonces } = await supabase
      .from('siwe_nonces')
      .select('*', { count: 'exact', head: true });

    return new Response(JSON.stringify({
      success: true,
      deleted: deletedCount,
      remaining: totalNonces || 0,
      cleanedAt: now,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[CleanupNonces] Unexpected error:', err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
