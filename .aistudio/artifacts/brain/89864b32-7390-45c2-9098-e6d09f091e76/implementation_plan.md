# Dynamic Game Catalog Management & Mobile Chime Direct QR Downloader Implementation Plan

Fix game catalog addition logic in the admin portal, eradicate all hardcoded "fixed 20 games" references across the codebase to allow a fully fluid and dynamic catalog, and equip the Chime Direct checkout flow with mobile-friendly QR code downloading and tap-to-enlarge modal preview.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed during requirements clarification:
> - **Chime QR Mobile Interaction**: Support both an instant direct "Download QR Code" button and a tap-to-enlarge preview modal with a prominent download trigger, enabling effortless photo gallery saving on iOS and Android.
> - **Chime Payment Card Layout**: Kept visually minimal and uncluttered without redundant textual guide blocks, prioritizing fast 1-tap download and handle copying.
> - **Game Catalog Icon/Image Capabilities**: Administrators can upload image files directly from their device (auto-processed and saved), input custom image URLs, or select from local preset assets.
> - **Dynamic Catalog Invariants**: Games can be added, updated, toggled, or deleted dynamically; all obsolete references asserting "20 fixed games" or "fixed catalog" are removed.

---

## 1. Overview & Core Concept

1. **Bug Resolution in Game Catalog Creation**:
   - In `AdminGameCatalog.tsx`, opening the "New Game" modal pre-assigns `gameId = 'gc_' + Date.now()`. When calling `dataService.saveGameCatalogItem`, `isNew` was evaluated as `!item.id`, which resulted in `false`. As a consequence, new games were mistakenly routed to the update routine, failed the lookup against existing games, and were silently ignored while showing a false success notification.
   - The catalog engine will be updated to correctly determine new versus existing items via ID lookup (`!list.some(g => g.id === item.id)`), properly prepending new entries, updating state in real-time, and persisting directly to Firestore.

2. **Removing "Fixed 20 Games" Constraints**:
   - Replace rigid UI copy across `AdminDashboard.tsx`, `AdminGameCatalog.tsx`, `CustomerGameAccounts.tsx`, `CustomerChat.tsx`, and `dataService.ts` that references "fixed games" or "20 local game assets".
   - The catalog will dynamically adapt to any quantity of games added or removed by the platform administrator.

3. **Mobile Chime Direct QR Downloader & Tap-to-Enlarge Modal**:
   - In `CustomerTopUp.tsx`, players selecting Chime Direct will be able to tap the QR thumbnail to open an enlarged high-contrast modal or click the direct "Download QR" button.
   - The download mechanism converts the SVG/PNG QR image into a downloadable blob asset named `Chime_QR_SwiftSweeps.png` using a mobile-safe anchor download trigger, allowing seamless storage into iOS Photos and Android Gallery for direct scanning within the Chime mobile app.

---

## 2. User Experience & Visual Design

### A. Chime Direct QR Code Interaction (Customer Top-Up View)
- **Compact & High-Contrast Card**:
  - Deep slate background (`#020617` / `#0A0F1D`) with emerald/teal accents reflecting Chime's brand palette.
  - High-res QR code thumbnail framed with rounded corners, subtle border, and tap indicator (`Click to enlarge`).
  - Action row beneath the QR code:
    - **Download QR Button**: High-visibility button with `Download` icon (`bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 active:scale-95`).
    - **Enlarge QR Trigger**: Clicking the QR thumbnail opens a full-screen backdrop modal with the enlarged QR code.
- **Enlarge Modal**:
  - Darkened backdrop (`bg-black/80 backdrop-blur-sm`).
  - Clean centered card with high-resolution QR display, Chime handle badge with quick copy, and prominent "Save / Download to Gallery" CTA button.

