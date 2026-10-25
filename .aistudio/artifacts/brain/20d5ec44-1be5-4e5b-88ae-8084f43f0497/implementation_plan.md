# Resolution Plan - Fix Supabase "Database error granting user"

## Diagnosis
1. **Operator Type Mismatch in Guard Trigger (`uuid = text`):** The previous trigger function `public.sync_user_verification_status` executed `WHERE id = NEW.id` comparing `auth.users.id` (type `uuid`) with `public.users.id` (type `text`). In PostgreSQL, this comparison fails with `ERROR: operator does not exist: uuid = text`.
2. **Cascading Failure during GoTrue Sign-In:** When signing in, Supabase GoTrue updates `auth.users` (`last_sign_in_at`). The unhandled exception from the attached trigger aborted the entire authentication transaction, producing the GoTrue client error `"Database error granting user"`.
3. **Trigger Over-Firing:** `on_auth_user_sync_trigger` was firing on every `UPDATE` to `auth.users`. It should only fire on user creation (`INSERT`) or when `email_confirmed_at` actually changes (`UPDATE OF email_confirmed_at`).

## Strategy & Architectural Fix
1. Drop the circular and broken `tr_protect_public_user_verification` trigger and its function from `public.users`.
2. Replace it with a pure local trigger (`prevent_verification_downgrade`) that prevents downgrading `email_verified` from true to false without querying `auth.users`.
3. Harden `handle_auth_user_sync()` on `auth.users` with `NEW.id::text` casting, conflict resolution by ID and email, and an `EXCEPTION WHEN OTHERS THEN` guard so auth operations never fail even if profile sync encounters an edge case.
4. Restrict trigger execution to `AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users`.
