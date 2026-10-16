# Pure Supabase 6-Digit OTP Authentication, Verification & Reset System

Deliver a 100% code-driven OTP workflow using Supabase and Brevo. Users never need to click links or rely on redirect URLs; instead, they receive 6-digit OTP codes via Brevo and enter them directly into the app for account verification, unverified login resolution, and password resets.

> [!IMPORTANT]
> **Key Revisions Based on Feedback**:
> - **Zero URL / Redirect Dependencies**: No modifications to Supabase Site URL or Redirect URLs are needed. Everything is handled via 6-digit OTP token entry (`{{ .Token }}`) directly inside the app.
> - **Pure OTP Delivery**: Email templates simply output the 6-digit code `{{ .Token }}`. The app provides instant digit inputs, automatic focus, and copy/paste support.
> - **Immediate OTP Screen on Signup**: Automatically navigate new signups to an interactive 6-digit OTP verification screen.
> - **Instant OTP Modal on Unverified Sign-In**: When an unverified user signs in, intercept the error and open an instant OTP modal with a resend button to prevent lockouts.
> - **Direct 6-Digit Password Reset**: Users enter the 6-digit code and their new password on the same screen, calling `verifyOtp(type: 'recovery')` and updating the password in one unified flow.

---

## 1. Supabase Email Template Configuration (Brevo)

Since we are using 6-digit OTP codes exclusively, you do not need to touch Site URLs or Redirect URLs. You only need to configure the email templates to show the 6-digit code `{{ .Token }}`:

* Location: **Supabase Dashboard** &rarr; **Authentication** &rarr; **Email Templates**

### A. Confirm Signup Template
* **Subject**: `Your SwiftSweeps Verification Code: {{ .Token }}`
* **Body**:
  ```html
  <h2>Welcome to SwiftSweeps!</h2>
  <p>Here is your 6-digit verification code to activate your account:</p>
  <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; padding: 18px; background: #131c2e; color: #f59e0b; border-radius: 8px; text-align: center; margin: 20px 0; font-family: monospace;">
    {{ .Token }}
  </div>
  <p>Enter this code in the app to complete your registration. This code expires in 1 hour.</p>
  ```

### B. Reset Password Template
* **Subject**: `SwiftSweeps Password Reset Code: {{ .Token }}`
* **Body**:
  ```html
  <h2>Reset Your Password</h2>
  <p>You requested a password reset. Here is your 6-digit security code:</p>
  <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; padding: 18px; background: #131c2e; color: #f59e0b; border-radius: 8px; text-align: center; margin: 20px 0; font-family: monospace;">
    {{ .Token }}
  </div>
  <p>Enter this code in your password reset screen along with your new password. This code expires in 15 minutes.</p>
  ```

---

## 2. Overview & Core Concept

* **What It Does**: Transitions all authentication challenges from link-clicking to direct 6-digit OTP verification. Handles email verification during registration, resolves unverified user login lockouts via an interactive modal, and streamlines password recovery with single-screen OTP validation.
* **Target Audience**: SwiftSweeps players across mobile, tablet, and desktop devices.
* **Key Value**: 100% immunity to domain mismatch errors or `localhost` redirects, zero account lockouts, and instant user activation.

---

## 3. User Experience & Visual Design

### Unified User Flows

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FLOW 1: NEW USER SIGNUP                         │
├────────────────────────────────────────────────────────────────────────┤
│ 1. User registers on Sign Up tab.                                      │
│ 2. Supabase registers account and dispatches 6-digit OTP via Brevo.    │
│ 3. App immediately displays OTP screen with 6 digit boxes.             │
│ 4. User types or pastes 6-digit code -> App calls verifyOtp('signup'). │
│ 5. Account verified! Automatically logged in to Dashboard.             │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                FLOW 2: UNVERIFIED USER ATTEMPTS SIGN IN                │
├────────────────────────────────────────────────────────────────────────┤
│ 1. User enters Email + Password on Sign In tab.                        │
│ 2. Supabase returns "Email not confirmed".                             │
│ 3. App catches error and opens the "Verify Account OTP" modal.         │
│ 4. Modal displays pre-filled email, 6-digit input, and "Resend OTP".   │
│ 5. User enters code -> Account verified & session established!         │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                    FLOW 3: FORGOT / RESET PASSWORD                     │
├────────────────────────────────────────────────────────────────────────┤
│ 1. User clicks "Forgot Password?", enters email, and hits Submit.      │
│ 2. Supabase dispatches 6-digit OTP via Brevo.                          │
│ 3. App transitions directly to Reset Password screen with OTP input.   │
│ 4. User enters 6-digit OTP + New Password on the same screen.          │
│ 5. App verifies recovery OTP -> Sets new password -> Logs user in.     │
└────────────────────────────────────────────────────────────────────────┘
```

### Visual Identity & Theme
* **Palette**: Dark casino aesthetic (`#0A0F1D` background, `#131C2E` container cards), neon amber accents (`amber-500`, `#F59E0B`), and emerald confirmation badges (`emerald-400`).
* **OTP Input**: 6 individual high-contrast digits with auto-focus, paste support, numeric keyboard on mobile (`inputMode="numeric"`), and smooth focus rings.
* **Accessibility**: Clear error states with contextual instructions, a visible 60-second resend cooldown timer, and screen-reader accessible labels.

