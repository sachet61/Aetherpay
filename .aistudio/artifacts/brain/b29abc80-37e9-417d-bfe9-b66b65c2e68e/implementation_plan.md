# Production Request Synchronization & Modal Viewport Hardening Plan

Complete the real-time request lifecycle synchronization between Customer Support Chat and the Requests tab, ensure production PostgreSQL durability across all request types, and eliminate viewport clipping and z-index collisions on all action modals.

## User Review & Critical Decisions

> [!IMPORTANT]
> - **Zero Stale Banners Across Views**: When an agent approves or declines a request in the Requests tab, the amber action banner in Chat for that customer will disappear immediately. Conversely, when approved in Chat, the request will vanish from the Requests queue in real time without a page refresh.
> - **Authoritative PostgreSQL Durability**: In `dataService.ts`, `rejectTopUp`, `provisionGameAccount`, and `assignOrUpdateGameCredentials` will write directly to Supabase (`.update()` / `.upsert()`) targeting the exact record ID. This matches the existing `approveTopUp` and `updateWithdrawalStatus` implementations, preventing stale rows in PostgreSQL from reviving old statuses on delta syncs.
> - **Reactive Chat State Versioning**: In `AdminChat.tsx`, add a reactive `requestsVersion` state counter that triggers re-evaluation of `customerWithdrawals`, `customerGameAccounts`, and `customerTopUps` whenever an `aetherpay_state_changed` event fires.
> - **Modal Polish & Mobile Accessibility**: Elevate all modals in `AdminChat.tsx` (`showGameIdModal`, `showTopUpModal`, `showCashoutModal`, `showNewChatModal`) to `z-[100]` with `max-h-[90vh] overflow-y-auto`, backdrop click dismissal, and prominent `X` buttons.

---

### 1. Diagnosis & Remaining Gaps

1. **Missing Supabase Writes & State Dispatch in Specific Operations**:
   - `rejectTopUp()`: Modifies local memory and updates the transaction card in chat, but never writes the `'rejected'` status to the `topups` table in Supabase and never dispatches `aetherpay_state_changed`. As a result, the Requests queue and subsequent delta syncs still see the top-up as `'submitted'`.
   - `provisionGameAccount()` & `assignOrUpdateGameCredentials()`: Modifies local cache and dispatches chat messages, but lacks direct Supabase writes to the `game_accounts` table. If the page is refreshed or a delta sync occurs, the status may revert to `'pending_assignment'`, keeping the amber banner visible in Chat.
   - `persistToSupabase()`: For `TOPUPS`, `WITHDRAWALS`, and `GAME_ACCOUNTS`, it only upserted `value[0]`. If an item at index > 0 was updated, the database was bypassed.

2. **Missing Reactive State Hook in `AdminChat.tsx`**:
   - `AdminChat.tsx` derives `customerWithdrawals`, `customerGameAccounts`, and `customerTopUps` as plain variables outside of component state:
     ```tsx
     const customerGameAccounts = canonicalCustomerId ? dataService.getGameAccounts(canonicalCustomerId) : [];
     const customerTopUps = canonicalCustomerId ? dataService.getTopUpRequests(canonicalCustomerId) : [];
     const customerWithdrawals = canonicalCustomerId ? dataService.getWithdrawalRequests(canonicalCustomerId) : [];
     ```
   - When an event fired from `AdminRequests.tsx`, `syncFromMemory()` only updated `conversations` and `messages`. If the active conversation list did not produce a new array reference, React skipped re-rendering, leaving the amber action banner visible at the top of the chat view.

3. **`AdminChat.tsx` Modals Layering & Height Overflow**:
   - `showGameIdModal`, `showTopUpModal`, `showCashoutModal`, and `showNewChatModal` in `AdminChat.tsx` still use `z-50` and lack `max-h-[90vh] overflow-y-auto`. On smaller laptop screens or mobile devices, action buttons (such as "Authorize & Complete Payout" and "Provision & Send to Chat") can be clipped by the viewport boundaries.

---

