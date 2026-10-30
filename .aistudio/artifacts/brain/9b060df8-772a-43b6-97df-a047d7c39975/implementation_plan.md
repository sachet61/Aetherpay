# Background Push Notifications for Android & iOS (Facebook Messenger Style)

Delivers real-time, heads-up system push notifications with sound, custom vibration patterns, and action buttons to Android and iOS devices—functioning even when the browser or PWA is minimized or closed in the background—compatible with the live production server and Supabase database.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following technical and UX choices were confirmed during requirement clarification:
> - **Visual & Alert Style**: High-priority heads-up banner with sound, vibration, and reply action buttons (mirroring Facebook Messenger and Facebook Lite behavior).
> - **Event Scope**: All critical player and staff events: live chat messages, cashout payout approvals, deposit credits, and game login credential issuances.
> - **Platform Onboarding**: Guided "Add to Home Screen" visual walkthrough for iOS Safari (required by Apple WebKit for Web Push) plus 1-tap activation for Android and desktop devices.

---

## 1. Overview & Core Concept

### What It Does
When a player or support agent receives a message, payout approval, top-up credit, or gaming credentials, their physical phone (Android or iPhone) alerts them immediately with:
1. A **system-level heads-up banner** at the top of the screen (or lock screen) displaying the sender's avatar, name, and message summary.
2. A **distinct tactile vibration rhythm** (`[200ms, 100ms, 200ms, 100ms, 250ms]`) and audible chime.
3. An **interactive action button** (`Open Chat`, `Reply`) allowing the user to jump directly into the active conversation or dismiss the alert.
4. Continuous background delivery powered by the **W3C Web Push Protocol** and Service Worker (`/public/sw.js`), remaining active when the browser is minimized, screen is locked, or app is swiped away.

### Target Audience & Platforms
- **Android Users (Chrome, Samsung Internet, Edge, Firefox)**: Supported both inside the browser and as an installed PWA.
- **iOS Users (iPhone / iPad on iOS 16.4+)**: Apple WebKit requires PWAs to be added to the Home Screen to access the Web Push API (`PushManager`). We provide a frictionless 2-step visual guide for iOS users.
- **Operations Staff & Agents**: Receive instant customer chat alerts and pending cashout requests even while multitasking in other applications.

---

## 2. User Experience & Visual Design

### Key User Flows

```
[ ANDROID / DESKTOP FLOW ]
User visits app ──► Top notification banner shows "Enable Messenger-style Alerts" 
                  ──► Taps "Turn On Notifications" 
                  ──► Browser native permission granted 
                  ──► Device token saved to Supabase 
                  ──► Background alerts active 24/7!

[ iOS / SAFARI FLOW ]
User visits app on iPhone ──► iOS Banner: "Add to Home Screen for Background Alerts" 
                         ──► Taps banner to view illustrated 2-step sheet 
                         ──► Taps Safari Share Icon [↑] ──► "Add to Home Screen" 
                         ──► Launches app from Home Screen 
                         ──► 1-tap "Allow Notifications" 
                         ──► Background alerts active 24/7!
```

### Visual Components
- **Notification Opt-In Banner (`BackgroundNotificationPrompt.tsx`)**:
  - Mounted discretely below the TopNavbar.
  - Deep financial dark slate backdrop (`#0E1726`) with amber glow accents (`border-amber-500/30`), bell icon, and a single high-contrast CTA button.
  - Auto-dismisses once permission is granted or if user snoozes it.
- **iOS Home Screen Installation Modal (`IOSPwaInstallModal.tsx`)**:
  - Clean bottom drawer with tactile handle, animated iOS Share icon `[↑]`, and bold numbered instructions tailored specifically for Safari on iOS 16.4+.
- **In-App Toast Sync**:
  - When the user is actively viewing the chat, intrusive system banners are suppressed in favor of sleek in-app toasts with immediate Web Audio chime.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Native Web Push Protocol (VAPID RFC 8292) over Third-Party Paid Push Services**
  - *Chosen Approach*: Pure standard VAPID Web Push handled directly by Node.js `web-push` on `server.ts` and `/api/push/*` routes.
  - *Why*: Zero third-party fees, no external vendor lock-in (e.g., OneSignal or Pusher SDKs that introduce bloat and tracking), works natively across Google Cloud Messaging (Android FCM) and Apple Push Notification service (APNs).
  - *Alternatives Considered*: Firebase Cloud Messaging client SDK was considered, but requires Google Cloud project credentials not configured in this applet; VAPID works out of the box with existing keys.

- **Decision 2: Dual-Layer Persistence in PostgreSQL**
  - *Chosen Approach*: Write device push subscriptions directly to PostgreSQL `push_subscriptions` table with an atomic fallback to `app_config.push_subscriptions` JSONB row.
  - *Why*: In case migrations have not yet executed on production Supabase, the `app_config` key guarantees zero subscription loss, while `push_subscriptions` provides high-speed indexed lookups.

