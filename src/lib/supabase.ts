import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

function hasUsableSupabaseConfig(url: string | undefined, key: string | undefined) {
  if (!url || !key) return false;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    if (parsed.hostname === 'mock.supabase.co') return false;
  } catch {
    return false;
  }

  if (key === 'mock-anon-key') return false;
  return true;
}

export const isSupabaseConfigured = hasUsableSupabaseConfig(supabaseUrl, supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;