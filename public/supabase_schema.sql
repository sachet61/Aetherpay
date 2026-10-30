-- ====================================================================
-- Swift Sweeps (Aetherpay) - Supabase / PostgreSQL Database Schema
-- Run this script in your Supabase SQL Editor (https://app.supabase.com)
-- ====================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  phone TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  email_verified BOOLEAN NOT NULL DEFAULT true,
  referred_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Wallets Table
CREATE TABLE IF NOT EXISTS public.wallets (
  customer_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  pending_withdrawal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  pending_deposit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_deposited NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_withdrawn NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  description TEXT NOT NULL,
  reference_id TEXT,
  game_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Top-Up Requests Table
CREATE TABLE IF NOT EXISTS public.topups (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  bonus_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payment_method_id TEXT NOT NULL,
  payment_method_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  proof_url TEXT,
  target_game_name TEXT,
  target_game_account_id TEXT,
  customer_notes TEXT,
  reviewer_id TEXT,
  reviewer_name TEXT,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Withdrawal Requests Table
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  net_amount NUMERIC(12, 2) NOT NULL,
  payout_method_id TEXT NOT NULL,
  payout_method_name TEXT NOT NULL,
  payout_details JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_id TEXT,
  reviewer_name TEXT,
  review_notes TEXT,
  transaction_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Game Catalog Table
CREATE TABLE IF NOT EXISTS public.game_catalog (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  min_load NUMERIC(12, 2) NOT NULL DEFAULT 5.00,
  bonus_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  icon_url TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Game Accounts Table
CREATE TABLE IF NOT EXISTS public.game_accounts (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  game_title TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  pin TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Support Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  agent_id TEXT,
  agent_name TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  last_message TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Support Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  content TEXT NOT NULL,
  transaction_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  link_tab TEXT,
  link_request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. App Configuration Table
CREATE TABLE IF NOT EXISTS public.app_config (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. Cashouts Live Feed Table
CREATE TABLE IF NOT EXISTS public.faked_cashouts (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  method_name TEXT NOT NULL,
  game_name TEXT NOT NULL,
  is_fake BOOLEAN NOT NULL DEFAULT true,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  pin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faked_cashouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Permissive public policies for client and service operations
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access users') THEN
    CREATE POLICY "Allow public access users" ON public.users FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access wallets') THEN
    CREATE POLICY "Allow public access wallets" ON public.wallets FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access transactions') THEN
    CREATE POLICY "Allow public access transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access topups') THEN
    CREATE POLICY "Allow public access topups" ON public.topups FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access withdrawals') THEN
    CREATE POLICY "Allow public access withdrawals" ON public.withdrawals FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access game_catalog') THEN
    CREATE POLICY "Allow public access game_catalog" ON public.game_catalog FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access game_accounts') THEN
    CREATE POLICY "Allow public access game_accounts" ON public.game_accounts FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access conversations') THEN
    CREATE POLICY "Allow public access conversations" ON public.conversations FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access messages') THEN
    CREATE POLICY "Allow public access messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access notifications') THEN
    CREATE POLICY "Allow public access notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access audit_logs') THEN
    CREATE POLICY "Allow public access audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access app_config') THEN
    CREATE POLICY "Allow public access app_config" ON public.app_config FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access faked_cashouts') THEN
    CREATE POLICY "Allow public access faked_cashouts" ON public.faked_cashouts FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access password_reset_tokens') THEN
    CREATE POLICY "Allow public access password_reset_tokens" ON public.password_reset_tokens FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Indexes for maximum query performance
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON public.transactions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_topups_customer ON public.topups(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_customer ON public.withdrawals(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_accounts_customer ON public.game_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_cashouts_timestamp ON public.faked_cashouts(timestamp DESC);

-- ====================================================================
-- 13. Automated Auth Synchronization & Email Verification Triggers
-- Keeps public.users.email_verified in lockstep with auth.users.email_confirmed_at
-- with zero client-side egress and guarantees verified status is never wiped.
-- ====================================================================

-- Trigger Function 1: Synchronize changes from auth.users into public.users
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_display_name TEXT;
  v_role TEXT;
  v_verified BOOLEAN;
BEGIN
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(COALESCE(NEW.email, 'user@domain.com'), '@', 1),
    'User'
  );

  v_role := CASE 
    WHEN NEW.email = 'sachet61@gmail.com' THEN 'admin' 
    ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'customer') 
  END;

  v_verified := (NEW.email_confirmed_at IS NOT NULL);

  -- Check if user exists by id or email to avoid unique constraint violations
  IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id::text OR email = NEW.email) THEN
    UPDATE public.users
    SET
      id = NEW.id::text,
      email = NEW.email,
      email_verified = CASE 
        WHEN v_verified THEN true 
        ELSE public.users.email_verified 
      END,
      role = CASE 
        WHEN NEW.email = 'sachet61@gmail.com' THEN 'admin' 
        ELSE public.users.role 
      END,
      updated_at = now()
    WHERE id = NEW.id::text OR email = NEW.email;
  ELSE
    INSERT INTO public.users (
      id,
      email,
      display_name,
      role,
      status,
      email_verified,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id::text,
      NEW.email,
      v_display_name,
      v_role,
      'active',
      v_verified,
      COALESCE(NEW.created_at, now()),
      now()
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Guard auth.users transaction: log warning without failing authentication
  RAISE WARNING 'handle_auth_user_sync exception: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Bind Trigger to auth.users (only on INSERT or when email_confirmed_at changes)
DROP TRIGGER IF EXISTS on_auth_user_sync_trigger ON auth.users;
CREATE TRIGGER on_auth_user_sync_trigger
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_sync();

-- Trigger Function 2: Guard public.users from accidental downgrades by client upserts
CREATE OR REPLACE FUNCTION public.prevent_verification_downgrade()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.email_verified = true AND (NEW.email_verified IS NULL OR NEW.email_verified = false) THEN
    NEW.email_verified := true;
  END IF;
  RETURN NEW;
END;
$$;

-- Bind Downgrade Guard Trigger to public.users
DROP TRIGGER IF EXISTS tr_prevent_verification_downgrade ON public.users;
CREATE TRIGGER tr_prevent_verification_downgrade
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_verification_downgrade();

-- ====================================================================
-- 14. Supabase Storage Buckets & Policies (Avatars & Chat Attachments)
-- Idempotent creation of public storage buckets and row-level policies
-- Reference: https://supabase.com/docs/guides/storage
-- ====================================================================

-- 1. Insert storage buckets if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']),
  ('chat_attachments', 'chat_attachments', true, 15728640, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Objects Access Policies (SELECT, INSERT, UPDATE, DELETE)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access for Avatars and Chat') THEN
    CREATE POLICY "Public Access for Avatars and Chat" ON storage.objects
      FOR SELECT USING (bucket_id IN ('avatars', 'chat_attachments'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow Uploads to Avatars and Chat') THEN
    CREATE POLICY "Allow Uploads to Avatars and Chat" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id IN ('avatars', 'chat_attachments'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow Updates to Avatars and Chat') THEN
    CREATE POLICY "Allow Updates to Avatars and Chat" ON storage.objects
      FOR UPDATE USING (bucket_id IN ('avatars', 'chat_attachments'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow Deletes on Avatars and Chat') THEN
    CREATE POLICY "Allow Deletes on Avatars and Chat" ON storage.objects
      FOR DELETE USING (bucket_id IN ('avatars', 'chat_attachments'));
  END IF;
END $$;
