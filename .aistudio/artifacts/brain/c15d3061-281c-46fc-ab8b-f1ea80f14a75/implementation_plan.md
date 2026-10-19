# Implementation Plan: Eliminate High REST API Egress & Transition to Pure Scoped Realtime

Address the root cause of continuous Supabase REST request spikes (~16,000+ daily GET requests across `messages`, `conversations`, `wallets`, `users`, `topups`, `withdrawals`, etc.) by removing redundant REST `syncDelta` bursts, scoping queries strictly to the active authenticated user, and relying on pure event-driven WebSocket payloads for real-time updates.

---

## Root Cause Analysis

1. **Redundant REST Catch-Up Loop (`syncDelta`)**:
   - Every time a browser tab regained focus or the Realtime WebSocket connection re-established, `syncDelta()` dispatched 7 parallel REST requests across `topups`, `withdrawals`, `wallets`, `users`, `game_accounts`, `conversations`, and `messages`.
   - With multiple users or tab-switching, this generated 1,700–2,480 REST calls per table within 24 hours.

2. **Unscoped Global Table Reads**:
   - Customers opening the app triggered queries for all users and all wallets in the database rather than scoping solely to their own record (`customer_id = currentUser.id`).
   - Every client-side wallet or user state save triggered a bulk upsert of the entire cache, broadcasting change events to all connected clients and creating broadcast amplification.

3. **Duplication Between Realtime & REST**:
   - Supabase Realtime already delivers the updated row directly inside `payload.new`. Fetching the entire table again via REST upon receiving a change or reconnecting was completely redundant.

---

## Proposed Changes

### 1. Data Access & Synchronization Layer (`src/services/dataService.ts`)

#### A. Remove Automatic REST Catch-Up (`syncDelta`) on Focus & Reconnect
- Remove the automatic multi-table `syncDelta()` trigger inside `document.addEventListener('visibilitychange')`.
- Remove `this.syncDelta()` call on WebSocket channel `SUBSCRIBED` status.
- Ensure the app stays connected to Realtime without firing 7 parallel REST queries every time a tab is clicked.

#### B. Direct Event-Driven Ingestion from Realtime Payloads
- Update `queueRealtimeMutation` and `flushRealtimeMutations`:
  - Directly apply `payload.new` into local in-memory cache and dispatch `aetherpay_state_changed`.
  - Never trigger a background REST query when processing Realtime stream events.

#### C. Role & User-Scoped Queries
- Update `initialCompactLoad()` and customer hydration methods:
  - **For Customers**:
    - `wallets`: `.eq('customer_id', currentUserId).maybeSingle()`
    - `game_accounts`: `.eq('customer_id', currentUserId)`
    - `topups`: `.eq('customer_id', currentUserId).order('created_at', { ascending: false }).limit(20)`
    - `withdrawals`: `.eq('customer_id', currentUserId).order('created_at', { ascending: false }).limit(20)`
    - `conversations`: `.eq('customer_id', currentUserId).maybeSingle()`
    - Do NOT query the global `users` table or other customers' wallets.
  - **For Admins**:
    - Load administrative queues on-demand when the admin navigates to the respective dashboard view, using query limits (`limit(30)`) and pagination.

#### D. Single-Record Upserts
- Replace bulk table upserts in `saveToSupabase` with targeted single-record upserts:
  - When a user's wallet changes, upsert only that user's wallet record.
  - When an individual request or message is created, upsert/insert only that single row.

---

### 2. Chat & Communication Layer (`src/pages/customer/CustomerChat.tsx` & `src/pages/admin/AdminChat.tsx`)

#### A. Pure WebSocket Realtime for Live Messages
- Listen to Supabase Realtime `INSERT` on `messages` table filtered by `conversation_id=eq.{id}`.
- Append new incoming messages directly from `payload.new` without re-querying the REST API.

#### B. Scoped Initial Chat Load with Pagination
- Load only the most recent 40 messages for the active conversation on open.
- Load older messages only when the user explicitly clicks "Load Older Messages" via `fetchOlderMessages(conversationId, beforeTimestamp, 40)`.

---

### 3. Verification & Metrics

- **Build & Syntax Verification**:
  - Run `compile_applet` and `lint_applet` to confirm zero TypeScript compilation errors and clean builds.
- **REST Request Validation**:
  - Verify that tab switching or WebSocket reconnects do not trigger any REST requests in the network panel.
  - Verify that customer session loads only fire targeted queries for their own records.
- **Realtime Responsiveness**:
  - Test chat sending and live status updates to confirm instant delivery over WebSocket.
