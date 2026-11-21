-- ====================================================================
-- Swift Sweeps: Official Partners Directory Migration
-- Single source of truth replacing legacy app_config.supportedPartners
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Strict HTTPS & Platform-Matched Host Validation Helper
CREATE OR REPLACE FUNCTION public.is_valid_official_partner_url(
  p_url TEXT,
  p_platform TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
  v_trimmed TEXT;
  v_authority TEXT;
  v_host TEXT;
BEGIN
  v_trimmed := btrim(p_url);

  -- Must start with https://, contain no whitespace, no userinfo (@), and no query-in-authority tricks
  IF v_trimmed !~* '^https://[^/\s?#]+(?:/[^\s]*)?$' THEN
    RETURN FALSE;
  END IF;

  v_authority := split_part(regexp_replace(v_trimmed, '^https://', '', 'i'), '/', 1);
  v_authority := split_part(v_authority, '?', 1);
  v_authority := split_part(v_authority, '#', 1);

  IF position('@' IN v_authority) > 0 THEN
    RETURN FALSE;
  END IF;

  v_host := lower(split_part(v_authority, ':', 1));

  IF p_platform = 'facebook' THEN
    RETURN v_host IN ('facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.com', 'm.me');
  ELSIF p_platform = 'instagram' THEN
    RETURN v_host IN ('instagram.com', 'www.instagram.com', 'ig.me');
  ELSIF p_platform = 'telegram' THEN
    RETURN v_host IN ('t.me', 'telegram.me');
  END IF;

  RETURN FALSE;
END;
$$;

-- 2. Official Partners Table
CREATE TABLE IF NOT EXISTS public.official_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  icon_url TEXT NULL CHECK (
    icon_url IS NULL
    OR (
      icon_url ~* '^https://[^\s<>"'']+$'
      AND icon_url !~* '\.svg(\?|#|$)'
      AND icon_url !~* 'image/svg'
    )
  ),
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'telegram')),
  page_url TEXT NOT NULL,
  message_link TEXT NULL,
  game_id TEXT NULL,
  note TEXT NULL CHECK (note IS NULL OR char_length(note) <= 80),
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  updated_by UUID NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_official_partners_page_url
    CHECK (public.is_valid_official_partner_url(page_url, platform)),
  CONSTRAINT chk_official_partners_message_link
    CHECK (message_link IS NULL OR public.is_valid_official_partner_url(message_link, platform))
);

CREATE INDEX IF NOT EXISTS idx_official_partners_visible_order
  ON public.official_partners (is_visible, sort_order ASC, name ASC);

CREATE INDEX IF NOT EXISTS idx_official_partners_game_id
  ON public.official_partners (game_id)
  WHERE game_id IS NOT NULL;

-- 3. Automatic updated_at Trigger
CREATE OR REPLACE FUNCTION public.touch_official_partners_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := timezone('utc'::text, now());
  IF NEW.message_link IS NOT NULL AND btrim(NEW.message_link) = '' THEN
    NEW.message_link := NULL;
  END IF;
  IF NEW.icon_url IS NOT NULL AND btrim(NEW.icon_url) = '' THEN
    NEW.icon_url := NULL;
  END IF;
  IF NEW.game_id IS NOT NULL AND btrim(NEW.game_id) = '' THEN
    NEW.game_id := NULL;
  END IF;
  IF NEW.note IS NOT NULL AND btrim(NEW.note) = '' THEN
    NEW.note := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_official_partners_updated_at ON public.official_partners;
CREATE TRIGGER trg_official_partners_updated_at
  BEFORE INSERT OR UPDATE ON public.official_partners
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_official_partners_updated_at();

-- 4. DB Audit Hook for Direct Authenticated Client Mutations
-- (Service-role serverless endpoints log rich actor context & PARTNER_REORDERED directly without duplication.)
CREATE OR REPLACE FUNCTION public.audit_official_partners_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_uid UUID;
  v_actor_id TEXT;
  v_actor_name TEXT;
  v_action TEXT;
  v_entity_id TEXT;
  v_details TEXT;
