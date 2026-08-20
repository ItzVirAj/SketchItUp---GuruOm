import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV } from './env';

/**
 * Backend-only Supabase Service Client.
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass Row Level Security for authorized backend operations.
 */
let supabaseAdminInstance: SupabaseClient | null = null;

export function getDbClient(): SupabaseClient {
  if (!supabaseAdminInstance) {
    const url = ENV.SUPABASE_URL || 'https://txztwjvjqjczxwskzjjx.supabase.co';
    const key = ENV.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_fallback_for_offline';
    
    if (!ENV.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('⚠️ Supabase service credentials missing in server environment. Using offline mock client.');
    } else {
      const maskedKey = key.slice(0, 8) + '...' + key.slice(-6);
      console.log(`🔌 [Database] Connected to Supabase Host: ${url} (Key: ${maskedKey})`);
    }

    supabaseAdminInstance = createClient(
      url,
      key,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
  }
  return supabaseAdminInstance;
}

