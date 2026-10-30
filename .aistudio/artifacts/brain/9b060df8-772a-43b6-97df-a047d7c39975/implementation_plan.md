# Implementation Plan: Complete Eradication of Automated Greeting Messages & Synthetic Bot Personas

## User Directive
> "COMPLETELY REMOVE THIS TYPE OF MESSAGING. Come up with a plan first and prompt me to proceed or not. Make sure that fix is compatible with live production server too."
> Attachment: Screenshot displaying automated message: `"Welcome to Swift Sweeps Support! How can our treasury and gaming care specialists assist you today?"` sent by `Sarah Lin`.

---

## 1. Root Cause Diagnosis
1. **Automated Greeting Injection in `src/services/dataService.ts`**:
   - `getOrCreateConversationForCustomer()` (lines 4737–4762) runs an automated routine that dispatches `this.sendChatMessage()` with the exact payload:
     `"Welcome to Swift Sweeps Support! How can our treasury and gaming care specialists assist you today?"` attributed to `Sarah Lin` (`usr_agent_1`).
   - This message gets pushed into local memory, `localStorage`, and synced directly to Supabase's `public.messages` table.
2. **Permissive Greeting Filter in `src/services/dataService.ts`**:
   - Lines 711–723 (in `fetchMessagesForConversation`) and lines 4793–4807 (in `getMessages`) contain legacy deduplication logic that only dropped secondary duplicates while explicitly retaining the first greeting instance:
     ```ts
     // Filter duplicate Sarah Lin greeting messages
     let greetingSeen = false;
     const merged = sorted.filter((m) => {
       const isGreeting = (m.senderRole === 'agent' || m.senderId === 'usr_agent_1') &&
         m.text && m.text.includes('Welcome to Swift Sweeps Support!');
       if (isGreeting) {
         if (greetingSeen) return false;
         greetingSeen = true;
       }
       return true;
     });
     ```
3. **Hardcoded Fallback Persona**:
   - `src/pages/customer/CustomerChat.tsx` (line 300) defaults unassigned tickets to `Sarah Lin (Treasury Desk)`.
   - `src/services/dataService.ts` (lines 4651, 4725) defaults `assignedAgentName: 'Sarah Lin'`.
4. **Persisted Records in Supabase PostgreSQL**:
   - Historical records inserted by this routine reside in the live `public.messages` table and will continue to hydrate onto screens unless sanitized at both the egress/filter level and via backend cleanup.

---

## 2. Proposed Architectural Strategy

### Step 1: Total Elimination of Bot Message Dispatch
- Remove the automated greeting dispatch block in `src/services/dataService.ts` (`getOrCreateConversationForCustomer`).
- Remove the `swiftsweeps_greeting_sent_*` localStorage keys and automated creation triggers.
- For newly initialized conversations, leave `lastMessageText: ''` until an actual user or support operator sends a message.

### Step 2: Unconditional Filtering of Legacy Bot Messages
- In `src/services/dataService.ts` (`getMessages`, `fetchMessagesForConversation`, and `subscribeToMessages`):
  - Replace the deduplication logic with an absolute filter that rejects ANY message matching the automated greeting signature (`Welcome to Swift Sweeps Support!` / `treasury and gaming care specialists assist you today`).
  - Purge cached instances of this message from `localStorage` (`aetherpay_chat_messages`) during data service boot.

### Step 3: Neutral Support Desk Assignment
- Change default fallback agent name in `src/services/dataService.ts` and `src/pages/customer/CustomerChat.tsx` from `Sarah Lin` to `Swift Sweeps Support Desk` or leave unassigned until an actual agent takes ownership of the ticket.

### Step 4: Live Production Parity & Database Cleanup (`server.ts` & `api/index.ts`)
- Add an administrative sanitization endpoint and automatic cleanup query on both Express (`server.ts`) and Vercel serverless (`api/index.ts`):
  - Executes a targeted Supabase Service Role query:
    ```sql
    DELETE FROM public.messages 
    WHERE content ILIKE '%Welcome to Swift Sweeps Support%' 
       OR content ILIKE '%treasury and gaming care specialists assist you today%';
    ```
  - Ensures live PostgreSQL records are permanently scrubbed so no stale bot greetings linger in database backups or Realtime hydration feeds.

---

## 3. Verification & Acceptance Criteria
1. **Zero Bot Greetings**: Creating a new customer conversation or refreshing existing chats never produces or displays any canned greeting.
2. **Clean Chat Feed**: Existing historical chats display strictly real human messages (customer messages, transaction receipts, human agent replies).
3. **Database Cleared**: The `public.messages` table in Supabase contains 0 automated greeting records.
4. **Full-Stack Parity**: Both `server.ts` (local dev port 3000) and `api/index.ts` (Vercel production) run the exact same sanitization and support chat protocol.
5. **Compilation Verification**: `compile_applet` and `tsc --noEmit` pass with zero errors.
