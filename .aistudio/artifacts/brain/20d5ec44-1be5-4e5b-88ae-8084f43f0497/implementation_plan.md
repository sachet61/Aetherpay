# Implementation Plan - Telegram Bot Setup Guide & Error Troubleshooting UI

## Problem
When users configure the Telegram bot with an incorrect or unjoined chat ID (e.g. `-4339845768`), Telegram returns a "Bad Request: chat not found" error. The current UI shows a basic error banner, but lacks interactive step-by-step guidance on how to invite the bot as an administrator to the group/channel and obtain the correct numeric Chat ID.

## Solution
1. Enhance the Telegram bot configuration panel (`AdminConfig.tsx` or `TelegramConfigModal`) to display clear troubleshooting instructions when "chat not found" or authorization errors occur.
2. Add an interactive "Bot Setup Guide Modal" with step-by-step instructions on:
   - Creating a bot via `@BotFather`.
   - Adding the bot to a Telegram Group or Channel.
   - Promoting the bot as an **Administrator** with message posting permissions.
   - Retrieving the correct Channel/Chat ID (e.g. starting with `-100...`).
3. Handle API connection errors gracefully with actionable troubleshooting steps.

## Proposed Changes

### 1. `src/pages/admin/AdminConfig.tsx` (or Telegram Config Section)
- Add a dedicated "Telegram Bot Setup Guide" modal triggered by clicking "Bot Setup Guide".
- Provide clear, actionable error styling and quick-fix recommendations when Telegram returns error 400 ("chat not found").

## Verification Plan
- Run `compile_applet` to verify build success.
- Test the Telegram setup guide modal and error handling UI.