### 2. Proposed Architecture & Fix Strategy

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                  Action Triggered                                       │
│         (ChatTransactionCard / AdminChat Modal / AdminRequests Modal)                  │
└───────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                dataService.ts Engine                                    │
│  - approveTopUp() / rejectTopUp()           ──> Supabase: supabase.from('topups')       │
│  - updateWithdrawalStatus()                  ──> Supabase: supabase.from('withdrawals')  │
│  - provisionGameAccount() / assignCreds()    ──> Supabase: supabase.from('game_accounts')│
│  - Dispatches 'aetherpay_state_changed' with entity key & timestamp                     │
└───────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    ▼                                               ▼
┌───────────────────────────────────────┐       ┌───────────────────────────────────────┐
│            AdminChat.tsx              │       │          AdminRequests.tsx            │
│ - requestsVersion counter increments  │       │ - syncVersion counter increments      │
│ - Re-evaluates pendingGameRequests    │       │ - Re-evaluates unifiedList queue      │
│ - Re-evaluates pendingWithdrawal      │       │ - Processed items drop out immediately│
│ - Amber Banner clears IMMEDIATELY     │       │ - Zero manual refresh required        │
└───────────────────────────────────────┘       └───────────────────────────────────────┘
```

#### A. Database Durability & Event Dispatch (`src/services/dataService.ts`)
- **`rejectTopUp()`**:
  - Add direct Supabase write:
    ```ts
    if (supabase && isSupabaseConfigured()) {
      supabase.from('topups').update({
        status: 'rejected',
        reviewer_id: params.reviewerId,
        reviewer_name: params.reviewerName,
        review_notes: params.reason,
        updated_at: req.updatedAt,
      }).eq('id', req.id).then(() => {}, (err) => console.warn('Supabase topup reject error:', err));
    }
    window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'topup_rejected', requestId: req.id } }));
    ```
- **`provisionGameAccount()`**:
  - Add direct Supabase upsert:
    ```ts
    if (supabase && isSupabaseConfigured()) {
      supabase.from('game_accounts').upsert({
        id: targetAccount.id,
        customer_id: targetAccount.customerId,
        game_id: targetAccount.gameCatalogId,
        game_title: targetAccount.gameName,
        username: targetAccount.username,
        password: targetAccount.password || '',
        pin: targetAccount.notes || null,
        status: targetAccount.status,
        created_at: targetAccount.createdAt,
        updated_at: targetAccount.updatedAt,
      }).then(() => {}, (err) => console.warn('Supabase game account upsert error:', err));
    }
    window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'game_account_provisioned', accountId: targetAccount.id } }));
    ```
- **`assignOrUpdateGameCredentials()`**:
  - Add direct Supabase update:
    ```ts
    if (supabase && isSupabaseConfigured()) {
      supabase.from('game_accounts').update({
        username: acc.username,
        password: acc.password,
        status: acc.status,
        pin: acc.notes || null,
        updated_at: acc.updatedAt,
      }).eq('id', acc.id).then(() => {}, (err) => console.warn('Supabase game account update error:', err));
    }
    window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'game_credentials_assigned', accountId: acc.id } }));
    ```
- **`persistToSupabase()`**:
  - Update `TOPUPS`, `WITHDRAWALS`, and `GAME_ACCOUNTS` handlers to iterate or safely upsert all modified items rather than strictly `value[0]`.

#### B. Reactive Banner Synchronization (`src/pages/admin/AdminChat.tsx`)
- Add `const [requestsVersion, setRequestsVersion] = useState(0);`
- In `handleSync` (listening to `aetherpay_state_changed` and `storage`), call `setRequestsVersion((v) => v + 1);`
- In `handleApprovePendingCashoutInChat` and `handleConfirmProvisionGameId`, immediately call `setRequestsVersion((v) => v + 1);`
- Ensure derived values (`customerWithdrawals`, `customerGameAccounts`, `customerTopUps`, `pendingWithdrawalForCustomer`, and `pendingGameRequestsForCustomer`) recompute with `requestsVersion` as a reactive dependency.

#### C. Modal Viewports & Accessibility in `AdminChat.tsx`
- **`showGameIdModal`**: Upgrade to `fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto` with modal card `max-w-md w-full max-h-[90vh] overflow-y-auto overscroll-contain my-auto`.
- **`showTopUpModal`**: Upgrade to `z-[100]` with `max-h-[90vh] overflow-y-auto` and backdrop click dismissal.
- **`showCashoutModal`**: Upgrade to `z-[100]` with `max-h-[90vh] overflow-y-auto` and backdrop click dismissal.
- **`showNewChatModal`**: Upgrade to `z-[100]` with `max-h-[90vh] overflow-y-auto` and backdrop click dismissal.

---

### 3. Files to Modify

1. **`src/services/dataService.ts`**:
   - Add Supabase writes and `aetherpay_state_changed` event dispatches to `rejectTopUp`, `provisionGameAccount`, and `assignOrUpdateGameCredentials`.
   - Update `persistToSupabase()` to ensure all updated items are persisted.

2. **`src/pages/admin/AdminChat.tsx`**:
   - Add reactive `requestsVersion` state to guarantee immediate dismissal of the amber action banner upon request approval/rejection.
   - Upgrade all 4 modal dialogs to `z-[100]`, `max-h-[90vh] overflow-y-auto`, and backdrop dismissal.

---

### 4. Verification & Testing Plan

1. **Compilation Check**:
   - Run `compile_applet` to verify clean build without TypeScript errors.
2. **Synchronization Testing**:
   - Approve/reject a cashout in `AdminRequests` -> observe Chat view: the amber banner must vanish instantly.
   - Approve/reject a cashout or credit a top-up in `AdminChat` -> observe `AdminRequests` queue: the item must be removed from the pending list instantly.
   - Provision game credentials in `AdminChat` -> verify both Chat banner and Requests tab queue clear immediately.
3. **Modal Usability on Mobile**:
   - Test opening Top-Up, Cashout, and Game ID modals in `AdminChat.tsx` on narrow viewports: all action buttons ("Authorize & Complete Payout", "Confirm & Credit Game", "Assign Credentials") must be fully visible and scrollable.
   - Verify modal backdrop clicks and `X` buttons cleanly dismiss each modal.
