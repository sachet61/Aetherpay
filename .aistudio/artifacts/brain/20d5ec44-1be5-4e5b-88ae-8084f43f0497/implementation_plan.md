# Implementation Plan - Lightweight Zero-Egress Telegram Notification Bot

## 1. Egress Analysis & Polling Explanation
- **Why Continuous Polling Consumes Egress:** The current long-polling loop calls `api.telegram.org/bot<token>/getUpdates` every 3–20 seconds continuously 24/7. Even when no messages arrive, this maintains open HTTP connections and generates tens of thousands of outbound requests per day.
- **Why Event-Driven Is Superior:** By disabling the background polling loop completely, server egress becomes **0% at idle**. An outbound HTTP request to Telegram is made **only** when a player actually sends a message in the chat (`POST /sendMessage`), which takes negligible bandwidth (~500 bytes per alert).

---

## 2. Proposed Changes

### Backend Engine (`src/server/telegramEngine.ts` & `server.ts`)
- **Disable Polling Loop:** Remove or disable `runPollLoop()`. The bot will no longer poll Telegram for updates, eliminating 100% of idle polling egress.
- **Minimal Notification Dispatcher:** Implement a dedicated, lightweight function `notifyCustomerMessage(customerName: string)` that sends a single clean message:
  ```
  💬 New message from [Customer Name]
  ```
- **New Server Route (`server.ts`):** Add `POST /api/telegram/notify-customer` to accept `{ customerName }` and dispatch the minimal alert to the configured channel.

### Chat Integration (`src/services/dataService.ts`)
- In `sendChatMessage()`:
  - Whenever `params.senderRole === 'customer'`, trigger the minimal alert with the customer's name.
  - Omit complex ticket metadata, system payloads, or internal IDs to keep the Telegram channel clean and minimal.

### Admin Settings UI (`src/components/admin/TelegramBotConfigCard.tsx`)
- Update the status indicator from "Polling 24/7" to "Event-Driven Alerts (Zero-Egress Mode)".
- Remove the continuous polling loop requirement, simplifying bot setup to just Token + Channel ID.

---

## 3. Verification Plan
- **Verification via `compile_applet`:** Ensure clean build compilation.
- **Testing:**
  1. Verify the polling loop does not run in background logs.
  2. Test sending a message from a customer account in the web chat and verify the minimal notification (`💬 New message from [Customer Name]`) is delivered to Telegram.
