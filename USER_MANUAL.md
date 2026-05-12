# Optic Sound: Operations & User Manual

This manual provides instructions for operating the Optic Sound system via the Web UI and directly via the command line for verification and troubleshooting.

## 1. Web Interface (optic-sound.local:9000)

### Accessing the Console
- **URL**: `http://optic-sound.local:9000`
- **Security**: Enter your 4-digit PIN on "The Vault" screen to unlock the mixing desk.
- **Haptic Feedback**: On mobile, you will feel a subtle vibration (5-20ms) confirming every tap and slider movement.

### Mixing Desk Operations
- **Turntable / AirPlay Sliders**: Use a "Thumb-First" model. Tap anywhere on the slider and drag; the fader is locked to your thumb for precision.
- **System Mute**: The large red/charcoal button provides a global silence across all output paths.
- **EQ (Tone Control)**: Access the 10-band "Precision EQ" via the navigation bar. Use "Reset Flat" to quickly return to a neutral profile.
- **Environment Themes**: Switch between **Night (Dark)** and **Light (Day)** modes using the Sun/Moon toggle in the header. Your preference is saved automatically.

---

## 2. "Physics" Verification (Hardware Commands)

If you want to verify that the UI actions have physically reached the hardware registers, use these commands on the host machine.

### Checking Volume Levels
To see the actual gain percentage and decibel (dB) level:
```bash
# Check Turntable hardware level
amixer -c 0 sget Turntable

# Check AirPlay hardware level
amixer -c 0 sget AirPlay
```

### Checking Equalizer State
The app uses a **Unified State File** (`/var/lib/alsa/equalizer.bin`) shared between the Docker container and the host. This ensures that UI changes are immediately applied to all audio processes.

```bash
# Check a specific band (e.g., 32 Hz in UI -> 31 Hz in ALSA)
amixer -D equal sget "00. 31 Hz"

# View all 10 EQ band settings at once
amixer -D equal contents
```
*Note: You no longer need to run these inside the container, as the host and container now share the exact same physical state.*

### Monitoring Live Action
To see every hardware command the backend executes in real-time as you use the app:
```bash
docker compose -f docker/docker-compose.yml logs -f optic-control
```

### Automated Synchronization Checks
You can run these scripts to perform an instant, side-by-side verification of the entire system:
```bash
# Verify all 10 EQ bands (App Logic vs. Hardware Physics)
./diagnostics/check_eq_sync.sh

# Verify all volume levels (App Logic vs. Hardware Physics)
./diagnostics/check_volume_sync.sh
```

---

## 3. Step-by-Step Hardware Verification (How-To)

Follow these steps to ensure the software-to-hardware "handshake" is working perfectly:

### Step 1: Open the Real-time Monitor
In a terminal, start watching the backend logs:
```bash
docker compose -f docker/docker-compose.yml logs -f optic-control
```

### Step 2: Perform a UI Action
On your mobile device or browser:
1.  Go to the **EQ (Tone Control)** screen.
2.  Move the **32 Hz** slider to exactly **50%**.
3.  Look at your terminal; you should immediately see the backend mapping to the physical register:
    `ALSA: Set 00. 31 Hz to 50%`

### Step 3: Verify the Physical Register
In your terminal, query the hardware *inside* the container using the **physical name**:
```bash
docker exec optic-control amixer -D equal sget "00. 31 Hz"
```
**Expected Result**: The output should contain `Front Left: Playback 50 [50%]`.

### Step 4: Verify Volume Logic
1.  On the **Mixer** screen, move the **Turntable** fader to **80%**.
2.  Run: `amixer -c 0 sget Turntable`
3.  **Expected Result**: You should see `[80%] [-8.35dB]` (the dB value may vary based on your hardware).

### Step 5: Verify Mute Physics
1.  Tap the **Mute System** button (it should turn Red).
2.  Run: `amixer -c 0 sget Turntable`
3.  **Expected Result**: The volume should be `[0%]`.
4.  Unmute in the UI.
5.  Run: `amixer -c 0 sget Turntable`
6.  **Expected Result**: The volume should return to its previous level (e.g., `80%`).

