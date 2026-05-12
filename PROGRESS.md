# Project Progress & Lessons Learned (Long-term Memory)

## Day 1: Initial Setup & Hardware Verification

### Issues Resolved
- **Signal Loss:** Initially no sound from USB input.
  - *Cause:* Turntable switch was set to PHONO (too quiet).
  - *Fix:* Switched to **LINE** to enable internal preamp.
- **Background Noise:** User reported electronic noise/hiss.
  - *Mitigation A:* Muted unused analog inputs (Line-In, Mic) on Card 0.
  - *Mitigation B:* Increased `alsaloop` latency to 200ms (`-t 200000`) and enabled double buffering (`-b`).
- **Equalizer Integration:** Needed a way to adjust tone for both sources.
  - *Action:* Installed `libasound2-plugin-equal` and `swh-plugins`.
  - *ALSA Change:* Inserted `plugequal` before `dmixer` in `/etc/asound.conf`.
- **Mixer Mapping Discovery:**
  - *Card 0 (Optical):* Uses 'Master' for final volume.
  - *Card 2 (Turntable):* Uses 'PCM Playback Volume' for internal codec gain (even for capture).
  - *Equalizer:* Controlled via `-D equal` with 10 specific bands ('00. 31 Hz' to '09. 16 kHz').
- **ALSA Loopback Error:** `alsaloop` failed with `--amplification` and `-A` flags.
  - *Lesson:* Version 1.2.9 of `alsaloop` on this system does not support those specific flags; stuck to standard buffer/latency flags.

### Frontend Implementation
- **Visual Design:** Implemented "Gold & Charcoal" aesthetic using Tailwind CSS.
- **Security:** Added a numeric "Vault" screen for PIN entry, using HttpOnly cookies for session persistence.
- **Mixing Desk:** Developed real-time vertical faders for Turntable gain and a custom rotary-style Master Volume interface.
- **EQ Control:** Built a panoramic 10-band slider panel that interacts directly with the LADSPA `equal` plugin.

### Testing & Validation
- **Backend Testing:** Implemented comprehensive tests using `pytest` and `httpx`, covering:
    - ALSA bridge command generation and output parsing.
    - API endpoint security (authorized vs. unauthorized access).
    - Service status reporting and hardware state aggregation.
- **Frontend Testing:** Implemented unit and behavior tests using `vitest` and `React Testing Library`, covering:
    - Security "Vault" entry logic and PIN validation.
    - Mixer screen state synchronization with mocked hardware responses.
    - Diagnostic screen navigation and system restart triggers.
- **Verification:** 14 tests (10 Backend, 4 Frontend) passing successfully.

### Dockerization & Deployment
- **Multi-Stage Build:** Created a production-ready `Dockerfile` that builds the React frontend and bundles it with the FastAPI backend into a single efficient image.
- **Hardware Bridge:** Configured `docker-compose.yml` to mount `/dev/snd` and `/etc/asound.conf`, giving the container direct, low-latency access to the hardware mixers.
- **Service Orchestration:** Used `network_mode: host` to ensure the web interface is discoverable on the local network (optic-sound.local) and can interact with system-level services like Shairport Sync.
- **Static Hosting:** Updated the backend to serve the compiled frontend, eliminating the need for a separate Nginx container for this local deployment.
- **Network Security:** 
  - *Issue:* Port 9000 was initially open to "Anywhere," posing a potential risk if the machine were internet-exposed.
  - *Fix:* Restricted UFW rules to only allow traffic from the local subnet (`192.168.1.0/24`). The control panel is now invisible to anything outside your home network.

### Final Implementation Refinements
- **UI Aesthetic Fix:** 
  - *Issue:* Tailwind CSS styles were not loading, resulting in a broken "ugly" UI.
  - *Fix:* Corrected `tailwind.config.js` with proper `content` glob patterns to ensure styles are purged and bundled correctly.
- **API Routing Logic:** 
  - *Issue:* Static file serving was intercepting API calls (like `/api/login`), causing "405 Method Not Allowed" errors.
  - *Fix:* Moved the static mount to the end of the FastAPI application lifecycle, ensuring API routes have priority.
- **Docker Environment Management:**
  - *Issue:* Configuration variables in `.env` were not being picked up by the container.
  - *Fix:* Centralized the `.env` file in the `docker/` directory where the orchestration command is executed.
- **TypeScript Integrity:**
  - *Issue:* Production build failed due to unused variables and invalid JSX attributes.
  - *Fix:* Cleaned up the codebase and utilized standard CSS for vertical range input appearance.
- **Automated CI/CD Integration:**
  - *Action:* Updated the `Dockerfile` to automatically run all 14 tests (Frontend & Backend) before every build, guaranteeing a bug-free deployment.
