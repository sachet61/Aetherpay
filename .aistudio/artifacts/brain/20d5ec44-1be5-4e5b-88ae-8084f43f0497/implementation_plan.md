# Architectural Breakdown: User Directory Updates & Vercel Deployment Analysis

## 1. How the Users List is Fetched and Updated
The Swift Sweeps iGaming platform uses an **on-demand, server-authoritative live query model** (with zero localStorage caching for user records) to maintain absolute financial and administrative consistency across all sessions:

```
┌─────────────────────────┐         GET /api/admin/users         ┌──────────────────────────┐
│ AdminUsers.tsx (React)  │ ───────────────────────────────────> │ Express Server (server.ts│
│ - Triggers loadUsersLive│ <─────────────────────────────────── │ - Validates Auth Cookie/ │
│ - Renders UI Table      │            JSON Response             │   Headers (x-user-role)  │
└─────────────────────────┘                                      └────────────┬─────────────┘
                                                                              │
                                                                   supabaseAdmin queries
                                                                   PostgreSQL tables
                                                                              │
                                                                              ▼
                                                                 ┌──────────────────────────┐
                                                                 │ Supabase PostgreSQL DB   │
                                                                 │ - users                  │
                                                                 │ - wallets                │
                                                                 │ - game_accounts          │
                                                                 └──────────────────────────┘
```

1. **Client Trigger (`AdminUsers.tsx`)**: When an administrator opens the "Users & Roles" tab or clicks "Refresh", `loadUsersLive()` calls `dataService.fetchLiveUsersDirectory(currentUser)`.
2. **HTTP Request (`dataService.ts`)**: A `GET` request is sent to `/api/admin/users` with headers containing `x-user-id`, `x-user-role`, and authorization session cookies.
3. **Backend Authorization & Aggregation (`server.ts`)**:
   - The Express backend validates whether the acting user is an authorized `admin` or `agent` (or protected super admin `sachet61@gmail.com`).
   - It queries PostgreSQL via `supabaseAdmin` (bypassing RLS with the service role key) to fetch up to 100 users ordered by `created_at DESC`.
   - It performs batched lookups on the `wallets` and `game_accounts` tables for those user IDs.
   - It merges user records, balances, and game account credentials into an aggregated array and returns `{ success: true, users: [...] }`.
4. **State Synchronization (`aetherpay_state_changed`)**: Whenever roles are updated or users are deleted, custom window events dispatch `aetherpay_state_changed` to instantly trigger live re-fetching without stale caching.

---

## 2. Why It Works in AI Studio But Fails on Vercel
The root cause of the deployment discrepancy lies in **Runtime Architecture & Entry Point Execution**:

### Local / AI Studio Runtime (Vite + Express in `server.ts`)
- The app runs a unified Node.js Express process (`server.ts` on port 3000) that explicitly registers all `/api/*` endpoints (including `/api/admin/users`) and then mounts Vite in middleware mode (`app.use(vite.middlewares)`).
- Because Express and Vite share the exact same Node process and port, every frontend fetch request to `/api/admin/users` is intercepted and handled directly by Express, querying Supabase successfully.

### Vercel Serverless Runtime
- Vercel deploys frontends as static SPAs (or via Next.js framework routing) and treats backend API routes as serverless functions (e.g., `api/` directory functions or rewrites).
- **The Mismatch**: If the app is structured as a Vite SPA backed by an Express `server.ts` entry point, Vercel **cannot execute `server.ts` as a persistent Express server** unless configured with explicit Vercel serverless function handlers (`api/admin/users.ts` or `api/index.ts`) or `vercel.json` rewrites. 
- Without corresponding serverless function files for each `/api/*` route on Vercel, requests to `/api/admin/users` result in **HTTP 404 (Not Found)** because Vercel looks for serverless endpoints in an `/api` directory that are missing from a pure Vite SPA bundle.

---

## 3. Recommended Solution for Vercel Deployment
To make the app run natively on Vercel alongside AI Studio, the backend routes must be adapted for Vercel's serverless architecture:
1. **Option A (Vercel Serverless Functions)**: Create individual serverless handler files under an `/api` folder (e.g., `api/admin/users.ts`) or a unified Next.js/Vercel catch-all API route handler if migrating to Next.js.
2. **Option B (Direct Client-Side Supabase Client)**: For non-privileged read operations or where RLS permits, query Supabase directly from client-side services while keeping privileged administrative mutations secured.
