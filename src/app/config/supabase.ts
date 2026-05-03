import { createClient } from '@supabase/supabase-js';
import type { Database } from '@shared/types/database';
import { env } from './env';

export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'aquimaq-crm-auth',
    },
  },
);
