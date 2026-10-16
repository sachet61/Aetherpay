# Email Verification, Password Reset Link Fix & Realtime Messaging Restoration

Deliver complete end-to-end fixes for player email verification, eradicate the `localhost:3000` redirect error in Supabase password resets through direct server-generated links and in-app code verification, and restore real-time messaging between players and support staff using Supabase Realtime channels with reliable local state synchronization.

### User Review & Critical Decisions

> [!IMPORTANT]
> - **Password Reset Link Resolution**: Supabase project configuration defaults Site URL to `http://localhost:3000`. To prevent broken external redirects, password resets will use a dual approach: direct server-generated links (using the Supabase service role key) that preserve the active application domain, and in-app 6-digit recovery codes via `supabase.auth.verifyOtp`.
> - **Email Verification Enforcement**: Newly signed-up players will accurately reflect unverified status (`email_confirmed_at === null`). A prominent verification banner on customer dashboards and an active "Verify Now" button in player profiles will allow instant resend and live status updates.
> - **Chat Messaging Synchronization**: Fixes missing local state event dispatches in `dataService.sendChatMessage` and ensures Supabase Realtime channels are fully subscribed before broadcasting, with periodic fallback polling to guarantee zero message loss.

- **Confirmed Decision 1**: Direct server-generated reset link and in-app code entry for password recovery.
- **Confirmed Decision 2**: Prominent verification banner and profile button with instant email trigger.
- **Confirmed Decision 3**: Supabase Realtime broadcast channels combined with instant local state dispatch.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. Accurately tracks and reflects whether a player's email is verified in Supabase. Displays clear banners and "Verify Email Now" actions when unverified, with one-click verification email dispatch.
  2. Eliminates broken password reset redirects by routing password recovery through server-generated action URLs or 6-digit in-app OTP tokens, guaranteeing users can reset passwords on any domain or preview environment.
  3. Restores real-time customer support chat so player messages, staff responses, transaction cards, and game credential requests update instantly without requiring page reloads.
- **Target Audience**: Players managing deposits, withdrawals, and game accounts, as well as support staff handling live inquiries.
- **Key Value**: Restores full platform functionality without dependence on external Supabase dashboard Site URL misconfigurations or silent messaging drops.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. *Player Email Verification Flow*:
     - Unverified player signs in or registers: A distinctive dark slate banner with amber highlight displays: *"Your email is not verified yet. Verify your email to unlock instant cashouts and referral bonuses."*
     - Player clicks *"Verify Now"*: An instant request triggers `supabase.auth.resend` or server verification link. The button enters a 60-second countdown with visual feedback.
     - In *Customer Profile*, an "Unverified" status chip pairs with a prominent *"Send Verification Email"* button.
     - When verified, the banner smoothly dismisses and cashout limits unlock immediately.
  2. *Password Reset Flow (Zero Localhost Errors)*:
     - User clicks *"Forgot Password"* and enters their email.
     - The backend generates a direct domain-aware reset link (`${origin}/#type=recovery&token=...`) and displays/dispatches an in-app recovery code.
     - Clicking the email link lands directly on the application's active domain, immediately opening the **Set New Password** modal.
     - If the user prefers, they can simply type the 6-digit code into the in-app reset form.
  3. *Customer Support Chat Flow*:
     - Player types a message and clicks Send.
     - The message displays immediately in the chat thread (0ms latency).
     - Staff in *AdminChat* receives the message in real-time via Supabase broadcast channel, complete with notification sound/badge.
     - Staff replies or sends a Game ID card, which appears instantly on the player's screen.
- **Visual Identity & Theme**:
  - *Canvas*: High-contrast neutral slate (`#0A0F1D` background, `#111827` surface panels, `#1F2937` borders).
  - *Accents*: Amber/Gold (`#F59E0B`) for gaming actions, Emerald (`#10B981`) for verified badges and successful approvals, Crimson (`#EF4444`) for errors.
  - *Typography*: `Plus Jakarta Sans` for headers, `DM Sans` for body, `tabular-nums` for timers and currency.
  - *Anti-Slop Discipline*: Zero static pill containers for metadata, clean hairline dividers, single-elevation depth.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Server-Generated Direct Recovery vs Standard Client Reset**
  - *Chosen Approach*: Implement an Express endpoint `/api/auth/request-reset` using `supabaseAdmin.auth.admin.generateLink` to create exact, host-aware recovery URLs and OTP codes.
  - *Why*: Supabase client SDK `resetPasswordForEmail` silently falls back to the dashboard's `Site URL` (`http://localhost:3000`) if the request domain is not explicitly whitelisted in the dashboard. Generating the link via the admin service role bypasses this restriction and ensures the link always redirects to the currently loaded site domain.
