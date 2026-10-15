import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as Record<string, string | undefined>);

const supabaseUrl = (env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project.supabase.co') &&
    !supabaseAnonKey.includes('your-supabase-anon-key')
  );
};

export const getSupabaseConfig = () => ({
  url: supabaseUrl || '',
  hasKey: Boolean(supabaseAnonKey && !supabaseAnonKey.includes('your-supabase-anon-key')),
  isReady: isSupabaseConfigured(),
});

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  if (!supabase || !isSupabaseConfigured()) {
    return {
      ok: false,
      message: 'Supabase credentials not yet configured in .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Running in in-memory mode.',
    };
  }

  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true, message: `Connected to Supabase (${supabaseUrl}) successfully!` };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Connection check failed' };
  }
}
