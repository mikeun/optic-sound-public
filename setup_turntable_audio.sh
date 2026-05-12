#!/bin/bash
if [ "$EUID" -ne 0 ]; then
  echo "Please run this script with sudo."
  exit 1
fi

echo "Creating shared EQ state directory..."
mkdir -p /var/lib/alsa
touch /var/lib/alsa/equalizer.bin
chmod 666 /var/lib/alsa/equalizer.bin
chmod 777 /var/lib/alsa

echo "Copying asound.conf..."
cp ${PROJECT_DIR:-$HOME/optic_sound}/asound.conf /etc/asound.conf

echo "Copying shairport-sync.conf..."
cp ${PROJECT_DIR:-$HOME/optic_sound}/shairport-sync.conf /etc/shairport-sync.conf

echo "Copying turntable-loop.service..."
cp ${PROJECT_DIR:-$HOME/optic_sound}/turntable-loop.service /etc/systemd/system/turntable-loop.service

echo "Reloading systemd daemon..."
systemctl daemon-reload

echo "Restarting shairport-sync..."
systemctl restart shairport-sync

echo "Enabling and starting turntable-loop service..."
systemctl enable --now turntable-loop.service

echo "Setup complete! The turntable should now be mixed with the optical output alongside AirPlay."