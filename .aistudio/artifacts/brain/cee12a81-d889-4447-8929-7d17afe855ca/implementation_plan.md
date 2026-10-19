# Supabase PostgREST API Egress Reduction & Realtime Synchronization Plan

Eliminate catastrophic PostgREST API egress consumption (13.20 GB overage against a 5 GB quota) by replacing relentless 3-second and 4-second full-table client polling loops with event-driven Supabase Realtime (`postgres_changes`) push notifications, visibility-aware connection pausing for hidden tabs, soft-delete tracking, 300ms mutation batching, and timestamped delta queries.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions govern this implementation:
> - **Synchronization Strategy**: Transition from aggressive REST polling to event-driven **Supabase Realtime (`postgres_changes`) streaming** with visibility-aware smart synchronization.
> - **Tab Visibility & Inactivity Handling**: Suspend all synchronization immediately when the browser tab is hidden (`document.visibilityState === 'hidden'`) or user is idle, running a single lightweight delta catch-up upon returning to the active tab.
> - **Query Optimization**: Replace unrestricted `select('*')` table dumps with strict timestamp delta queries (`gt('updated_at', lastSyncTimestamp)`), explicit column projections, and pagination limits (`.limit(25)`).
> - **Soft Deletions**: Enforce soft deletes (`deleted_at` timestamps) across all synchronized tables to ensure delta queries accurately capture removed records.
> - **Render Optimization**: Batch incoming Realtime payloads with a 300ms debounce buffer to prevent UI render thrashing during bulk database updates.
> - **Reconnection & Stale Tab Guard**: Bind delta catch-up queries to the Supabase Realtime `SUBSCRIBED` status event, and reset to an initial compact load if the tab has been dormant for >12 hours.

---

### 1. Overview & Core Concept

#### The Root Cause of the Egress Spike
Inspection of the PostgREST egress metrics and codebase revealed that `dataService.ts` was executing two concurrent, unconditioned `setInterval` routines in the client browser:
1. **Chat Poller (`pollSupabaseChat`)**: Fired every 3,000ms fetching `messages` and `conversations`.
2. **General Poller (`pollSupabaseGeneral`)**: Fired every 4,000ms querying **8 entire database tables simultaneously** via `select('*')` without limits:
   - `topups` (all records, no limit)
   - `withdrawals` (all records, no limit)
   - `wallets` (all customer wallets)
   - `game_catalog` (all games)
   - `faked_cashouts` (up to 40 records)
   - `users` (all registered users)
   - `game_accounts` (all provisioned accounts)
   - `app_config` (main JSON payload)

Each open browser tab was making **120+ full-table REST requests per minute**, 24 hours a day, even when backgrounded. This generated 4–5 GB of egress per day for a single open tab, rapidly exhausting the 5 GB quota.

#### The Target Solution
- **Event-Driven Supabase Realtime (`postgres_changes`)**: Subscribe to PostgreSQL change events via WebSocket. Realtime pushes only mutated rows (a few bytes per mutation).
- **Tab Visibility Awareness**: Automatically pause sync subscriptions and disconnect listeners when `document.hidden === true`.
- **Optimized Delta Fetching**: Initial load retrieves only recent active records (`.limit(25)`). Incremental syncs request only records modified after `lastSyncTimestamp`.

---

### 2. Database Configuration & Security

Supabase Realtime requires explicit backend publication configuration to broadcast mutations:

