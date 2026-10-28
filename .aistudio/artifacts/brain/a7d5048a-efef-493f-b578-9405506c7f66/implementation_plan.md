# Browser History & Tab Navigation Routing Plan

Ensure clicking tabs or back navigation smoothly transitions between previous routes instead of closing the browser tab or exiting the application, with complete compatibility for local development and live production environments.

## User Review & Critical Decisions

> [!IMPORTANT]
> - **Core Issue Addressed**: In single-page applications without browser history synchronization, clicking back or navigating tabs leaves the browser history stack empty, causing the browser tab to close or exit to external sites.
> - **Confirmed Solution**: Implement a two-way browser history synchronization (`history.pushState` + `popstate` event listener) and an in-app navigation stack (`handleGoBack`) so navigating back always takes the user to their previous route, never abruptly closing the tab.
> - **Production Compatibility**: Fully compatible with the live Express server (`server.ts`) and Vite client SPA using client-side URL hash and history state management.

---

### 1. Diagnosis & Root Causes

1. **State-Only Navigation Without Browser History Push**:
   - `handleNavigateTab(tab)` in `src/App.tsx` only updates internal React state (`setActiveTab(targetTab)`). It never calls `window.history.pushState({ tab }, '', `#${tab}`)`.
   - When opened in a new tab or iframe, the browser's history stack length is `1`. As soon as a user clicks back or uses mobile back gestures, the browser exits the application or closes the tab immediately.

2. **Hardcoded In-App Back Triggers**:
   - In-app back buttons (e.g. `CustomerChat.tsx` header back button `onClick={() => onNavigateTab('dashboard')}`) unconditionally jump to `'dashboard'` rather than inspecting the user's actual preceding tab (e.g., returning to `wallet`, `topup`, or `game_accounts` if they opened chat from those screens).

3. **Missing `popstate` Handler**:
   - Browser back/forward navigation is not bound to React state. Pressing back does not pop the previous in-app route.

---

### 2. Proposed Architecture & Fix Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    User Tab Navigation                      │
│             (Navbar, Mobile Nav, Quick Links)               │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             handleNavigateTab(targetTab, meta)              │
│  - Appends to in-app tabHistoryStack: [...stack, targetTab] │
│  - Calls history.pushState({ tab: targetTab }, '', `#${tab}`)│
│  - Sets activeTab state                                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│     User Clicks Back /       │ │   User Clicks In-App Back    │
│    Device / Browser Back     │ │     (e.g., Chat Header)      │
└──────────────┬───────────────┘ └──────────────┬───────────────┘
               │                                │
               ▼                                ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│       popstate Listener      │ │        handleGoBack()        │
│ - Reads event.state?.tab     │ │ - Pops top of history stack  │
│ - Updates activeTab safely   │ │ - Navigates to prev tab      │
│ - If at root, stays safe     │ │ - Fallback to portal home    │
│ - Tab DOES NOT close         │ │ - Tab DOES NOT close         │
└──────────────────────────────┘ └──────────────────────────────┘
```

#### A. Two-Way Browser History & Hash Routing (`App.tsx`)
- On initial mount, read initial tab from URL hash (e.g. `#topup`, `#chat`, `#wallet`) or fallback to user role's default tab.
- Initialize `window.history.replaceState({ tab: initialTab }, '', `#${initialTab}`)` to prime the browser history stack.
- In `handleNavigateTab(targetTab, meta, options)`:
  - When navigating forward (`options?.isBack !== true`), push state: `window.history.pushState({ tab: targetTab }, '', `#${targetTab}`)`.
  - Maintain an internal history stack (`historyStackRef` / `tabHistoryStack`) to track the exact trail of pages visited in the session.
- Attach `window.addEventListener('popstate', onPopState)`:
  - When the user presses browser Back or uses device swipe back gestures, read `event.state?.tab` (or `window.location.hash`).
  - If a valid tab exists in state or hash, transition to it without pushing another history entry.
  - If at the beginning of the history stack, keep user safely on their home dashboard rather than closing the tab.

#### B. Dynamic "Back to Previous Route" in Chat and Sub-Pages
- Provide an `onGoBack: () => void` or `previousTab` prop through `handleNavigateBack()` to child views:
  - `CustomerChat.tsx`: Change the back button from hardcoded `dashboard` to `onGoBack ? onGoBack() : onNavigateTab('dashboard')`. The button label dynamically displays the previous tab title (e.g. "Back to Wallet", "Back to Top-Up", or "Back").
  - `AdminChat.tsx`: Ensure back button in conversation view returns to chat list on mobile or previous staff dashboard on desktop.
  - `LegalContent.tsx` & Rules: Smoothly return to the previous screen.

#### C. Production & Deployment Invariants
- Zero backend routing conflicts: Client hash routing (`#wallet`, `#chat`) is 100% immune to server-side routing issues in Express (`server.ts`) or Cloud Run reverse proxies.
- Zero mock fallbacks: Real navigation state only.

---

### 3. Files to Modify

1. **`src/App.tsx`**:
   - Implement hash-aware initial tab loader.
   - Implement `tabHistoryStack` tracking and `handleGoBack()` handler.
   - Implement `popstate` listener for native back/forward browser support.
   - Update `handleNavigateTab` to sync with `history.pushState`.
   - Pass `onGoBack` callback to `CustomerChat` and child pages.

2. **`src/pages/customer/CustomerChat.tsx`**:
   - Accept optional `onGoBack?: () => void` prop.
   - Use `onGoBack` on header back button with fallback to `dashboard`.
   - Display informative label showing previous route name when available.

3. **`src/pages/admin/AdminChat.tsx`**:
   - Accept optional `onGoBack?: () => void` prop and ensure back navigation respects prior routes.

---

### 4. Verification Plan

1. **Vite & TypeScript Compilation**:
   - Run `compile_applet` to confirm error-free TypeScript types and build assets.
2. **Tab Navigation & History Stack Check**:
   - Navigate: Dashboard -> Wallet -> Top-Up -> Support Chat.
   - Verify browser URL updates to `#wallet`, `#topup`, `#chat`.
   - Click in-app Back button in Chat: verify it returns to Top-Up (the previous route), not Dashboard.
   - Click browser Back button: verify it navigates to Wallet, then Dashboard, without closing the tab or exiting the site.
