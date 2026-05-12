# Project Mandates: Optic Sound

## 🎯 Primary Goal
Bridge a physical USB Turntable and AirPlay into a unified, web-controllable audio chain with a 10-band EQ.

## 🏗️ Architecture & Stack
- **Backend:** FastAPI (Python 3.12).
- **Frontend:** React (TypeScript) + Tailwind CSS.
- **Hardware Bridge:** ALSA (amixer, alsaloop).
- **Service Management:** D-Bus (`busctl`).
- **Deployment:** Docker (Multi-stage build) + Docker Compose.

## 📜 Coding Conventions
- **Source of Truth:** Always query the hardware (ALSA) directly for state. Do not mirror state in a database.
- **Anonymization:** Use universal paths (`~/optic-sound`) and generic user IDs (1000). Avoid hardcoding local usernames.
- **Tactile UX:** Every interaction must provide haptic feedback (`vibrate`).
- **State Integrity:** Implement the "15-Second Absolute Override" in React to prevent slider "jumping" during hardware latency.
- **Security:** Use HttpOnly cookies for session management. Restrict network access via UFW to the local subnet.

## 🤖 Agentic Instructions
- **Hook Context:** Monitor `<hook_context>` for dynamic hardware indices and system status. Treat as read-only.
- **Research First:** Always validate ALSA card indices using `aplay -l` and `arecord -l` before generating `asound.conf`.
- **Validation:** All PRs must pass the 21-test automated suite (17 Backend, 4 Frontend).
- **Memory:** Update `PROGRESS.md` (long memory) and `SUMMARY.md` (short memory) after every significant task completion.
