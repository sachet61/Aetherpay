# Implementation Plan: Authoritative Cross-Session & Incognito Chat Persistence

Guarantee 100% persistent message and conversation retrieval in incognito mode and fresh browser sessions across both Customer Support Chat and Staff Operations Inbox by eliminating local storage dependency and enforcing server-side identity consolidation.

## User Review & Critical Decisions

> [!IMPORTANT]
> In an incognito or fresh browser window, `localStorage` is completely empty on first load. The application previously relied on client-side cache and direct anonymous Supabase queries that failed to resolve historical user aliases (e.g. Supabase Auth UUIDs vs initial customer IDs) or bypassed RLS restrictions. This plan establishes server-authoritative consolidation via the Service Role so all historical messages and conversations are unified by user ID, email, and display name and immediately delivered to fresh sessions.

- **Authoritative Server Endpoints**: Route all conversation and message queries through Express Service Role endpoints (`/api/chat/messages` and `/api/chat/conversations`) rather than unauthenticated client queries.
- **Unified Identity & Alias Resolution**: Automatically correlate user UUIDs, legacy customer identifiers, emails, and display names on the server and re-parent orphan messages in PostgreSQL to canonical conversation IDs (`conv_${customerId}`).
- **Incognito Hydration Handlers**: Update customer and admin chat components to pass full identity context (`customerId`, `email`, `customerName`) and render the returned authoritative message list immediately on mount.

---

## 1. Overview & Core Concept

- **What It Does**: Ensures that any customer or staff member logging in or opening chat in incognito mode, a new browser, or a different device immediately sees all historical chat messages, transaction approval notes, and photo attachments.
- **Target Audience / Persona**: Customers accessing support across multiple browsers/devices, and support agents/administrators managing live player requests.
- **Key Value**: Zero message loss across sessions, no dependence on volatile browser storage, and instant synchronization between player and staff portals.

---

## 2. User Experience & Visual Design

- **Zero-Flicker Chat Hydration**:
  - When a customer opens Support Chat (`#chat`) in incognito mode, a subtle loading indicator displays while the server endpoint retrieves the authoritative thread history.
  - Historical messages, transaction approval badges (Top-Up / Cashout completed), and photos render chronologically without disappearing on refresh.
- **Support Inbox Consistency**:
  - In Admin Chat (`#ops_chat`), the conversation list is populated directly from PostgreSQL via `/api/chat/conversations`.
  - Selecting any conversation instantly hydrates the full thread history via `/api/chat/messages`, including messages sent from other browsers.
- **Real-Time Continuity**:
  - Realtime broadcast and database listeners remain subscribed to the canonical conversation ID (`conv_${customerId}`), ensuring subsequent messages sent in any session appear instantly across all open windows.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Server Service-Role Consolidation vs Client RLS Direct Queries**
  - *Chosen Approach*: Use Express endpoints backed by `supabaseAdmin` (Service Role) to query and consolidate conversations and messages, while keeping Supabase Realtime channels for instant live updates.
  - *Why*: Eliminates RLS read-blocking and foreign key resolution errors on the client, and ensures that incognito sessions with empty local storage fetch complete server-authoritative history.
  - *Alternatives Considered*: Client-side multi-table joins using public anon key were rejected due to RLS limitations and inability to run server-level foreign key and alias re-parenting.

- **Decision 2: Multi-Field Identity Resolution (ID + Email + Name)**
  - *Chosen Approach*: Query candidate conversations and messages by user UUID, email, and display name in `server.ts`. Automatically update orphan message rows in PostgreSQL to point to `conv_${customerId}`.
  - *Why*: Players transitioning from guest/seed IDs to Supabase Auth accounts retain their complete chat history seamlessly.
  - *Alternatives Considered*: Enforcing strict single-ID queries caused all pre-login or alias messages to be completely invisible in incognito mode.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│               Incognito / Fresh Browser Session (Client)                │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ 1. GET /api/chat/messages
                                     │    ?conversationId=...&customerId=...
                                     │    &email=...&customerName=...
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Express Backend (`server.ts`)                       │
│  - Lookup user in public.users by ID or Email                          │
│  - Resolve all historical conversation IDs and sender IDs               │
│  - Fetch messages from PostgreSQL via Service Role (Bypasses RLS)       │
│  - Re-parent orphan rows to canonical ID (conv_${customerId})          │
│  - Guarantee canonical conversation row exists in conversations table   │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ 2. SQL SELECT & UPDATE
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Supabase PostgreSQL Database                       │
│  - Table: public.conversations (Canonical thread shells)               │
│  - Table: public.messages (Authoritative message log + JSONB payloads)  │
└────────────────────────────────────────────────────────────────────────┘
```

### Proposed Changes

1. **`server.ts`**:
   - Enhance `/api/chat/messages` to accept `email` and `customerName` in query parameters.
   - Look up the user in `public.users` to find all linked accounts or historical IDs.
   - Collect candidate conversation IDs and query messages where `conversation_id IN (candidateIds)` OR `sender_id IN (candidateIds)` OR `sender_id = customerId`.
   - Authoritatively re-parent legacy messages in PostgreSQL to `conv_${customerId}`.
   - Implement `GET /api/chat/conversations` with Service Role to return all open/active conversations sorted by `last_message_at DESC` for reliable Support Inbox loading in fresh sessions.

2. **`src/services/dataService.ts`**:
   - Update `fetchMessagesForConversation`: Pass `email` and `customerName` to `/api/chat/messages`, populate in-memory cache directly with the returned messages, and return the chronological list.
   - Update `fetchConversations`: Fetch from `/api/chat/conversations` with fallback to direct Supabase query, guaranteeing full conversation list hydration in incognito mode.

3. **`src/pages/customer/CustomerChat.tsx`**:
   - Pass `currentUser.email` and `currentUser.displayName` into `fetchMessagesForConversation`.
   - Update state immediately with server-returned messages on mount.

4. **`src/pages/admin/AdminChat.tsx`**:
   - Ensure selected conversation passes `customerId`, `customerEmail`, and `customerName` to message hydration.
   - Subscribe to canonical room channel for real-time bi-directional messaging.

### Verification Plan

- Unit test verification using `npx tsx --test` to validate message alias resolution and deduplication logic.
- Automated browser testing via `playwright-cli` simulating incognito/fresh sessions:
  1. Open fresh browser context without local storage.
  2. Log in as customer and open `#chat`. Verify older messages, approvals, and photos render immediately.
  3. Log in as support agent / admin in another session and open `#ops_chat`. Verify the conversation appears in the inbox with full history.
  4. Send a message from incognito session and verify real-time arrival in the admin session.