- **File Ownership & Permission Enforcement:**
  - *Issue:* Files created during development or by services were sometimes owned by root, causing permission issues.
  - *Fix:* Created `set_permissions.sh` to recursively enforce `mu:mu` ownership and applied the **setgid bit** to all directories. This ensures all new files automatically inherit the correct group.
  - *Fix:* Updated `turntable-loop.service` to run as `User=<YOUR_USER>` instead of root.
  - *Fix:* Fixed hardcoded paths in `setup_turntable_audio.sh` to use the permanent project directory.
- **Feature Completion (Health & EQ):**
  - *Action:* Implemented the full "Diag" screen with real-time service status and emergency restart functionality.
  - *Action:* Added "Reset Flat" button to the EQ panel and implemented haptic feedback (vibration) for all sliders.
  - **Verification:** Expanded test suite to 20 tests (16 Backend, 4 Frontend) covering diagnostic navigation, system restarts, independent AirPlay/Turntable mixing, and EQ control. All tests passing.

  ### Final Mixing Desk Completion
  - **Independent Mixing:** 
    - *Issue:* AirPlay and Turntable were originally mixed into a single stream, preventing individual volume control.
    - *Fix:* Implemented ALSA `softvol` devices (`AirPlay` and `Turntable`) in `asound.conf`.
    - *Integration:* Updated `shairport-sync` and `alsaloop` to route through their respective softvol devices.
    - *API:* Expanded the FastAPI backend and React frontend to provide real-time control over these independent channels.
  - **ALSA "No Sound" Resolution:**
    - *Issue:* `alsaloop` failed to initialize with `softvol`, reporting "Unknown PCM" and "Slave PCM not usable", resulting in a complete loss of audio.
    - *Fix 1 (Visibility):* Added `hint { show on }` blocks to the `softvol` definitions in `asound.conf`. Without these, custom PCMs are often invisible to non-root users and systemd services.
    - *Fix 2 (Stability):* Wrapped the `softvol` devices in **nested `plug` layers** (`plug` -> `softvol` -> `plug` -> `dmix`). This is critical for `alsaloop` to negotiate varying hardware sample rates (48kHz capture vs 44.1kHz playback).
    - *Fix 3 (Negotiation):* Removed strict formatting flags (`-f`, `-c`, `-r`) from `alsaloop` to allow the virtual devices to handle resampling automatically.
    - *Fix 4 (Service Persistence):* Discovered that systemd units can become "masked" during rapid configuration changes; required explicit `unmask` and `enable` to restore the loopback.
    - *Fix 5 (Hardware Output):* Re-enabled the `IEC958` (Optical) playback switch which can be reset by ALSA during driver reloads.
- **ALSA Plugin Conflict Resolution:**
  - *Issue:* Fatal `alsaloop` crashes occurred when nesting `softvol` devices within the `alsaequal` plugin chain.
  - *Fix:* Implemented a **Hybrid Strategy**: AirPlay uses software volume (slaved to EQ), while the Turntable uses **Direct Hardware Gain** (Card 2 `PCM`). This maintains stability while keeping high audio fidelity.
- **Frontend Deployment & Caching:**
  - *Issue:* UI changes (like new slider logic) appeared non-functional because Docker aggressively cached old frontend assets.
  - *Fix:* Implemented a **Forced Build Protocol** (`docker compose build --no-cache`) and added a **Version ID** (`state["version"]`) to the footer to verify that the client is running the latest deployment.
- **Mobile Touch Ergonomics:**
  - *Issue:* Native vertical sliders were physically difficult to use and triggered page scrolls instead of audio changes.
  - *Fix:* Developed a **'Thumb-First' Slider Model**. Added large invisible hit zones (padding) and used `e.preventDefault()` on touch moves to lock the fader to the user's thumb. This provides a truly tactile, physical-console feel.
- **Real-Time Debugging:**
  - *Issue:* Identifying why hardware didn't react was difficult due to buffered logs.
  - *Fix:* Enabled **Unbuffered Python Logging** (`print(..., flush=True)`) for all `amixer` commands. This allows for instant tracing of user actions from the finger-tap to the physical hardware register.
- **Mute Functionality Fix:** 
  - *Issue:* Muting the Turntable or AirPlay in the app had no effect because the underlying `softvol` devices lacked a hardware mute switch (`pswitch`).
  - *Fix:* Implemented **Simulated Mute** logic in the backend `ALSABridge`. When a mute request is received for these devices, the backend captures the current volume, sets the hardware level to 0%, and restores the previous level upon unmuting.
- **Backend Environment Stability:**
  - *Issue:* Backend logs showed persistent "Invalid CTL equal" errors because the Docker container lacked the `libasound2-plugin-equal` library.
  - *Fix:* Updated the `Dockerfile` to include the missing ALSA plugin, enabling the backend to correctly query and set equalizer bands.
