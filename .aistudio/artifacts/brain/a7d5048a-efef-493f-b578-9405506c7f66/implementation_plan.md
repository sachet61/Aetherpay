# Live Production Chat Synchronization, Message Delivery & Photo Support Architecture

Comprehensive architectural fix resolving cross-browser message discrepancies, guaranteeing atomic first-message delivery from support specialists to customers in PostgreSQL, and restoring full image and photo attachment upload, persistence, and rendering.

### User Review & Critical Decisions

> [!IMPORTANT]
> All proposed changes operate strictly on live production code with zero mock fallbacks, maintaining full compatibility with the existing Express server (`server.ts`), Supabase PostgreSQL database, and Vite React SPA.

- **Cross-Browser Thread Reconciliation**: Ensure older chat messages load identically in any browser (fresh browser, incognito, or secondary device) by performing server-authoritative reconciliation of legacy conversation aliases directly in PostgreSQL rather than relying on browser-local storage.
- **Parent Conversation Existence Guarantee**: Await and verify parent conversation record commitment in `conversations` prior to dispatching messages to prevent PostgreSQL foreign key constraint drops (`23503`) when staff initiates chat.
- **Dual-Resilient Photo & Attachment Storage**: Save attachments to server storage (`public/uploads/chat`) and mirror to Supabase Storage, with an Express streaming proxy (`/api/storage/file`) and unified metadata resolution (`attachmentUrl`, `proofUrl`, `receiptUrl`) so photos never fail to render.

---

### 1. Overview & Core Concept

- **What It Does**: Unifies live customer support and administrative messaging across all browsers and devices. It ensures that 100% of historical conversation records stored in Supabase PostgreSQL are fetched on any browser, guarantees that staff-initiated messages are never dropped due to race conditions with parent conversation creation, and restores seamless photo uploads and image previews in both customer and administrative consoles.
- **Target Audience / Persona**:
  - **Players/Customers**: View complete chat history across any device/browser without missing responses from support, receive instant replies, and upload payment receipts/screenshots that render reliably.
  - **Support Specialists & Admins**: Confidently dispatch initial messages, rotate game credentials, process top-up/cashout actions directly from chat, and inspect attached photos without broken image links or sync delays.
- **Key Value**: Eliminates message loss, removes device-specific chat discrepancies, and provides high-trust financial auditability for iGaming support operations.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. *Customer Opens Support Chat in Fresh Browser*:
     - The chat client detects the authenticated customer ID and requests the canonical message thread.
     - The system queries Supabase PostgreSQL across all alias records, consolidates them into canonical `conv_${customerId}`, and streams the complete message history into the chat view.
     - Loading indicators cleanly present thread hydration without blank screens.
  2. *Support Agent Sends First Message to New Customer*:
     - Agent selects customer from directory or clicks "Start New Customer Chat".
     - The system ensures the parent conversation row is committed to PostgreSQL before inserting the message payload.
     - The message is saved in PostgreSQL, broadcast over Supabase Realtime, and web push/desktop alerts are dispatched.
     - The customer sees the message immediately upon receiving the alert and opening the chat.
  3. *Customer or Staff Attaches Photo / Receipt*:
     - User clicks the paperclip icon and selects an image (JPEG, PNG, WebP).
     - Image is compressed on client and uploaded via `/api/storage/upload`.
     - File is saved to server storage and mirrored to Supabase Storage bucket `chat_attachments`.
     - The message bubble renders an inline image preview with click-to-expand lightbox modal; if direct storage CDN is blocked, the fallback proxy transparently streams the image.
- **Visual Identity & Theme**:
  - Maintained dark financial aesthetic: deep slate background (`#0A0F1D`, `#0E1726`), gold/amber primary accents (`#F59E0B`, `#D97706`), indigo staff branding (`#6366F1`), and emerald completion indicators (`#10B981`).
  - Seamless image cards with subtle borders (`border-slate-700/60`), zoom hover indicators, and fullscreen lightbox with backdrop blur.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Server-Authoritative Thread Consolidation vs. Client-Side Alias Mapping**
  - *Chosen Approach*: Server endpoint (`/api/chat/messages`) and data service query that consolidates all legacy conversation rows and messages in PostgreSQL under canonical `conv_${customerId}`.
  - *Why*: In the current codebase, `migrateUserEntityIds` only rewrote `localStorage` in the browser where the migration happened. A second browser querying PostgreSQL with the new user UUID could not see older messages because their rows in PostgreSQL still had legacy conversation IDs. Server consolidation ensures all devices view the identical history.
  - *Alternatives Considered*: Client-only multi-query with in-memory union. Rejected because it incurs high PostgREST egress and fails if local storage lacks alias knowledge.

- **Decision 2: Sequential Parent Conversation Upsert with Server Fallback vs. Fire-and-Forget Message Upsert**
  - *Chosen Approach*: In `sendChatMessage`, ensure the parent conversation record exists in `conversations` table in PostgreSQL before inserting into `messages`. Provide an authoritative `/api/chat/send` server endpoint using Service Role privileges as a fallback.
  - *Why*: When staff sends the first message, `conversations.upsert` was called without `await`, causing `messages.upsert` to execute concurrently. PostgreSQL rejected the message insert with foreign key error `23503`, while web push notifications still fired, leading to "ghost notifications" with missing messages.
  - *Alternatives Considered*: Removing foreign key constraint on `messages.conversation_id`. Rejected because foreign key constraints enforce relational integrity in production.

