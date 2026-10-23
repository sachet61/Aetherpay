# Fix HTTP 404 Error on Admin Users Directory API Endpoint

## Problem Diagnosis
When administrators or agents open the "Users & Roles" admin tab (`AdminUsers.tsx`), the client requests `GET /api/admin/users`. 
The HTTP 404 error occurs when:
1. The Express server (`server.ts`) was not running or was reloaded prior to the route registration taking effect in the active dev process.
2. The client request lacks proper authorization headers (`x-user-id`, `x-user-role`, or `aetherpay_session` cookie) or is sent before the administrator session is fully authenticated on the server.
3. Fallback handling in `AdminUsers.tsx` displays the raw server HTTP status error when the endpoint fails or times out.

## Technical Strategy
1. **Ensure Express Route Availability**: Verify that `/api/admin/users` is correctly registered in `server.ts` before `vite.middlewares`.
2. **Robust Authorization Handling**: Ensure `server.ts` accepts both session cookies and header credentials (`x-user-id`, `x-user-role`) gracefully, while providing clear error messages (HTTP 401/403) instead of 404 when unauthenticated.
3. **Client-Side Resilience & Diagnostics**: Enhance `fetchLiveUsersDirectory` in `dataService.ts` and error states in `AdminUsers.tsx` to provide clear troubleshooting feedback and automatic retry options if the server dev process needs a warm-up.

## Implementation Steps
1. **Verify `server.ts` Route & Middleware Order**: Confirm `/api/admin/users` is placed correctly before Vite middleware.
2. **Enhance Client Error Handling in `AdminUsers.tsx`**: Add a "Retry Loading" button and descriptive error state when `/api/admin/users` returns 404 or fails to connect.
3. **Restart / Verify Dev Server Process**: Ensure Express server is running and responding cleanly on port 3000.
