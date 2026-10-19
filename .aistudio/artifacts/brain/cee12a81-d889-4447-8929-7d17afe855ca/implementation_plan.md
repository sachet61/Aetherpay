# Real-Time Chat Architecture & Tri-Mode Notification Engine

Overhaul the live messaging system between players and support staff by replacing ephemeral, lossy room broadcasts with high-speed Supabase Database Changes (`postgres_changes`), lightweight delta polling, and a comprehensive tri-mode notification engine (audio chimes, floating in-app toast alerts, and native desktop notifications).

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed in Phase 1 clarification:
> - **Real-Time Architecture**: Supabase Database Changes (`postgres_changes` streaming) combined with Instant Broadcast for immediate local UI optimism and smart lightweight delta polling (fetching only new messages since the last timestamp rather than dumping the full table).
> - **Notification Modes**: Tri-mode notification system delivering an elegant synthesized Web Audio chime, floating in-app toast preview banners across all portals, and native browser desktop notifications.
> - **Permission Flow**: An explicit **"Enable Notifications"** bell toggle situated prominently in the chat header, respecting user privacy without intrusive page-load permission popups.

---

### 1. Overview & Core Concept

#### Why Chat Was Previously Slow & Required Reloads
1. **Ephemeral Broadcast Silos**: The previous implementation relied primarily on transient room broadcast channels (`room_${conv.id}`). If an agent or player was on another view (such as the Vault, Games, or Ops Dashboard), their client never joined the specific conversation room, silently dropping incoming messages.
2. **Channel Subscription Churn**: Every message dispatch attempted to create and subscribe to new Supabase Realtime channels inline before sending, adding 500ms–2000ms of latency per message.
3. **Full-Table Polling Inefficiencies**: The 3-second backup poll queried all historical messages across the entire database without limits or timestamp filtering, creating bottlenecks as message history grew.
4. **Zero Global Listeners**: No top-level listener existed in `App.tsx`, leaving users with no visual or audio cues when messages arrived outside the active chat screen.

#### What This Upgrade Delivers
- **Sub-Second Delivery Everywhere**: Global `postgres_changes` subscription on the `messages` table streams every incoming message to active players and agents in real time, regardless of what tab or screen they are on.
- **Tri-Mode Notifications**:
  - **Audio Chime**: Crisp, high-fidelity pleasant tone generated via Web Audio API (zero external asset loading lag, zero broken mp3 URLs).
  - **Floating In-App Toast**: Rich, interactive banner with sender avatar, message snippet, and quick 1-click **"Reply Now"** navigation.
  - **Browser Desktop Notifications**: Native OS/browser desktop alerts for players and agents who have the tab backgrounded or minimized.
- **Chat Header Notification Toggle**: Clean bell icon in the chat header allowing users to enable/disable sound and desktop alerts on demand.

---

### 2. User Experience & Visual Design

#### Player & Agent Notification Workflows
1. **When Active in Chat**:
   - Messages appear instantly (sub-200ms) with typing/sent ticks.
   - Incoming messages from the other party play a subtle, soft incoming tone without jarring alert modals.
2. **When Browsing Other Pages (e.g. Games, Wallet, Admin Overview)**:
   - Floating glassmorphic toast slides in smoothly from the top-right:
     - Shows sender name, badge (`Player` or `Customer Care Specialist`), and text snippet.
     - Includes a glowing **"Reply"** action that immediately navigates to the chat view.
   - Navbar chat icon updates with an animated pulsing notification badge count.
   - If enabled, native browser notification pops up in the OS notification center.
3. **Chat Header Controls**:
   - Next to the Support status indicator, a new **Notification Settings** bell toggle button:
     - Green glowing icon with checkmark when notifications are active.
     - Amber indicator with one-click permission request if browser notifications are pending.
     - Volume mute toggle for silent browsing environments.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Supabase `postgres_changes` vs Pure WebSockets**
  - *Chosen Approach*: Stream directly from Supabase PostgreSQL replication via `postgres_changes`.
  - *Why*: Connects directly to the single source of truth; even if a broadcast packet is dropped or network blips, the database record is guaranteed to stream down to all subscribers.
  - *Alternatives Considered*: Pure ephemeral WebSocket broadcast (drops messages when switching tabs).

- **Decision 2: Delta Polling vs Full-Table Query**
  - *Chosen Approach*: Query only records where `created_at > lastSyncTimestamp`.
  - *Why*: Cuts network payload by 99% and eliminates CPU parsing lag during multi-tab conversations.

- **Decision 3: Synthesized Web Audio API vs External Audio Files**
  - *Chosen Approach*: Pure browser `AudioContext` synthesizer (frequency ramps from 587Hz to 880Hz with soft exponential decay).
  - *Why*: 100% reliable, zero network latency, zero CORS or missing file errors.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                     REAL-TIME CHAT SYNCHRONIZATION                     │
└────────────────────────────────────────────────────────────────────────┘
          Sender inputs message (CustomerChat / AdminChat)
                                 │
                                 ▼
                     dataService.sendChatMessage()
                                 │
         ┌───────────────────────┴───────────────────────┐
         ▼                                               ▼
  Optimistic Local UI                            Supabase DB Insert
  (Immediate display)                          (messages table)
                                                         │
                                                         ▼
                                             PostgreSQL Replication
                                                         │
                                                         ▼
                                           supabase.channel('global:messages')
                                           .on('postgres_changes', INSERT)
                                                         │
                         ┌───────────────────────────────┴───────────────────────────────┐
                         ▼                                                               ▼
             Receiver on Chat View                                          Receiver on Another Tab/Page
         ┌───────────────────────────┐                                  ┌───────────────────────────┐
         │ • Append to message list  │                                  │ • Global Toast Banner     │
         │ • Auto-scroll to bottom   │                                  │ • Unread Badge +1 in Nav  │
         │ • Soft Audio Pop          │                                  │ • Web Audio Chime         │
         │ • Mark as Read            │                                  │ • Desktop Push Alert      │
         └───────────────────────────┘                                  └───────────────────────────┘
```

#### Detailed Implementation Plan:
1. **`src/services/notificationSoundService.ts` (New)**:
   - High-fidelity Web Audio API sound synthesizer with graceful fallback.
   - Browser `Notification` API wrapper handling permissions, OS desktop popups, and user focus checks.
2. **`src/services/dataService.ts`**:
   - Refactor `pollSupabaseChat()` to use delta queries (`created_at > lastTimestamp`).
   - Eliminate channel subscription churn inside `sendChatMessage`.
3. **`src/App.tsx`**:
   - Mount a top-level `GlobalChatNotificationListener` that listens to `postgres_changes` across all conversations.
   - Render floating interactive in-app toast banners with instant jump-to-chat navigation.
4. **`src/pages/customer/CustomerChat.tsx` & `src/pages/admin/AdminChat.tsx`**:
   - Connect to persistent `postgres_changes` streaming channel.
   - Add the **Notification Bell Toggle** button in the chat header with permission status indicators.
   - Implement idempotent message appending to eliminate duplication during reconnections.