- **Slider Responsiveness Optimization:**
  - *Issue:* Sliders (Turntable, AirPlay, EQ) were difficult to control on touch devices because they relied on hidden native vertical range inputs which didn't track the thumb position accurately.
  - *Fix:* Refactored the `VerticalSlider` and introduced `HorizontalSlider` to use a **Direct Touch Tracking** model. They now listen directly to `touchstart` and `touchmove` events, calculating the value based on the coordinate. This provides zero-latency, "stick-to-thumb" precision across all faders and EQ bands.
  - *Network Optimization:* Throttled backend sync to every 80ms while dragging, decoupling the 60fps visual update from the network request to eliminate 'tug-of-war' lag.
- **Tactile UI Harmonization:**
  - *Issue:* Interactions with buttons (like Mute System, Vault login) lacked physical confirmation and felt sluggish due to waiting for network responses.
  - *Fix:* Implemented **Optimistic State Updates** for all mute toggles and EQ resets to provide instant visual feedback.
  - *Fix:* Synchronized **Haptic Feedback** (`navigator.vibrate`) across all interaction points: 5ms clicks for sliders/navigation, 15ms for mute toggles, and 20ms for Vault login. This unifies the entire UI into a premium, responsive physical console.
- **UX Refinement (Simplified Control):**
  - **Simplification:** Removed the circular Master Volume display and the horizontal Master Volume slider.
  - **Result:** The "Mute System" button is now the primary global control on the Mixing Desk, providing a cleaner, more focused interface for quick audio silencing while leaving gain control to individual sources.
- **State Truth Integrity (v3.2.5):**
  - **Issue:** Sliders would "jump" back to old positions when switching tabs or during rapid interaction due to stale backend polling racing against React renders.
  - **Fix:** Implemented a robust **Manual Override** system in the root `App` component. It tracks absolute user intent in a persistent `ref` and forces the UI to ignore contradicting hardware data for 15 seconds after any interaction. This guarantees state persistence across tab switches (Mixer ↔ EQ) and slow ALSA hardware responses. Refactored sliders to be fast, controlled components.
- **Coordinated Master Control Architecture (Internal Only):**
  - *Issue:* The hardware `Master` control on Card 0 only affects analog outputs and has zero effect on the digital (optical) output used for the speakers.
  - *Fix:* Implemented a **Coordinated Master** logic in the Python backend. While the slider is hidden in v3.2.1, the API still supports unified control for programmatic stability.
  - *Stability:* Simplified the ALSA chain to avoid "Assertion Failed" crashes caused by nesting multiple software volume plugins.
- **Direct Systemd Service Management:**
  - *Issue:* Docker containers cannot natively use `systemctl` to control host-level services like `shairport-sync` or `alsaloop`.
  - *Fix:* Refactored the backend to communicate with the host via **Direct D-Bus (`busctl`)** through a mounted socket. This enables 100% accurate service status monitoring and reliable "Restart Engine" functionality.
  - **System Stability:** Verified that all 20 tests (16 Backend, 4 Frontend) pass in the local environment.
  - **Hardware Verification:** Confirmed that the PCM stream is in a stable `RUNNING` state and hardware levels are correctly synchronized with the web interface.

## Day 3: EQ State Synchronization Fix

### Issues Resolved
- **EQ Slider "Jumping":**
  - *Issue:* EQ sliders would snap back to old positions immediately after dragging and then jump to the new position a few seconds later.
  - *Cause:* The `manualOverrides` system was adding EQ updates as top-level properties instead of nesting them inside the `equalizer` state object.
  - *Fix:* Refactored `applyOverride` and `handleEQ` in `App.tsx` to correctly handle nested state updates.
  - *Verification:* Verified smooth slider behavior across 10 bands; all 20 tests passing.
  - *Version:* Bumped internal version to **v3.2.6**.

## Day 3: EQ Frequency Refactor (32Hz/64Hz)

