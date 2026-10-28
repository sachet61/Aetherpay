# Implementation Plan: Permanent Prevention of User Role Reversion (Agent / Admin)

## 1. Problem Diagnosis & Root Causes

When an administrator promotes a user (such as changing `haudemaxe@gmail.com` to `agent`) via the Admin Dashboard, the change succeeds in the database, but repeatedly reverts to `customer` upon session refresh or re-login in testing and production environments due to three interlocking flaws:

1. **Unsynced `auth.users` Metadata in `server.ts`**:
   The `/api/admin/users/:userId/role` endpoint in `server.ts` updated `public.users` but did NOT update `auth.users.raw_user_meta_data.role` via `supabaseAdmin.auth.admin.updateUserById`. The user's Supabase Auth JWT and auth session retained `role: "customer"`.

2. **Blind Role Overwrite in `supabaseAuthService.ts` (`syncProfileAndWallet`)**:
   During app startup (`onAuthStateChange`, `getSession`) or `loginWithEmail`, if the user was not present in the in-memory cache, `supabaseAuthService` reconstructed the user profile using `session.user.user_metadata?.role || 'customer'`. It immediately called `syncProfileAndWallet(userProfile)`, which executed `supabase.from('users').upsert({ id, role: 'customer', ... })`, actively clobbering the PostgreSQL database record back to `customer`.

3. **Client-Side Role Leak in `dataService.ts` (`saveEntityToSupabase`)**:
   Whenever generic user records were synchronized through `saveEntityToSupabase(STORAGE_KEYS.USERS)`, the client's local cached `role` was upserted back into PostgreSQL, allowing unprivileged client state to downgrade database roles.

---

## 2. Architectural Fix & Invariants

1. **PostgreSQL `public.users` as Authoritative Single Source of Truth**:
   - Client sessions and authentication listeners must always query `public.users` in PostgreSQL for the user's canonical `role` rather than defaulting to stale `user_metadata` or hardcoded `'customer'`.

2. **Atomic Dual-Sync in Admin Role API (`server.ts`)**:
   - When an administrator modifies a user's role via `/api/admin/users/:userId/role`, the server will update `public.users` AND `auth.users.user_metadata` via `supabaseAdmin.auth.admin.updateUserById`.
   - Handles lookups by both UUID and email to ensure 100% reliability regardless of identifier passed.

3. **Role Immutability in Client Sync (`syncProfileAndWallet` & `saveEntityToSupabase`)**:
   - `syncProfileAndWallet()` will check existing records in `public.users` and preserve the database role rather than overwriting it with client session metadata.
   - `saveEntityToSupabase(STORAGE_KEYS.USERS)` will omit or preserve existing `role` to prevent client downgrades.

4. **Instant Role Hydration in `supabaseAuthService.ts`**:
   - In `onAuthStateChange`, `getSession`, and `loginWithEmail`, fetch the user's row from `public.users` before establishing the session, ensuring that agents and admins are assigned their correct role on initial login and reload.

---

## 3. Step-by-Step Implementation Strategy

### Step 1: Update Server Role Handler (`server.ts`)
- Modify `app.patch('/api/admin/users/:userId/role')` to:
  - Query user by ID or email.
  - Update `public.users` with `newRole`.
  - Update `auth.users` metadata via `supabaseAdmin.auth.admin.updateUserById(userId, { user_metadata: { role: newRole } })`.

### Step 2: Fix `supabaseAuthService.ts` Session Hydration & Sync
- In `initAuthListener` (`onAuthStateChange` and `getSession`):
  - Query `public.users` for the user's database role before generating `userProfile`.
  - Ensure `userProfile.role` matches the database record.
- In `loginWithEmail`:
  - Query `public.users` for the verified role before constructing `userProfile` and `authSessionService.createSessionForUser`.
- In `syncProfileAndWallet`:
  - Verify if a record already exists in `public.users`; if so, retain `dbUser.role` and do not overwrite it.

### Step 3: Guard `dataService.ts` Storage Sync
- In `saveEntityToSupabase(STORAGE_KEYS.USERS)`:
  - Do not overwrite `role` with client state if the database row already exists.
- In `updateUserRole`:
  - Immediately call `authSessionService.updateUserProfile(targetUser)` if the updated user is the active user.

### Step 4: Verification & Live Database Audit
- Run `node` verification script to verify `haudemaxe@gmail.com` and other test users in both `public.users` and `auth.users`.
- Run `compile_applet` to confirm zero TypeScript and build errors.

---

## 4. User Prompt
Please review the plan above. Click **Proceed** to apply the fix across `server.ts`, `supabaseAuthService.ts`, and `dataService.ts`.
