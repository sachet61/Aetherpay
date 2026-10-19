# Implementation Plan: Replace Promotional Bonus with Payment Method Linked Bonus

Replace generic "+0% Promotional Bonus" with dynamic, payment-method-linked bonuses that automatically inherit the bonus percentage configured for each payment method in platform settings.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your confirmed preferences:
> - **Bonus Source**: The bonus percentage will be directly linked to the specific payment method chosen by the player (from Admin Settings `config.paymentMethods`).
> - **Card Display Label**: The card will display `+{bonusPct}% [Payment Method Name] Bonus` (e.g., `+20% Instant Gateway Bonus` instead of `+0% Promotional Bonus`).
> - **Crediting Automation**: When staff enters the verified deposit amount from the receipt, the bonus dollar amount is automatically calculated and added to the total game credits.

---

## 1. Overview & Core Concept

Currently, when a player forwards a payment proof via chat or the top-up modal, the top-up card displays `+0% Promotional Bonus` because the request amount is initially `$0` ("Awaiting Staff Amount"), causing the bonus calculator to resolve to 0%.

This update ensures:
1. Every payment method's configured bonus percentage (e.g., Instant Gateway +20%, Cash App +30%, Crypto +30%, Chime +15%) is captured and linked to the top-up request upon creation, regardless of initial deposit amount.
2. The chat transaction card, customer top-up review, and admin approval drawers display the exact payment method name with its bonus percentage (e.g., `+20% Instant Gateway Bonus`).
3. When staff enters the verified payment amount upon reviewing the proof screenshot, the system automatically computes `bonusAmount = (deposit * methodBonusPct) / 100` and displays the exact credit total (`$deposit + $bonus`).

---

## 2. User Experience & Visual Design

### A. Chat Transaction Card (`src/components/chat/ChatTransactionCard.tsx`)
- **Pending State ("Awaiting Staff Amount")**:
  - **Deposit & Bonus box**:
    - Top line: `Deposit & Bonus`
    - Middle line: `Awaiting Staff Amount` (amber monospace)
    - Bottom line: `+{methodBonusPct}% {paymentMethodName} Bonus` (amber-400 font-medium, e.g. `+20% Instant Gateway Bonus`)
  - **Total Game Credits box**:
    - Displays `Verify from Proof` with tooltip explaining that credits will include the `+{methodBonusPct}%` method bonus once verified.

- **Staff Review & Approval Modal**:
  - When staff inputs the verified deposit (e.g., `$100.00`), the modal dynamically previews:
    - Verified Deposit: `$100.00`
    - Method Bonus (`+{methodBonusPct}% {paymentMethodName}`): `+$20.00`
    - Total Credited to Game: `$120.00`
  - Clicking "Approve & Credit Game" applies the calculated bonus immediately.

- **Completed State**:
  - Displays: `$100.00 + $20.00 (+20% Instant Gateway Bonus)` -> Total: `$120.00`.

### B. Customer Top-Up Flow (`src/pages/customer/CustomerTopUp.tsx`)
- In the payment method selection list and proof submission step, replace all generic "Promotional Bonus" text with the specific method bonus label (e.g. `Instant Gateway Bonus: +20%`).

### C. Admin Top-Up Queue (`src/pages/admin/AdminTopUps.tsx`)
- In the administrative requests queue, show the method-linked bonus percentage and auto-calculate bonus credits when reviewing receipts.

---

## 3. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│ AppConfig / PaymentMethodConfig                        │
│ - instant_gateway: 20% bonus                           │
│ - cashapp: 30% bonus                                   │
│ - crypto: 30% bonus                                    │
│ - chime: 15% bonus                                     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ dataService.submitTopUp()                              │
│ - Resolves pm = config.paymentMethods.find(...)        │
│ - Stores immutable snapshot:                           │
│     bonusPercentage = pm.bonusPercentage               │
│     methodName = pm.name                               │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ ChatTransactionCard & Admin Top-Up Review              │
│ - Displays: `+{bonusPct}% {methodName} Bonus`          │
│ - On staff verification of deposit ($X):               │
│     calculatedBonus = (X * bonusPct) / 100             │
│     totalCredit = X + calculatedBonus                  │
│ - Dispatches approved transaction with bonus           │
└────────────────────────────────────────────────────────┘
```

---

## 4. Implementation Steps

1. **`src/services/dataService.ts`**:
   - Update `submitTopUp()`: Always capture `pm.bonusPercentage` into `bonusPercentage` on the top-up request even when `amount === 0` (for proof-first workflows).
   - Update `approveTopUp()`: When staff inputs `verifiedAmount`, auto-calculate `bonusAmount = (verifiedAmount * req.bonusPercentage) / 100` and `finalCredit = verifiedAmount + bonusAmount`.

2. **`src/components/chat/ChatTransactionCard.tsx`**:
   - Resolve `bonusPct` by looking up the actual payment method configuration from `appConfig` as well as request metadata.
   - Replace `+{bonusPct}% Promotional Bonus` with `+{bonusPct}% {methodName} Bonus`.
   - Update the Staff Review modal to show live payment-method-linked bonus calculations as staff types the deposit amount.

3. **`src/pages/customer/CustomerTopUp.tsx`**:
   - Replace any remaining "Promotional Bonus" references with method-linked bonus names.

4. **Verification**:
   - Run `lint_applet` and `compile_applet`.
   - Verify top-up card renders `+20% Instant Gateway Bonus` (or the configured percentage for the selected method) instead of `+0% Promotional Bonus`.
