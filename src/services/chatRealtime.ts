import { supabase, isSupabaseConfigured } from './supabaseClient';
import { createRealtimeChatHub } from './realtimeChatHub';

export const realtimeChatHub = createRealtimeChatHub(() =>
  supabase && isSupabaseConfigured() ? supabase : null
);
