# Implementation Plan: Fix Profile Avatar Upload & Storage Persistence Across Live Production

## User Directive
> "https://supabase.com/docs/guides/storage there is guide for storage. Please profile avataar upload and storage not fixed. Come up with a plan first and prompt me to proceed or not. Make sure that fix is compatible with live production server too."

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Production Architecture Confirmation**:
> We will implement a resilient dual-channel storage strategy:
> 1. **Direct Supabase Client Upload** with WebP compression for minimum latency.
> 2. **Automatic Service-Role Server Fallback** (`POST /api/storage/upload`) with guaranteed bucket provisioning (`avatars` & `chat_attachments`) if direct upload encounters missing buckets or RLS restrictions.
> 3. **Atomic Database Persistence** (`POST /api/user/avatar`) updating both PostgreSQL `public.users.avatar_url` and Supabase Auth `raw_user_meta_data.avatar_url` so uploaded avatars are permanent and never lost on reload.
> 4. **Supabase SQL Editor Ready Script** added to `supabase_schema.sql` and `public/supabase_schema.sql` containing idempotent `storage.buckets` insertion and `storage.objects` RLS policies.

---

## 1. Root Cause Diagnosis

After profiling `CustomerProfile.tsx`, `storageService.ts`, `dataService.ts`, `supabaseAuthService.ts`, `server.ts`, `api/index.ts`, and `supabase_schema.sql`, five core defects prevent avatar upload and persistence:

1. **Storage Bucket & Policy Absence in Supabase Schema**:
   - `supabase_schema.sql` and `public/supabase_schema.sql` have zero definitions for `storage.buckets` or `storage.objects` RLS policies.
   - Without `storage.buckets` records or RLS policies on `storage.objects`, client direct uploads fail with `Bucket not found` (404) or `new row violates row-level security policy for table "objects"` (403).

2. **Avatar URL Dropped During Database Persistence**:
   - In `CustomerProfile.tsx`, after `storageService.uploadAvatar()` returns a URL, it calls `dataService.registerUser(updatedUser)`.
   - In `dataService.ts`, the parameter interface of `registerUser` **completely omits `avatarUrl`**, and the function body never sets `existing.avatarUrl`.
   - Crucially, neither `dataService.registerUser` nor `CustomerProfile.tsx` executes an SQL update query (`supabase.from('users').update({ avatar_url: ... })`), so PostgreSQL never receives the new avatar URL!

3. **Avatar Wiped on Page Reload & Session Auth Events**:
   - In `supabaseAuthService.ts` (`onAuthStateChange` and startup `getSession()`), when `userProfile` is hydrated or synchronized from `dbUser`, `dbUser.avatar_url` is completely omitted.
   - Any tab reload, token refresh, or delta sync immediately resets the player's in-memory `avatarUrl` back to null/empty because the database was never updated.

4. **Missing Dedicated Server Endpoint for Profile Avatar Updates**:
   - Neither `server.ts` (Express dev/production) nor `api/index.ts` (Vercel serverless) provides an endpoint to update user profile pictures using service-role privileges (`supabaseAdmin`).

5. **UI Rendering Gaps**:
   - While `CustomerProfile.tsx` displays an avatar if present, `RoleSwitcher.tsx` (Top Navbar user menu) and `AdminUsers.tsx` (Staff User Directory) render generic fallback initial letters instead of the uploaded avatar image.

---

## 2. Technical Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Customer Profile UI (React)                       │
│                                                                        │
│  1. File Selected (PNG, JPEG, WebP)                                    │
│  2. Client-Side WebP Compression (400x400 max, 88% quality)            │
│  3. storageService.uploadAvatar()                                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                ┌───────────────────┴───────────────────┐
                ▼                                       ▼
    [Channel 1: Direct Client]              [Channel 2: Server Fallback]
  supabase.storage.from('avatars')       POST /api/storage/upload
  (Fast, CDN edge)                       (Uses SUPABASE_SERVICE_ROLE_KEY)
                │                                       │
                │ (If 403 RLS or 404)                   │
                └───────────────► Auto-retry ───────────┘
                                                        │
                                                        ▼
                                       ┌────────────────────────────────┐
                                       │ Public CDN URL Generated       │
                                       │ https://.../avatars/usr_...    │
                                       └────────────────┬───────────────┘
                                                        │
                                                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Dual Database & Auth Persistence                     │
│                                                                        │
│  1. dataService.updateUserAvatar(userId, avatarUrl)                    │
│  2. Client: supabase.from('users').update({ avatar_url })              │
│  3. Server: POST /api/user/avatar (service role guaranteed)            │
│     - Updates public.users.avatar_url                                  │
│     - Updates auth.users.raw_user_meta_data.avatar_url                 │
│  4. In-Memory Session + LocalStorage Cache Sync                        │
│  5. Dispatch 'aetherpay_state_changed' ({ key: 'avatar_updated' })     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  Global UI Instant Realtime Sync                       │
│  - CustomerProfile (Active Avatar + Camera overlay)                    │
│  - TopNavbar & RoleSwitcher (Active profile thumbnail)                 │
│  - AdminUsers Directory Table & Detail Modal (Live player image)       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Step-by-Step Implementation Strategy

