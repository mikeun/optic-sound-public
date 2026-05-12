# Optic Sound: Agentic Audio Bridge

![Mixing Desk](frontend/public/Screenshot%20Mixer.png)
![10-Band EQ](frontend/public/Screenshot%20EQ.png)
![System Diagnostics](frontend/public/Screenshot%20System.png)

[Download Agent Reconstruction Manual (PDF)](Agent_Reconstruction_Manual.pdf) | [Read Manual (Markdown)](Agent_Reconstruction_Manual.md)

Optic Sound is a high-fidelity hardware bridge
 designed to unify physical USB Turntables and AirPlay into a single, web-controllable audio chain with integrated DSP (10-band EQ).

This project serves as the reference implementation for the **"Agent Reconstruction Manual"**.

## Quick Start (Public v1)

### 1. Prerequisites
- Linux (Ubuntu/Debian recommended)
- ALSA utilities (alsa-utils)
- Docker & Docker Compose
- Node.js & Python 3.12

### 2. Hardware Configuration
1. Identify your audio cards:
   aplay -l
2. Update asound.conf: Replace CARD_ID with your specific hardware indices.
3. Run the setup script:
   ./setup_turntable_audio.sh

### 3. Environment Setup
Copy the example environment files and fill in your local configuration:
cp backend/.env.example backend/.env
cp docker/.env.example docker/.env

### 4. Launch with Docker
docker-compose -f docker/docker-compose.yml up --build

## Agent Reconstruction Manual
This codebase is a living example of agent-driven software engineering. Each module corresponds to a chapter in the manual:
- ALSA & Hardware: Chapter 2
- FastAPI Backend: Chapter 3
- React Frontend: Chapter 4
- Agentic Workspaces: Chapter 6

## Project Navigation

### Modules & Structure
- [backend/](backend/) - FastAPI application logic and hardware bridge.
- [frontend/](frontend/) - React (Vite) tactile console.
- [docker/](docker/) - Containerization and production orchestration.
- [diagnostics/](diagnostics/) - Logic-vs-Physics verification scripts.
- [book/](book/) - Source files for the Agent Reconstruction Manual.

### The Agent Reconstruction Manual
- [Full Index](book/index.md)
- [Chapter 1: Foundations](book/chapter_1_foundations.md)
- [Chapter 2: ALSA Engineering](book/chapter_2_alsa.md)
- [Chapter 3: Backend Bridge](book/chapter_3_backend.md)
- [Chapter 4: Frontend UX](book/chapter_4_frontend.md)
- [Chapter 5: Deployment & Portability](book/chapter_5_deployment.md)
- [Chapter 6: Agentic Workspace](book/chapter_6_agentic_workspace.md)
- [Chapter 7: Testing & Validation](book/chapter_7_testing.md)

### Core Documentation
- [User Manual](USER_MANUAL.md) - Operational guide for the web console.
- [Project Summary](SUMMARY.md) - Short-term memory & current architecture.
- [Progress Log](PROGRESS.md) - Long-term memory & lessons learned.
- [Experience-Driven Plan](PLAN.md) - The architectural roadmap.
- [Gemini Mandates](GEMINI.md) - Agentic workflow rules.
- [Design Flows](DESIGN_FLOWS.md) - Visual and technical logic maps.
- [Turntable Guide](README_TURNTABLE.md) - Physical hardware setup specifics.

### Administrative & Legal
- [Contributing](CONTRIBUTING.md) - Guidelines for readers.
- [Web Interface Plan](PLAN_WEB_INTERFACE.md) - Frontend design document.
- [Book Plan](BOOK_PLAN_AUDIOPHILE_CONSOLE.md) - Authoring roadmap.
- [License](LICENSE) - Proprietary legal notice.

## License
This project is proprietary - All Rights Reserved - see the LICENSE file for details.

---
*Maintained by @mikeun*
