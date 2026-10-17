# Production Architecture & Feature Expansion Plan

## 1. Overview & Objectives
Transition Swift Sweeps from hybrid/mock local storage to a **100% production-grade Supabase PostgreSQL architecture**, eliminating test data mocks and providing robust security, role governance, streamlined payment and provisioning workflows, and **24/7 server-side background Telegram bot integration** deployed directly alongside the web application.

---

## 2. Key Architecture & Feature Modules

### Module 1: Production Storage & Clean-Slate Migration
- **Remove Mock Local Storage**:
  - Remove fallback mock arrays (`INITIAL_USERS`, mock conversations, mock game accounts, mock wallets) as active state.
  - Supabase PostgreSQL becomes the authoritative single source of truth for:
    - `users` (profiles, roles, status)
    - `wallets` (real-time balance and credits)
    - `game_accounts` (credentials, assignments, balances)
    - `conversations` & `messages` (live support communication)
    - `topups` & `withdrawals` (treasury transaction ledger)
    - `platform_settings` (site policies, partner social links, telegram bot configuration)
- **Safe Local Cleanup Routine**:
  - Run a one-time clean-slate migration on app startup:
    - Purges obsolete mock keys (`aetherpay_users`, `aetherpay_mock_*`, `aetherpay_messages`, `aetherpay_conversations`).
    - Cleans legacy state without throwing `JSON.parse` or null pointer errors.
    - Forces users to log in cleanly through Supabase Authentication.

### Module 2: Registration, Duplicate Prevention & OTP Spam Notice
- **Strict Registration Check**:
  - In `supabaseAuthService.ts` and signup forms, query the `users` table via case-insensitive email lookup (`ilike` or lowercase match) before processing new registrations.
  - Return user-friendly rejection notice if email already exists: *"An account with this email already exists. Please log in or reset your password."*
- **Strict Supabase-Only Verification**:
  - Always verify user activation/status strictly against the Supabase `users` table, completely ignoring any conflicting or stale local storage records.
- **OTP Spam Notice**:
  - Add clear helper text below the OTP input:
    - *"Please check your Spam/Junk folder if the OTP code is not found in your Inbox."*
- **Eliminate Instant Verification**:
  - Completely remove all "Instant Verify" and bypass buttons so OTP verification is the sole pathway.

### Module 3: Admin & Agent Role Hierarchy with Protected Parent Admin
- **Role Permissions Matrix**:
  - **Super/Parent Admin** (`koofrkolagi@gmail.com` and initial platform creator): Permanent super admin status. Cannot be demoted, deactivated, or modified by any other administrator.
  - **Admin**: Can view all user profiles, manage treasury, edit policies, configure Telegram bot, and promote/demote customers to agents or secondary admins. Cannot modify the parent admin.
  - **Agent**: Can view customer profiles (wallet, game IDs, transaction logs, support tickets) for customer care. Role assignment controls are hidden/disabled (read-only profile view).
- **Profile Viewer & Role Management UI**:
  - Enhanced User Detail modal in Admin/Agent views showing full player profile, wallet balance, active game platforms, and chat history.
  - Role management selector with security safeguards and audit alerts.

### Module 4: Sorted Games Directory & Auto-Closing Provisioning Flow
- **Display All Games with Priority Sorting**:
  - In customer dashboard and game accounts directory, display **all supported games** sorted intelligently:
    1. **Assigned / Available First**: Games where the player already has provisioned Game IDs and passwords appear right at the top with quick copy tools.
    2. **Pending Request**: Games currently in verification or being prepared.
    3. **Available to Request**: All remaining supported games with a 1-click "Request Game ID" button.
- **Auto-Closing Ticket & Live Credential Provisioning**:
  - When a customer requests a game ID, a structured request is sent to chat/support queue.
  - When an admin or agent provides/provisions the Game ID and password:
    - The game account is immediately saved/updated in the Supabase `game_accounts` table.
    - The request ticket automatically closes and updates status to *Fulfilled*.
    - The provisioned Game ID and password immediately render at the top of the customer's portal and in the chat notification.

### Module 5: Proof-First Top-Up & Agent Review Workflow
- **Simplified Customer Deposit Experience**:
  - Remove fixed deposit amount and cashtag input requirements for players across all 4 payment methods.
  - Flow:
    1. Customer selects payment method and target game platform.
    2. Customer views the official payment address / link / QR code.
    3. Customer completes the payment in their payment app and uploads the screenshot proof of payment.
    4. Submission forwards directly to the agent/admin treasury review queue with proof image attached.
- **Agent/Admin Review & Credit Approval**:
  - Staff reviews the uploaded payment screenshot proof.
  - Staff enters the verified deposit amount.
  - Applicable bonus is calculated, displayed, and adjusted dynamically.
  - System automatically checks if the player already possesses an active Game ID & password for the selected game:
    - *If Game ID exists*: System confirms credentials and allows 1-click dispatch to chat along with the wallet/game credit confirmation.
    - *If Game ID does NOT exist*: System flags an alert reminding staff and customer to request and provision a Game ID for that game platform.

