# Production Email Verification, Password Reset & Qualified Referral Flow

Deliver a production-ready authentication and referral qualification workflow for SwiftSweeps. This enforces database existence verification before initiating password resets, replaces mock tokens with official Firebase password reset email dispatch, integrates a live email verification lifecycle (with resend/refresh capabilities), and restricts referral bonus payouts to only referees who have both verified their email address and loaded credits into a game account, while restricting unverified players from requesting cashouts.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed through Phase 1 clarifications and are locked for execution upon plan approval:

- **Confirmed Decision 1 (Password Reset Delivery)**: Strict Firebase reset email link only. The app will strictly dispatch official Firebase Auth password reset links to the player's registered inbox. All mock/in-memory reset PINs and manual token entry codes will be eradicated from the client and server.
- **Confirmed Decision 2 (Email Existence Pre-Check)**: Before dispatching any reset email, the system verifies that the account exists in the platform database (Firestore users registry). If no account matches the entered email, the system rejects the submission with a clear error ("No account found with this email address") and halts execution.
- **Confirmed Decision 3 (Referral Reward Qualification Rule)**: Referees must satisfy **two mandatory milestones** before the referrer's wallet is credited:
  1. The referee's email address must be verified (`emailVerified: true`).
  2. The referee must have loaded credits into at least one game account (`loadFundsToGame` executed).
  If either milestone is unmet, the referral remains in a pending state with zero bonus credited.
- **Confirmed Decision 4 (Unverified Player Restrictions)**: Players with unverified emails are permitted to play games and top up, but **cashouts/withdrawals and referral bonus earnings are strictly blocked** until email verification is confirmed.

---

## 1. Overview & Core Concept

- **What It Does**: Hardens SwiftSweeps authentication and growth loops for production deployment. It eliminates test mock token leaks, ensures users can recover accounts only via verified email addresses, protects platform funds from bogus referral loops, and provides players with a transparent self-service email verification interface.
- **Target Audience / Persona**: Players seeking secure account recovery and sweepstakes cashouts, platform operators preventing multi-account referral fraud, and compliance/risk teams requiring verified player identities.
- **Key Value**: Closes security loopholes (no email existence bypass, no unverified referral abuse), provides native email verification banners with instant reload checks, and guarantees that cashouts only flow to verified players.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Strict Password Reset Flow**:
   - **Trigger**: Visitor clicks "Forgot Password?" on the SwiftSweeps sign-in card.
   - **Input & Existence Validation**: Visitor enters their email. When submitting, the system checks the Firestore `users` registry:
     - *If NOT found*: Displays an inline alert: *"No account found with this email address. Please check for typos or create a new account."* No email is sent.
     - *If found*: Dispatches the official Firebase reset email via `sendPasswordResetEmail(auth, email)` and displays a high-clarity success card: *"Password reset link dispatched. Please check your inbox (and spam folder) for the link from Firebase."*
     - Replaces manual token input forms with a direct "Back to Sign In" action.
2. **Email Verification Status & Alert Banner**:
   - When an unverified user logs in (or creates an account), a persistent, non-intrusive alert banner appears at the top of the player dashboard:
     - Visual: Dark amber/gold container with warning icon, clean typography: *"Your email (name@example.com) is unverified. Cashouts and referral bonuses remain locked until verified."*
     - Actions: `[Resend Verification Email]` (with a 60-second cooldown timer) and `[I Have Verified - Check Status]` (triggers `auth.currentUser.reload()` and updates Firestore/local user state instantly).
3. **Cashout / Withdrawal Protection**:
   - If an unverified user navigates to the Cashout tab or attempts to submit a cashout request:
     - The cashout form disables the submit action with a clear badge: *"Email verification required to request cashouts."*
     - In-form button allows 1-click verification email resend.
4. **Referral Program Transparency**:
   - In the Referrals dashboard, the referrer sees detailed qualification statuses for each referred friend:
     - `Pending Email Verification`: Referee signed up but has not clicked the verification link.
     - `Pending First Game Load`: Referee verified email, waiting to load credits into a game.
     - `Qualified & Credited`: Both conditions fulfilled, bonus ($10.00) transferred to referrer's wallet.

### Visual Identity & Theme
- **Color Tokens**: Dark mode palette adhering to SwiftSweeps aesthetic: deep `slate-950` canvas, `indigo-500` accents, `emerald-500` for verified states, and `amber-400` for pending verification warnings.
- **Typography**: Clean display font pairing (`Plus Jakarta Sans` display, readable body typography) with tabular formatting for timestamps and amounts.
- **Anti-Slop Discipline**: Zero static pill badges; clean unboxed text dividers (`·`) for referral milestone progress; visible focus rings; minimum 44px touch targets.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Strict Firebase Password Reset vs. Dual Code/Token Fallback**
  - *Chosen Approach*: Pure Firebase `sendPasswordResetEmail` action links; eliminate all temporary server-generated PINs and fake tokens.
  - *Why*: Eliminates security vulnerabilities and confusing parallel recovery modes; complies with production standards where passwords must never be resettable via arbitrary client-side token guessing.
  - *Alternatives Considered*: Retaining the 6-digit PIN code on screen for demo testing was rejected because it bypassed real email delivery and violated the user's explicit instructions.
