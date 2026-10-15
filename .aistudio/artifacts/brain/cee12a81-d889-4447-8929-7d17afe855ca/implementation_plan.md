# Implementation Plan: Self-Service Password Reset

## Overview
Implement a secure, email-based password reset system. This system will use cryptographically secure tokens stored in Firestore with an expiration policy and enforce strict validation on the backend.

## Architecture
1.  **Security Token Storage**: Create a new `password_reset_tokens` collection in Firestore. Tokens will be stored with: `email`, `tokenHash`, and `expiresAt` (e.g., 15 minutes).
2.  **Server-Side Logic (`server.ts`)**:
    *   `POST /api/auth/request-reset`:
        *   Accepts email.
        *   Checks if the user exists.
        *   Generates a cryptographically strong, random token.
        *   Hashes the token and saves it to Firestore.
        *   *Note: In this preview environment, "sending an email" will be simulated via console logs/UI alerts.*
    *   `POST /api/auth/reset-password`:
        *   Accepts email, token, and new password.
        *   Validates the token against Firestore.
        *   Checks expiration.
        *   If valid, updates the password hash in `authSessionService` and invalidates the token.
3.  **Frontend Implementation**:
    *   `pages/auth/ForgotPassword.tsx`: Form to request a reset link.
    *   `pages/auth/ResetPassword.tsx`: Form to enter the token received via email and the new password.
4.  **Firestore Security**: Update `firestore.rules` to allow unauthenticated `create` access to `password_reset_tokens` collection (for requests) and restricted `get/delete` access.

## Proposed Security Controls
- **Token Entropy**: Tokens generated using `crypto.randomBytes(32)`.
- **Short Lifetime**: Tokens expire automatically after 15 minutes.
- **Single Use**: Tokens are deleted from Firestore immediately after a successful reset.
- **Rate Limiting**: Implementation of basic rate limiting on the `/api/auth/request-reset` endpoint to prevent brute-forcing.

## Development Tasks
1.  Add `password_reset_tokens` to `firestore.rules`.
2.  Implement token management logic in `dataService.ts`.
3.  Implement backend API routes in `server.ts`.
4.  Create frontend UI components for request and reset forms.
5.  Link new UI from the existing `AuthPage.tsx`.

[Proceed to execute this plan?]
