# Customer Wallet History, Dashboard Persistence & Login Hydration

This plan replaces the legacy Wallet & Ledger transaction table with a unified historical view of all Deposits, Withdrawals, and Referral transactions, while fixing a systemic login hydration gap so Latest Top-Up Amount and Game ID counts appear accurately across reloads and browsers.

### User Review & Critical Decisions

> [!IMPORTANT]
> All five architectural and UX decisions below were confirmed during clarification and will govern execution:

- **Confirmed Decision 1 — Unified History with Category Filters**: Replace the Wallet & Ledger table with a single chronological activity stream featuring segmented filters for `All Activity`, `Deposits`, `Withdrawals`, and `Referrals`.
- **Confirmed Decision 2 — Full Status Visibility & Audit Notes**: Display every request lifecycle state (`submitted`, `verifying`, `processing`, `completed`, `approved`, `rejected`, `cancelled`) along with review/rejection notes, payout references, target game labels, and fee/bonus breakdowns.
- **Confirmed Decision 3 — Final Credited Last Deposit Amount**: Persist the Dashboard's Latest Top-Up Amount from the customer's most recent completed deposit (`base amount + bonus amount`), including its target game and timestamp, independently of cumulative wallet lifetime counters.
- **Confirmed Decision 4 — Immediate Dashboard Game ID Count**: Hydrate customer game accounts automatically during login so the Dashboard's `My Game IDs (N)` action tile and platform credential indicators render accurate totals immediately without visiting the Game IDs tab first.
- **Confirmed Decision 5 — Full Customer Login Hydration**: Upgrade session initialization and authentication sync to hydrate all customer-scoped tables (`users`, `wallets`, `topups`, `withdrawals`, `game_accounts`, `transactions`, `conversations`, `messages`) immediately after every login, session restore, and cross-browser load.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. **Unified Wallet Activity History**: Transforms the Wallet & Ledger screen into a complete, auditable player record combining real Deposit requests, Cashout/Withdrawal requests, and Referral reward events—replacing sparse ledger entries that previously missed request statuses, rejection notes, and unhydrated database rows.
  2. **Persistent Latest Deposit Metric**: Derives and caches the Dashboard's Latest Top-Up Amount (`base + bonus`) and target game directly from the latest completed deposit stored in PostgreSQL, ensuring exact consistency across page reloads, sign-outs, and separate browsers.
  3. **Immediate Dashboard Game IDs & Full Sync**: Executes scoped customer hydration (with resilient server-route fallback for game accounts) right after authentication completes, ensuring Dashboard counters and Wallet history never start empty.
- **Target Audience / Persona**: Verified and returning players accessing their Swift Sweeps portal on desktop or mobile across multiple sessions or devices.
- **Key Value**: Eliminates invisible transaction history, disappearing deposit metrics, and stale `0` Game ID counts—making every financial action and account credential immediately verifiable after login.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Post-Login Dashboard**: Upon signing in on any browser, customer data hydrates immediately. The hero balance card displays the final credited total (e.g., `$130.00` for a `$100` deposit + `$30` bonus) and target game name, while the quick-action tile immediately reads `My Game IDs (N)`. Recent Activity reflects the latest deposits, withdrawals, and referrals.
  2. **Inspecting Wallet History**: Navigating to Wallet & Ledger shows the four existing balance summary cards (`Withdrawable Cash`, `Referral Bonus`, `Reserved for Cashout`, `Pending Deposits`), followed by the unified activity toolbar (`All Activity`, `Deposits`, `Withdrawals`, `Referrals`), reference/description search input, and CSV statement export.
  3. **Auditing Request Details & Notes**: Each row displays timestamp, category label, target game / method, gross amount, bonus or fee impact, final net/credited figure, and explicit text+color status (`Completed`, `Verifying`, `Processing`, `Rejected`). Clicking any row opens a detail modal showing full IDs, reviewer name, review/rejection notes, payout hash/details, and timestamps.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-trust dark financial gaming vault matching the existing Swift Sweeps executive slate surface hierarchy.
  - *Color Palette & Mood*: Deep obsidian canvas (`#0A0F1D`), elevated navy cards (`#0E1726` and `slate-900`), crisp `slate-800` hairline borders, high-contrast emerald (`emerald-400`) for completed credits/final credited deposits, warm gold (`amber-400` / `amber-500`) for bonuses and primary CTAs, cyan (`cyan-400`) for processing states, and rose (`rose-400`) for rejected/reversed requests.
  - *Typography & Hierarchy*: Clean sans-serif headings paired with `font-mono tabular-nums` across all currency amounts, fees, bonuses, reference IDs, and timestamps so ledger columns align vertically.
  - *Component Styling & Layout*: Preserve the 4-column summary card strip above a single full-width control bar and responsive table/detail modal. Static metadata (category names, payment methods, status text, review notes) uses crisp colored typography and bordered micro-labels rather than floating decorative pill badges; segmented filter buttons remain single-line (`whitespace-nowrap`) with active amber highlight.
