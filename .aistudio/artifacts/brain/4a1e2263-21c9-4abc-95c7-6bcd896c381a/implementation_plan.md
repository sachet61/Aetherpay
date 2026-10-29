# Dual-Environment Implementation Plan: Express (Dev) & Vercel (Production) Parity

## 1. Architectural Strategy: Dual-Environment Parity

To ensure the application behaves identically in the **testing environment (Express running on port 3000)** and the **live production server (Vercel)**, all functionality is architected for dual-environment symmetry:

```
                                  ┌───────────────────────────┐
                                  │   Client PWA (React SPA)  │
                                  └─────────────┬─────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼ (Testing / Local: dev script)                               ▼ (Live Production: Vercel)
┌───────────────────────────────────────────────┐             ┌───────────────────────────────────────────────┐
│         Express Server (server.ts)            │             │   Vercel Serverless Function (/api/index.ts)  │
│  - Port 3000 Node process                     │             │  - Ephemeral Serverless Handler               │
│  - Vite dev middleware                        │             │  - Static asset CDN (/public/sw.js & manifest)│
│  - Routes: /api/push/*, /api/admin/*          │             │  - Routes: /api/push/*, /api/admin/*          │
└───────────────────────┬───────────────────────┘             └───────────────────────┬───────────────────────┘
                        │                                                             │
                        └──────────────────────────────┬──────────────────────────────┘
                                                       │
                                                       ▼
                        ┌─────────────────────────────────────────────────────────────┐
                        │             Supabase Cloud (External Infrastructure)        │
                        │  - Native Realtime WebSockets for In-App Live Chat          │
                        │  - PostgreSQL 'messages', 'conversations', 'users'          │
                        │  - 'push_subscriptions' table (negligible size impact)      │
                        └─────────────────────────────────────────────────────────────┘
```

---

## 2. Environment Parity Matrix

| Component | Express (Testing / Dev) | Vercel (Live Production) | Implementation Strategy |
|---|---|---|---|
| **In-App Live Chat** | Direct client ↔ Supabase Realtime | Direct client ↔ Supabase Realtime | **100% Identical**. Browser connects directly to `wss://<id>.supabase.co`. Zero dependency on Express or Vercel compute. Zero polling egress. |
| **PWA Manifest & Service Worker** | Served from `/public` via Express static | Served from `/public` via Vercel Edge CDN | **100% Identical**. `/manifest.webmanifest` and `/sw.js` are static assets handled seamlessly by both web servers. |
| **Web Push Dispatcher** | `/api/push/notify` in `server.ts` | `/api/push/notify` in `/api/index.ts` | **Mirrored API Handlers**. Both environments share the exact same `web-push` VAPID signing logic and payload format. |
| **Push Subscriptions Storage** | Supabase `public.push_subscriptions` | Supabase `public.push_subscriptions` | **Single Source of Truth**. Both environments read and write subscriptions to PostgreSQL (with resilient memory fallback). |
| **Admin Chat Back Navigation** | React SPA component state | React SPA component state | **100% Identical**. Pure client-side component logic in `AdminChat.tsx`. |

---

## 3. Step-by-Step Implementation Plan

### Step 1: Fix Admin Chat Back Navigation (`src/pages/admin/AdminChat.tsx`)
- In `syncFromMemory()`, remove the aggressive fallback that auto-selected `validList[0].id` when `selectedConvId` was empty (`''`).
- Confine auto-selection exclusively to the **first mount on desktop** (`innerWidth >= 768`).
- When a user clicks `< Chats` on mobile or deselects on desktop, `selectedConvId` remains `''`:
  - **Mobile**: Shows the customer list screen (`Chats`).
  - **Desktop**: Shows a clean Messenger/WhatsApp-style placeholder (*"Select a player conversation from the list to start messaging"*).
- Use `selectedConvIdRef` to eliminate stale closure bugs in realtime message handlers.

### Step 2: Native Supabase Realtime WebSocket Optimization (Zero-Egress)
- Ensure all components (`AdminChat.tsx`, `CustomerChat.tsx`, `GlobalChatNotificationManager.tsx`) use canonical ID matching (`dataService.resolveCanonicalConvId()`) for incoming `postgres_changes` events on `public.messages`.
- Maintain a single persistent `postgres_changes` channel per session instead of tearing down and recreating WebSocket channels on selection changes.
- **Strictly zero polling**: No `setInterval` or periodic HTTP fetch loops.

### Step 3: PWA Manifest & Service Worker Setup
- **Web App Manifest (`public/manifest.webmanifest`)**:
  - `id: '/'`, `name: 'Swift Sweeps'`, `short_name: 'SwiftSweeps'`, `display: 'standalone'`, `theme_color: '#0A0F1D'`, `background_color: '#0A0F1D'`.
- **Service Worker (`public/sw.js`)**:
  - `push` event: receives encrypted payload from server and invokes `self.registration.showNotification(title, options)` to display a native OS notification on mobile/desktop.
  - `notificationclick` event: focuses or opens the browser window directly to the target conversation.
- **In-App Install Component (`src/components/common/PWAInstallButton.tsx`)**:
  - Handles `beforeinstallprompt` on Android/Chrome/Edge.
  - Provides guided modal instructions for iOS Safari (*Share -> Add to Home Screen*).

### Step 4: Mirrored Web Push Endpoints in `server.ts` & `/api/index.ts`
Implement identical request/response endpoints in both environments:
1. `GET /api/push/vapid-public-key`: Returns the VAPID public key.
2. `POST /api/push/subscribe`: Persists the browser's `PushSubscription` in Supabase `push_subscriptions`.
3. `POST /api/push/notify`: Dispatches an encrypted Web Push notification via `web-push` to recipient device endpoints when messages arrive.

---

## 4. Verification & Testing Across Both Environments

1. **Express Testing Environment Verification**:
   - Run `compile_applet` (`npm run build`) to ensure build and TypeScript pass.
   - Test dev server (`server.ts` on port 3000): verify `/api/push/vapid-public-key` returns 200 OK with valid key.
   - Verify Admin Chat back button on mobile returns to the customer list.
   - Verify instant live chat delivery over Supabase Realtime WebSockets without page reload.
2. **Vercel Production Compatibility Check**:
   - Verify `/api/index.ts` exports standard Vercel serverless handler with CORS headers and matches `vercel.json` rewrite rules.
   - Confirm all PWA assets in `/public` match static serving expectations on Vercel CDN.