BEGIN
  v_actor_uid := auth.uid();
  IF v_actor_uid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT u.id, COALESCE(u.display_name, u.email, v_actor_uid::text)
    INTO v_actor_id, v_actor_name
  FROM public.users u
  WHERE u.id = v_actor_uid::text
  LIMIT 1;

  v_actor_id := COALESCE(v_actor_id, v_actor_uid::text);
  v_actor_name := COALESCE(v_actor_name, 'Administrator');

  IF TG_OP = 'INSERT' THEN
    v_action := 'PARTNER_CREATED';
    v_entity_id := NEW.id::text;
    v_details := 'Created official partner "' || NEW.name || '" (' || NEW.platform || ').';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.sort_order IS DISTINCT FROM OLD.sort_order
       AND NEW.name = OLD.name
       AND NEW.platform = OLD.platform
       AND NEW.page_url = OLD.page_url
       AND NEW.message_link IS NOT DISTINCT FROM OLD.message_link
       AND NEW.icon_url IS NOT DISTINCT FROM OLD.icon_url
       AND NEW.game_id IS NOT DISTINCT FROM OLD.game_id
       AND NEW.note IS NOT DISTINCT FROM OLD.note
       AND NEW.is_visible = OLD.is_visible THEN
      v_action := 'PARTNER_REORDERED';
    ELSE
      v_action := 'PARTNER_UPDATED';
    END IF;
    v_entity_id := NEW.id::text;
    v_details := 'Updated official partner "' || NEW.name || '" (' || NEW.platform || ').';
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'PARTNER_DELETED';
    v_entity_id := OLD.id::text;
    v_details := 'Deleted official partner "' || OLD.name || '" (' || OLD.platform || ').';
  END IF;

  INSERT INTO public.audit_logs (
    id,
    actor_id,
    actor_name,
    actor_role,
    action,
    entity_type,
    entity_id,
    details,
    timestamp
  ) VALUES (
    'aud_' || replace(gen_random_uuid()::text, '-', ''),
    v_actor_id,
    v_actor_name,
    'admin',
    v_action,
    'official_partner',
    v_entity_id,
    v_details,
    timezone('utc'::text, now())
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_official_partners ON public.official_partners;
CREATE TRIGGER trg_audit_official_partners
  AFTER INSERT OR UPDATE OR DELETE ON public.official_partners
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_official_partners_changes();

-- 5. Strict Row Level Security (RLS)
ALTER TABLE public.official_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read visible official partners" ON public.official_partners;
CREATE POLICY "Authenticated users read visible official partners"
  ON public.official_partners
  FOR SELECT
  TO authenticated
  USING (is_visible = true);

DROP POLICY IF EXISTS "Admins insert official partners" ON public.official_partners;
CREATE POLICY "Admins insert official partners"
  ON public.official_partners
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE (
        u.id = auth.uid()::text
        OR lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
      AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins update official partners" ON public.official_partners;
CREATE POLICY "Admins update official partners"
  ON public.official_partners
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE (
        u.id = auth.uid()::text
        OR lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
      AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE (
        u.id = auth.uid()::text
        OR lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
      AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins delete official partners" ON public.official_partners;
CREATE POLICY "Admins delete official partners"
  ON public.official_partners
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE (
        u.id = auth.uid()::text
        OR lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
      AND u.role = 'admin'
    )
  );

-- 6. Storage Bucket: partner-icons (public read, admin-only write, PNG/JPG/WebP only, max 512 KB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partner-icons',
  'partner-icons',
  true,
  524288,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 524288,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

DROP POLICY IF EXISTS "Public read partner icons" ON storage.objects;
CREATE POLICY "Public read partner icons"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'partner-icons');

DROP POLICY IF EXISTS "Admins upload partner icons" ON storage.objects;
CREATE POLICY "Admins upload partner icons"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'partner-icons'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE (
        u.id = auth.uid()::text
        OR lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
      AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins update partner icons" ON storage.objects;
CREATE POLICY "Admins update partner icons"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'partner-icons'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE (
        u.id = auth.uid()::text
        OR lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
      AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins delete partner icons" ON storage.objects;
CREATE POLICY "Admins delete partner icons"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'partner-icons'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE (
        u.id = auth.uid()::text
        OR lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
      AND u.role = 'admin'
    )
  );

-- 7. Migrate Legacy "Supported Partners" from app_config & Remove Old List (Single Source of Truth)
DO $$
DECLARE
  v_cfg JSONB;
  v_legacy JSONB;
  v_item JSONB;
  v_idx INT := 0;
  v_platform TEXT;
  v_name TEXT;
  v_url TEXT;
  v_visible BOOLEAN;
  v_policies JSONB;
BEGIN
  SELECT data INTO v_cfg
  FROM public.app_config
  WHERE id = 'main'
  LIMIT 1;

  IF v_cfg IS NOT NULL THEN
    v_legacy := COALESCE(v_cfg->'supportedPartners', v_cfg->'policies'->'supportedPartners');

    IF jsonb_typeof(v_legacy) = 'array' THEN
      FOR v_item IN SELECT * FROM jsonb_array_elements(v_legacy)
      LOOP
        v_platform := lower(btrim(COALESCE(v_item->>'platform', '')));
        v_name := left(btrim(COALESCE(v_item->>'label', v_item->>'name', '')), 80);
        v_url := btrim(COALESCE(v_item->>'url', ''));
        v_visible := COALESCE((v_item->>'active')::boolean, true);

        IF v_platform IN ('facebook', 'instagram', 'telegram')
           AND char_length(v_name) > 0
           AND public.is_valid_official_partner_url(v_url, v_platform) THEN
          IF NOT EXISTS (
            SELECT 1 FROM public.official_partners op
            WHERE lower(op.page_url) = lower(v_url) AND op.platform = v_platform
          ) THEN
            INSERT INTO public.official_partners (name, platform, page_url, is_visible, sort_order)
            VALUES (v_name, v_platform, v_url, v_visible, v_idx);
            v_idx := v_idx + 1;
          END IF;
        END IF;
      END LOOP;
    END IF;

    -- Strip supportedPartners from app_config.data and app_config.data.policies
    v_policies := v_cfg->'policies';
    IF jsonb_typeof(v_policies) = 'object' THEN
      v_policies := v_policies - 'supportedPartners';
      v_cfg := jsonb_set(v_cfg, '{policies}', v_policies);
    END IF;
    v_cfg := v_cfg - 'supportedPartners';

    UPDATE public.app_config
    SET data = v_cfg,
        updated_at = timezone('utc'::text, now())
    WHERE id = 'main';
  END IF;
END;
$$;

-- 8. Seed 3 Example Placeholder Partners (Only when official_partners is empty)
INSERT INTO public.official_partners (name, platform, page_url, message_link, note, is_visible, sort_order)
SELECT v.name, v.platform, v.page_url, v.message_link, v.note, true, v.sort_order
FROM (
  VALUES
    (
      'Swift Sweeps Facebook (Example)',
      'facebook',
      'https://www.facebook.com/swiftsweeps.example',
      NULL,
      'Example placeholder — replace with your official Facebook Page.',
      0
    ),
    (
      'Swift Sweeps Instagram (Example)',
      'instagram',
      'https://www.instagram.com/swiftsweeps.example',
      NULL,
      'Example placeholder — replace with your official Instagram.',
      1
    ),
    (
      'Swift Sweeps Telegram (Example)',
      'telegram',
      'https://t.me/swiftsweeps_example',
      NULL,
      'Example placeholder — replace with your official Telegram.',
      2
    )
) AS v(name, platform, page_url, message_link, note, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.official_partners);

-- 9. Enable Realtime Publication
ALTER TABLE public.official_partners REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'official_partners'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.official_partners;
  END IF;
END;
$$;