- **Interactive Feedback & Motion**: Smooth modal reveal for record inspection, subtle row hover highlight (`bg-slate-800/40`), instant reactive refresh when Supabase hydration finishes, clear empty-state guidance when no records match a filter or search term, and explicit loading feedback if hydration is actively in flight.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Merge Authoritative Request Tables with Ledger Transactions Client-Side**
  - *Chosen Approach*: Build a pure, deduplicating activity selector that unifies `topups`, `withdrawals`, and `transactions` (preserving standalone `referral_reward` and adjustment/legacy ledger records while enriching deposit/withdrawal entries with request-level bonuses, fees, payout methods, games, and review notes).
  - *Why*: Deposit and withdrawal rejections, pending states, bonus breakdowns, and staff review notes live authoritatively in the request tables rather than the compact `transactions` table (whose schema does not store fee, bonus, or review note columns).
  - *Alternatives Considered*: Reading only the `transactions` table (rejected because pending/rejected requests and staff notes do not exist there) or altering the database schema (unnecessary and risky for live records).
- **Decision 2 — Authoritative Re-Ordering & Latest-Completed Query for Last Deposit**
  - *Chosen Approach*: Reorder hydration so `topups` and `withdrawals` apply before `wallets`, add a bounded lookup for the user's latest completed/approved deposit (`limit(1)` ordered by `updated_at` descending), recompute wallet last-deposit metadata (`amount + bonus_amount`, target game, timestamp) whenever top-ups synchronize, and stop overwriting that metric with cumulative lifetime `total_deposited` counters.
  - *Why*: Previously, wallets hydrated before top-ups, stale `0` or cumulative wallet fields shadowed actual completed deposits, and newer pending requests could push an older completed deposit out of a small slice.
  - *Alternatives Considered*: Adding extra columns to `wallets` in PostgreSQL (rejected to preserve live schema compatibility without requiring manual DDL migrations).
- **Decision 3 — Full Customer-Scoped Hydration with Server Fallback on Every Login**
  - *Chosen Approach*: Update session hydration so customer roles trigger bounded, user-scoped hydration of all customer tables (`users`, `wallets`, `topups`, `withdrawals`, `game_accounts`, `transactions`, `conversations`, `messages`), falling back to the dedicated authenticated server route for `game_accounts` if the browser query returns empty or fails RLS checks.
  - *Why*: Previously, session hydration gated on `admin` or `agent` roles only, leaving newly logged-in customers with empty Dashboard counters and history until they visited individual tabs.
  - *Alternatives Considered*: Triggering separate fetches inside every individual page component (rejected because it duplicates requests, delays Dashboard totals, and causes staggered UI pop-in).

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Auth & Session Lifecycle Layer                       │
│   Email Login / OAuth / Session Restore  ──▶  Trigger Customer Hydrate  │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ (User ID & Role Scoped)
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               Bounded Customer Hydration & Realtime Engine              │
│  Parallel Queries: users · wallets · topups (+latest completed) ·       │
│  withdrawals · transactions (limit 50) · game_accounts (+API fallback)  │
│  · conversations · messages                                             │
│                                                                         │
│  Apply Order Invariant: TopUps/Withdrawals ──▶ Wallets Reconciliation   │
└──────────────┬───────────────────────────────────────────┬──────────────┘
               │                                           │
               ▼                                           ▼
