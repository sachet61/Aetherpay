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
  attachment_url TEXT,
  attachment_name TEXT,
  transaction_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;

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
  DROP POLICY IF EXISTS "Allow public access audit_logs" ON public.audit_logs;
  DROP POLICY IF EXISTS "Admins can read audit_logs" ON public.audit_logs;
  CREATE POLICY "Admins can read audit_logs" ON public.audit_logs
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE (
          u.id = auth.uid()::text
          OR lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
        AND (u.role = 'admin' OR lower(u.email) = 'sachet61@gmail.com')
      )
    );
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

-- Drop old problematic guard trigger and function if present
DROP TRIGGER IF EXISTS tr_protect_public_user_verification ON public.users;
DROP FUNCTION IF EXISTS public.sync_user_verification_status();

-- Trigger Function 2: Guard public.users from accidental downgrades by client upserts (pure local check, zero cross-table queries)
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

-- ====================================================================
-- 15. Realtime Replication & Messaging Schema Safeguards
-- Ensures live postgres_changes events stream cleanly and descending reads stay fast
-- ====================================================================

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_internal_note BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_messages_conv_created_id
  ON public.messages(conversation_id, created_at DESC, id);

ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
  END IF;
END $$;

-- ====================================================================
-- 16. Idempotent Audit Logs Schema Alignment, Indexes & Realtime
-- Reconciles legacy user_id/user_email/created_at columns if present,
-- enforces server-side writes (no public/client write RLS), and enables Realtime
-- ====================================================================

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_id TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_name TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_role TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'user_id'
  ) THEN
    EXECUTE 'UPDATE public.audit_logs SET actor_id = COALESCE(actor_id, user_id, ''system'') WHERE actor_id IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'user_email'
  ) THEN
    EXECUTE 'UPDATE public.audit_logs SET actor_name = COALESCE(actor_name, user_email, ''System'') WHERE actor_name IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'created_at'
  ) THEN
    EXECUTE 'UPDATE public.audit_logs SET timestamp = COALESCE(timestamp, created_at, timezone(''utc''::text, now())) WHERE timestamp IS NULL';
  END IF;
END $$;

UPDATE public.audit_logs
SET
  actor_id = COALESCE(actor_id, 'system'),
  actor_name = COALESCE(actor_name, 'System'),
  actor_role = COALESCE(actor_role, 'customer'),
  entity_type = COALESCE(entity_type, 'settings'),
  entity_id = COALESCE(entity_id, ''),
  timestamp = COALESCE(timestamp, timezone('utc'::text, now()))
WHERE actor_id IS NULL
   OR actor_name IS NULL
   OR actor_role IS NULL
   OR entity_type IS NULL
   OR entity_id IS NULL
   OR timestamp IS NULL;

ALTER TABLE public.audit_logs ALTER COLUMN actor_id SET DEFAULT 'system';
ALTER TABLE public.audit_logs ALTER COLUMN actor_name SET DEFAULT 'System';
ALTER TABLE public.audit_logs ALTER COLUMN actor_role SET DEFAULT 'customer';
ALTER TABLE public.audit_logs ALTER COLUMN timestamp SET DEFAULT timezone('utc'::text, now());

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_timestamp ON public.audit_logs(entity_type, timestamp DESC);

ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'audit_logs'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
    END IF;
  END IF;
END $$;

-- ====================================================================
-- 17. Referral Ledger, Vanity Codes, Fraud Telemetry & Wallet Bonus Alignment
-- Idempotent migration for server-enforced referral payouts & governance
-- ====================================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS signup_ip TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code_upper_unique
  ON public.users (upper(referral_code))
  WHERE referral_code IS NOT NULL AND btrim(referral_code) <> '';

ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS referral_bonus_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00;

