# Implementation Plan: Fix "Bucket Not Found" Error During Avatar & Chat Uploads

## User Directive
> "Bucket not found during avatar upload. Come up with a plan first and prompt me to proceed or not. Make sure that fix is compatible with live production server too."
> User Confirmation:
> 1. Provide step-by-step instructions on what to do to make bucket provisioning possible.
> 2. Implement automated fallback to secure server storage endpoint with automatic retry.

---

## 1. Root Cause Diagnosis

### A. Client-Side Anon Key Limitations in Supabase Storage
1. **Forbidden Bucket Creation on Client**:
   - In `src/services/storageService.ts`, `ensureBucket()` called `supabase.storage.createBucket('avatars', { public: true })` directly from the browser using the public anonymous key (`VITE_SUPABASE_ANON_KEY`).
   - In Supabase, **storage bucket creation is an administrative operation** restricted to users with `service_role` privileges or project owners. Calling `createBucket()` with the anon key fails with a 403 Forbidden error.
2. **Missing Bucket in Storage Schema**:
   - Because client-side creation failed silently, the `avatars` bucket was never created on the Supabase project.
   - When `supabase.storage.from('avatars').upload(...)` was invoked, Supabase PostgREST returned: `Bucket not found` (HTTP 404).

---

## 2. Architectural Solution

We implement a two-pronged solution ensuring 100% reliability in development and live production:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Vite + React Client (SPA)                       │
│                                                                        │
│  1. Attempt direct upload via Supabase Client                          │
│  2. If "Bucket not found" (404) or RLS error (403):                    │
│     Auto-fallback to: POST /api/storage/upload                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│         Backend Server with Service Role (server.ts & api/index.ts)    │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ POST /api/storage/upload                                         │  │
│  │ 1. Uses supabaseAdmin (SUPABASE_SERVICE_ROLE_KEY)                │  │
│  │ 2. Checks if bucket exists; if not, creates bucket               │  │
│  │    (avatars / chat_attachments) with public: true                │  │
│  │ 3. Performs upload with service-role permissions                 │  │
│  │ 4. Returns public CDN URL + WebP transformation parameters        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Automatic Startup Self-Healing:                                  │  │
│  │ - Automatically runs initStorageBuckets() on server boot         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Live Supabase PostgreSQL                        │
│                                                                        │
│  - storage.buckets: 'avatars', 'chat_attachments'                     │
│  - storage.objects: public read policy enabled                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Step-by-Step Instructions for Supabase Project Dashboard

If you prefer to configure the buckets directly in your Supabase Project Dashboard:

### Step 1: Open Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and select your project (`fsykihwprqdptrqapxxg`).
2. Click on **Storage** in the left-hand navigation sidebar.

### Step 2: Create the `avatars` Bucket
1. Click the **New bucket** button.
2. Enter Name: `avatars`
3. Toggle **Public bucket** to **ON** (so user avatars can be loaded by the web app and CDN).
4. Click **Save bucket**.

### Step 3: Create the `chat_attachments` Bucket
1. Click **New bucket**.
2. Enter Name: `chat_attachments`
3. Toggle **Public bucket** to **ON**.
4. Click **Save bucket**.

### Step 4 (Optional SQL Alternative): Run Storage Initialization Script
Alternatively, navigate to the **SQL Editor** in your Supabase dashboard and run this single script:
```sql
-- 1. Insert avatars bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 2. Insert chat_attachments bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat_attachments', 'chat_attachments', true, 15728640, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- 3. Enable public read access for both buckets
CREATE POLICY "Public Read Avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Public Read Chat Attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat_attachments');

-- 4. Enable insert access for authenticated & anonymous users
CREATE POLICY "Allow Uploads Avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow Uploads Chat Attachments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chat_attachments');
```

---

## 4. Implementation Steps in the Codebase

### Step 1: Automated Server Provisioning & Fallback Route (`server.ts` & `api/index.ts`)
1. Create helper `ensureStorageBuckets(supabaseAdmin)`:
   - Queries `supabaseAdmin.storage.listBuckets()`.
   - If `avatars` or `chat_attachments` is missing, invokes `supabaseAdmin.storage.createBucket(...)` with `public: true`.
2. Add endpoint `POST /api/storage/upload`:
   - Accepts multipart/form-data or base64 JSON payload (`bucket`, `path`, `fileData`, `contentType`).
   - Uses `supabaseAdmin.storage` to ensure bucket existence and upload the file.
   - Returns `{ success: true, url: publicUrl }`.
   - Implemented identically in both `server.ts` (Express dev) and `api/index.ts` (Vercel serverless).

### Step 2: Client Self-Healing Fallback (`src/services/storageService.ts`)
1. In `uploadAvatar` and `uploadChatAttachment`:
   - Attempt direct client upload to Supabase first.
   - If it succeeds, return the URL immediately.
   - If it throws or returns `Bucket not found` (or any 400/403/404):
     - Seamlessly send the compressed image to `POST /api/storage/upload`.
     - The backend uses `supabaseAdmin` to auto-create the bucket and persist the file.
     - Return the verified CDN URL back to the caller.
   - Result: **Zero errors displayed to the user**, even before the buckets are manually created in the dashboard!

---

## 5. Verification Plan
1. **Self-Healing Test**: Trigger avatar upload when bucket is initially absent. Confirm the server auto-provisions the bucket and returns HTTP 200 with the active URL.
2. **Transformations Test**: Confirm the avatar renders with `?width=160&height=160&format=webp&quality=80`.
3. **Parity Check**: Verify compilation with `compile_applet` and `lint_applet`.