- **Decision 2: Prominent Banner + Profile Action for Verification**
  - *Chosen Approach*: Mount `EmailVerificationBanner` in `App.tsx` (above customer pages) and add an interactive status card in `CustomerProfile.tsx`.
  - *Why*: Ensures the player cannot miss the verification requirement while keeping the rest of the application accessible for browsing games.
- **Decision 3: Dual-Mode Messaging (Supabase Channel + State Event Dispatch)**
  - *Chosen Approach*: `dataService.sendChatMessage` will immediately dispatch `aetherpay_state_changed` for instant local rendering AND broadcast via an explicitly subscribed Supabase channel `room_${conversationId}`.
  - *Why*: Guarantees instant feedback for the sender even on high-latency connections, while keeping staff and player in sync across browsers.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AetherPay Application                           │
├──────────────────────────┬─────────────────────────┬───────────────────┤
│   Email Verification     │    Password Recovery    │  Realtime Chat    │
│  - EmailVerification     │  - Server Endpoint      │  - Supabase Ch.   │
│    Banner                │    /api/auth/reset-link │    broadcast      │
│  - CustomerProfile Card  │  - Direct Domain URL    │  - Instant state  │
│  - Resend & Confirm      │  - In-App 6-Digit OTP   │    event dispatch │
└────────────┬─────────────┴────────────┬────────────┴─────────┬─────────┘
             │                          │                      │
             ▼                          ▼                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Supabase Auth & Database (Hardcoded Keys)                │
├────────────────────────────────────────────────────────────────────────┤
│  • supabase.auth.resend({ type: 'signup' })                            │
│  • supabaseAdmin.auth.admin.generateLink({ type: 'recovery' })         │
│  • supabase.channel('room_' + convId).subscribe()                      │
│  • In-Memory & LocalStorage Resilience Layer                           │
└────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Implementation Plan

1. **Email Verification Implementation**:
   - Update `supabaseAuthService.ts`: Ensure `registerWithEmail` and `loginWithEmail` check `user.email_confirmed_at` properly rather than defaulting to `true`.
   - Update `CustomerProfile.tsx`: Add a dedicated "Email Verification" card showing current status (Verified vs Unverified) with a "Verify Email Now" button and status check.
   - Update `App.tsx`: Mount `EmailVerificationBanner` at the top of the customer workspace when `currentUser.role === 'customer' && !currentUser.emailVerified`.
   - Update `dataService.ts`: Wire `sendVerificationEmail()` to `supabaseAuthService.resendConfirmationEmail()` with origin-aware redirect.

2. **Password Reset Localhost Redirect Elimination**:
   - Update `server.ts`: Add `POST /api/auth/generate-reset-link` using `DEFAULT_SUPABASE_SERVICE_ROLE_KEY`. It generates an exact recovery link pointing to `${req.headers.origin || req.headers.referer || currentHost}/#type=recovery` along with an OTP code.
   - Update `supabaseAuthService.sendPasswordReset`: Call the server endpoint first to retrieve the direct domain-aware recovery link or fallback to Supabase `resetPasswordForEmail`.
   - Update `ForgotPassword.tsx` and `ResetPassword.tsx`: Ensure users can both click the direct link OR enter the 6-digit code manually into the form without relying on redirects.

3. **Realtime Messaging Fix**:
   - Update `dataService.ts`: In `sendChatMessage`, add `window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: STORAGE_KEYS.MESSAGES } }))` so local state updates immediately.
   - Fix Supabase Realtime channel subscription in `CustomerChat.tsx` and `AdminChat.tsx`: Ensure channels are properly initialized with `.subscribe((status) => ...)` and reused without dropping events.
   - Add a 3-second lightweight poll fallback when chat is actively open to guarantee messages arrive even if WebSocket connections are filtered by browser extensions.
