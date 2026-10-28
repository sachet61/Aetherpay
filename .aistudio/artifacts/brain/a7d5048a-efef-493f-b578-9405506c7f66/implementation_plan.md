# Chat Loading Speed Optimization & Greeting Deduplication Plan

Eliminate repeated Sarah Lin greeting messages, filter legacy duplicate greetings from chat history, and fix chat loading latency and display issues so conversations and messages appear immediately on both Customer and Admin portals without requiring page refreshes.

## User Review & Critical Decisions

> [!IMPORTANT]
> - **Confirmed Choice**: The automated Sarah Lin greeting message will only be sent once for brand new accounts upon initial registration, never on subsequent logins or chat clicks.
> - **Confirmed Choice**: Filter out previously generated duplicate greeting messages from chat histories so users only see at most one welcome message.
> - **Confirmed Choice**: Fully compatible with both local development and live production serverless environments (Vercel).

---

### 1. Overview & Core Concept

- **What It Does**:
  1. Fixes conversation lookup in `dataService.ts` so customers consistently bind to their deterministic canonical conversation (`conv_${customerId}`) rather than generating a new random `conv_${Date.now()}` on every chat click.
  2. Restricts the automated greeting to initial signup only, using persistent storage tracking (`greeting_dispatched_${convId}`).
  3. Deduplicates and cleans legacy duplicate greeting messages from memory and local storage.
  4. Fixes key mismatches in `fetchMessagesForConversation` (`targetConvId` vs `conversationId`) so fetched messages render immediately upon entering the chat tab without waiting or needing a page refresh.
  5. In `AdminChat.tsx`, immediately selects the first conversation if none is highlighted, avoiding blank chat views.

- **Key Value**: Instant, responsive chat loading with pristine message histories and zero repetitive bot greetings.

---

### 2. User Experience & Visual Design

- **Customer Chat Experience**:
  - Clicking "Support Chat" opens the customer's permanent conversation instantly with cached messages rendered in 0ms.
  - No new "Sarah Lin" greeting message appears when returning to chat.
  - Background hydration from Supabase seamlessly populates any new messages without layout shifts.
- **Admin Chat Experience**:
  - Clicking "Support Inbox" immediately displays the conversation list and selects the active/top inquiry.
  - Messages appear immediately upon clicking any conversation card.
  - Clean message timeline without walls of duplicate greeting bubbles.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Deterministic Conversation ID Architecture (`conv_${customerId}`)**:
  - *Chosen Approach*: Bind each customer's conversation ID directly to their customer ID rather than `Date.now()`.
  - *Why*: Prevents orphan conversations from being created when the local cache is empty or syncing.
  - *Alternatives Considered*: Relying on asynchronous `supabase.from('conversations').select(...)` before rendering causes noticeable UI lag and spinners. Deterministic IDs allow instantaneous synchronous rendering while remaining 100% consistent with PostgreSQL.

- **Decision 2: Deduplication Filter for Legacy Messages**:
  - *Chosen Approach*: When loading messages in `getMessages()` and `fetchMessagesForConversation()`, collapse multiple greeting messages (`Welcome to Swift Sweeps Support!...`) into at most one instance.
  - *Why*: Cleans up existing cluttered conversations without requiring destructive database deletes.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                       Chat Trigger                          │
│          (Customer Chat Tab / Admin Support Inbox)          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│        Deterministic Canonical ID Resolution                │
│             convId = conv_${customerId}                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│ Synchronous In-Memory Load   │ │ Async Supabase Hydration     │
│ - Instant 0ms render         │ │ - fetchMessagesForConv       │
│ - Filter duplicate greetings │ │ - Updates targetConvId cache │
│ - No synthetic greeting      │ │ - Dispatches sync event      │
└──────────────┬───────────────┘ └──────────────┬───────────────┘
               │                                │
               └───────────────┬────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Immediate Live Render                       │
│      Messages displayed without page refresh                │
└─────────────────────────────────────────────────────────────┘
```

- **Files to Modify**:
  1. `src/services/dataService.ts`:
     - Update `getOrCreateConversationForCustomer` to use deterministic ID `conv_${customerId}` and remove unconditional `sendChatMessage` greeting.
     - Add greeting guard flag so new accounts only get 1 greeting on initial signup.
     - Fix `fetchMessagesForConversation` to save under `targetConvId` consistently.
     - In `getMessages()`, filter duplicate Sarah Lin greeting messages.
  2. `src/pages/customer/CustomerChat.tsx`:
     - Ensure messages state updates reactively on `conversation_messages_fetched` and `aetherpay_state_changed`.
  3. `src/pages/admin/AdminChat.tsx`:
     - Auto-select top conversation when `selectedConvId` is empty.
     - Ensure reactive state update immediately upon message hydration.
