#!/bin/bash

echo "--- EQ SYNCHRONIZATION CHECK (LOGIC VS PHYSICS) ---"
echo "Comparing Backend API state with ALSA Hardware Registers..."
echo ""

# Get Logic state from inside the container
LOGIC=$(docker exec optic-control python3 -c "from backend.alsa_bridge import ALSABridge; import json; print(json.dumps(ALSABridge().get_system_state()['equalizer']))")

# Get Physical state
PHYSICS=$(docker exec optic-control amixer -D equal contents)

printf "%-15s | %-15s | %-15s | %-10s\n" "BAND (UI)" "LOGIC (APP)" "PHYSICS (ALSA)" "STATUS"
echo "----------------|-----------------|-----------------|-----------"

# Define the bands to check
BANDS=("00. 32 Hz" "01. 64 Hz" "02. 125 Hz" "03. 250 Hz" "04. 500 Hz" "05. 1 kHz" "06. 2 kHz" "07. 4 kHz" "08. 8 kHz" "09. 16 kHz")
PHYS_BANDS=("00. 31 Hz" "01. 63 Hz" "02. 125 Hz" "03. 250 Hz" "04. 500 Hz" "05. 1 kHz" "06. 2 kHz" "07. 4 kHz" "08. 8 kHz" "09. 16 kHz")

for i in "${!BANDS[@]}"; do
    LABEL="${BANDS[$i]}"
    PHYS_LABEL="${PHYS_BANDS[$i]}"
    
    # Extract logic value using python (cleaner than grep/sed)
    L_VAL=$(echo $LOGIC | python3 -c "import sys, json; print(json.load(sys.stdin)['$LABEL'])")
    
    # Extract physics value from amixer output - look for the specific band name then get values
    P_VAL=$(echo "$PHYSICS" | grep -A 3 "$PHYS_LABEL" | grep ": values=" | cut -d'=' -f2 | cut -d',' -f1)
    
    # Status check
    STATUS="OK"
    if [ "$L_VAL" != "$P_VAL" ]; then
        STATUS="MISMATCH!"
    fi
    
    printf "%-15s | %-15s | %-15s | %-10s\n" "$LABEL" "$L_VAL%" "$P_VAL%" "$STATUS"
done

echo ""
echo "Verification Complete."
