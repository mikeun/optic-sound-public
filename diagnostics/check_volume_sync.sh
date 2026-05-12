#!/bin/bash

echo "--- VOLUME SYNCHRONIZATION CHECK (LOGIC VS PHYSICS) ---"
echo "Comparing Backend API state with ALSA Hardware Registers..."
echo ""

# Get Logic state
STATE=$(docker exec optic-control python3 -c "from backend.alsa_bridge import ALSABridge; import json; print(json.dumps(ALSABridge().get_system_state()))")

# Get Physical state
TT_PHYS=$(docker exec optic-control amixer -c 0 sget Turntable)
AP_PHYS=$(docker exec optic-control amixer -c 0 sget AirPlay)

printf "%-15s | %-15s | %-15s | %-10s\n" "SOURCE" "LOGIC (APP)" "PHYSICS (ALSA)" "STATUS"
echo "----------------|-----------------|-----------------|-----------"

# Turntable
L_TT=$(echo $STATE | python3 -c "import sys, json; print(json.load(sys.stdin)['turntable_gain'])")
P_TT=$(echo "$TT_PHYS" | grep "Front Left:" | awk -F"[][]" '{print $2}' | sed 's/%//')
STATUS_TT="OK"
if [ "$L_TT" != "$P_TT" ]; then STATUS_TT="MISMATCH!"; fi
printf "%-15s | %-15s | %-15s | %-10s\n" "Turntable" "$L_TT%" "$P_TT%" "$STATUS_TT"

# AirPlay
L_AP=$(echo $STATE | python3 -c "import sys, json; print(json.load(sys.stdin)['airplay_gain'])")
P_AP=$(echo "$AP_PHYS" | grep "Front Left:" | awk -F"[][]" '{print $2}' | sed 's/%//')
STATUS_AP="OK"
if [ "$L_AP" != "$P_AP" ]; then STATUS_AP="MISMATCH!"; fi
printf "%-15s | %-15s | %-15s | %-10s\n" "AirPlay" "$L_AP%" "$P_AP%" "$STATUS_AP"

echo ""
echo "Verification Complete."