### Issues Resolved
- **Frequency Nomenclature Alignment:**
  - *Issue:* User requested EQ bands to follow the common 32Hz/64Hz naming convention instead of the ISO 31Hz/63Hz defaults.
  - *Fix:* Implemented a **Logical-to-Physical Mapping** in the backend `ALSABridge`.
  - *Physics Alignment:* The app now exposes "32 Hz" and "64 Hz" via the API and UI, while the backend transparently translates these to the physical ALSA "31 Hz" and "63 Hz" registers.
  - *Verification:* Verified via backend unit tests that index 0 (32Hz) correctly triggers the `00. 31 Hz` amixer command.
  *Version:* Bumped internal version to **v3.2.7**.

  ## Day 3: Design Harmonization & Audio Funnel Audit

  ### Issues Resolved
  - **UI "Disbalance":**
  - *Issue:* The EQ panel felt visually disconnected from the Mixer panel due to differing heights and slider scales.
  - *Fix:* Refactored EQ panel to match the Mixer's **520px height** and upscaled EQ sliders to **300px**.
  - *UX Improvement:* Implemented a "Slim-Console" layout that fits all 10 EQ bands on a single screen without scrolling.
  - **Routing Integrity (The Audio Funnel):**
  - *Audit:* Performed a comprehensive check of ALSA routes to ensure no audio can bypass the Mixer/EQ.
  - *Enforcement:* Updated `asound.conf` to set `pcm.!default` to the EQ device and synchronized `shairport-sync` and `alsaloop` services to strictly use the processed signal paths.
  - **Diagnostic Automation:**
  - *Action:* Created the `diagnostics/` folder containing CLI tools for instant Logic-vs-Physics verification.
  - *Verification:* All 21 tests (17 Backend, 4 Frontend) passing; manual synchronization confirmed across all 10 bands.
  - *Final Version:* **v3.2.7-stable**.

  ## Day 3: EQ State Synchronization Fix (Multi-User/Container)

  ### Issues Resolved
  - **Inaudible EQ Changes:**
    - *Issue:* Changes made in the web UI had no effect on the audio.
    - *Cause:* The `alsaequal` plugin defaults to storing state in `~/.alsaequal.bin`. Since the backend (Docker), `shairport-sync` (host user), and `alsaloop` (user `mu`) all run as different users/contexts, they were each looking at different state files. The UI was updating a file that the audio processes never saw.
    - *Fix:* Unified the EQ state by explicitly pointing all ALSA `equal` instances to a shared file at `/var/lib/alsa/equalizer.bin` in `asound.conf`.
    - *Infrastructure:* Mounted `/var/lib/alsa` into the Docker container and set broad permissions (666) on the state file to allow all users/services to read/write to the same controls.
    - *Verification:* Confirmed synchronization between container `amixer` and host `amixer` commands. 
    - *Version:* Bumped internal version to **v3.2.8**.

  ## Day 3: EQ Design Refactor (0dB Visibility)

  ### Issues Resolved
  - **Hard-to-see 0dB Line:**
    - *Issue:* The horizontal guide line representing the 0dB (Flat) position was too subtle (`white/10`) and difficult to see against the dark background.
    - *Fix:* Refactored the `VerticalSlider` component to use the slider's `accentColor` for the guide line (e.g., `gold/50` or `blue/50`). This makes the reference point significantly more visible while maintaining design harmony.
    - *Version:* Bumped internal version to **v3.2.9**.

  ## Day 3: Theme Support (Light/Night Environments)

  ### New Features
  - **Dual Environment Support:**
    - *Action:* Implemented a comprehensive theme system that supports both **Night (Dark)** and **Light (Day)** environments.
    - *Implementation:* Utilized Tailwind CSS class-based dark mode (`dark:`). Refactored all UI components to use theme-aware colors (e.g., `bg-white dark:bg-[#141414]`).
    - *UX:* Added a theme toggle button (☀️/🌙) in the header and on the login screen. The user's preference is persisted in `localStorage`.
    - *Transitions:* Added smooth 500ms color transitions across the entire app for a premium feel when switching environments.
    - *Version:* Bumped internal version to **v3.3.0**.

  ## Day 3: Documentation & Visual Assets

  ### New Features
  - **Visual Gallery:** Added high-resolution screenshots of the three primary interface modes (Mixer, EQ, Diagnostics) to the project root and documentation.
  - **Public Asset Integration:** Migrated screenshots to `frontend/public/` and updated the `README.md` to provide a visual-first introduction to the project.
  - **System Naming Fix:** Corrected file naming for system diagnostics screenshots to ensure consistent documentation.

  ## Day 3: Light Theme UX Refinement (v3.3.1)

  ### Issues Resolved
  - **Light Theme Visibility:**
    - *Issue:* The 0dB guide lines were nearly invisible in Light mode due to low contrast between gold/blue and the light-gray slider track.
    - *Fix:* Increased guide line opacity to **80%** (Gold) and used a darker **Blue-600** for the AirPlay fader in Light mode. Maintained the subtle **50%** opacity in Dark mode for aesthetics.
    - *Version:* Bumped internal version to **v3.3.1**.

  ### Technical Decisions
............
  - **Stack:** FastAPI (Backend) + React/TS (Frontend) + Docker.
  - **Mixing Strategy:** ALSA `softvol` for independent input control, `plugequal` for global tone, and hardware `Master` for final output.
  - **Auth:** JWT stored in HttpOnly cookies for security on the local network.
  - **State:** "Hardware as Source of Truth" - Backend always queries `amixer` directly.
  - **Networking:** `network_mode: host` chosen to support mDNS and AirPlay visibility within the container.
  - **Reliability:** CI/CD pipeline now enforces 100% test pass rate for both units and integration points before allowing a build.

