# Real-Time Messaging Unread Badges & Browser Push Notifications

Ensure customers and support staff receive immediate desktop browser notifications and audio chimes when a new message arrives, even when operating in background tabs, along with clear unread message count badges across all navigation items and support buttons.

## User Review & Critical Decisions

> [!IMPORTANT]
> - **Confirmed Choice**: Play synthesized notification audio chime using the Web Audio API on incoming messages.
> - **Confirmed Choice**: Show unread message count badge on both the floating support button and the navigation bar chat tab.
> - **Confirmed Choice**: Trigger native Desktop Browser Notifications (`window.Notification`) on incoming messages to alert users even when the browser tab is unfocused or in the background.

---

### 1. Overview & Core Concept

- **What It Does**: 
  1. Automatically requests and maintains browser notification permission (`notificationSoundService.requestDesktopPermission()`).
  2. Triggers Web Audio API notification chimes and native `window.Notification` popups when new messages are received in `sendChatMessage`.
  3. Displays unread message counter badges (1, 2, etc.) on navigation chat tabs and support buttons.
- **Key Value**: Guarantees players and support staff never miss incoming messages regardless of browser tab focus state.

### 2. User Experience & Visual Design

- **Visual Indicators**:
  - Prominent unread badge pills displaying message counts.
  - Native browser desktop notification banner with sender name and message preview.
- **Audio Experience**:
  - Web Audio API notification chime.

### 3. Key Product Decisions & Trade-Offs

- **Decision 1**: Leverage browser native `Notification` API combined with Web Audio API.
  - *Why*: Works natively across modern web browsers without external third-party push gateway dependencies, fully compatible with Vercel and AI Studio production environments.

### 4. Technical Architecture & Data Strategy

- **Implementation Details**:
  - Update `sendChatMessage` in `src/services/dataService.ts` to invoke `notificationSoundService.playIncomingMessageSound()` and `notificationSoundService.showDesktopNotification(...)`.
  - Add auto-permission prompt on first user interaction with chat.
  - Update `CustomerMobileNav.tsx`, `TopNavbar.tsx`, and chat interfaces to render live unread badge counters.
