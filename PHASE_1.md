# Phase 1: The Camera Rig & State Manager

**Target AI:** Claude Sonnet 4.5/4.6
**Context:** We are building a high-end 3D Portfolio Hub using React Three Fiber, Antigravity Physics, and GSAP. Our workspace is already scaffolded as a React TypeScript Vite app with the necessary 3D dependencies (`three`, `@react-three/fiber`, `@react-three/drei`, `gsap`, `antigravity`).

## Objective
Establish the foundational 3D scene architecture. Focus on building a robust global state manager and a responsive camera rig to navigate the central Hub and transition to the four Portals (Tech, Research, Drone, Design).

## Step-by-Step Implementation Instructions

### Step 1: Global State Setup
- Install `zustand`. (Run `npm install zustand` in the terminal).
- Create `src/store/useStore.ts`.
- Set up a Zustand store with the following state:
  - `currentView`: string (`'HUB'`, `'PORTAL_TECH'`, `'PORTAL_RESEARCH'`, `'PORTAL_DRONE'`, `'PORTAL_DESIGN'`).
  - `isTransitioning`: boolean.
  - `setView(view: string)`: function to update the view.

### Step 2: Main Canvas & Base Scene
- Clear out the Vite boilerplate in `src/App.tsx`.
- Set up the R3F `<Canvas>` taking up to 100vh and 100vw.
- Add basic premium lighting (Ambient, Directional) and an `<Environment preset="city" />` from `@react-three/drei`.
- Create a base `<Scene />` component to house the objects.

### Step 3: Portal Nodes & Hub Design
- Create `src/components/Portal.tsx`.
- The Portal component should accept props like `name`, `position`, `color` to map out the 4 sections.
- Lay them out around the center conceptually (e.g., at `[x, 0, z]` coordinates around the origin `[0,0,0]`).
- Place a central Hub element representing the user's origin at `[0,0,0]`.
- Add pointer events (`onPointerOver`, `onClick`) to the Portals. When clicked, it should trigger `setView('PORTAL_NAME')` in the Zustand store.

### Step 4: The Camera Rig (`components/CameraRig.tsx`)
- Create `src/components/CameraRig.tsx`.
- Import `useFrame` from `@react-three/fiber`.
- Access the `currentView` from `useStore`.
- Based on the `currentView`, define target `position` and `lookAt` vectors for the camera.
  - E.g. If `'HUB'`, position is slightly elevated and back, looking at origin.
  - If `'PORTAL_TECH'`, position the camera intimately close to the Tech portal, looking at it.
- Use GSAP or `three/src/math/MathUtils.damp` (or custom dampening) inside `useFrame` to smoothly interpolate `state.camera.position` and `state.camera.updateProjectionMatrix()` when transitioning.
- Ensure the movement feels dynamic and buttery smooth.

### Step 5: Global UI Overlay
- Create an HTML UI overlay over the `<Canvas>`.
- If `currentView !== 'HUB'`, show a "Back to Hub" `<button>` fixed to the top left or bottom center.
- Clicking the button triggers `setView('HUB')`, initiating the camera rig to fly back to the origin.

## Output Expectations
Please write and apply these files. Ensure the code is production-ready, typed correctly in TS, and implements smooth 3D transitions.