### B. Admin Game Catalog Modal & Dynamic Management
- **Image Source Selector Tabs**:
  - Three clean segmented options:
    1. **Upload Image File**: Drag & drop or file picker accepting PNG, JPG, and WebP, converting via base64 or server upload to generate persistent preview.
    2. **Custom URL**: Direct input field with live preview.
    3. **Preset Icons**: Visual selection grid of local high-quality game badges.
- **Action Feedback**:
  - Immediate optimistic catalog update in the table view.
  - Toast confirmation indicating the exact game title created or updated.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: QR Image Download Strategy on Mobile (Blob vs URL Trigger)**:
  - *Chosen Approach*: Fetch/render the QR image into a Blob, create an object URL (`URL.createObjectURL(blob)`), and trigger a download via `<a download="Chime_QR_SwiftSweeps.png">`.
  - *Why*: On iOS Safari and Android Chrome, opening external cross-origin image URLs directly in a new tab often fails to trigger the system "Save Image" prompt. A local Blob trigger with filename ensures proper photo saving and gallery access.
  - *Alternatives Considered*: Direct link to external QR generator (rejected: causes CORS and popup issues in mobile web views).

- **Decision 2: Game Catalog ID Assignment & Existence Check**:
  - *Chosen Approach*: In `dataService.saveGameCatalogItem`, evaluate `isNew` as `!item.id || !list.some((g) => g.id === item.id)`.
  - *Why*: Guarantees that whether an ID was pre-generated by the UI or omitted, unlisted IDs are correctly added as new items and existing items are updated.
  - *Alternatives Considered*: Stripping `id` in UI (rejected: pre-assigned IDs help optimistic indexing and logging).

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                       Admin Portal                          │
│                                                             │
│   ┌────────────────────────┐    ┌────────────────────────┐  │
│   │  AdminGameCatalog.tsx  │    │   AdminDashboard.tsx   │  │
│   │  - Upload file/URL/icon│    │   - Dynamic count copy │  │
│   │  - saveGameCatalogItem │    │   - No "fixed 20" text │  │
│   └───────────┬────────────┘    └────────────────────────┘  │
└───────────────┼─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│                 dataService & Firestore                     │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ saveGameCatalogItem(item, actorId, actorName)       │   │
│   │  - isNew check: !item.id || !list.some(...)         │   │
│   │  - unshift(newItem) or update existing index        │   │
│   │  - Sync to Firestore collection 'game_catalog'      │   │
│   │  - Emit 'aetherpay_state_changed'                   │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│                       Customer Views                        │
│                                                             │
│   ┌───────────────────────────┐ ┌─────────────────────────┐ │
│   │    CustomerTopUp.tsx      │ │ CustomerGameAccounts.tsx│ │
│   │    - Chime QR Download    │ │ - Dynamic games listing │ │
│   │    - Tap-to-enlarge modal │ │ - No "fixed games" copy │ │
│   │    - Minimal payment card │ └─────────────────────────┘ │
│   └───────────────────────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

### Component & File Mapping:
1. `src/services/dataService.ts`:
   - Fix `saveGameCatalogItem`: check `!item.id || !list.some(g => g.id === item.id)`.
   - Update audit log text from "fixed platform catalog" to "platform catalog".
2. `src/pages/admin/AdminGameCatalog.tsx`:
   - Add image file upload support (FileReader base64 / upload endpoint).
   - Change "Select From 20 Local Game Assets" to "Select From Available Local Game Assets".
3. `src/pages/admin/AdminDashboard.tsx`:
   - Change "Configure {catalog.length} fixed games shown to players" to "Configure {catalog.length} games shown to players".
4. `src/pages/customer/CustomerChat.tsx` & `src/pages/customer/CustomerGameAccounts.tsx`:
   - Remove "fixed tournament games" copy and update to natural, dynamic phrasing.
5. `src/pages/customer/CustomerTopUp.tsx`:
   - Implement `handleDownloadChimeQr` function with blob conversion and mobile download trigger.
   - Add tap-to-enlarge QR modal with dedicated download action and handle copy.
