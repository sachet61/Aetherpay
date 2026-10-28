# Plan: Separate Support Staff from Customer Inboxes & Clean Up Redundant Messages

## Root Cause Analysis
1. **Initial Registration as Customer**:
   Every new user (including staff members like `haudemaxe@gmail.com`) is created as a `customer` during sign-up.
2. **Automated Welcome Greeting Dispatch**:
   Upon first login or visit, `getOrCreateConversationForCustomer()` automatically creates a support conversation record (`conv_<userId>`) and sends the automated greeting: *"Welcome to Swift Sweeps Support! How can our treasury and gaming care specialists assist you today?"* from Sarah Lin (`usr_agent_1`). This conversation is persisted to PostgreSQL (`public.conversations` and `public.messages`) and local cache.
3. **Role Promotion Without Conversation Cleanup**:
   When an administrator promotes the user to `agent` or `admin`, only their role in `public.users` and `auth.users` was modified. Their legacy customer support ticket was never removed from `conversations`.
4. **Missing Customer-Only Filter in Support Inbox (`AdminChat.tsx`)**:
   `AdminChat.tsx` fetched all rows from `conversations` without verifying `user.role === 'customer'`. Consequently, staff members appeared in the Support Inbox as customers, showing their own legacy customer greeting message while logged in as support.
5. **Lack of Role Guard on Conversation Creation**:
   `getOrCreateConversationForCustomer()` did not verify whether the target user was an agent or admin, allowing support conversations to be spawned for staff.

---

## Key Decisions & Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          User Authentication                           │
│                     (Role: 'agent' or 'admin')                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌───────────────────────────────────────┐   ┌────────────────────────────────────┐
│      Server & Startup Self-Healing    │   │        Client Filtering & Guards   │
│ - server.ts startup reconciliation    │   │ - dataService: block staff from    │
│ - Purge lingering staff rows from     │   │   getOrCreateConversation()        │
│   'conversations' & 'messages'        │   │ - AdminChat: strictly filter       │
│ - /api/admin/users/:userId/role auto- │   │   conversations by customer role   │
│   cleans conversation upon promotion  │   │ - De-select staff conversations    │
└───────────────────────────────────────┘   └────────────────────────────────────┘
```

> [!IMPORTANT]
> **Production Server Compatibility**:
> The cleanup handles both live PostgreSQL rows in Supabase and in-memory/localStorage caches. When the server or app initializes, it automatically queries for any conversation records where `customer_id` belongs to an `agent` or `admin` in `public.users` and cleans them up, fixing existing dirty records like `haudemaxe@gmail.com` immediately in live production without requiring manual database intervention.

---

## Affected Files & Proposed Solution

### 1. `server.ts`
- **Startup Reconciliation**:
  On Express server initialization, query `public.conversations` joined with `public.users` (or check users with `role IN ('agent', 'admin')`). Delete any lingering customer support conversation and automated greeting messages belonging to staff accounts.
- **Atomic Cleanup on Role Update (`PATCH /api/admin/users/:userId/role`)**:
  When a user's role is updated to `agent` or `admin`:
  - Delete any matching conversation (`customer_id = targetUser.id` or `customer_email = targetUser.email`) from `public.conversations` and related messages.

### 2. `src/services/dataService.ts`
- **Role Guard in `getOrCreateConversationForCustomer`**:
  If the user's role is `'agent'` or `'admin'`, do not create a conversation or send the automated welcome message; return `null` or existing conversation if in read-only audit mode.
- **Filter in `getConversations()` & `deduplicateAndMergeConversations()`**:
  Filter out any conversations where the associated user has `role === 'agent'` or `role === 'admin'`.
- **Promotion Cleanup in `updateUserRole`**:
  When updating a user to staff, purge their conversation from memory, `localStorage`, and trigger Supabase deletion.
- **Client Cache Self-Healing in `initPersistence()`**:
  Remove any conversation where `customerId` matches an agent or admin.

### 3. `src/pages/admin/AdminChat.tsx`
- **Filter Customer Chats**:
  Ensure `filteredConversations` strictly includes users who are actual customers (`role === 'customer'`).
- **Auto-Deselect**:
  If `selectedConvId` currently points to a staff user, reset `selectedConvId` to the first valid customer conversation.

### 4. `src/components/common/GlobalChatNotificationManager.tsx` & `src/pages/customer/CustomerChat.tsx`
- Verify that customer chat rooms and subscriptions are strictly restricted to `currentUser.role === 'customer'`.

---

## Verification Plan
1. Check that `haudemaxe@gmail.com` (and all other agent/admin accounts) no longer appear in the Support Inbox customer chat list (`Chats`).
2. Verify that legitimate customers (`Rashil Basukala`, `Saral Basukala`, `Blithe Sweeps`, `Ndu Phase`) remain in the Support Inbox with their requests and messages intact.
3. Test promoting a test user to `agent` in the User Directory and verify their customer conversation is immediately decommissioned.
4. Run `compile_applet` to ensure zero compilation or build errors.