CREATE TABLE IF NOT EXISTS public.referral_awards (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referee_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referral_code_used TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'signup_link',
  reward_mode TEXT NOT NULL DEFAULT 'flat',
  payout_target TEXT NOT NULL DEFAULT 'referral_bonus',
  referrer_reward_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  referee_reward_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  qualifying_deposit_id TEXT,
  qualifying_deposit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'registered',
  fraud_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  staff_reason TEXT,
  assigned_by TEXT,
  assigned_by_name TEXT,
  reviewed_by TEXT,
  reviewed_by_name TEXT,
  review_notes TEXT,
  rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_referral_awards_referee UNIQUE (referee_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_awards_referrer_status
  ON public.referral_awards(referrer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_awards_status_created
  ON public.referral_awards(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_awards_rewarded_at
  ON public.referral_awards(rewarded_at DESC);

ALTER TABLE public.referral_awards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'referral_awards' AND policyname = 'Allow authenticated referral read'
  ) THEN
    CREATE POLICY "Allow authenticated referral read" ON public.referral_awards
      FOR SELECT USING (
        auth.uid()::text = referrer_id
        OR auth.uid()::text = referee_id
        OR EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()::text AND u.role IN ('admin', 'agent')
        )
      );
  END IF;
END $$;

ALTER TABLE public.referral_awards REPLICA IDENTITY FULL;
ALTER TABLE public.wallets REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.topups REPLICA IDENTITY FULL;
ALTER TABLE public.withdrawals REPLICA IDENTITY FULL;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH tbl IN ARRAY ARRAY['referral_awards', 'wallets', 'transactions', 'topups', 'withdrawals']
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      END IF;
    END LOOP;
  END IF;
END $$;

-- ====================================================================
-- 18. Atomic & Idempotent Referral Payout RPC + Ledger Safeguards
-- Guarantees wallets + transactions + referral_awards update atomically
-- inside a single PostgreSQL transaction (never marks rewarded if credit fails).
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_transactions_reference_type
  ON public.transactions(reference_id, type)
  WHERE reference_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.credit_referral_award_atomic(
  p_award_id TEXT,
  p_referrer_id TEXT,
  p_referee_id TEXT,
  p_payout_target TEXT DEFAULT 'referral_bonus',
  p_referrer_amount NUMERIC DEFAULT 0,
  p_referee_amount NUMERIC DEFAULT 0,
  p_referrer_tx_id TEXT DEFAULT NULL,
  p_referee_tx_id TEXT DEFAULT NULL,
  p_referrer_desc TEXT DEFAULT NULL,
  p_referee_desc TEXT DEFAULT NULL,
  p_referrer_notif_title TEXT DEFAULT 'Referral Reward Credited!',
  p_referrer_notif_msg TEXT DEFAULT NULL,
  p_referee_notif_title TEXT DEFAULT 'Welcome Referral Bonus Credited!',
  p_referee_notif_msg TEXT DEFAULT NULL,
  p_qualifying_deposit_id TEXT DEFAULT NULL,
  p_qualifying_deposit_amount NUMERIC DEFAULT 0,
  p_reward_mode TEXT DEFAULT 'flat',
  p_reviewed_by TEXT DEFAULT NULL,
  p_reviewed_by_name TEXT DEFAULT NULL,
  p_review_notes TEXT DEFAULT NULL,
  p_fraud_flags JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_award RECORD;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_ref_amt NUMERIC(12, 2) := ROUND(GREATEST(0, COALESCE(p_referrer_amount, 0)), 2);
  v_ee_amt NUMERIC(12, 2) := ROUND(GREATEST(0, COALESCE(p_referee_amount, 0)), 2);
  v_target TEXT := CASE WHEN p_payout_target = 'available_balance' THEN 'available_balance' ELSE 'referral_bonus' END;
  v_ref_tx_id TEXT := COALESCE(NULLIF(btrim(p_referrer_tx_id), ''), 'tx_ref_r_' || p_award_id);
  v_ee_tx_id TEXT := COALESCE(NULLIF(btrim(p_referee_tx_id), ''), 'tx_ref_f_' || p_award_id);
  v_ref_credited BOOLEAN := false;
  v_ee_credited BOOLEAN := false;
  v_ref_already BOOLEAN := false;
  v_ee_already BOOLEAN := false;
  v_first_id TEXT;
  v_second_id TEXT;
BEGIN
  SELECT * INTO v_award
  FROM public.referral_awards
  WHERE id = p_award_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Referral award % not found', p_award_id;
  END IF;

  -- Lock wallets in deterministic customer_id order to prevent deadlocks
  v_first_id := LEAST(p_referrer_id, p_referee_id);
  v_second_id := GREATEST(p_referrer_id, p_referee_id);

  IF v_first_id IS NOT NULL AND btrim(v_first_id) <> '' THEN
    INSERT INTO public.wallets (customer_id, balance, referral_bonus_balance, currency, updated_at)
    VALUES (v_first_id, 0, 0, 'USD', v_now)
    ON CONFLICT (customer_id) DO NOTHING;
    PERFORM 1 FROM public.wallets WHERE customer_id = v_first_id FOR UPDATE;
  END IF;

  IF v_second_id IS NOT NULL AND btrim(v_second_id) <> '' AND v_second_id <> v_first_id THEN
    INSERT INTO public.wallets (customer_id, balance, referral_bonus_balance, currency, updated_at)
    VALUES (v_second_id, 0, 0, 'USD', v_now)
    ON CONFLICT (customer_id) DO NOTHING;
    PERFORM 1 FROM public.wallets WHERE customer_id = v_second_id FOR UPDATE;
  END IF;

  -- 1. Referrer credit (strictly idempotent via deterministic tx id)
  IF v_ref_amt > 0 AND p_referrer_id IS NOT NULL AND btrim(p_referrer_id) <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE (id = v_ref_tx_id AND status = 'completed')
         OR (customer_id = p_referrer_id AND reference_id = p_award_id AND type = 'referral_reward' AND status = 'completed')
    ) THEN
      v_ref_already := true;
    ELSE
      IF v_target = 'available_balance' THEN
        UPDATE public.wallets
        SET balance = ROUND((COALESCE(balance, 0) + v_ref_amt)::numeric, 2),
            updated_at = v_now
        WHERE customer_id = p_referrer_id;
      ELSE
        UPDATE public.wallets
        SET referral_bonus_balance = ROUND((COALESCE(referral_bonus_balance, 0) + v_ref_amt)::numeric, 2),
            updated_at = v_now
        WHERE customer_id = p_referrer_id;
      END IF;

      INSERT INTO public.transactions (
        id, customer_id, amount, type, status, description, reference_id, game_name, created_at
      ) VALUES (
        v_ref_tx_id,
        p_referrer_id,
        v_ref_amt,
        'referral_reward',
        'completed',
        COALESCE(NULLIF(btrim(p_referrer_desc), ''), 'Referral Bonus Reward'),
        p_award_id,
        'Swift Sweeps Referral',
        v_now
      )
      ON CONFLICT (id) DO UPDATE SET
        amount = EXCLUDED.amount,
        status = 'completed',
        description = EXCLUDED.description,
        reference_id = EXCLUDED.reference_id,
        game_name = EXCLUDED.game_name,
        created_at = EXCLUDED.created_at;

      INSERT INTO public.notifications (
        id, user_id, title, message, type, read, link_tab, link_request_id, created_at
      ) VALUES (
        'notif_' || v_ref_tx_id,
        p_referrer_id,
        COALESCE(NULLIF(btrim(p_referrer_notif_title), ''), 'Referral Reward Credited!'),
        COALESCE(NULLIF(btrim(p_referrer_notif_msg), ''), 'Your referral reward has been credited to your wallet.'),
        'referral',
        false,
        'referrals',
        p_award_id,
        v_now
      ) ON CONFLICT (id) DO NOTHING;

      v_ref_credited := true;
    END IF;
  END IF;

  -- 2. Referee welcome bonus credit (strictly idempotent via deterministic tx id)
  IF v_ee_amt > 0 AND p_referee_id IS NOT NULL AND btrim(p_referee_id) <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE (id = v_ee_tx_id AND status = 'completed')
         OR (customer_id = p_referee_id AND reference_id = p_award_id AND type = 'referral_reward' AND status = 'completed')
    ) THEN
      v_ee_already := true;
    ELSE
      IF v_target = 'available_balance' THEN
        UPDATE public.wallets
        SET balance = ROUND((COALESCE(balance, 0) + v_ee_amt)::numeric, 2),
            updated_at = v_now
        WHERE customer_id = p_referee_id;
      ELSE
        UPDATE public.wallets
        SET referral_bonus_balance = ROUND((COALESCE(referral_bonus_balance, 0) + v_ee_amt)::numeric, 2),
            updated_at = v_now
        WHERE customer_id = p_referee_id;
      END IF;

      INSERT INTO public.transactions (
        id, customer_id, amount, type, status, description, reference_id, game_name, created_at
      ) VALUES (
        v_ee_tx_id,
        p_referee_id,
        v_ee_amt,
        'referral_reward',
        'completed',
        COALESCE(NULLIF(btrim(p_referee_desc), ''), 'Welcome Referral Bonus'),
        p_award_id,
        'Swift Sweeps Referral',
        v_now
      )
      ON CONFLICT (id) DO UPDATE SET
        amount = EXCLUDED.amount,
        status = 'completed',
        description = EXCLUDED.description,
        reference_id = EXCLUDED.reference_id,
        game_name = EXCLUDED.game_name,
        created_at = EXCLUDED.created_at;

      INSERT INTO public.notifications (
        id, user_id, title, message, type, read, link_tab, link_request_id, created_at
      ) VALUES (
        'notif_' || v_ee_tx_id,
        p_referee_id,
        COALESCE(NULLIF(btrim(p_referee_notif_title), ''), 'Welcome Referral Bonus Credited!'),
        COALESCE(NULLIF(btrim(p_referee_notif_msg), ''), 'Your welcome referral bonus has been credited to your wallet.'),
        'referral',
        false,
        'wallet',
        p_award_id,
        v_now
      ) ON CONFLICT (id) DO NOTHING;

      v_ee_credited := true;
    END IF;
  END IF;

  -- 3. Mark award rewarded ONLY after wallet & ledger mutations succeeded
  UPDATE public.referral_awards
  SET
    status = 'rewarded',
    payout_target = v_target,
    reward_mode = COALESCE(NULLIF(btrim(p_reward_mode), ''), reward_mode),
    referrer_reward_amount = v_ref_amt,
    referee_reward_amount = v_ee_amt,
    qualifying_deposit_id = COALESCE(NULLIF(btrim(p_qualifying_deposit_id), ''), qualifying_deposit_id),
    qualifying_deposit_amount = GREATEST(COALESCE(qualifying_deposit_amount, 0), COALESCE(p_qualifying_deposit_amount, 0)),
    reviewed_by = COALESCE(NULLIF(btrim(p_reviewed_by), ''), reviewed_by),
    reviewed_by_name = COALESCE(NULLIF(btrim(p_reviewed_by_name), ''), reviewed_by_name),
    review_notes = COALESCE(NULLIF(btrim(p_review_notes), ''), review_notes),
    fraud_flags = COALESCE(p_fraud_flags, fraud_flags),
    rewarded_at = COALESCE(rewarded_at, v_now),
    updated_at = v_now
  WHERE id = p_award_id;

  RETURN jsonb_build_object(
    'ok', true,
    'awardId', p_award_id,
    'referrerCredited', v_ref_credited,
    'referrerAlreadyCredited', v_ref_already,
    'refereeCredited', v_ee_credited,
    'refereeAlreadyCredited', v_ee_already
  );
END;
$$;



