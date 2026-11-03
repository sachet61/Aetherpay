# Production Real-Time Chat Infrastructure Optimization Plan

## Summary
Comprehensive resolution of all 5 diagnostic bottlenecks identified in the non-AI real-time chat infrastructure. Consolidates redundant Supabase Realtime channels into single multiplexed connections, eliminates UI main-thread blocking from synchronous `localStorage` writes via bounded debounced caching, implements deterministic composite keyset pagination `(created_at, id)` with monotonic tie-breaking, and streamlines delta synchronization to single-query canonical lookups. Fully compatible with live Supabase PostgreSQL and the Node/Express backend.

---

## 1. Core Architectural Flaws & Targeted Solutions

| Diagnostic Issue | Root Cause | Production Architectural Fix |
| :--- | :--- | :--- |
| **1. Dual-Channel Subscription Overhead** | `CustomerChat.tsx` creates two separate WebSocket channels (`room_` + `db_chat_`), doubling gateway connections. | Consolidate broadcast and `postgres_changes` into a **single multiplexed channel** (`chat_${canonicalConvId}`). |
| **2. Main-Thread LocalStorage Serialization** | `dataService.ts` executes synchronous `JSON.stringify` on the entire message history on every single incoming socket event. | Implement **bounded thread-local storage** (latest 100 messages per conversation) with **debounced asynchronous writes (300ms)** while updating memory immediately. |
| **3. Monotonic Ordering & Jitter** | Sort comparison relies solely on `new Date(createdAt).getTime()`, leading to indeterminate ordering on rapid sub-millisecond multi-tab sends. | Implement **monotonic composite tie-breaking**: `new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() \|\| a.id.localeCompare(b.id)`. |
| **4. Keyset Pagination & DB Efficiency** | Messages fetched with offset/timestamp filters without compound keyset cursor support. | Implement **composite keyset pagination** using `(created_at, id)` cursor slicing in `dataService.ts` and ensure index compatibility on `messages(conversation_id, created_at DESC, id)`. |
| **5. Multi-Candidate ID Query Waste** | `syncDelta` and `fetchMessagesForConversation` scan multiple legacy alias arrays on each poll/focus event. | Enforce **write-time canonical ID normalization**; query strictly `conv_${currentUserId}` during delta sync. |

---

## 2. Technical Implementation Specifications

### Step 1: Single Multiplexed Realtime Channel (`src/pages/customer/CustomerChat.tsx` & `GlobalChatNotificationManager.tsx`)
- Replace the twin `broadcastChannel` + `dbChannel` setup with a single multiplexed Supabase channel:
  ```typescript
  const chatChannel = supabase.channel(`chat_${canonicalConvId}`)
    .on('broadcast', { event: 'new_chat_message' }, ({ payload }) => {
      handleIncoming(payload);
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${canonicalConvId}`
    }, (payload) => {
      handlePostgresInsert(payload.new);
    })
    .subscribe();
  ```
- Store and cleanly unsubscribe `chatChannel` on component unmount or user change.

### Step 2: Bounded Local Storage & Debounced Persistence (`src/services/dataService.ts`)
- In `saveToLocalStorage(STORAGE_KEYS.MESSAGES)`:
  - Prune each conversation thread in the persistent payload to the **latest 100 messages**.
  - Debounce the `localStorage.setItem` call by 300ms so rapid bursts of incoming or sent messages never block the rendering pipeline.
  - In-memory cache (`this.cache[STORAGE_KEYS.MESSAGES]`) retains the full active session history for immediate, zero-latency UI rendering.

### Step 3: Composite Keyset Pagination & Deterministic Monotonic Sorting (`src/services/dataService.ts`)
- In `getMessages()` and `fetchOlderMessages()`:
  - Enforce monotonic ordering:
    ```typescript
    sorted = messages.sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return diff !== 0 ? diff : a.id.localeCompare(b.id);
    });
    ```
  - In `fetchOlderMessages(conversationId, oldestTimestamp, oldestId)`:
    - Slices strictly by `created_at <= oldestTimestamp` and excludes `id = oldestId` to eliminate edge pagination duplicate records.

### Step 4: Write-Time Normalization & Streamlined Delta Sync (`src/services/dataService.ts`)
- In `syncDelta()`:
  - Query directly against `canonicalConvId` with a 10-second clock-skew tolerance buffer.
  - Eliminate multi-candidate alias array construction.
- In `server.ts`:
  - Verify `/api/chat/messages` and `/api/chat/send` strictly enforce `conv_${customerId}`.

---

## 3. Production Verification & Safety Invariants
- **Zero Mock / Zero Fallback**: Real PostgreSQL and Supabase Realtime channels only.
- **Port 3000 Stability**: Dev server verified responding with `HTTP 200`.
- **Zero Data Loss**: Existing message history and database rows remain untouched and protected.
- **Build Verification**: Run `compile_applet` to confirm clean compilation and zero TypeScript errors.

---

## 4. User Confirmation
Please review the architecture plan above. Click **Proceed** to apply the fixes across `src/services/dataService.ts`, `src/pages/customer/CustomerChat.tsx`, and `src/components/common/GlobalChatNotificationManager.tsx`.
