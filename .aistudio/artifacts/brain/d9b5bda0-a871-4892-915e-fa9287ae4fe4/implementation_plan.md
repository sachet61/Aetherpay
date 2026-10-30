# Chat Photo Attachment Persistence & Refresh Resilience

## Title & Summary
**Permanent Chat Photo Persistence Across Page Refresh & Live Production Synchronization**
Chat photo attachments currently display immediately upon upload but disappear permanently after a browser refresh. This plan details the root cause diagnosis, dual-resilient PostgreSQL storage strategy (supporting both migrated and unmigrated live production databases), and end-to-end hydration updates across Customer and Admin chat interfaces.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The primary database schema currently lacks `attachment_url` and `attachment_name` columns in `public.messages`. If an application relies solely on a column that might not yet exist on a live Supabase production instance, PostgREST will reject the upsert with error `42703` (column does not exist).
> 
> To ensure **100% live production compatibility without downtime**, we implement a **Dual-Resilient Persistence Architecture**:
> 1. Store attachment metadata in both the native columns (`attachment_url`, `attachment_name`) and the existing, production-active `transaction_data` JSONB column (`transaction_data.attachmentUrl`, `transaction_data.attachmentName`).
> 2. Implement resilient fallback in `sendChatMessage`: if the database rejects `attachment_url` with column-not-found, gracefully fallback to the `transaction_data` payload.
> 3. Read symmetrically: resolve attachments as `row.attachment_url || row.transaction_data?.attachmentUrl`.

---

## 1. Overview & Core Concept
- **What It Does**: Ensures that any image/photo uploaded by a customer or staff member in chat remains permanently stored, attached to the message record in PostgreSQL, and instantly restored upon page refresh, browser restart, or cross-device session switch.
- **Target Audience**: Customers uploading receipts/verification screenshots and Support/Treasury staff reviewing payment proofs and game account credentials.
- **Key Value**: Eliminates lost transaction proofs, avoids asking customers to re-upload receipts, and prevents support friction.

---

## 2. User Experience & Visual Design
- **Upload Flow**: 
  1. Customer or Admin selects an image (JPEG, PNG, WebP).
  2. Client auto-compresses to WebP (max 1200px) and uploads to Supabase Storage bucket `chat_attachments` (with server-side fallback).
  3. Instant optimistic render in the message stream with thumbnail, filename, and full-screen lightbox preview trigger.
- **Post-Refresh Experience**:
  1. User reloads browser (`F5` / `Cmd+R`) or switches tabs.
  2. `fetchMessagesForConversation` queries PostgreSQL `public.messages`.
  3. Messages hydrate with `attachmentUrl` intact; thumbnails render immediately with zero flicker or broken image placeholders.
  4. Lightbox modal opens high-resolution image smoothly on click.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual-Resilient Storage (Native Column + JSONB Payload)**
  - *Chosen Approach*: Write `attachment_url` and `attachment_name` as explicit columns while simultaneously mirroring them in the existing `transaction_data` JSONB field.
  - *Why*: Existing production Supabase tables may not immediately receive `ALTER TABLE` DDL execution until an administrator runs migrations. The `transaction_data` JSONB column is already present and active across all live production tables. By writing to both and falling back gracefully on `42703`, photos will persist permanently today even on unmigrated live instances.
  - *Alternatives Considered*: Native column only (fails on live production if DDL is delayed); JSONB only (lacks clean indexed queryability and direct SQL inspection).

- **Decision 2: Universal Hydration Fallback**
  - *Chosen Approach*: `row.attachment_url || row.transaction_data?.attachmentUrl || undefined` across all readers (`fetchMessagesForConversation`, `fetchOlderMessages`, `applyMessageRows`, `db_chat` Supabase Realtime listeners).
  - *Why*: Guarantees backward compatibility for existing records and future-proofs any newly inserted messages.

---

## 4. Technical Architecture & Data Strategy

### System Flow Diagram
```
┌─────────────────────────────────────────────────────────────┐
│ CustomerChat / AdminChat                                    │
│ 1. User selects image -> storageService.uploadChatAttachment │
│ 2. Public Storage URL received:                             │
│    https://<supabase-id>.supabase.co/storage/v1/object/...   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ dataService.sendChatMessage                                 │
│ Dual-Resilient Payload:                                     │
│  - content: string                                          │
│  - attachment_url: URL                                      │
│  - attachment_name: Name                                    │
│  - transaction_data: { ...data, attachmentUrl, attachmentName}
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ Standard Upsert              │    │ Fallback Upsert (on 42703)   │
│ Inserts with native columns  │    │ Omits missing column, keeps  │
│ & transaction_data JSONB     │    │ transaction_data JSONB       │
└──────────────────────────────┘    └──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ PostgreSQL: public.messages                                 │
│ id | conversation_id | content | attachment_url | tx_data   │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼ (On Refresh / Load)                 ▼ (Realtime Event)
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ fetchMessagesForConversation │    │ postgres_changes on messages │
│ Resolves:                    │    │ Resolves:                    │
│ attachmentUrl =              │    │ attachmentUrl =              │
│  col || tx_data.attachmentUrl│    │  col || tx_data.attachmentUrl│
└──────────────────────────────┘    └──────────────────────────────┘
```

### Proposed Execution Steps (Upon Proceed)
1. **Schema & Migration Update**:
   - Add `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;` and `attachment_name TEXT;` to `/supabase_schema.sql` and `/public/supabase_schema.sql`.
   - Update `CREATE TABLE IF NOT EXISTS public.messages` definition.
2. **Server-Side Live Boot Migration (`server.ts` & `api/index.ts`)**:
   - Execute safe non-blocking `ALTER TABLE IF NOT EXISTS` check using the Supabase Service Role client so production instances automatically adopt the new columns.
3. **Data Service Core Engine (`src/services/dataService.ts`)**:
   - In `sendChatMessage`: Include `attachment_url` and `attachment_name`, mirror inside `transaction_data`, and handle `42703` column error fallback.
   - In `fetchMessagesForConversation`: Extract `attachmentUrl: row.attachment_url || row.transaction_data?.attachmentUrl || undefined`.
   - In `fetchOlderMessages`: Extract attachment fields identically.
   - In `applyMessageRows`: Extract attachment fields identically.
4. **Chat View Realtime Synchronization (`CustomerChat.tsx` & `AdminChat.tsx`)**:
   - Ensure the Realtime `postgres_changes` listener extracts `attachmentUrl` from `row.attachment_url || row.transaction_data?.attachmentUrl`.
   - Verify lightbox modal and file preview component bindings.
5. **Validation**:
   - Run `lint_applet` (`tsc --noEmit`) and `compile_applet`.