---

## 4. Verification Examples (Side-by-Side)

### Example: Checking Turntable Synchronization
Compare what the App says versus what the Hardware says:

| Source | Command | Expected Output Example |
| :--- | :--- | :--- |
| **App Logic** | `docker exec optic-control python3 -c "from backend.alsa_bridge import ALSABridge; b = ALSABridge(); print(b.get_system_state()['turntable_gain'])"` | `57` |
| **Physics** | `docker exec optic-control amixer -c 0 sget Turntable` | `Front Left: [57%] [-22.00dB]` |

### Example: Checking AirPlay Synchronization
| Source | Command | Expected Output Example |
| :--- | :--- | :--- |
| **App Logic** | `docker exec optic-control python3 -c "from backend.alsa_bridge import ALSABridge; b = ALSABridge(); print(b.get_system_state()['airplay_gain'])"` | `85` |
| **Physics** | `docker exec optic-control amixer -c 0 sget AirPlay` | `Front Left: [85%] [-7.60dB]` |

### Optical Output (Digital) Diagnostics
Verify the state of the physical Optical port (IEC958) and its active stream parameters.

| Check | Command | What to Look For |
| :--- | :--- | :--- |
| **Port Status** | `amixer -c 0 sget IEC958` | `Item0: 'PCM'` or `'On'` means active light. |
| **Live Parameters** | `cat /proc/asound/card0/pcm1p/sub0/hw_params` | Displays `rate` (44100) and `format` (S16_LE). |
| **Hardware ID** | `aplay -l | grep Digital` | Confirms Card 0, Device 1 is the Digital out. |

---

## 5. Audio "Funnel" Architecture
The system is designed as a physical funnel to ensure that no audio can reach the speakers without being processed by your Mixer and EQ.

### The Routing Chain:
1.  **Entry Points**:
    - `turntable_softvol`: Used by the Turntable loop.
    - `airplay_softvol`: Used by the AirPlay receiver.
    - `default`: Used by any other system sounds (enforced).
2.  **The Filter (EQ)**: All entry points lead into `plugequal`.
3.  **The Hardware**: `plugequal` leads into the hardware `dmixer` (Card 0, Device 1 - Optical).

### Verification of the "Funnel":
Run this command to see the routing dependencies:
```bash
# Verify that all 'softvol' devices are slaved to the EQ (plugequal)
grep -A 5 "type softvol" /etc/asound.conf
```

---

## 6. System Management & Maintenance

### Restarting the Audio Engine
If audio drops or services become unresponsive, you can restart the core hardware bridges:
- **Via UI**: Go to the "Diag" screen and tap "Restart Audio Engine".
- **Via CLI**:
  ```bash
  # Restart the Turntable loopback and AirPlay receiver
  sudo systemctl restart turntable-loop.service shairport-sync.service
  ```

### Container Management
To rebuild the application after making code changes (ensures v3.2.6+ integrity):
```bash
cd docker
docker compose up --build -d
```

### Checking Service Health (Host Level)
```bash
# Check if the turntable loop is running
busctl get-property org.freedesktop.systemd1 /org/freedesktop/systemd1/unit/turntable_2dloop_2eservice org.freedesktop.systemd1.Unit ActiveState

# Check if AirPlay (Shairport) is running
busctl get-property org.freedesktop.systemd1 /org/freedesktop/systemd1/unit/shairport_2dsync_2eservice org.freedesktop.systemd1.Unit ActiveState
```

---

## 4. Hardware Reference (ALSA Mapping)
- **Card 0 (Default)**: Handles Optical Output (IEC958) and Software Volume.
- **Card 2 (Turntable)**: USB Audio Codec from the Reference USB Turntable.
- **Device 'equal'**: The LADSPA equalizer bridge.

## 5. Troubleshooting
- **No Sound**: Ensure the Turntable is set to **LINE** (not PHONO) and the "Mute System" button is not red in the UI.
- **Jumping Sliders**: Ensure you are running version **v3.3.1** or higher. Refresh your browser to clear old cached frontend files.
- **UI Unresponsive**: Check the status of the `optic-control` container using `docker ps`.
