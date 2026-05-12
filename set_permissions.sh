#!/bin/bash
# Enforce ownership and setgid bit for the optic_sound project

PROJECT_DIR="${PROJECT_DIR:-$HOME/optic_sound}"
# Identify the current user and their primary group
USER=$(whoami)
GROUP=$(id -gn)

echo "Applying ownership to $USER:$GROUP..."
sudo chown -R $USER:$GROUP $PROJECT_DIR

echo "Setting setgid bit on directories..."
find $PROJECT_DIR -type d -exec chmod g+s {} +

echo "Setting default permissions (rw-rw-r--)..."
find $PROJECT_DIR -type d -exec chmod 2775 {} +
find $PROJECT_DIR -type f -exec chmod 664 {} +

# Make scripts executable
chmod +x $PROJECT_DIR/*.sh

echo "Ownership and permissions have been enforced."
