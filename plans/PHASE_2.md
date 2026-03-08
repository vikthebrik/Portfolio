# Phase 2: Warm Analog Aesthetics & Redirection by Asset

**Target AI:** Claude Sonnet 4.5/4.6
**Context:** Phase 1 established a global `zustand` router (`currentView`) and a GSAP/R3F `<CameraRig />` handling smooth transitions between 5 mock 3D elements (Hub, Tech, Research, Drone, Design). 
**Inspiration Divergence:** Unlike typical clean Next.js 3D portfolios, we are aiming for a **robust, wide breadth, warmer, analog, saturated, detailed, and colorful** experience.

## Objective
Evolve the environment's materials, lighting, and post-processing.
Introduce **"Redirection by Asset"**: Selecting an asset (e.g. Drone) not only moves the camera but immediately replaces the 2D HTML layout with a distinct, themed UI component specifically for that asset.

## Step-by-Step Implementation Instructions

### Step 1: Install Dependencies
- Run `npm install @react-three/postprocessing framer-motion`. 
- (We will use `framer-motion` for fluid mounting/unmounting of the HTML UI overlays).

### Step 2: Analog Post-Processing
- In `src/App.tsx` (or your primary scene file), import `<EffectComposer>`, `<Noise>`, `<Vignette>`, and `<Bloom>` from `@react-three/postprocessing`.
- Add them to the `<Canvas>`.
  - **Noise**: Opacity constraint (e.g., `0.05`), just enough to feel tactile.
  - **Vignette**: Focuses the user towards the center of the viewport.
  - **Bloom**: Low threshold, soft intensity to make highlights (like neon indicators or sun reflections) bleed realistically.
- Add `<DepthOfField />` tied to the active target distance (Bonus if you can tween the focus distance when `isTransitioning === true`).

### Step 3: Warm Lighting & Saturated Materials
- In `<Scene />`, replace default materials with `<meshPhysicalMaterial>` variants.
- Make the materials vibrant, saturated, and distinct. Use properties like `clearcoat: 1`, high `roughness`, and warm base tones.
- Upgrade the `Environment` preset to something warmer (e.g. `'sunset'` or `'apartment'`) to introduce golden-hour or cozy indirect lighting.
- Add an orange point light near the Hub's origin.

### Step 4: The `<UI Router />`
- Create `src/ui/UIManager.tsx`.
- Connect it to `useStore`.
- This component renders over the entire `<Canvas>` using absolutely positioned HTML (or Drei's `<Html fullscreen>`).
- Use `framer-motion`'s `<AnimatePresence>` to mount entirely different React components based on `currentView`:
  - `HUB`: A minimal, classic portfolio overlay (e.g. Logo top left, soft menu).
  - `PORTAL_DRONE`: A high-contrast, technical FPV/Telemetry overlay (battery, pitch/yaw, technical fonts).
  - `PORTAL_DESIGN`: A Bauhaus-style, clean grid layout.
  - `PORTAL_TECH`: A dense, terminal-inspired layout.
  - `PORTAL_RESEARCH`: A muted, document-heavy layout (serif fonts, off-white container).

### Step 5: Tying the Transitions Together
- When `currentView` changes, the `<CameraRig>` flies to the new asset.
- Simultaneously, the old UI fades out and the new UI fades in. 
- *Crucially*: Ensure every specific UI layout contains a button/mechanism to call `setView('HUB')` so the user is never trapped.

## Output Expectations
Implement this logic natively across the existing Phase 1 architecture. Make sure the visual quality feels instantly "warm and analog". The UI redirection should completely break the user out of the default "Portfolio" mindset into a specialized "Application" context for each asset.