- **Decision 3: Dual Storage Persistence with Streaming Proxy vs. Supabase-Only Storage**
  - *Chosen Approach*: Save uploaded chat photos to local server disk (`public/uploads/chat`) AND Supabase Storage `chat_attachments`, while serving an intelligent URL backed by `/api/storage/file` streaming proxy.
  - *Why*: Supabase storage buckets can have strict RLS, public access toggle restrictions, or egress limits that cause 403 Forbidden or 400 Bucket Not Found errors in the browser. Storing a local copy and offering a streaming proxy guarantees 100% photo availability.
  - *Alternatives Considered*: Storing images as raw Base64 data strings in PostgreSQL `messages.content`. Rejected because large Base64 blobs degrade PostgreSQL query performance and inflate database size.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT FRONTEND (SPA)                         │
│                                                                        │
│   CustomerChat.tsx                          AdminChat.tsx              │
│   ┌───────────────────────────┐             ┌────────────────────────┐ │
│   │ • Full History Hydration  │             │ • Messenger Queue View │ │
│   │ • Photo Upload & Lightbox │             │ • Quick Action Modals  │ │
│   │ • Realtime & Push Listener│             │ • Staff Notes & Attach │ │
│   └─────────────┬─────────────┘             └────────────┬───────────┘ │
└─────────────────┼────────────────────────────────────────┼─────────────┘
                  │                                        │
                  ▼                                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   DATA & STORAGE LAYER (Client Services)               │
│                                                                        │
│   dataService.ts                            storageService.ts          │
│   ┌───────────────────────────┐             ┌────────────────────────┐ │
│   │ • Canonical conv_${id}    │             │ • WebP Auto-Compress   │ │
│   │ • Parent Conv Await Before│             │ • Dual-Write Fallback  │ │
│   │   Message Insert          │             │ • Unified Attachment   │ │
│   │ • Multi-Field Normalizer  │             │   Field Extraction     │ │
│   └─────────────┬─────────────┘             └────────────┬───────────┘ │
└─────────────────┼────────────────────────────────────────┼─────────────┘
                  │                                        │
                  ▼                                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     EXPRESS BACKEND (server.ts)                        │
│                                                                        │
│   /api/chat/messages           /api/chat/send        /api/storage/*    │
│   ┌─────────────────────┐      ┌───────────────┐     ┌───────────────┐ │
│   │ Consolidates legacy │      │ Guarantees    │     │ Uploads local │ │
│   │ threads in Postgres │      │ parent conv   │     │ & Supabase,   │ │
│   │ & returns full list │      │ before insert │     │ streams files │ │
│   └──────────┬──────────┘      └───────┬───────┘     └───────┬───────┘ │
└──────────────┼─────────────────────────┼─────────────────────┼─────────┘
               │                         │                     │
               ▼                         ▼                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      SUPABASE / POSTGRESQL & STORAGE                   │
│                                                                        │
│   public.conversations         public.messages       chat_attachments  │
│   ┌─────────────────────┐      ┌───────────────┐     ┌───────────────┐ │
│   │ Foreign Key Parent  │◄─────┤ FK validated  │     │ Storage Bucket│ │
│   │ conv_${customerId}  │      │ content, url  │     │ + Local Disk  │ │
│   └─────────────────────┘      └───────────────┘     └───────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Component & Handler Mapping
1. **`server.ts`**:
   - Add `/api/chat/messages`: Queries all messages by customer ID, resolves legacy thread IDs to canonical `conv_${customerId}`, commits any pending re-parenting in PostgreSQL using `supabaseAdmin`, and returns complete sorted message history.
   - Add `/api/chat/send`: Server-side endpoint with Service Role privileges that executes:
     1. Upsert parent row in `conversations` if not already present.
     2. Insert message into `messages` table with attachment URLs and transaction data.
     3. Update conversation's `last_message` and timestamps.
   - Enhance `/api/storage/upload` & add `/api/storage/file`: Stores files locally in `public/uploads/chat` and mirrors to Supabase storage, serving files via streaming proxy to bypass bucket ACL issues.
2. **`src/services/dataService.ts`**:
   - In `sendChatMessage`: Ensure parent conversation is upserted and awaited before message insert. If client Supabase PostgREST fails or returns foreign key error `23503`, automatically fall back to `/api/chat/send`.
   - In `fetchMessagesForConversation`: Call `/api/chat/messages` for complete thread retrieval, falling back to direct Supabase query with canonical alias expansion.
   - In `applyMessageRows`: Standardize attachment field resolution across `attachment_url`, `attachmentUrl`, `proofUrl`, `proof_url`, `receiptUrl`, and `imageUrl`.
3. **`src/pages/customer/CustomerChat.tsx` & `src/pages/admin/AdminChat.tsx`**:
   - Normalize attachment rendering: Check both `msg.attachmentUrl` and `msg.transactionData?.proofUrl`.
   - Add image `onError` fallback that transparently routes broken CDN links through `/api/storage/file`.
   - Ensure file input resets and provides visual feedback during upload.