- **Decision 3: Multi-Event Push Dispatching in `dataService.ts` & `server.ts`**
  - *Chosen Approach*: Trigger push notifications across all critical business events:
    1. Chat messages (Player <-> Staff)
    2. Cashout approvals & processing notices
    3. Top-up deposit credits & bonus grants
    4. Game credential assignment & password reveals
  - *Why*: Keeps users informed in real-time about their money and games without requiring active browser polling.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (PWA / Browser)                    │
│                                                                        │
│   [BackgroundNotificationPrompt]          [IOSPwaInstallModal]         │
│                 │                                   │                  │
│                 ▼                                   ▼                  │
│        [webPushClient.ts] ──────► [PushManager.subscribe(VAPID)]       │
│                 │                                   │                  │
│                 │ POST /api/push/subscribe          │ PushSubscription │
└─────────────────┼───────────────────────────────────┼──────────────────┘
                  │                                   │
                  ▼                                   │
┌───────────────────────────────────────────────┐     │
│             SERVER LAYER (server.ts)          │     │
│                                               │     │
│   POST /api/push/subscribe                    │     │
│   POST /api/push/notify ──► [webPushEngine]   │     │
│   POST /api/push/test                         │     │
└──────────────────┬────────────────────────────┘     │
                   │                                  │
                   ▼                                  ▼
┌──────────────────────────────────────┐    ┌───────────────────────────┐
│        SUPABASE POSTGRESQL           │    │    PUSH GATEWAYS          │
│                                      │    │                           │
│   • push_subscriptions table         │    │  • FCM (Android Chrome)   │
│   • app_config (fallback JSONB)      │    │  • Apple APNs (iOS PWA)   │
│   • messages / topups / withdrawals  │    │  • Mozilla Push Service   │
└──────────────────────────────────────┘    └─────────────┬─────────────┘
                                                          │
                                                          ▼
                                            ┌───────────────────────────┐
                                            │      DEVICE HARDWARE      │
                                            │                           │
                                            │  [Service Worker: sw.js]  │
                                            │  • Heads-up Alert Banner  │
                                            │  • Custom Vibration       │
                                            │  • Messenger Tone Audio   │
                                            │  • Quick Reply / Open CTA │
                                            └───────────────────────────┘
```

### Data Schema & Types

#### 1. Push Subscription Model
```typescript
interface StoredPushSubscription {
  id: string;
  userId: string;
  userRole: 'customer' | 'agent' | 'admin';
  endpoint: string;
  p256dh: string;
  auth: string;
  devicePlatform: 'android' | 'ios' | 'desktop';
  createdAt: string;
  updatedAt: string;
}
```

#### 2. Service Worker (`public/sw.js`) High-Priority Payload
```javascript
{
  title: "Swift Sweeps Support (Sarah Lin)",
  body: "Your cashout request for $250.00 has been approved!",
  icon: "/pwa-192x192.png",
  badge: "/favicon.png",
  vibrate: [200, 100, 200, 100, 250],
  tag: "swiftsweeps_cashout_123",
  renotify: true,
  requireInteraction: true,
  data: {
    url: "/#wallet",
    type: "withdrawal_approved"
  },
  actions: [
    { action: "open_view", title: "View Wallet" },
    { action: "dismiss", title: "Dismiss" }
  ]
}
```

### Planned File Edits
1. `/public/sw.js`:
   - Upgrade push listener with high-priority `vibrate`, `requireInteraction: true`, `renotify: true`, and multi-action buttons.
   - Upgrade notification click handler to focus existing tabs or open standalone PWA window directly to the relevant view.
2. `/src/services/webPushClient.ts`:
   - Enhance browser and iOS standalone detection.
   - Add platform detection (`android`, `ios`, `desktop`) and send it to server.
   - Add automated renewal of expired subscriptions.
3. `/src/server/webPushEngine.ts` & `/server.ts`:
   - Optimize multi-recipient push delivery for all staff when customers send messages or requests.
   - Support `requireInteraction`, `vibrate`, and rich action payloads.
   - Add `/api/push/test` diagnostic endpoint for instant device verification.
4. `/src/components/common/BackgroundNotificationPrompt.tsx`:
   - Create responsive opt-in banner with 1-tap activation on Android and step-by-step modal guide for iOS.
5. `/src/components/common/IOSPwaInstallModal.tsx`:
   - Create Apple-styled visual sheet with clear icons explaining Safari Share -> Add to Home Screen.
6. `/src/services/dataService.ts`:
   - Wire push alerts into:
     - `sendChatMessage` (player <-> staff chat)
     - `approveWithdrawal` / `markWithdrawalCompleted` (payout cashouts)
     - `approveTopUp` (deposit balance credited)
     - `assignGameCredentials` (game account ready)
7. `/src/App.tsx`:
   - Mount `BackgroundNotificationPrompt` globally for both customer and staff portals.
