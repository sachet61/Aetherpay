# Strict Supabase Auth Existence Check for Password Recovery

## Overview & Goal
Ensure password reset requests (`/api/auth/request-reset` and `supabaseAuthService.sendPasswordReset`) strictly validate that the requested email exists in Supabase Auth (`auth.users`) or PostgreSQL `users` table via exact matching, and remove hardcoded demo email fallbacks that allowed non-existent accounts (such as `koofrkolagi@gmail.com`) to trigger password reset dispatches.

## User & Clarification Alignment
- **Explicit Error on Missing Account**: Show an explicit error message stating the email is not registered when not found in Supabase Auth / PostgreSQL.
- **Strict Existence Check**: Enforce strict user existence checks directly against Supabase Auth / PostgreSQL before dispatching recovery tokens or links.

---

## Technical Changes

### 1. Backend Server (`server.ts`)
- **Remove Hardcoded Demo Emails**: Clean up `KNOWN_PLATFORM_EMAILS` map in `/api/auth/request-reset` to eliminate hardcoded fallbacks for test/demo email addresses.
- **Strict Exact Email Matching**: Replace loose wildcard matching (`.ilike.%${cleanEmail}%`) with strict exact case-insensitive matching (`.ilike('email', cleanEmail)` or `.eq('email', cleanEmail)`).
- **Strict Supabase Auth Validation**: Verify existence in `supabaseAdmin.auth.admin.listUsers()` or PostgreSQL `users` table. If neither contains the exact email, immediately return HTTP 404 with error: `"No account found with this email address. Please check your spelling or sign up."`.

### 2. Frontend Auth Service (`src/services/supabaseAuthService.ts`)
- **Strict Error Handling**: Ensure frontend properly displays the 404 error message returned by the server when an email is not registered.
