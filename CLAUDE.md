# Portfolio Hub - Shared Memory & Project Rules

## Project Overview
A high-end 3D Portfolio Hub using React Three Fiber, Antigravity Physics, and GSAP. 
The experience acts as a central Hub with Portals leading to different conceptual sections:
- **Tech**
- **Research**
- **Drone**
- **Design**

## Tech Stack & Dependencies
- React Three Fiber (`@react-three/fiber`)
- React Three Drei (`@react-three/drei`)
- GSAP (`gsap`)
- Antigravity Physics (`antigravity`)
- Three.js (`three`)
- Vite Scaffold (React + TypeScript)

## Roles & Architectures
- **Agent Orchestrator (Orchestrator)**: Focus on high-level architectural planning, asset orchestration, and robust UI/state logic. Model matching: Gemini 3 Pro.
- **R3F Component Expert (3D/Math)**: Dedicated to intricate 3D scene execution, component logic, and complex physics/math. Model matching: Claude Sonnet 4.5/4.6.

## Workflow Rules
1. **Plan Generation**: A Plan Artifact must be produced for each current phase before coding heavily.
2. **Browser Mockup Preview**: Use local dev browser mockups to preview 3D scene changes in real-time.
3. **Terminal Driven**: Run all necessary npm scripts and tasks directly within the integrated terminal.
4. **Context Updates**: Always update this shared memory `CLAUDE.md` after every major feature or phase implementation.

## Current Phase: Phase 1 (Initial Setup & Camera Rig)
- Scaffold Vite environment.
- Install 3D packages (`three`, `three-fiber`, `gsap`, etc.).
- Scaffold Phase 1 conceptual structure (Camera Rig & State Manager).