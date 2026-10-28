# Implementation Plan: Fix "Failed to Fetch" Error on Account Registration

## 1. Exact Root Cause Identified

We conducted live network and environment probing on the running platform. Here is the verified diagnosis:

### What Failed
When a user submits the signup form, `supabaseAuthService.registerWithEmail()` executes:
1. `supabase.from('users').select('id, email').ilike('email', cleanEmail).maybeSingle()`
2. `supabase.auth.signUp(...)`

Both calls fail immediately with **`TypeError: fetch failed`** (DNS resolution `ENOTFOUND your-project.supabase.co`).

### Why It Failed
In `src/services/supabaseClient.ts`, the code resolved the Supabase endpoint as:
```typescript
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as Record<string, string | undefined>);
const proc = typeof process !== 'undefined' && process.env ? process.env : ({} as Record<string, string | undefined>);

export const supabaseUrl = (
  env.VITE_SUPABASE_URL ||
  proc.VITE_SUPABASE_URL ||
  proc.SUPABASE_URL ||
  DEFAULT_SUPABASE_URL
).trim();
```

In the runtime environment, `VITE_SUPABASE_URL` was injected with the template placeholder string:
`"https://your-project.supabase.co"`
and `VITE_SUPABASE_ANON_KEY` with `"your-supabase-anon-key"`.

Because `"https://your-project.supabase.co"` is a non-empty string, JavaScript truthy evaluation accepted it instead of falling back to `DEFAULT_SUPABASE_URL` (`https://fsykihwprqdptrqapxxg.supabase.co`).
As a result, all client-side Supabase network requests were routed to `your-project.supabase.co`, which does not exist in DNS, triggering `Failed to fetch`.

### Verified Live Production Connectivity
We tested direct connectivity to the authoritative Supabase instance:
- **Target URL**: `https://fsykihwprqdptrqapxxg.supabase.co`
- **Users Table Query**: Returned HTTP 200 and real records with `error: null`.
- **Auth SignUp**: Successfully registered test probe `probe_1793149559480@swift-test.com` with user ID `7e151637-4091-4529-a49e-d55c5ac6c008` and `error: null`.

---

## 2. Proposed Architectural Fix

### Step 1: Sanitize Supabase URL & Key Resolution (`src/services/supabaseClient.ts`)
- Implement a strict validation helper `isValidSupabaseValue(val)` that rejects empty strings, dummy placeholders (`your-project.supabase.co`, `your-supabase-anon-key`, `placeholder`, `<...>`, `undefined`).
- Ensure `supabaseUrl`, `supabaseAnonKey`, and `supabaseJwksUrl` automatically fall back to the live production credentials (`DEFAULT_SUPABASE_URL`, `DEFAULT_SUPABASE_ANON_KEY`) whenever an invalid or placeholder value is provided in the environment.

### Step 2: Sanitize Server-Side Supabase Client (`server.ts`)
- Apply the same validation check in `server.ts` for `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to guarantee that backend API routes (such as `/api/auth/request-reset`, admin user provisioning, etc.) never attempt to connect to placeholder domains.

### Step 3: Verification & Live Registration Test
- Run `compile_applet` to ensure zero compilation or type errors.
- Execute a test registration verification to confirm that creating a new user through `supabaseAuthService.registerWithEmail` succeeds against the live database without throwing `Failed to fetch`.
