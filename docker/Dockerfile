# --- Stage 1: Build & Test Frontend ---
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Run Frontend Tests
RUN npm test
# Build Production Bundle
RUN npm run build

# --- Stage 2: Final Production Image ---
FROM python:3.12-slim

# Install ALSA utilities, plugins, and systemd for host control
RUN apt-get update && apt-get install -y \
    alsa-utils \
    libasound2-plugin-equal \
    sudo \
    dbus \
    systemd \
    && rm -rf /var/lib/apt/lists/*

# Set environment to talk to host systemd via mounted dbus
ENV DBUS_SYSTEM_BUS_ADDRESS=unix:path=/var/run/dbus/system_bus_socket

WORKDIR /app

# Copy Backend
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

COPY backend/ ./backend/

# Run Backend Tests before final image is prepared
ENV PYTHONPATH=/app
RUN pytest backend/tests/

# Copy Build Frontend
COPY --from=frontend-builder /app/frontend/dist ./static

# Expose port (informational)
EXPOSE 8000

# Command to run the application
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${APP_PORT:-8000}"]
