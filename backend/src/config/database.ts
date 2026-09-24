import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV } from './env';
import { logger } from '../utils/logger';

/**
 * Backend-only Supabase Service Client.
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass Row Level Security for authorized backend operations.
 */
let supabaseAdminInstance: SupabaseClient | null = null;

export function getDbClient(): SupabaseClient {
  if (!supabaseAdminInstance) {
    const url = ENV.SUPABASE_URL as string;
    const key = ENV.SUPABASE_SERVICE_ROLE_KEY as string;
    
    if (!ENV.SUPABASE_SERVICE_ROLE_KEY) {
      logger.warn('⚠️ Supabase service credentials missing in server environment. Using offline mock client.');
    } else {
      const maskedKey = key.slice(0, 8) + '...' + key.slice(-6);
      logger.info(`🔌 [Database] Connected to Supabase Host: ${url} (Key: ${maskedKey})`);
      try {
        const parts = key.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          if (payload?.role === 'anon') {
            logger.warn('⚠️ [Database] SUPABASE_SERVICE_ROLE_KEY in .env contains an "anon" token instead of the secret "service_role" key. Database table writes will fail if anon mutations are revoked in Supabase.');
          }
        }
      } catch (_) {}
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

