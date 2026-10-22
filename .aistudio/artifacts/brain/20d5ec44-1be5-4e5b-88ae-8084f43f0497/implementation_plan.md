# Implementation Plan - Image Preloading & Client Caching

## Problem
Images (game logos, badges, banners) are re-fetched or reloaded on tab transitions or page refreshes, causing slight layout re-renders and network overhead.

## Solution
Integrate a robust image preloader pool in `StartupSplash.tsx` that leverages JavaScript `Image` objects (`new Image()`) to preload all core game platform banners, logos, and UI assets during the cinematic startup splash screen sequence (0% to 100%). This populates the browser and client-side image cache immediately upon launch.

## Proposed Changes

### 1. `src/components/common/StartupSplash.tsx`
- Add a preloader utility function and asset array containing paths to all platform and game images (`/src/images/Firekirin.png`, `/src/images/GameVault.png`, `/src/images/Juwa.png`, `/src/images/OrionStars.png`, `/src/images/PandaMaster.png`, `/src/images/MilkyWay.png`, `/src/images/Vblink.png`, `/src/images/UltraPanda.png`, `/src/images/RiverSweeps.png`, `/src/images/VegasSweeps.png`, `/src/images/VegasX.png`, `/src/images/Winstar.png`, `/src/images/CashMachine.png`, `/src/images/CasinoIgnite.jpeg`, `/src/images/CasinoRoyale.png`, `/src/images/Egame.png`, `/src/images/GamblingGalaxy.png`, `/src/images/Gameroom.png`, `/src/images/Mafia.png`, `/src/images/Yolo.png`, etc.).
- Initiate preloading in `useEffect` as soon as the splash screen mounts.
- Track preload progress or cache instances so images are stored in browser memory cache.

## Verification Plan
- Run `compile_applet` to ensure successful compilation.
- Verify that opening the app triggers preloading during the splash screen and images load instantly from cache on subsequent navigation.
