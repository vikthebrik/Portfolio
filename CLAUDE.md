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
4. **Context Updates (MANDATORY)**: You MUST autonomously update this shared memory `CLAUDE.md` after *every* major feature, bug fix, or phase implementation. Do not wait for the user to ask you to update it; always proactively track the current state, active phase, and completed goals in this file.
## Current Phase: Phase 2 (Warm Analog Aesthetic & Asset-Based Redirection)
- **Status: Completed**
- **Previous:** Phase 1 (Initial Setup & Camera Rig) - *Completed*
- **Implemented:**
  - `@react-three/postprocessing` + `framer-motion` installed
  - `<PostFX />`: DepthOfField (tweens on transition), Bloom, Noise (0.05 opacity), Vignette
  - Warm lighting rig: ambient `#ff9966`, key `#ffd580`, hub point `#ff6600`, rim `#aa44ff`; Environment: `'sunset'`
  - Portal orbs: `clearcoat:1`, saturated pallete (purple/orange/green/amber), stronger hover glow
  - `meshPhysicalMaterial` on HubCore (warm orange, clearcoat) and Ground
  - `src/ui/UIManager.tsx` with `AnimatePresence` — 5 fully distinct HTML overlays:
    - **HUB**: minimal logo + ghost nav
    - **PORTAL_DRONE**: FPV HUD (crosshair, telemetry sidebar, battery, rec timer)
    - **PORTAL_DESIGN**: Bauhaus color-grid + giant display type
    - **PORTAL_TECH**: macOS-style terminal window (monospace, green-on-dark)
    - **PORTAL_RESEARCH**: serif document card (Georgia, off-white)
  - All portal UIs include a back-to-hub control