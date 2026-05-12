# Reference USB Turntable Turntable & AirPlay Audio Setup Guide

This document describes the configuration and operation of the Reference USB Turntable turntable mixed with Optical Output and AirPlay.

## 1. Physical Hardware Setup

*   **Turntable Rear Switch:** Must be set to **LINE**. This enables the internal pre-amp. Setting it to PHONO will result in extremely low volume and high noise.
*   **USB Connection:** Connected to a USB port on the PC. For the best sound, use a direct motherboard port (avoid hubs) to minimize electronic interference.
*   **Audio Path:** Turntable (USB) -> PC (ALSA Loopback) -> Optical Out (S/PDIF).

## 2. Software Configuration

### Turntable Loop
The system uses a systemd service to loop audio from the turntable to the mixer.
*   **Service Name:** `turntable-loop.service`
*   **Optimized Settings:** 200ms latency (`-t 200000`), double buffering (`-b`), and strict sync (`-S 1`).

### AirPlay (Shairport Sync)
The system runs **Shairport Sync** to allow streaming from Apple devices.
*   **Service Name:** `shairport-sync.service`
*   **Integration:** It is configured to output to the `optic_plug` ALSA device, which allows it to mix simultaneously with the turntable audio via the `dmixer`.

### Managing Services
```bash
# Check status of both services
systemctl status turntable-loop.service shairport-sync

# Restart services
sudo systemctl restart turntable-loop.service
sudo systemctl restart shairport-sync
```

## 2.5 Equalizer Setup

You now have a 10-band equalizer installed that affects both the Turntable and AirPlay.

### How to adjust the Equalizer:
*   **Recommended:** Use the **Tone Control (EQ)** tab in the Web UI (`optic-sound.local:9000`) for real-time visual adjustment with haptic feedback.
*   **CLI Option:** To open the visual equalizer interface in the terminal, run:
    ```bash
    alsamixer -D equal
    ```

### Using Commands:
You can also adjust specific bands using amixer:
```bash
# Increase bass (31Hz) to 80%
amixer -D equal sset "00. 31 Hz" 80%

# Reset all bands to flat (66%)
amixer -D equal sset "00. 31 Hz" 66%
```

## 3. Volume and Mixer Control

Audio is mixed digitally in the ALSA `dmixer`. You can control the levels of the Turntable and AirPlay independently.

### Main Output (Optical)
The Master volume affects the final combined mix.
```bash
# Set master volume to 80%
amixer -c 0 sset 'Master' 80%
```

### Turntable Input Volume
```bash
# Set turntable input level to 100% (Recommended)
amixer -c 2 sset 'PCM' 100%
```

### AirPlay Volume
*   **Primary Control:** Use the volume slider on your iPhone, iPad, or Mac.
*   **Secondary Limit:** The PC's `Master` volume acts as a master cap for the AirPlay signal.

## 4. Troubleshooting

### Background Noise / Hiss
1.  **Mute unused inputs:** Ensure analog Line-In and Mic ports are muted in `alsamixer`.
2.  **USB Ground Loop:** If you hear a "whine," try a different USB port or a shielded cable.

### Audio Stuttering or Sync Issues
1.  **AirPlay Lag:** Ensure your WiFi is stable. If AirPlay drops, restart the service: `sudo systemctl restart shairport-sync`.
2.  **Turntable Crackle:** Increase the loopback latency in the service file (`-t 200000` to `-t 300000`).

## 5. File Locations
*   **Turntable Service:** `/etc/systemd/system/turntable-loop.service`
*   **AirPlay Config:** `/etc/shairport-sync.conf`
*   **ALSA Mixer Config:** `/etc/asound.conf`
*   **Project Folder:** `~/optic_sound/`
