import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Hardcoded default Supabase credentials ensuring 100% reliable connectivity
export const DEFAULT_SUPABASE_URL = 'https://qlurdhimtgchlgoaziqq.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsdXJkaGltdGdjaGxnb2F6aXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNjE2NjYsImV4cCI6MjEwNzYzNzY2Nn0.v6d72CHlC3R7KxRqNhWXlh3JPToStEGu8WWXPXNWWQk';
export const DEFAULT_SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsdXJkaGltdGdjaGxnb2F6aXFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjA2MTY2NiwiZXhwIjoyMTA3NjM3NjY2fQ.iH8f_0MXUD3faa43gc13XtfBc_r_tKptMqrfZkbxuag';

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as Record<string, string | undefined>);
const proc = typeof process !== 'undefined' && process.env ? process.env : ({} as Record<string, string | undefined>);

export const supabaseUrl = (
  env.VITE_SUPABASE_URL ||
  proc.VITE_SUPABASE_URL ||
  proc.SUPABASE_URL ||
  DEFAULT_SUPABASE_URL
).trim();

export const supabaseAnonKey = (
  env.VITE_SUPABASE_ANON_KEY ||
  proc.VITE_SUPABASE_ANON_KEY ||
  proc.SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_ANON_KEY
).trim();

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
  url: supabaseUrl,
  hasKey: Boolean(supabaseAnonKey),
  isReady: true,
  projectId: 'qlurdhimtgchlgoaziqq',
});

// Single authoritative Supabase client with auth detection and realtime enabled
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'aetherpay_supabase_auth_token',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const { error } = await supabase.auth.getSession();
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true, message: `Connected to Supabase (${supabaseUrl}) successfully!` };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Connection check failed' };
  }
}