- **Decision 2: Game Load Qualification Trigger vs. Pure Deposit**
  - *Chosen Approach*: The referee must complete at least one `loadFundsToGame` operation (transferring wallet funds into a game platform like Fire Kirin, Orion Stars, etc.) before the referrer qualifies for a bonus.
  - *Why*: Directly satisfies the user's criteria that the referee must have actually "played" rather than simply depositing and immediately idling.
- **Decision 3: Soft Restriction vs. Hard Account Block for Unverified Emails**
  - *Chosen Approach*: Allow gameplay and deposits, but block cashouts and referral rewards.
  - *Why*: Minimizes onboarding friction for players who want to test games immediately while establishing a strict financial gate preventing payout abuse.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SwiftSweeps Client                              │
│                                                                        │
│  ┌──────────────────────┐             ┌─────────────────────────────┐  │
│  │   Auth / Reset Card  │             │   Player Dashboard / Nav    │  │
│  │                      │             │                             │  │
│  │  1. Check User Exist ├────┐        │  - Verification Alert Banner│  │
│  │  2. Firebase Reset   │    │        │  - Resend Link (60s timer)  │  │
│  │     Email Dispatch   │    │        │  - Live Status Check        │  │
│  └──────────┬───────────┘    │        └──────────────┬──────────────┘  │
│             │                │                       │                 │
└─────────────┼────────────────┼───────────────────────┼─────────────────┘
              │                │                       │
              ▼                ▼                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Firebase & Platform Services                         │
│                                                                        │
│  ┌─────────────────────────┐            ┌───────────────────────────┐  │
│  │   Firebase Auth SDK     │            │   Firestore Database      │  │
│  │                         │            │                           │  │
│  │ - sendPasswordResetEmail│            │ - /users/{uid}            │  │
│  │ - sendEmailVerification │            │   (emailVerified, played) │  │
│  │ - currentUser.reload()  │            │ - /withdrawals/{id}       │  │
│  └─────────────────────────┘            │   (blocked if unverified) │  │
│                                         │ - /referrals / wallets    │  │
│                                         └─────────────┬─────────────┘  │
│                                                       │                │
│                                 ┌─────────────────────┴─────────────┐  │
│                                 │ Referral Qualification Engine     │  │
│                                 │   IF emailVerified == true        │  │
│                                 │   AND hasLoadedGameCredits == true│  │
│                                 │   ==> Award Referral Reward       │  │
│                                 └───────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Component & State Mapping

1. **`src/services/dataService.ts`**:
   - `requestPasswordReset(email)`: Queries the existing users list. If not found, returns `{ success: false, message: 'No registered account was found with this email address.' }`. If found, calls `sendPasswordResetEmail(auth, email)` via `firebaseAuthService` and returns a clean success response without any test token.
   - `requestWithdrawal(params)`: Enforces `if (!customer.emailVerified) return { success: false, message: 'Email verification required. Please verify your email before requesting a cashout.' }`.
   - `checkAndAwardReferral(customerId)`: Enforces `if (!customer.emailVerified) return;` and checks if the customer has loaded credits to any game (`hasLoadedGameCredits` or `getTransactions` with game load). Only credits the referrer if both conditions are met.
   - `syncEmailVerificationStatus(userId)`: Re-checks `auth.currentUser?.emailVerified` after reload and updates the user's profile in Firestore and state.
2. **`src/components/auth/ForgotPassword.tsx`**:
   - Updates form submission to remove token/PIN display.
   - Shows feedback that an official reset link was dispatched by Firebase.
   - Streamlines UX to a single email input with existence error handling.
3. **`src/components/common/EmailVerificationBanner.tsx`** *(New/Updated)*:
   - High-visibility banner when `currentUser.emailVerified === false`.
   - Offers "Resend Email" (with cooldown) and "Refresh Status" actions.
4. **`src/components/customer/CustomerWithdrawalView.tsx`**:
   - Checks `currentUser.emailVerified`; disables cashout form with notice if unverified.
5. **`src/components/customer/CustomerReferralsView.tsx`**:
   - Shows referee milestone breakdown: `Email Verified (✓/✗)` and `Game Loaded (✓/✗)` so referrers understand why bonuses are pending.
6. **`server.ts`**:
   - Clean up `/api/auth/request-reset` to eliminate arbitrary in-memory dummy token generation.

---

## 5. Verification & Testing Plan

1. **Password Reset Verification**:
   - Attempt reset with an unregistered email (e.g. `nonexistent@test.com`): Verify it fails immediately with "No account found".
   - Attempt reset with a registered email (e.g. `blithesweeps@gmail.com`): Verify Firebase `sendPasswordResetEmail` is triggered and success message directs user to check inbox. Verify no tokens/PINs are exposed in UI or console.
2. **Email Verification Lifecycle**:
   - Sign up / sign in with an unverified account: Verify alert banner displays prominently.
   - Click "Resend Verification Email": Verify Firebase `sendEmailVerification` is dispatched.
   - Click "Check Status": Verify it reloads Firebase user profile and updates Firestore.
3. **Cashout Blocking**:
   - With an unverified account, attempt to submit a cashout request: Verify system rejects request and displays verification requirement.
4. **Referral Reward Rules**:
   - Register a new account with a referral code.
   - Verify referrer has $0 referral bonus while referee is unverified.
   - Simulate email verification: Verify bonus is still withheld because referee hasn't loaded a game.
   - Load credits into any game account (`loadFundsToGame`): Verify qualification triggers and referral bonus is awarded to referrer.
