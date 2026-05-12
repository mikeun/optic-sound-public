# Backend Technical Specification: Optic Sound ALSA Bridge

## 1. Overview
The Optic Sound backend is a specialized FastAPI application that acts as a low-latency bridge between a web-based React interface and the Linux kernel's Advanced Linux Sound Architecture (ALSA). It translates digital API requests into physical hardware register changes and system service management.

## 2. Technical Stack
- **Framework:** FastAPI (Python 3.12)
- **Server:** Uvicorn
- **Hardware Interface:** `amixer` (ALSA-utils)
- **Service Management:** `busctl` (D-Bus)
- **Testing:** Pytest + Httpx + Unittest Mock

## 3. Core Architectural Logics

### 3.1 Hardware as Source of Truth
**Mandate:** The backend does not maintain a database for volume levels or mute states.
- **Polling:** Every `GET /api/state` request triggers a series of synchronous `subprocess` calls to the hardware.
- **Reasoning:** This ensures the UI is never out of sync with external changes (e.g., direct `amixer` terminal commands or physical hardware gain dials on the motherboard).

### 3.2 Logical-to-Physical Frequency Mapping (EQ)
**Problem:** The ISO standard for 10-band EQs uses 31Hz and 63Hz, but audiophiles and high-end software often use 32Hz and 64Hz nomenclature.
- **Logic:** The `ALSABridge` maintains an `api_eq_bands` mapping. 
- **Translation:** Requests for "32 Hz" are transparently mapped to the physical ALSA register "00. 31 Hz" before the `amixer` command is executed.

### 3.3 Simulated Mute Logic
**Problem:** Virtual ALSA `softvol` devices often lack a hardware `pswitch` (mute register). 
- **Mechanism:**
  1. When a mute request is received, the backend executes `sget` to capture the current percentage.
  2. It caches this value in memory and sets the hardware level to `0%`.
  3. Upon unmuting, it restores the cached value to the hardware register.
- **Safety:** If the application restarts during a mute, the default restore value is set to `70%` to prevent sudden peak volume.

### 3.4 Coordinated Master Control
**Strategy:** While the `Master` volume is virtually represented in the UI, the backend executes a **Fan-Out** update:
- Changing the "Master" volume simultaneously updates both the `Turntable` and `AirPlay` softvol devices.
- This provides a unified audio experience while maintaining the high stability of a simplified ALSA chain.

## 4. System Integration

### 4.1 D-Bus Service Orchestration
**Strategy:** To avoid the security and stability risks of running `sudo systemctl` inside a Docker container:
- The backend communicates with the host's `systemd` via a mounted `/var/run/dbus/system_bus_socket`.
- Uses `busctl` to query `ActiveState` and trigger `RestartUnit`.
- **Escaped Path Mapping:** Services like `shairport-sync` are addressed via their escaped D-Bus paths (e.g., `shairport_2dsync_2eservice`).

### 4.2 Logging & Debugging
- **Unbuffered Outputs:** All hardware actions use `flush=True` in Python.
- **Traceability:** Every `amixer sset` command is logged to `stdout` to provide an instant audit trail from user-tap to hardware-execution.

## 5. Security Model
- **PIN-Based Auth:** A 4-digit numeric PIN is verified against the `ACCESS_PIN` environment variable.
- **Session Management:** Utilizes HttpOnly, SameSite=Strict cookies to prevent cross-site scripting (XSS) and request forgery (CSRF) on the local network.
- **Dependency Isolation:** Strict environment checks ensure that critical hardware commands fail gracefully if ALSA plugins are missing from the container.

## 6. Testing Framework
- **ALSA Mocking:** The `test_alsa_bridge.py` suite patches `subprocess.run` to verify that the generated command strings (including card indices and percentage formatting) are 100% correct.
- **Integration Tests:** `test_main.py` uses `AsyncClient` to verify the end-to-end API lifecycle, from authentication to hardware state aggregation.

---
*© 2026 Michael Untershlak. All rights reserved.*
