# Implementation Plan - Complete Removal of Demo/Seed Data for Production

## User Request & Context
- **User Request**: Remove all demo and seeded data (including fake seed accounts like `marcus.vance@example.com`, `elena.rostova@example.com`, etc.) that cause email availability/authentication conflicts with Supabase Auth. Rely 100% on Supabase Auth for production.
- **Goal**: Cleanly strip out all mock seed users, mock wallets, mock transactions, mock support tickets, and fallback seed credentials from `seedData.ts` and `authSessionService.ts`.

## Proposed Changes

### 1. `src/services/seedData.ts`
- Empty out `INITIAL_USERS`, `INITIAL_WALLETS`, `INITIAL_TRANSACTIONS`, `INITIAL_TOPUPS`, `INITIAL_WITHDRAWALS`, `INITIAL_GAME_ACCOUNTS`, `INITIAL_CONVERSATIONS`, `INITIAL_MESSAGES`, `INITIAL_NOTIFICATIONS`, and `INITIAL_AUDIT_LOGS`.
- Keep `INITIAL_CONFIG` and `INITIAL_GAME_CATALOG` (master game catalog is needed for players to view available games).

### 2. `src/services/authSessionService.ts`
- Empty out `SEED_CREDENTIALS` (`{}`).
- Remove auto-population of seed credentials in `initCredentials()`.
- Update `hasAccount()` to check only actual registered credentials or Supabase Auth.

## Verification Plan
- **Build Check**: Run `compile_applet` to verify compilation and TypeScript types.
- **Auth Verification**: Verify that sign up and password reset/recovery interact directly with Supabase Auth without interference from stale seed accounts.
