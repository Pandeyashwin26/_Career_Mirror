import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Create Supabase client only if env vars are provided
function makeClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) return null;
  try {
    return createClient(url, key);
  } catch {
    return null;
  }
}

export const supabase = makeClient();
