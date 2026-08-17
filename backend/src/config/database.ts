import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV } from './env';

/**
 * Backend-only Supabase Service Client.
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass Row Level Security for authorized backend operations.
 */
let supabaseAdminInstance: SupabaseClient | null = null;

export function getDbClient(): SupabaseClient {
  if (!supabaseAdminInstance) {
    if (!ENV.SUPABASE_URL || !ENV.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('⚠️ Supabase service credentials missing in server environment. Using local mock store.');
    } else {
      const maskedKey = ENV.SUPABASE_SERVICE_ROLE_KEY.slice(0, 8) + '...' + ENV.SUPABASE_SERVICE_ROLE_KEY.slice(-6);
      console.log(`🔌 [Database] Connected to Supabase Host: ${ENV.SUPABASE_URL} (Key: ${maskedKey})`);
    }
    supabaseAdminInstance = createClient(
      ENV.SUPABASE_URL,
      ENV.SUPABASE_SERVICE_ROLE_KEY,
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
