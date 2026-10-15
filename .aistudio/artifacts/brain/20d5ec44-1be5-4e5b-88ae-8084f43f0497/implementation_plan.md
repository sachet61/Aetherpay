# Live Cashouts Ticker & Cinematic Startup Splash Implementation Plan

Implement a continuous, news-style horizontal scrolling ticker for live cashouts (driven by existing admin-managed records) placed right below the top navigation header, alongside a polished cinematic startup loading screen with logo glow and progress bar.

## User Review & Critical Decisions

> [!IMPORTANT]
> - **Ticker Position**: Positioned directly below the navigation header as a sleek news ticker.
> - **Data Source**: Uses existing live cashout records maintained in the admin settings/database without generating random mock payouts.
> - **Startup Splash**: Cinematic splash screen on app startup featuring the Swift Sweeps logo with a gold glow, progress bar, and smooth entrance/exit transition (1.5-2s).

## 1. Overview & Core Concept

- **Live Cashouts News Ticker**: Displays recent cashout achievements (name, amount, game title, time ago) in a continuous smooth horizontal marquee scroll, mimicking professional news broadcast tickers.
- **Startup Splash Screen**: A branded 1.5-2 second loading screen shown on initial web app launch, displaying the official logo, gold ambient glow, loading progress indicator, and smooth fade-out.

## 2. User Experience & Visual Design

- **Ticker Styling**:
  - Dark midnight navy background (`#0A0F1D`) with subtle amber/gold borders (`border-amber-500/20`).
  - Pulsing live badge (`● LIVE CASHOUTS`) on the left.
  - Seamless horizontal CSS animation (`marquee` / transform translate) scrolling the items continuously across the screen. Pause on hover.
- **Startup Splash Styling**:
  - Full-screen backdrop (`bg-[#070B14] z-50`).
  - Centered glowing Swift Sweeps emblem with pulse animation.
  - Animated gold progress bar filling up over 1.5 seconds.
  - Clean fade transition when app is fully ready.

## 3. Technical Architecture & Data Strategy

- **Components**:
  - `StartupSplash.tsx`: Manages initial launch timer and animation.
  - `LiveCashoutsTicker.tsx`: Fetches existing cashouts and renders the continuous CSS marquee ticker.
- **Integration**: Insert `LiveCashoutsTicker` right below `TopNavbar` in the layout wrapper, and wrap the app root with `StartupSplash`.