┌─────────────────────────────────┐       ┌───────────────────────────────┐
│   Pure Wallet Metrics Helper    │       │  Pure Unified Activity Helper │
│  • Derives latest completed     │       │  • Merges topups, withdrawals │
│    deposit (amount + bonus)     │       │    & referral/ledger entries  │
│  • Resolves target game & date  │       │  • Deduplicates linked rows   │
│  • Keeps lifetime total clean   │       │  • Supports category & search │
└──────────────┬──────────────────┘       └──────────────┬────────────────┘
               │                                         │
               ▼                                         ▼
┌─────────────────────────────────┐       ┌───────────────────────────────┐
│       Customer Dashboard        │       │    Wallet & Activity Tab      │
│  • Latest Top-Up Amount card    │       │  • 4 Balance Summary Cards    │
│  • Immediate My Game IDs (N)    │       │  • Deposits/Withdrawals/Ref   │
│  • Recent Unified Activity (5)  │       │    filters, CSV & Note Modal  │
└─────────────────────────────────┘       └───────────────────────────────┘
```

- **Data Model & State**:
  - **Customer Session Hydration**: Scoped strictly to `customer_id = currentUser.id` with bounded `.limit(...)` clauses and explicit ordering (`created_at` / `updated_at` descending). Zero `localStorage` cross-user leakage and zero unbounded table scans.
  - **Wallet Last Deposit State**: Derived deterministically from completed/approved top-up records sorted by completion/update timestamp (`finalWalletCredit = amount + bonusAmount`), stored cleanly on the runtime wallet state without conflating `total_deposited` with last-deposit display values.
  - **Unified Activity Record**: Normalized read-model containing `id`, `category` (`deposit` | `withdrawal` | `referral` | `other`), `title`, `baseAmount`, `bonusAmount`, `feeAmount`, `netAmount` (for deposits: final credited `amount + bonusAmount`; for withdrawals: net payout or requested gross), `status`, `methodName`, `targetGameName`, `reviewNotes`, `reviewerName`, `payoutReference`, `referenceId`, and `timestamp`.
- **Interactive Component & State Mapping**:
  - **Login / Session Restore**: Calling login or restoring an active Supabase auth session invokes customer session hydration immediately, writing normalized records into the central store and emitting `aetherpay_state_changed` so subscribed hooks re-render Dashboard and Wallet views automatically.
  - **Dashboard Mount & Quick Actions**: Reads hydrated `gameAccounts.length` (triggering background fallback hydration only if unhydrated), renders the persisted Latest Top-Up Amount and target game from the wallet/completed-deposit selector, and lists the 5 most recent unified activity items linking into the Wallet tab.
  - **Wallet & Activity Controls**: Category filter tabs (`All Activity`, `Deposits`, `Withdrawals`, `Referrals`), live search box, pagination (`+25` reveal), CSV export of the filtered unified records, and row-click detail modal displaying complete request audit metadata (including rejection reasons and reviewer notes).
- **Key Sequences & Integrations**:
  - **Hydration Ordering**: `topups` (recent 30 + latest completed/approved 1) and `withdrawals` (recent 30) apply to memory before `applyWalletRows`, and both `applyTopupRows` and realtime `topups` events invoke wallet last-deposit reconciliation so approvals immediately update the Dashboard card without waiting for a manual reload.
  - **Transaction Delta Sync**: Realtime and visibility-resume delta sync include bounded `transactions` queries (`customer_id = currentUser.id`) alongside `wallets`, `topups`, `withdrawals`, and `game_accounts` so newly awarded referral bonuses or staff-approved deposits/cashouts propagate live across tabs and browsers.
