# Cross-Browser Chat Sync & Dev Server Stability Plan

## Summary
Resolve real-time chat desynchronization between separate browsers logged into the same account, while verifying and locking dev server runtime stability on port 3000. Eliminates fragmented conversation IDs, unifies Supabase Realtime rooms and `postgres_changes` stream filters, prevents destructive message deletion during thread deduplication, and adds automatic visibility/focus delta sync.

---

## Dev Server Status & Runtime Stability

- **Port & Host**: Verified running on `http://localhost:3000` (listening on `0.0.0.0:3000`).
- **HTTP Verification**: Confirmed responsive with `HTTP/1.1 200 OK` (`X-Powered-By: Express` mounting `vite.middlewares`).
- **Compilation Check**: `npm run build` and `compile_applet` verified passing with zero errors.
- **Process Guard**: Dev server process restarted fresh via `restart_dev_server` to ensure clean WebSocket and HMR listeners.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Deterministic Canonical ID**: Every customer conversation ID is strictly enforced as `conv_${customerId}` across all browser sessions and devices. Any legacy conversation IDs (`conv_1`, `conv_abc`, etc.) will be automatically consolidated into `conv_${customerId}` in live PostgreSQL without message loss.
>
> **Zero Data Loss Guarantee**: Destructive `DELETE FROM messages` operations in client deduplication routines are removed. All messages belonging to legacy aliases are re-parented via SQL `UPDATE messages SET conversation_id = 'conv_' || customer_id`.

---

## 1. Overview & Core Concept
- **Problem**: When a customer logs into two separate browsers, Browser A and Browser B maintain independent local caches. If Browser A holds a legacy conversation (`conv_1`) while Browser B initializes `conv_${customerId}`, messages sent from Browser A are saved under `conv_1` and broadcast to `room_conv_1`, while Browser B only subscribes to `room_conv_${customerId}` and filters `postgres_changes` on `conversation_id = conv_${customerId}`. Furthermore, neither browser performs delta catch-up on tab focus or visibility changes.
- **Goal**: Full bidirectional synchronization where any message sent from either browser appears instantaneously (< 150ms) in the other browser, and the entire message history is unified and complete across both browsers and on page refresh.

---

## 2. Key Architecture & Synchronization Flow

```
┌─────────────────────────────────┐                ┌─────────────────────────────────┐
│        Browser Instance A       │                │        Browser Instance B       │
│  (Logged in as customer usr_X)  │                │  (Logged in as customer usr_X)  │
└────────────────┬────────────────┘                └────────────────┬────────────────┘
                 │                                                  │
                 │ 1. Guaranteed Canonical ID: conv_usr_X           │ 1. Guaranteed Canonical ID: conv_usr_X
                 │                                                  │
                 │ 2. Broadcast & DB Upsert                         │ 2. Realtime Broadcast & Postgres Stream
                 ▼                                                  ▼
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │                         Supabase Realtime & PostgreSQL                      │
   │                                                                             │
   │   • Channel: room_conv_usr_X (both browsers subscribed)                    │
   │   • postgres_changes: messages WHERE conversation_id = 'conv_usr_X'         │
   │   • Database Table: messages (strictly keyed to conv_usr_X)                 │
   └──────────────────────────────────────┬──────────────────────────────────────┘
                                          │
                        3. Window Focus / Tab Activation
                        Catch-up Delta (.gt('created_at', lastTimestamp))
                                          ▼
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │                   Instant State & Chronological Merge                       │
   └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Key Technical Decisions & Trade-Offs

### 1. Deterministic Canonical Conversation ID Invariant
- **Approach**: Ensure `getOrCreateConversationForCustomer` and `deduplicateAndMergeConversations` ALWAYS enforce `conv_${customerId}` as the primary ID.
- **Why**: Eliminates client-side ID divergence where Browser A adopts an arbitrary local ID from cache while Browser B creates a fresh canonical ID.
- **Trade-Off**: Any legacy aliases in storage (`conv_1`, etc.) will be cleanly re-mapped to `conv_${customerId}`.

### 2. Live Supabase Thread Consolidation Without Deletion
- **Approach**: Remove the unsafe `supabase.from('messages').delete().in('conversation_id', duplicateIds)` call. Instead, execute an atomic update:
  `UPDATE messages SET conversation_id = 'conv_' || customer_id WHERE conversation_id IN (legacyIds)`
  prior to deleting empty legacy conversation records.
- **Why**: Prevents message loss if concurrent inserts occur or if migration is partially executed.

### 3. Unified Realtime Subscriptions (Broadcast + Postgres Changes)
- **Approach**:
  - In `CustomerChat.tsx`: Subscribe to `room_${canonicalId}` for instant peer-to-peer broadcast delivery across tabs/browsers.
  - Subscribe to `postgres_changes` on `messages` table for `conversation_id=eq.${canonicalId}` so database inserts from the server or other clients are immediately captured.
  - Handle duplicate message reconciliation by unique message `id`.

### 4. Visibility & Window Focus Delta Catch-Up
- **Approach**: In `CustomerChat.tsx` and `dataService.ts`:
  - When `document.visibilityState === 'visible'` or window receives `focus`, fetch messages created after the latest in-memory message timestamp (`.gt('created_at', latestTimestamp)`).
  - Merges newly received rows into React state without full page reload or UI flicker.

---

## 4. Implementation Steps (To Execute Upon Approval)

1. **`src/services/dataService.ts`**:
   - Enforce `conv_${customerId}` as the non-negotiable canonical ID in `getOrCreateConversationForCustomer` and `deduplicateAndMergeConversations`.
   - Update `fetchMessagesForConversation` to query all historical candidate IDs and user-scoped messages, consolidating them under `conv_${customerId}` in PostgreSQL.
   - Remove destructive message deletion from `deduplicateAndMergeConversations`.
   - Add chat message delta sync to `syncDelta()`.

2. **`src/pages/customer/CustomerChat.tsx`**:
   - Ensure the active conversation ID is resolved to `conv_${currentUser.id}`.
   - Attach a window `focus` and `visibilitychange` listener that performs a timestamp-bounded delta query to catch up messages sent from another browser.
   - Ensure `channelRef` and `dbChannel` consistently use `conv_${currentUser.id}`.

3. **`src/components/common/GlobalChatNotificationManager.tsx`**:
   - Align the background customer message listener with `conv_${currentUser.id}`.

4. **Verification**:
   - Compile using `compile_applet`.
   - Verify TypeScript type safety (`tsc --noEmit`).