### Step 1: Storage Schema & RLS Policies (`supabase_schema.sql` & `public/supabase_schema.sql`)
Add official Supabase Storage configuration to schema files:
```sql
-- Storage Buckets Creation (Idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']),
  ('chat_attachments', 'chat_attachments', true, 15728640, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS Policies on storage.objects for Public & Authenticated Access
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access for Avatars and Chat') THEN
    CREATE POLICY "Public Access for Avatars and Chat" ON storage.objects
      FOR SELECT USING (bucket_id IN ('avatars', 'chat_attachments'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow Uploads to Avatars and Chat') THEN
    CREATE POLICY "Allow Uploads to Avatars and Chat" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id IN ('avatars', 'chat_attachments'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow Updates to Avatars and Chat') THEN
    CREATE POLICY "Allow Updates to Avatars and Chat" ON storage.objects
      FOR UPDATE USING (bucket_id IN ('avatars', 'chat_attachments'));
  END IF;
END $$;
```

### Step 2: Server Storage & Avatar Endpoints (`server.ts` & `api/index.ts`)
1. **Ensure Bucket Auto-Provisioning**:
   - In `ensureStorageBuckets(supabaseAdmin)`, create the buckets using `supabaseAdmin.storage.createBucket(...)` and verify connectivity on startup and inside upload requests.
2. **Dedicated `/api/user/avatar` Endpoint**:
   - Accepts `{ userId, avatarUrl }`.
   - Uses `supabaseAdmin` to update `public.users.avatar_url`.
   - Uses `supabaseAdmin.auth.admin.updateUserById(userId, { user_metadata: { avatar_url: avatarUrl } })` so Supabase Auth user metadata stays in sync.
   - Return `{ success: true, avatarUrl }`.
3. **Resilient `/api/storage/upload`**:
   - Support uploading base64-encoded files directly to `avatars` or `chat_attachments` with standard WebP content-type and public URL generation.

### Step 3: Data Layer & Auth Hydration (`dataService.ts` & `supabaseAuthService.ts`)
1. **In `dataService.ts`**:
   - Add `avatarUrl?: string;` to `registerUser` parameter types and ensure `existing.avatarUrl = params.avatarUrl` is updated.
   - Add `updateUserAvatar(userId: string, avatarUrl: string): Promise<{ success: boolean; error?: string }>`:
     - Updates in-memory `cache[STORAGE_KEYS.USERS]`.
     - Calls `supabase.from('users').update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() }).eq('id', userId)`.
     - Calls `POST /api/user/avatar` as service-role fallback.
     - Updates `authSessionService`.
     - Dispatches `aetherpay_state_changed` with `{ key: 'avatar_updated', avatarUrl }`.
   - In `initialCompactLoad` and `syncDelta`, ensure `dbUser.avatar_url` is synchronized into `local.avatarUrl`.
2. **In `supabaseAuthService.ts`**:
   - In `onAuthStateChange`, map `dbUser?.avatar_url || user.user_metadata?.avatar_url` to `userProfile.avatarUrl`.
   - In `getSession()`, map `dbUser?.avatar_url` to `userProfile.avatarUrl`.

### Step 4: Storage Service Refinement (`src/services/storageService.ts`)
1. In `uploadAvatar`:
   - Compress to 400x400 WebP.
   - Attempt direct upload with `cacheControl: '86400'` and `upsert: true`.
   - If direct upload fails, fallback to `/api/storage/upload`.
   - Return clean public CDN URL (compatible with all Supabase tiers).

### Step 5: UI Integration Across Components
1. **`CustomerProfile.tsx`**:
   - Use `dataService.updateUserAvatar(currentUser.id, res.url)`.
   - Add visual feedback, spinner, and error dismissal.
2. **`RoleSwitcher.tsx`**:
   - Render `currentUser.avatarUrl` in the nav trigger button and the popup menu header when present, falling back to role icon / initials.
3. **`AdminUsers.tsx`**:
   - Render `u.avatarUrl` in table rows and in the user detail inspect drawer.

---

## 4. Verification Plan

1. **Compilation & Type Checking**:
   - Run `compile_applet` and `lint_applet` to verify zero TypeScript errors or missing arguments.
2. **Avatar Upload Test**:
   - Upload profile picture in Customer Profile.
   - Verify image compression to WebP.
   - Verify storage in `avatars` bucket.
   - Verify persistence in `public.users` table (`avatar_url`).
   - Refresh page and verify avatar persists.
3. **Cross-Component Rendering**:
   - Verify avatar displays in TopNavbar `RoleSwitcher` and Admin `User Directory`.
4. **Production Serverless Compatibility**:
   - Verify both `server.ts` and `api/index.ts` have identical `/api/storage/upload` and `/api/user/avatar` handlers.
