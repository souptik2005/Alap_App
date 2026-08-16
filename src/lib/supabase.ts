import { createClient } from '@supabase/supabase-js';

// Read environment variables with fallback support for both NEXT_PUBLIC_ and VITE_ prefixes
const supabaseUrl =
  (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string) ||
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://placeholder.supabase.co';

const supabaseAnonKey =
  (import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'placeholder-anon-key';

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    !supabaseUrl.includes('your-supabase-project') &&
    supabaseAnonKey !== 'placeholder-anon-key' &&
    !supabaseAnonKey.includes('your-supabase-anon-key')
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