### Module 6: Cashout Non-Refundable Cashtag Warning
- On Cashout / Withdrawal modal and submission view, add a prominent, high-visibility warning note:
  - *"⚠️ Please review your cashtag before submission. Once sent the amount cannot be refunded."*
- Ensure players must confirm or acknowledge this warning before final submission.

### Module 7: Admin Panel Streamlining
- Remove redundant developer and preview cards:
  - Remove *"Supabase (PostgreSQL) Database Integration"* status card.
  - Remove *"Live Dynamic Bonus System Preview"* card.
- Clean up navigation tabs and metrics display to prioritize live operations:
  - Pending Approvals (Proof-First Top-ups & Cashouts)
  - Live Support Messenger
  - User Directory & Role Governance
  - Game Account Provisioning
  - Content & Policy CMS
  - Telegram Bot Integrations & Live Engine Status

### Module 8: Dynamic Rich HTML Policies & Partner Links CMS
- **Database Schema for Settings**:
  - Dedicated `platform_settings` table in Supabase containing:
    - `cashout_policy_html` (supports `<p>`, `<strong>`, `<ul>`, `<li>`, `<h3>`, etc.)
    - `privacy_policy_html`
    - `terms_policy_html`
    - `partner_links`: Array of partners with `{ platform: 'facebook' | 'instagram' | 'telegram' | 'other', label: string, url: string, active: boolean }`
- **Admin Policy Editor**:
  - Interactive editor with live visual preview and HTML markup support.
  - Partner link manager to add, edit, toggle, or delete social & partner links.
- **Customer Pages Integration**:
  - Cashout policy modal/tab renders configured HTML dynamically with rich formatting.
  - Footer and Customer Care screens dynamically render verified partner and Telegram channel links.

### Module 9: 24/7 Server-Side Telegram Bot Service (Deployed Alongside Web App)
- **Embedded Continuous Server-Side Engine** (in `server.ts`):
  - The Telegram bot engine runs directly inside the Node/Express backend process running 24/7 alongside the web application.
  - Polling loop runs indefinitely via long-polling (`getUpdates`) without depending on an open browser window.
  - Does NOT require a separate Python server or external daemon.
- **Dynamic Credentials Reload from Database**:
  - The Telegram Bot Token and Channel / Support Chat ID are stored in the database (`platform_settings`).
  - When an admin saves or changes the Bot Token or Channel ID in the Admin Panel, an internal signal (`/api/telegram/reload`) instantly refreshes the active bot instance and credentials without restarting the Node server.
- **Bi-Directional Messaging Pipeline**:
  - **Outbound**: When a player messages support or submits a top-up/cashout, the server bot immediately dispatches a formatted alert with player details, message content, and quick-reply metadata to the Telegram channel.
  - **Inbound**: When an admin or agent replies to that message inside the Telegram channel/chat, the server-side polling engine captures the response, correlates it to the customer's active conversation, and posts it directly into Supabase `messages` as an official agent message.
- **Admin Dashboard Monitoring & Controls**:
  - Real-time engine health card showing:
    - Connection status (Active / Idle / Reconnecting)
    - Bot username and verified chat ID
    - Polling uptime and last update received
    - "Test Telegram Dispatch" button to verify credentials instantly.

---

## 3. Step-by-Step Implementation Sequence

1. **Database Schema & Clean-Slate Migration**:
   - Ensure `platform_settings`, `game_accounts`, and approval fields exist in Supabase.
   - Run clean-slate startup migration to purge obsolete local storage keys while preserving auth stability.
2. **Server-Side Telegram Bot Engine (`server.ts` & `src/server/telegramEngine.ts`)**:
   - Build the 24/7 background polling service inside the Express backend.
   - Add `/api/telegram/config`, `/api/telegram/reload`, and `/api/telegram/test` endpoints.
   - Connect Telegram incoming replies directly to Supabase chat insertion.
3. **Authentication, Registration & OTP Hardening**:
   - Add duplicate email validation in `supabaseAuthService.ts`.
   - Remove instant verify buttons and add Spam/Junk folder reminder.
   - Ensure verification strictly checks the Supabase `users` table.
4. **Role Hierarchy Implementation**:
   - Implement protected parent admin check for `koofrkolagi@gmail.com`.
   - Update `AdminUsers.tsx` and customer detail views to enforce Admin vs Agent permission boundaries.
5. **Sorted Games Directory & Auto-Closing Provisioning**:
   - Sort games in customer view to place assigned/provisioned Game IDs at the top, followed by pending, then unassigned.
   - Link game credential assignment directly to ticket completion and live UI update.
6. **Proof-First Top-Up & Cashout Warning**:
   - Refactor customer top-up modal to proof-only submission without required amounts/cashtags.
   - Enhance admin top-up approval modal with manual amount input, bonus calculation, and game credential verification.
   - Add the non-refundable cashtag warning on Cashout modal.
7. **Admin Panel Streamlining & Policy CMS**:
   - Clean up `AdminDashboard.tsx`, removing developer/preview cards.
   - Create `AdminPolicyEditor.tsx` with rich HTML support and live preview.
   - Add Telegram Bot Manager tab with live server bot status and configuration.
8. **Verification & Build**:
   - Run compilation and linting to guarantee zero errors across all modules.
