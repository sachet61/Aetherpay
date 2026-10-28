# Production Fix: Permanent Email Verification Synchronization & Session State Integrity

Comprehensive architectural resolution for the intermittent "Email Verification Required" banner appearing for verified accounts (specifically confirmed for `rashilbasukala@gmail.com` in both `auth.users` and `public.users`) across testing and live production environments.

## User Review & Critical Decisions

> [!IMPORTANT]
> Both `auth.users` (Supabase Auth `email_confirmed_at`) and `public.users` (`email_verified: true`) are confirmed active in PostgreSQL. The intermittent unverified state is caused by a client-side session hydration race condition: on browser refresh or initial navigation to tabs like `/topup`, the in-memory user cache is empty, `authSessionService.activeSession` omits `emailVerified`, and `initialCompactLoad()` does not fetch the authenticated customer's own row from `public.users`.

- **Confirmed Decision 1**: Store `emailVerified` directly in `UserSession` (`authSessionService`) so page reloads immediately restore the verified state from the local session cookie/storage before any network roundtrip occurs.
- **Confirmed Decision 2**: In `dataService.initialCompactLoad()`, include an authoritative single-row query for `supabase.from('users').select('*').eq('id', currentUserId).maybeSingle()`, updating the local user profile and session with the true database `email_verified` column.
- **Confirmed Decision 3**: In `dataService.getCurrentUser()`, populate `emailVerified` from `session.emailVerified` when reconstructing the user stub from an active session, eliminating the transient `undefined` (falsy) state.
- **Confirmed Decision 4**: Enhance `/api/auth/check-verification` and client-side status checks to check both `public.users` and `auth.users`, ensuring instant bidirectional sync with zero egress waste.

---

## 1. Overview & Core Concept

- **What It Does**: Ensures that once a user's email is verified (either via OTP confirmation, link verification, admin confirmation, or Google OAuth), their verified status remains persistently recognized across all browser refreshes, tab navigations, and live production server environments. The "Email Verification Required" banner will never mistakenly display for verified players.
- **Target Audience / Persona**: Registered players (`customer` role) accessing their portal, depositing funds (`/topup`), requesting cashouts (`/withdrawal`), and redeeming referral bonuses.
- **Key Value**: Eliminates false "Action Required" alarms, unblocks cashouts and referral bonus claims, and guarantees 100% synchronization between Supabase PostgreSQL (`public.users`), Supabase Auth (`auth.users`), the Express server (`server.ts`), and the React SPA client.

---

## 2. User Experience & Visual Design

- **Zero False-Alarm Banners**: For verified players like `rashilbasukala@gmail.com`, the page loads cleanly into `/topup` or `/dashboard` without any flashing or momentary appearance of the amber `Email Verification Required` warning box.
- **Instant Local & Server Verification**:
  - If a player clicks "Check Status" in the banner, the client performs a fast check against `/api/auth/check-verification` and the local Supabase client, immediately updates the session and cache, dispatches `aetherpay_state_changed`, and cleanly dismisses the banner with a green confirmation toast.
  - When verified, features gated by verification (cashouts, promotional bonuses) are instantly unlocked without requiring manual logout/login.
- **Unverified Players**: Genuinely unverified players continue to see the prominent amber banner with clear OTP entry and resend options.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Session-Level Verification Persistence**
  - *Chosen Approach*: Add `emailVerified?: boolean` to `UserSession` in `src/services/authSessionService.ts`, persist it in `localStorage` under `aetherpay_active_session`, and update it whenever `authSessionService.updateUserProfile()` or `createSessionForUser()` is invoked.
  - *Why*: While the full user directory (`STORAGE_KEYS.USERS`) is deliberately excluded from `localStorage` for privacy and egress security, the *active user's own session* is already stored in `aetherpay_active_session`. Preserving `emailVerified` on that session object guarantees synchronous zero-latency access on the very first React render.
  - *Alternatives Considered*: Storing the entire `users` table in localStorage (rejected: violates zero-mock/security invariants).

