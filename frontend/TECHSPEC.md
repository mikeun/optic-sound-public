# Frontend Technical Specification: Optic Sound Mixing Console

## 1. Overview
The Optic Sound frontend is a high-performance React application designed to simulate a professional hardware mixing console. It provides real-time control over ALSA audio devices, including volume faders, muting, 10-band equalization, and system service management.

## 2. Technical Stack
- **Framework:** React 19 (TypeScript)
- **Build Tool:** Vite 8
- **Styling:** Tailwind CSS (Dark/Light mode support)
- **Testing:** Vitest + React Testing Library + JSDOM
- **Communication:** REST API via standard `fetch` with HttpOnly cookie session management.

## 3. Core Architectural Logics

### 3.1 Absolute State Persistence (The 15s Rule)
**Problem:** Hardware changes (ALSA amixer) have inherent latency. If the app polls the backend while a hardware change is still propagating, the UI might "snap back" to an old value (the "Jumping Slider" bug).

**Solution:**
- The application maintains a `manualOverrides` object using a React `useRef`.
- Every user interaction (slider drag, mute toggle) records the intended value and a timestamp in this ref.
- The `fetchState` loop (polling every 5 seconds) performs a **Deep Merge**:
  - If `Date.now() - override.timestamp < 15,000ms`, the manual value **must win** over the API data.
  - This shields the user from hardware-induced state reversals.

### 3.2 Thumb-First Touch Tracking
**Problem:** Native HTML5 `<input type="range">` elements are difficult to target on mobile and often trigger browser scroll/refresh gestures instead of value changes.

**Solution:**
- The `VerticalSlider` component uses a custom touch-event model.
- **Direct Coordinate Calculation:** Listens to `touchstart` and `touchmove`. Calculates percentage based on `(clientY - rect.top) / rect.height`.
- **Gesture Locking:** Calls `e.preventDefault()` on `touchmove` to lock the screen to the slider during interaction.
- **Optimistic UI:** A local `dragValue` state provides 60fps visual updates, decoupling the thumb position from the throttled 80ms API synchronization calls.

### 3.3 Tactile UI & Haptic Feedback
To simulate the physical feel of a mixing desk, the app utilizes the Web Vibrator API across all interaction points:
- **Slider Increments:** 5ms pulse per distinct value change.
- **Navigation/Toggles:** 10ms - 15ms pulse.
- **Login/Vault Access:** 20ms confirmation pulse.

### 3.4 Theme Environment Synchronization
The app supports dual environments (**Night/Dark** and **Light/Day**):
- Managed via Tailwind's `class` strategy (toggling `.dark` on `document.documentElement`).
- **Persistence:** User preference is saved to `localStorage` key `optic-theme`.
- **Contrast Logic:** The "0dB Guide Line" and accent colors (Gold/Blue) automatically shift opacity and saturation based on the theme to maintain legibility against varying backgrounds.

## 4. Component Hierarchy

### 4.1 `App.tsx` (The Brain)
- **Routing:** Manages four screens: `AUTH` (The Vault), `MIXER`, `EQ`, and `HEALTH` (Diag).
- **State Orchestration:** Centralized `state` object holding hardware data, service statuses, and version info.
- **Polling Engine:** Background `setInterval` that manages the periodic hardware sync and deep-merge logic.

### 4.2 `VerticalSlider.tsx` (The Muscle)
- A highly reusable, specialized component for faders and EQ bands.
- Features nested `plug` styling, "brushed aluminum" thumb visuals, and integrated haptic triggering.
- **Slim Mode:** Used in the EQ panel to fit 10 bands on a single mobile viewport without scrolling.

## 5. Service Layer (`api.ts`)
- Abstracts all `fetch` logic.
- Implements implicit 401 (Unauthorized) handling to redirect the user to the "Vault" screen if the session cookie expires.
- Supports "Simulated Mute" for hardware devices that lack physical mute registers (Software volume capture/restore).

## 6. Testing Strategy
- **Unit Testing:** Individual logic checks for volume normalization and coordinate-to-percentage math.
- **Behavioral Testing:** Mocks hardware latency and API polling to verify the 15-second override window remains stable during race conditions.
- **Visual Regression:** Integrated into the CI/CD pipeline to ensure Tailwind styles are bundled correctly across environments.

---
*© 2026 Michael Untershlak. All rights reserved.*
