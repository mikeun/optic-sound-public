# Plan: Turntable & AirPlay Web Control Interface [COMPLETED]

## Goal
Create a "Friendly User Mode" web interface to control the entire audio signal chain from any device on the local network, with a secure authorization layer.

---

## 1. Architectural Overview & Signal Flow (Implemented)

The application manages a tiered audio architecture:

### 1.1 Audio Signal Flow (The Physics)
This diagram shows how audio is funneled through the system to ensure Mixer and EQ processing.

```mermaid
graph TD
    subgraph Sources
        TT[Turntable: USB Card 2]
        AP[AirPlay: Shairport-Sync]
        SYS[System Sounds: Default]
    end

    subgraph "Mixing Layer (softvol)"
        TT_VOL[Turntable Fader]
        AP_VOL[AirPlay Fader]
    end

    subgraph "Tone Control (LADSPA)"
        EQ[10-Band Equalizer]
    end

    subgraph "Hardware Output"
        DMIX[ALSA dmixer]
        OPT[Optical Out: Card 0, Dev 1]
    end

    TT --> TT_VOL
    AP --> AP_VOL
    SYS --> EQ
    TT_VOL --> EQ
    AP_VOL --> EQ
    EQ --> DMIX
    DMIX --> OPT
```

### 1.2 System Logic Flow (The Bridge)
This diagram shows the relationship between the client, the containerized backend, and the host hardware.

```mermaid
graph LR
    subgraph "Client (Mobile/Browser)"
        UI[React / TS Frontend]
    end

    subgraph "Docker Container"
        API[FastAPI Backend]
        ALSA[ALSABridge Python]
    end

    subgraph "Host System (Ubuntu)"
        SND[ALSA Drivers /dev/snd]
        DBUS[Systemd / D-Bus]
    end

    UI -- HTTP/JSON --> API
    API -- Call --> ALSA
    ALSA -- subprocess: amixer --> SND
    ALSA -- busctl --> DBUS
```

---

## 2. Key Features & Navigation (Verified)

### 2.1 Navigation Flow
The interface is designed for minimal friction, moving from a secure vault to the active mixing console.

```mermaid
graph TD
    A[The Vault: PIN Login] -- Success --> B[Mixing Desk]
    B -- Tab Change --> C[Precision EQ]
    B -- Tab Change --> D[Service Health]
    C -- Tab Change --> B
    D -- Tab Change --> B
    B -- Logout/Session Expired --> A
```

- [x] **Secure Access:** Login screen with PIN entry and cookie-based sessions.
- [x] **Input Mixing:** Vertical faders for Turntable and Master control.
- [x] **10-Band EQ:** Panoramic slider panel for tone adjustment.
- [x] **Health Dashboard:** Service status monitoring for `turntable-loop` and `shairport-sync`.
- [x] **Global Reset:** One-tap restart functionality for the audio engine.

---

## 3. Technical Implementation (Production Ready)
...

### Backend (Python/FastAPI)
- **Status:** Live on Port 9000.
- **Features:** Hardware-as-Source-of-Truth ALSA Bridge, Secure Auth, and Static File serving.

### Frontend (React + TS + Tailwind)
- **Status:** Compiled and served via FastAPI.
- **Design:** Gold & Charcoal "Mixing Desk" aesthetic.

### Dockerization
- **Status:** Multi-stage build deployed via `docker compose`.
- **Networking:** Host-mode for native mDNS/AirPlay support.
- **Firewall:** Port 9000 opened in UFW.
