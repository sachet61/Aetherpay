# Implementation Plan: Single Unified Support Conversation Per Customer

## Overview
Currently, multiple conversation threads can be created for the same customer (as shown in the support chat list screenshot with multiple threads for "Rashil Basukala"). This plan introduces a strict single-thread architecture where each customer has **exactly one persistent conversation thread**, and all message history from duplicate threads is merged into this primary thread. Any admin or support agent can view and reply to this single thread collaboratively.

---

## Technical Strategy & Architecture

### 1. Conversation Unification & Deduplication (`dataService.ts`)
- **Single Thread Enforcement**: Update `getOrCreateConversation(customerId, customerName)` (or equivalent support initialization method) to search for any existing conversation for the customer ID. If multiple exist, retain the oldest (primary) thread and merge all subsequent threads into it.
- **Message Reassignment**: Automatically reassign all messages from duplicate conversation IDs to the primary conversation ID, sorting chronologically.
- **Deduplication on Startup**: In `DataService` constructor or initialization routine, scan existing conversations, group by `customer_id`, merge duplicate threads, and purge redundant conversation records from cache and storage.

### 2. Multi-Agent Shared Access
- **Global Staff Visibility**: Any authorized admin or support agent querying conversations or opening a customer chat will directly load the unified thread.
- **Collaborative Messaging**: All messages sent by any admin/agent or the customer attach to this single thread (`conversation_id`), ensuring zero fragmentation or split threads.

---

## User Experience & UI Flow
- **Clean Chat Sidebar**: The chat list will display exactly one entry per customer, showing the latest message across all staff/customer interactions.
- **Seamless Continuity**: When switching between different agents or admins viewing the support panel, everyone sees the exact same unified conversation thread and full message history.