1. **Enable Realtime Publication**:
   Expose the necessary tables to the Realtime replication stream:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE messages, topups, withdrawals, wallets, game_accounts;
   ```

2. **Row Level Security (RLS)**:
   Ensure `SELECT` policies are correctly configured for authenticated users on all published tables. Supabase Realtime respects RLS and will silently drop payloads if read access is not explicitly granted.

3. **Soft Delete Schema Update**:
   - Add a `deleted_at (TIMESTAMPTZ)` column to tables undergoing Realtime sync.
   - Update application logic to set this column instead of executing hard `DELETE` commands, ensuring `updated_at` is modified and broadcasted to clients.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Supabase Realtime vs Throttled Polling**
  - *Chosen Approach*: Supabase Realtime push streaming with fallback delta sync.
  - *Why*: Instant sub-second delivery for chat and transactions while reducing network traffic by over 98%.

- **Decision 2: Complete Suspension on Hidden Tabs**
  - *Chosen Approach*: Completely halt queries when `document.visibilityState === 'hidden'`.
  - *Why*: Completely stops egress bleeding when users leave tabs open in the background or close laptop lids.

- **Decision 3: Stale Tab Fallback (Max Delta Age)**
  - *Chosen Approach*: If `Date.now() - lastSyncTime > 12 hours`, bypass the delta query and perform a clean "Initial Compact Load".
  - *Why*: Prevents massive memory spikes and slow queries if a user returns to a tab that has been offline or sleeping for days.

- **Decision 4: Payload Debouncing (300ms Queue)**
  - *Chosen Approach*: Collect incoming WebSocket row updates into an in-memory queue and flush to state every 300ms.
  - *Why*: Avoids cascading React re-renders when multiple events arrive in rapid succession (e.g., bulk transaction status approvals).

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│             REALTIME SYNC & EGRESS OPTIMIZATION ARCHITECTURE           │
└────────────────────────────────────────────────────────────────────────┘

              Active Browser Tab (document.visibilityState === 'visible')
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
     Initial Compact Load (Limit 25)            Supabase Realtime Channel
     SELECT * FROM table WHERE ...              postgres_changes (INSERT, UPDATE)
                 │                                         │
                 │                                         ▼
                 │                               Payload Debounce Array
                 │                                (Flush every 300ms)
                 │                                         │
                 ▼                                         ▼
     Update Local Cache & State                Update Local Cache & State
                 │                                         │
                 └────────────────────┬────────────────────┘
                                      │
                   User minimizes tab OR Network Drops
                                      ▼
           [ ALL SYNC & POLLING PAUSED — ZERO EGRESS TRANSMITTED ]
                                      ▼
             User returns to tab (visible) OR WebSocket Reconnects
                                      ▼
        Is Date.now() - lastSyncTime > 12 Hours? 
           ├── YES: Run Initial Compact Load (Limit 25)
           └── NO: Run Targeted Delta Query (updated_at > lastSyncTime)
```

#### Step-by-Step Implementation Sequence:

1. **Eradicate Aggressive Polling (`src/services/dataService.ts`)**:
   - Remove `chatTimer` (3000ms) and `generalTimer` (4000ms) unconditioned intervals.
   - Refactor polling functions into on-demand delta sync methods.

2. **Implement Visibility & Network Resilience Listeners**:
   - Listen to `document.addEventListener('visibilitychange')`.
   - Bind the delta catch-up query to the Supabase Realtime `SUBSCRIBED` status event to handle automatic network reconnects (e.g., switching from Wi-Fi to cellular).

3. **Global Supabase Realtime Channel & Debouncing**:
   - Establish a centralized Supabase Realtime channel in `dataService.ts`.
   - Implement a 300ms batching/debouncing queue. Push incoming Realtime row mutations into an array and flush them to the state manager together to prevent UI render thrashing.

4. **Query Parameter Hardening & Soft Deletes**:
   - Add `.limit(25)` to initial table loads.
   - Apply `.gt('updated_at', lastPolledTime)` and `.is('deleted_at', null)` filters to incremental fetches.
   - Implement soft delete mutations (`update({ deleted_at: new Date().toISOString() })`) across data mutations.

5. **Admin Connection & Sync Health Bar**:
   - Display a clean status indicator in the admin console:
     - **Green**: `Realtime Live` (WebSocket streaming active).
     - **Amber**: `Catching Up...` (Delta sync in progress).
     - **Gray**: `Sleeping` (Tab backgrounded, egress paused).
