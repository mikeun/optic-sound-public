import subprocess
import re
from typing import Dict, List, Optional

class ALSABridge:
    """
    Interface for managing ALSA hardware and software mixers via amixer commands.
    Follows the 'Hardware as Source of Truth' principle.
    """

    # Device Mapping
    DEVICES = {
        "master": "hw:0",      # Shared across sources
        "turntable": "hw:0",   # Softvol on Card 0
        "airplay": "hw:0",     # Softvol on Card 0
        "equalizer": "equal"   # LADSPA Equalizer
    }

    # Control Mapping
    CONTROLS = {
        "master": "VIRTUAL_MASTER", # Managed programmatically
        "turntable": "Turntable",
        "airplay": "AirPlay",
        "physical_eq_bands": [
            "00. 31 Hz", "01. 63 Hz", "02. 125 Hz", "03. 250 Hz", "04. 500 Hz",
            "05. 1 kHz", "06. 2 kHz", "07. 4 kHz", "08. 8 kHz", "09. 16 kHz"
        ],
        "api_eq_bands": [
            "00. 32 Hz", "01. 64 Hz", "02. 125 Hz", "03. 250 Hz", "04. 500 Hz",
            "05. 1 kHz", "06. 2 kHz", "07. 4 kHz", "08. 8 kHz", "09. 16 kHz"
        ]
    }

    def _run_amixer(self, args: List[str]) -> str:
        cmd = ["amixer"] + args
        try:
            # print(f"DEBUG: Running amixer command: {' '.join(cmd)}", flush=True)
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            if "sset" in args:
                print(f"ALSA: Set {args[args.index('sset')+1]} to {args[args.index('sset')+2]}", flush=True)
            return result.stdout
        except subprocess.CalledProcessError as e:
            if "Invalid card number" not in e.stderr:
                print(f"ALSA Error: {e.stderr}", flush=True)
            return ""

    def __init__(self):
        # We store the virtual master state in memory, 
        # but the sources remain the source of truth.
        self._master_volume = 80
        self._master_muted = False
        
        # Internal tracking to prevent feedback loops
        self._soft_muted = {}
        self._pre_mute_volumes = {}

    def _get_actual_volume(self, device_key: str, control: str) -> int:
        """Bypasses simulated state to get real hardware volume."""
        device = self.DEVICES.get(device_key, "hw:0")
        card = device.split(":")[1] if ":" in device else "0"
        output = self._run_amixer(["-c", card, "sget", control])
        match = re.search(r"\[(\d+)%\]", output)
        vol = int(match.group(1)) if match else 0
        # print(f"ALSA: Get {control} -> {vol}%", flush=True)
        return vol

    def get_volume(self, device_key: str, control: str) -> int:
        """Parses the volume percentage from amixer output."""
        if device_key == "master":
            return self._master_volume
            
        if self._soft_muted.get(device_key):
            return 0
        return self._get_actual_volume(device_key, control)

    def set_volume(self, device_key: str, control: str, value: int) -> bool:
        """Sets volume percentage (0-100)."""
        if device_key == "master":
            self._master_volume = value
            # Move both source faders to the same level for a "Master" feel
            self.set_volume("airplay", self.CONTROLS["airplay"], value)
            self.set_volume("turntable", self.CONTROLS["turntable"], value)
            return True

        if device_key in ["airplay", "turntable"]:
            self._soft_muted[device_key] = False
            self._pre_mute_volumes[device_key] = value

        device = self.DEVICES.get(device_key, "hw:0")
        card = device.split(":")[1] if ":" in device else "0"
        
        # Use 'unmute' explicitly when setting volume
        cmd = ["-c", card, "sset", control, f"{value}%", "unmute"]
        self._run_amixer(cmd)
        return True

    def get_mute(self, device_key: str, control: str) -> bool:
        """Returns True if the control is MUTED."""
        if device_key == "master":
            return self._master_muted
            
        if self._soft_muted.get(device_key):
            return True

        device = self.DEVICES.get(device_key, "hw:0")
        card = device.split(":")[1] if ":" in device else "0"
        output = self._run_amixer(["-c", card, "sget", control])
        return "[off]" in output

    def set_mute(self, device_key: str, control: str, mute: bool) -> bool:
        """Mutes or Unmutes the control."""
        if device_key == "master":
            self._master_muted = mute
            self.set_mute("airplay", self.CONTROLS["airplay"], mute)
            self.set_mute("turntable", self.CONTROLS["turntable"], mute)
            return True

        if device_key in ["airplay", "turntable"]:
            if mute:
                if not self._soft_muted.get(device_key):
                    # Store current volume before muting
                    self._pre_mute_volumes[device_key] = self._get_actual_volume(device_key, control)
                    self._soft_muted[device_key] = True
                    device = self.DEVICES.get(device_key, "hw:0")
                    card = device.split(":")[1] if ":" in device else "0"
                    self._run_amixer(["-c", card, "sset", control, "0%"])
            else:
                if self._soft_muted.get(device_key):
                    self._soft_muted[device_key] = False
                    # Restore volume
                    val = self._pre_mute_volumes.get(device_key, 70)
                    device = self.DEVICES.get(device_key, "hw:0")
                    card = device.split(":")[1] if ":" in device else "0"
                    self._run_amixer(["-c", card, "sset", control, f"{val}%"])
            return True

        return False

    def get_eq_bands(self) -> Dict[str, int]:
        """Returns all 10 EQ band levels with API labels."""
        bands = {}
        for idx, phys_band in enumerate(self.CONTROLS["physical_eq_bands"]):
            api_band = self.CONTROLS["api_eq_bands"][idx]
            output = self._run_amixer(["-D", "equal", "sget", phys_band])
            match = re.search(r"\[(\d+)%\]", output)
            bands[api_band] = int(match.group(1)) if match else 0
        return bands

    def set_eq_band(self, band_index: int, value: int) -> bool:
        """Sets a specific EQ band by index (0-9) using its physical name."""
        if 0 <= band_index < len(self.CONTROLS["physical_eq_bands"]):
            phys_band_name = self.CONTROLS["physical_eq_bands"][band_index]
            self._run_amixer(["-D", "equal", "sset", phys_band_name, f"{value}%"])
            return True
        return False

    def get_system_state(self) -> Dict:
        """Aggregates all current hardware states."""
        try:
            return {
                "master_volume": self.get_volume("master", self.CONTROLS["master"]),
                "master_muted": self.get_mute("master", self.CONTROLS["master"]),
                "turntable_gain": self.get_volume("turntable", self.CONTROLS["turntable"]),
                "turntable_muted": self.get_mute("turntable", self.CONTROLS["turntable"]),
                "airplay_gain": self.get_volume("airplay", self.CONTROLS["airplay"]),
                "airplay_muted": self.get_mute("airplay", self.CONTROLS["airplay"]),
                "equalizer": self.get_eq_bands(),
                "services": {
                    "turntable_loop": self._check_service("turntable-loop"),
                    "airplay": self._check_service("shairport-sync")
                },
                "version": "3.3.1-stable"
            }
        except Exception as e:
            print(f"ERROR: Failed to get system state: {e}", flush=True)
            return {}

    def _check_service(self, name: str) -> str:
        """Checks service status using busctl."""
        try:
            escaped_name = name.replace("-", "_2d")
            path = f"/org/freedesktop/systemd1/unit/{escaped_name}_2eservice"
            res = subprocess.run(
                ["busctl", "get-property", "org.freedesktop.systemd1", path, "org.freedesktop.systemd1.Unit", "ActiveState"],
                capture_output=True, text=True, check=True
            )
            return res.stdout.strip().split('"')[1]
        except:
            return "unknown"

    def restart_audio_engine(self) -> bool:
        """Restarts the core audio services using busctl."""
        try:
            for service in ["turntable-loop.service", "shairport-sync.service"]:
                subprocess.run([
                    "busctl", "call", "org.freedesktop.systemd1", "/org/freedesktop/systemd1",
                    "org.freedesktop.systemd1.Manager", "RestartUnit", "ss", service, "replace"
                ], check=True)
            return True
        except Exception as e:
            print(f"ERROR: Failed to restart audio services: {e}", flush=True)
            return False