---

## 4. Technical Architecture & Component Mapping

```
┌───────────────────────────────────────────────────────────────────────┐
│                           AuthPage.tsx                                │
│   ┌───────────────────────────────────────────────────────────────┐   │
│   │ Sign In Tab / Sign Up Tab                                     │   │
│   │  - On SignUp -> Transitions to <EmailOtpView>                 │   │
│   │  - On Unverified Login -> Opens <EmailOtpModal>               │   │
│   └───────────────────────────────────────────────────────────────┘   │
│   ┌───────────────────────────┐       ┌───────────────────────────┐   │
│   │   <ForgotPassword>        │ ----> │      <ResetPassword>      │   │
│   │   Sends 6-digit reset OTP │       │   Verifies OTP & sets pwd │   │
│   └───────────────────────────┘       └───────────────────────────┘   │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│                     supabaseAuthService.ts                            │
│  ├── verifyEmailOtp(email, token): supabase.auth.verifyOtp('signup')  │
│  ├── resendEmailOtp(email): supabase.auth.resend({ type: 'signup' })  │
│  ├── sendPasswordReset(email): supabase.auth.resetPasswordForEmail()  │
│  ├── verifyOtpForRecovery(email, token): verifyOtp('recovery')        │
│  └── updateUserPassword(newPassword): supabase.auth.updateUser()      │
└───────────────────────────────────────────────────────────────────────┘
```

### Planned Code Changes
1. **`src/components/auth/EmailOtpModal.tsx`**:
   - Reusable modal and view for verifying email via 6-digit OTP.
   - Features: auto-focus, 6-digit pin inputs, clipboard paste handling, "Resend Code" with 60s cooldown timer, and error display.
2. **`src/services/supabaseAuthService.ts`**:
   - Add `verifyEmailOtp(email: string, token: string)` using `type: 'signup'`.
   - Add `resendEmailOtp(email: string)`.
   - Enhance `loginWithEmail` to return `isUnverified: true` when unconfirmed.
   - Ensure `verifyOtpForRecovery(email: string, token: string)` cleanly establishes a recovery session before password update.
3. **`src/pages/auth/AuthPage.tsx`**:
   - Immediately navigate to OTP verification view upon signup.
   - Detect `isUnverified` on sign-in attempt and trigger `EmailOtpModal` with user's email pre-filled and an option to resend.
   - After OTP verification succeeds, update user profile and log them straight into the application.
4. **`src/components/auth/ForgotPassword.tsx` & `ResetPassword.tsx`**:
   - Streamline `ForgotPassword` to transition directly to `ResetPassword` with email prefilled.
   - In `ResetPassword`, provide 6-digit OTP input + New Password fields; upon submit, verify recovery OTP and set the new password.

---

## 5. Verification Plan

1. **Sign Up Flow**:
   - Create a test account & verify the app immediately presents the 6-digit OTP view.
   - Test OTP entry and confirmation leading directly to logged-in dashboard.
2. **Unverified Sign-In Flow**:
   - Attempt to log in with an unverified account.
   - Verify the app catches the unverified status and launches the OTP verification modal.
   - Test the "Resend Code" button with 60-second cooldown timer.
   - Complete verification through the modal and verify direct session login.
3. **Password Reset Flow**:
   - Request password reset & verify the screen switches to OTP + new password inputs.
   - Verify that entering the 6-digit OTP successfully updates the password and logs in.
4. **Build & Compilation**:
   - Run `compile_applet` to ensure zero TypeScript or build issues.
