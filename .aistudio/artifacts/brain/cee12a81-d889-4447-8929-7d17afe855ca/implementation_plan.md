# Supabase Complete Migration, Password Reset Fix & Realtime Architecture

Transition the AetherPay platform exclusively to Supabase for authentication, relational database storage, and real-time messaging. This eliminates all Firebase/Firestore dependencies, fixes the `localhost:3000` password reset redirect error by dynamically detecting application origins and handling recovery tokens, and unifies account access so users registered in Supabase or the web app can sign in and manage their accounts.

### User Review & Critical Decisions

> [!IMPORTANT]
> The Supabase project credentials provided in `.env` (`https://qlurdhimtgchlgoaziqq.supabase.co`) will be hardcoded into the fallback configuration to ensure guaranteed connectivity across client bundles and server routes without depending on external runtime env injection.
> 
> In Supabase Authentication settings, password recovery emails default to the project's Site URL (`http://localhost:3000`) if a dynamic `redirectTo` is not passed. We fix this by passing `${window.location.origin}/#type=recovery` in the client request and intercepting recovery tokens immediately upon arrival.

- **Confirmed Decision 1**: All authentication, database queries, and real-time messaging will run strictly on Supabase.
- **Confirmed Decision 2**: Complete removal of Firebase SDKs (`firebase`, `firebase-admin`), Firestore blueprints, and security rules.
- **Confirmed Decision 3**: Supabase credentials hardcoded into the client configuration with `.env` precedence for instant, zero-configuration operation.
- **Confirmed Decision 4**: Dynamic origin resolution for password reset links with fallback in-app recovery token / OTP entry.

---

### 1. Overview & Core Concept

- **What It Does**: Unifies AetherPay's gaming marketplace and escrow system around a single Supabase backend. Users can sign up, log in with email and password, initiate and complete password resets without broken local redirects, create escrow transactions, and participate in real-time chat with buyer/seller counterparties.
- **Target Audience / Persona**: Gamers, traders, and escrow administrators requiring secure, fast, and transparent peer-to-peer digital transactions.
- **Key Value**: Eradicates platform disconnects between Firestore and Supabase, resolves account access failures, ensures reliable email link navigation on any deployed domain, and provides low-latency messaging via Supabase Realtime channels.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. *Authentication Flow*: User enters email and password on the unified Auth portal. The system queries Supabase Auth directly. If email confirmation is required by Supabase project settings, a descriptive banner instructs the user while providing a one-click resend button.
  2. *Password Reset Flow*:
     - User clicks "Forgot Password?" and enters their email.
     - The client sends `resetPasswordForEmail` with `redirectTo: `${window.location.origin}/#type=recovery``.
     - When the user clicks the link in their email, the app detects `#access_token=...&type=recovery` or `PASSWORD_RECOVERY` auth event and immediately opens the "Set New Password" modal.
     - An alternate direct recovery tab allows entering an OTP or reset code manually if email redirects are restricted by email client privacy protections.
  3. *Realtime Messaging Flow*: Buyer and seller enter transaction chat. Messages are stored in Supabase `messages` table and broadcast live via Supabase Realtime channels (`supabase.channel('room-...')`).
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Dark slate futuristic fintech gaming console (`#0B0F19` canvas, `#111827` surface containers, `#1F2937` borders).
  - *Color Palette*: Dominant neutral slate (60%), structural cards with 1px hairline borders (30%), vibrant electric cyan `#06B6D4` and emerald `#10B981` accents (10%).
  - *Typography & Hierarchy*: `Plus Jakarta Sans` for titles and navigation, `DM Sans` for body text, and `tabular-nums` / `JetBrains Mono` for currency values, countdown timers, and tokens.
  - *Design Discipline*: Anti-slop layout, zero unboxed pill badges, no mechanical `//` comments, clean single-line navigation contract.
