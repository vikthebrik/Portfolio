import { create } from 'zustand'

// ── View identifiers ──────────────────────────────────────────────────────────
export type ViewId =
  | 'HUB'
  | 'PORTAL_TECH'
  | 'PORTAL_RESEARCH'
  | 'PORTAL_DRONE'
  | 'PORTAL_DESIGN'

// ── Store shape ───────────────────────────────────────────────────────────────
interface StoreState {
  currentView: ViewId
  isTransitioning: boolean
  setView: (view: ViewId) => void
}

// ── Store ─────────────────────────────────────────────────────────────────────
const useStore = create<StoreState>((set) => ({
  currentView: 'HUB',
  isTransitioning: false,

  setView: (view) => {
    set({ isTransitioning: true, currentView: view })
    // Clear the transitioning flag after the camera rig finishes lerping (~1.2 s)
    setTimeout(() => set({ isTransitioning: false }), 1200)
  },
}))

export default useStore
