# Implementation Plan: Pure On-Demand User Directory Architecture (Zero LocalStorage Caching)

Completely eliminate browser `localStorage` caching for user accounts. User directory data, wallet balances, and game account totals will be fetched strictly on-demand from the PostgreSQL database only when an authorized administrator or agent opens the Users & Roles tab.

---

## 1. Architectural Rationale & Egress Benefits

- **Zero Egress on Page/App Startup:** Initial app loading, customer sessions, and navigating non-admin tabs will **never** download the user directory or populate memory/storage.
- **Pure Live Data (Zero Stale Cache):** Every time an admin opens the Users & Roles tab, the interface queries the live PostgreSQL database directly through `/api/admin/users`, ensuring 100% up-to-date roles, wallets, and accounts without caching desynchronization.
- **Zero LocalStorage User Footprint:** Eliminates `aetherpay_users` from browser storage, preventing sensitive staff/player metadata from lingering in local storage.

---

## 2. Proposed Changes

### Backend API: Live Aggregated Directory (`server.ts`)

#### `/api/admin/users` Endpoint
- **On-Demand Aggregation:**
  1. Query `public.users` (ordered by `created_at DESC`, bounded by `.limit(100)`).
  2. Batch-query `public.wallets` for all returned user IDs.
  3. Batch-query `public.game_accounts` to count assigned gaming accounts per user.
  4. Aggregate `availableBalance`, `referralBonusBalance`, and `gameAccountsCount` directly onto each user object.
- **Administrative Authorization Guard:**
  - Verify that the requesting session has `role === 'admin'` or `role === 'agent'`.
  - Return HTTP `401 Unauthorized` / `403 Forbidden` if unauthenticated or unauthorized.

---

### Data Service De-Caching (`src/services/dataService.ts`)

- **Remove User Caching:**
  - Remove user persistence to `localStorage.getItem(STORAGE_KEYS.USERS)` and `localStorage.setItem(STORAGE_KEYS.USERS)`.
  - Remove user list fetching from `initialCompactLoad()` so background app startup never fetches user records.
  - Remove user polling / delta sync loops for users.
- **Provide On-Demand Live Method:**
  - Expose `fetchLiveUsersDirectory(): Promise<{ success: boolean; users: UserProfile[]; error?: string }>` which directly queries `/api/admin/users` and returns the live array without caching to browser storage.

---

### Frontend UI: Tab-Open On-Demand Loading (`src/pages/admin/AdminUsers.tsx`)

#### 1. Authentication Barrier & Access Prompt
- If `currentUser` is not logged in or is not `admin`/`agent`:
  - Do not trigger any network requests.
  - Render a clean, dark administrative barrier card:
    - Shield/Lock icon.
    - Title: *"Admin Authentication Required"*.
    - Description: *"User Directory and Staff Governance records are restricted to authorized administrators."*
    - Action: *"Sign In as Administrator"* button triggering login navigation.

#### 2. Pure On-Demand Fetch on Tab Open
- State initialization:
  ```typescript
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  ```
- `useEffect` on mount:
  - If authenticated as admin/agent, execute `fetchLiveUsers()`.
  - Render an on-demand loading spinner while data is retrieved from the database.
  - Render error message with a "Retry" button if database query fails (fail loudly, zero swallowed errors).

#### 3. Realtime Updates & Manual Refresh
- Header action: Add a "Refresh Directory" button with a relative timestamp (`"Last updated just now"`).
- Maintain direct local React state updates for role changes and deletions, immediately syncing with the server without local storage writes.

---

## 3. Verification Plan

### Automated Verification
- Run `compile_applet` to verify clean compilation, zero type mismatches, and no missing imports.

### Manual Verification
1. **Unauthenticated Check:**
   - Visit the app without logging in and navigate to the admin user route.
   - Verify that the Access Barrier prompt is displayed and no request to `/api/admin/users` is fired.
   - Verify that browser `localStorage` contains zero `aetherpay_users` entries.
2. **On-Demand Tab Loading:**
   - Sign in as administrator (`sachet61@gmail.com` or preset admin).
   - Click the Users & Roles tab.
   - Verify the loading indicator displays briefly, followed by live user rows with accurate wallet balances and game account totals.
3. **Role Change & Deletion:**
   - Update a role or delete a test user.
   - Confirm server-side persistence in PostgreSQL and immediate reactive UI update.