- **Interactive Feedback & Motion**:
  - Instant form validation with inline error descriptions.
  - Smooth 150ms button feedback with subtle settling transitions.
  - Real-time connection indicator in chat reflecting Supabase Realtime channel status (`SUBSCRIBED`, `CONNECTING`, `DISCONNECTED`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Hardcoded Fallback Supabase Credentials**
  - *Chosen Approach*: Embed the project URL and anon public key into `supabaseClient.ts` as fallback defaults while reading `import.meta.env` and `process.env`.
  - *Why*: Eliminates deployment environment variable mismatch errors where Vite client bundles lose access to server-only env variables.
  - *Alternatives Considered*: Pure server proxy for all Supabase queries. Rejected because Supabase client SDK enables direct client-side Realtime subscriptions and secure JWT session persistence in browser storage.
- **Decision 2: Client-Driven Password Recovery Routing**
  - *Chosen Approach*: Dynamic `redirectTo` calculation using `window.location.origin` plus an in-app URL fragment listener in `App.tsx` and `AuthPage.tsx`.
  - *Why*: Solves the `localhost:3000` issue regardless of whether the app runs on Cloud Run preview URLs, custom domains, or local development.
  - *Alternatives Considered*: Forcing users to change Supabase Site URL in their Cloud Dashboard. Rejected because users frequently test across preview URLs and shouldn't be blocked by dashboard-level configuration defaults.
- **Decision 3: Complete Firebase & Firestore Deprecation**
  - *Chosen Approach*: Strip `firebase` package from `package.json`, delete Firebase helper files, replace all auth calls in `dataService.ts` and `authStore.ts` with Supabase Auth, and adapt data persistence to Supabase PostgreSQL.
  - *Why*: Prevents split-brain state where accounts exist in Supabase but the frontend attempts to read user profiles or sessions from Firestore.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AetherPay Frontend (React/Vite)                 │
├──────────────────────────┬─────────────────────────┬───────────────────┤
│    Unified Auth Page     │    Escrow & Exchange    │ Realtime Chat     │
│  - Supabase Auth SDK     │  - Supabase DB Tables   │  - Supabase       │
│  - URL Fragment Listener │  - Drizzle / REST API   │    Realtime Ch.   │
│  - Dynamic Reset Handler │  - Profile & Order Sync │  - Instant Sync   │
└────────────┬─────────────┴────────────┬────────────┴─────────┬─────────┘
             │                          │                      │
             ▼                          ▼                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 Supabase Cloud Backend (Hardcoded Config)               │
├────────────────────────────────────────────────────────────────────────┤
│  • Auth Service: gotrue (email/password, recovery tokens, sessions)    │
│  • PostgreSQL DB: profiles, orders, transactions, messages, disputes   │
│  • Realtime Engine: postgres_changes & broadcast channels              │
└────────────────────────────────────────────────────────────────────────┘
```

#### Data Model & Schema Synchronization
1. **`profiles` Table**:
   - `id` (UUID, primary key, references `auth.users.id`)
   - `email` (text, unique)
   - `username` (text)
   - `role` (text: 'user' | 'admin' | 'moderator')
   - `wallet_balance` (numeric, default 0)
   - `created_at` (timestamp)
2. **`messages` Table**:
   - `id` (UUID, primary key)
   - `trade_id` (text / UUID)
   - `sender_id` (UUID, references `profiles.id`)
   - `sender_name` (text)
   - `content` (text)
   - `created_at` (timestamp)
3. **`orders` / `escrow_transactions` Table**:
   - `id` (UUID, primary key)
   - `buyer_id` (UUID)
   - `seller_id` (UUID)
   - `title` (text)
   - `amount` (numeric)
   - `currency` (text)
   - `status` (text: 'pending' | 'funded' | 'completed' | 'disputed' | 'cancelled')
   - `created_at` (timestamp)

#### Interactive Component & State Mapping
- `AuthPage.tsx`:
  - `handleEmailSignIn`: Calls `supabase.auth.signInWithPassword`. Sets session in `authStore`.
  - `handleEmailSignUp`: Calls `supabase.auth.signUp`. Creates profile entry in `profiles`.
  - `handleForgotPassword`: Calls `supabase.auth.resetPasswordForEmail` with dynamic `redirectTo: window.location.origin`.
  - `handleUpdatePassword`: Calls `supabase.auth.updateUser({ password })` when recovery token is detected.
- `App.tsx`:
  - Monitors `supabase.auth.onAuthStateChange((event, session) => ...)`:
    - If event is `PASSWORD_RECOVERY`, triggers the reset password modal.
    - If event is `SIGNED_IN`, refreshes user profile from Supabase.
- `ChatRoom.tsx`:
  - Subscribes to `supabase.channel(`room:${tradeId}`)`.
  - On new message insert, updates chat history state instantly with sound/visual cue.