- **Decision 2: Authoritative Hydration in `initialCompactLoad()`**
  - *Chosen Approach*: When a customer session exists, add `supabase.from('users').select('*').eq('id', currentUserId).maybeSingle()` to the `Promise.all` batch in `initialCompactLoad()`.
  - *Why*: Ensures the client runtime directly reconciles with PostgreSQL on startup with a single, indexed, foreign-key-filtered query (`eq('id', currentUserId)`), maintaining our strict bounded-egress architecture.
  - *Alternatives Considered*: Querying the entire `users` table (rejected: unbounded query, violates architectural guidelines).

- **Decision 3: Server Endpoint Verification Dual-Check**
  - *Chosen Approach*: In `server.ts` `/api/auth/check-verification`, check `public.users` table as well as `supabaseAdmin.auth.admin.listUsers()`, and update `public.users.email_verified = true` if `auth.users` confirms verification.
  - *Why*: Prevents divergence between Supabase Auth and the application database.

---

## 4. Technical Architecture & Data Strategy

### System Flow & Verification Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React SPA Client (Mount)                        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   authSessionService.getActiveSession()                │
│    Now contains: { userId, email, role, token, emailVerified: true }   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      dataService.getCurrentUser()                      │
│   Constructs user profile with: emailVerified = session.emailVerified   │
│                 (Never returns undefined on page reload)               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             EmailVerificationBanner: currentUser.emailVerified         │
│          Evaluates TRUE immediately ──> Component Returns NULL         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼ (Concurrent in Background)
┌────────────────────────────────────────────────────────────────────────┐
│                  dataService.initialCompactLoad()                      │
│     Fetches: supabase.from('users').select('*').eq('id', currentUserId) │
│     Syncs: userProfile.emailVerified = dbUser.email_verified           │
│     Updates: authSessionService.activeSession.emailVerified            │
└────────────────────────────────────────────────────────────────────────┘
```

### Component & File Modifications

1. `src/services/authSessionService.ts`:
   - Add `emailVerified?: boolean` to `UserSession` interface.
   - Update `createSessionForUser(userId, email, displayName, role, emailVerified?)` to accept and persist `emailVerified`.
   - In `updateUserProfile(profile: UserProfile)`, sync `this.activeSession.emailVerified = profile.emailVerified`.

2. `src/services/dataService.ts`:
   - In `getCurrentUser()`: When reconstructing user stub from `activeSession`, set `emailVerified: Boolean(session.emailVerified)`.
   - In `initialCompactLoad()`: In the customer branch, add `supabase.from('users').select('id, email, display_name, role, status, email_verified, avatar_url').eq('id', currentUserId).maybeSingle()`. When received, update local user cache and active session.
   - In `reloadAndCheckEmailVerification()` and `confirmEmailNow()`: Ensure `authSessionService.updateUserProfile` is called with `emailVerified: true` and dispatches `aetherpay_state_changed`.

3. `src/services/supabaseAuthService.ts`:
   - In `initAuthListener` (both `onAuthStateChange` and `getSession`): Pass `isConfirmed` into `authSessionService.createSessionForUser(..., isConfirmed)`.
   - In `loginWithEmail`: Pass `isConfirmed` when creating/updating the session.
   - In `registerWithEmail`: Ensure initial confirmation state is passed accurately.

4. `server.ts`:
   - In `/api/auth/check-verification`: Query both `supabaseAdmin.from('users')` and `auth.admin.listUsers()`, sync `email_verified` to `true` in `public.users` if confirmed in auth, and return `{ verified: true }`.

---

## Verification Plan

1. **Build & Type Check**: Execute `compile_applet` to ensure zero TypeScript or Vite build errors.
2. **Session Persistence Test**: Verify that simulating a refresh with active session preserves `emailVerified: true` immediately without falling back to `undefined`.
3. **Database Reconciliation Test**: Verify `initialCompactLoad()` correctly receives `email_verified` from PostgreSQL and keeps `authSessionService` synchronized.
4. **UI Validation**: Verify that the banner is not displayed for verified users on `/topup`, `/dashboard`, or any other customer route.
