# Implementation Plan - Fix OTP Modal Z-Index and Layering

## Problem Statement
When triggering email verification or password recovery OTP codes, the 6-digit OTP confirmation modal appears behind other UI elements (such as the main dashboard, header, or drawer). This is caused by stacking context isolation and rendering the modal within container nodes instead of the root document body.

## Proposed Changes
1. **EmailOtpModal (`src/components/auth/EmailOtpModal.tsx`)**:
   - Wrap the modal backdrop and content in a React Portal (`ReactDOM.createPortal(..., document.body)`) when `isOpen` is true and `!isStandalone`.
   - Elevate the modal wrapper `z-index` to `z-[99999]` with a robust dark backdrop (`bg-black/85 backdrop-blur-md`) to guarantee it sits at the very top of the stacking context above all app headers, drawers, and dashboard elements.

## Verification Plan
1. Compile the applet with `compile_applet`.
2. Trigger password recovery / email verification in the app preview to verify that the OTP modal renders cleanly on top of all dashboard and navigation elements.
