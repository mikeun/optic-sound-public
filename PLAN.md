# Project Plan: Optic Sound (Experience-Driven Roadmap)

This plan reflects the hard-won technical insights required to bridge physical hardware with an autonomous agentic workflow, ordered by logical implementation priority.

## Phase 1: Agentic Workspace Optimization ✅
- [x] **The Mandate (`GEMINI.md`):** Established immutable rules for agentic consistency before a single line of code was written.
- [x] **Dual-Memory System:** Separated high-fidelity logs (`PROGRESS.md`) from architectural snapshots (`SUMMARY.md`) to manage context efficiently.
- [x] **Context Management:** Optimized `.geminiignore` to preserve the agent's context window for complex reasoning.

## Phase 2: Foundations & Environment Stability ✅
- [x] **Universal Portability:** Established `~/optic-sound` as the root to eliminate hardcoded local paths and ensure portability.
- [x] **Permission Shield:** Implemented `set_permissions.sh` with the **setgid bit** to ensure seamless file ownership between Host, Docker, and multiple users.
- [x] **Anonymization Strategy:** Sanitized system identities and hardware specs for public release.

## Phase 3: ALSA Engine & Physics Negotiation ✅
- [x] **Hardware Verification:** Enforced "LINE" pre-amp state as a prerequisite for software control.
- [x] **The Audio Funnel:** Engineered nested `plug` layers in `asound.conf` to handle sample rate negotiation (48kHz ↔ 44.1kHz).
- [x] **Hybrid Volume Strategy:** Combined **Software Volume** (AirPlay) with **Direct Hardware Gain** (Turntable) for maximum stability.
- [x] **Shared State Binary:** Unified EQ controls across all users via `/var/lib/alsa/equalizer.bin`.

## Phase 4: The Digital Bridge (FastAPI) ✅
- [x] **Hardware as Truth:** Eliminated state databases in favor of direct, real-time ALSA polling.
- [x] **Simulated Mute Logic:** Engineered software-level silencing for hardware devices lacking a physical `pswitch`.
- [x] **D-Bus Orchestration:** Enabled host-level service management (`busctl`) from within the isolated Docker container.
- [x] **Unbuffered Logging:** Optimized backend telemetry for real-time finger-to-hardware tracing.

## Phase 5: Tactile Frontend (React & UX) ✅
- [x] **Thumb-First UX:** Developed custom touch-tracking sliders to bypass restrictive native HTML5 range inputs.
- [x] **The 15s Absolute Override:** Solved the "Jumping Slider" bug by forcing UI persistence during hardware latency windows.
- [x] **Haptic Synchronicity:** Integrated `vibrate` feedback for every physical interaction to mimic high-end hardware.
- [x] **Theme Harmony:** Implemented persistent Light/Night modes with contrast-optimized 0dB guides.

## Phase 6: Production Hardening & Security ✅
- [x] **Multi-Stage Docker Architecture:** Consolidated React and FastAPI into a single, high-performance image.
- [x] **Subnet Lockdown:** Restricted web console access to the local home network via UFW.
- [x] **Hardware Mounts:** Configured low-latency access to `/dev/snd` within the containerized environment.

## Phase 7: The Validation Shield ✅
- [x] **Test-Driven Agentics (TDA):** Enforced a "Failed Test First" workflow for hardware logic.
- [x] **Empirical Reproduction:** Built Vitest cases to simulate and verify async latency fixes.
- [x] **Zero-Bug CI/CD:** Implemented a mandatory test barrier in the Docker build lifecycle.
