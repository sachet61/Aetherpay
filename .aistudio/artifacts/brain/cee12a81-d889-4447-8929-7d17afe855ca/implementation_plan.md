# Bulk Game Asset Replacement & Ingestion Pipeline

Architectural blueprint and optimized prompt specification for processing full-sized raw game images in bulk, standardizing them to high-efficiency square containers (512×512 WebP/PNG), preserving original game art fidelity without artificial distortion, and updating the catalog registry.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following specifications are established directly from your clarifications:
> - **Container & Aspect Ratio**: 1:1 Square (standardized at 512×512 px) to match the existing `w-14 h-14` (Customer Home), `w-12 h-12` (Customer Game Accounts), and `w-16 h-16` (Admin Catalog) containers without clipping or aspect distortion.
> - **Aesthetic Treatment**: Authentic, clean compatibility mode. No artificial glow, heavy filters, or cartoonish alterations. Center the game logo/mascot with subtle 8% breathing margins so circular or rectangular logos never get sliced by card borders.
> - **Storage & Placement**: Placed directly into `/public/images/`, registered with lowercase clean slugs in `/src/utils/imageUtils.ts`, and synced to active catalog items in `/src/services/dataService.ts`.

---

## 1. Overview & Core Concept

- **What It Does**: Provides a dedicated, turnkey ingestion workflow and ready-to-run execution prompt for uploading raw game screenshots or logos in bulk. Upon receipt, the system inspects image dimensions, crops to centered square geometry, compresses from bloated 2–5 MB raw assets to 40–80 KB high-performance WebP/PNG files, and updates catalog records.
- **Target Experience**: Fast-loading, crisp game cards across customer dashboard, platform credential cards, top-up modals, and administrative catalog tables.
- **Key Value**: Eliminates image distortion, fixes awkward logo clipping in `object-cover` containers, and dramatically accelerates page load times.

---

## 2. User Experience & Visual Design

### Container Sizing & Spatial Math
Current application components utilize 1:1 rounded square image containers:
- **Customer Home Grid**: `w-14 h-14` (56×56 px) with `rounded-xl`, `border border-slate-700`, `object-cover`.
- **Customer Game Accounts**: `w-12 h-12` (48×48 px) inside `rounded-xl` with `bg-indigo-950 border border-indigo-700/50`.
- **Admin Catalog Grid & Table**: `w-12 h-12` (48×48 px) with `rounded-xl` thumbnail badges.
- **Admin Modal Previews**: `w-16 h-16` (64×64 px) with live preview resolution.

### Image Processing Rules
1. **Target Dimensions**: `512 × 512 px` (Retina 4x sharpness for 48–64 px containers; lightweight footprint).
2. **Safe Zone Margins**: Maintain an 8% padding margin around logos so that the container's `rounded-xl` corner radii (12px) do not clip game typography or mascot edges.
3. **Fidelity Preservation**: Retain native publisher artwork colors, contrast, and branding without applying saturation boosts or generic filters.
4. **Format & Performance**: Optimize to WebP (with fallback PNG) to reduce asset footprint by over 80% compared to existing uncompressed files.

---

## 3. Bulk Ingestion Prompt for You to Use

When you are ready to upload your images in bulk, attach your images and paste the following prompt into the chat:

```text
Please process the attached game images in bulk and update the Swift Sweeps catalog:

1. Target Dimensions & Sizing:
   - Convert/crop each image into a clean 1:1 square (512x512 px).
   - Center the primary game logo or character with an 8% internal padding margin to prevent edge clipping in rounded-xl containers.
   - Maintain authentic game colors and branding; do not apply artificial filters or neon effects.

2. Storage & File Naming:
   - Save processed assets directly to /public/images/ with clean alphanumeric filenames matching existing game names (e.g., Firekirin.png, MilkyWay.png, Juwa.png, GameVault.png, OrionStars.png, VegasSweeps.png, CashMachine.png, RiverSweeps.png, UltraPanda.png, PandaMaster.png, Vblink.png, Gameroom.png, Winstar.png, CasinoRoyale.png, Mafia.png, Egame.png, Yolo.png, CasinoIgnite.png, VegasX.png, GamblingGalaxy.png).

3. Registry & Catalog Synchronization:
   - Ensure src/utils/imageUtils.ts LOCAL_GAME_IMAGES registry maps each asset cleanly.
   - Update any matching game items in src/services/dataService.ts so customer dashboards and admin tables immediately reflect the new assets without placeholder fallbacks.
```

---

## 4. Technical Architecture & Data Strategy

### Asset Processing Flow

```
┌─────────────────────────────────┐
│ User Bulk Images Upload         │
│ (Raw Screenshots / Logo Files)  │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ Image Optimization & Geometry   │
│ - Center Subject & Anchor       │
│ - Scale to 512x512 px Square    │
│ - 8% Internal Padding Safe Zone │
│ - Compress to WebP / PNG (80KB) │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ File System Storage             │
│ /public/images/<GameName>.png   │
└────────────────┬────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│ Catalog Registry & Frontend Components                 │
│ ├─ src/utils/imageUtils.ts (LOCAL_GAME_IMAGES list)   │
│ ├─ src/services/dataService.ts (game catalog items)    │
│ ├─ CustomerHome.tsx (w-14 h-14 rounded-xl game cards)  │
│ └─ AdminGameCatalog.tsx (management table & previews) │
└────────────────────────────────────────────────────────┘
```

### Component & Data Model Updates
- **Registry Synchronization (`imageUtils.ts`)**: Add or update entries in `LOCAL_GAME_IMAGES` with exact filenames and sanitized IDs.
- **Catalog Normalization (`dataService.ts`)**: Ensure `resolveGameImageUrl()` resolves both lowercase, uppercase, and extensionless matches so existing user game accounts remain unbroken.
