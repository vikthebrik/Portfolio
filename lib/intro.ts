'use client'

import { useSyncExternalStore } from 'react'

/**
 * The launch intro — shared state for the first-visit assembly sequence.
 *
 * The graph doesn't get a splash page; it *assembles*: name types over blank
 * paper, then the web blooms out of the root in layer order (see GraphExplorer,
 * which owns the timeline). This module holds what the rest of the app needs:
 * the run/skip predicate, and a tiny external store so global chrome mounted
 * outside the explorer's tree (minimap, terminal tab) can hide while it runs.
 *
 * Stages: -1 pending (deciding, everything hidden) → 0 name types → 1 the
 * skeleton (root + hubs + about) grows slowly out of the launch button →
 * 2 every project blooms out of its hub (the `revealed` set in GraphExplorer
 * flips to all) while the chrome fades in → 3 done. 3 is also the skip state —
 * reduced motion, mobile, deep links, and repeat visits this session all jump
 * straight there (full web, no animation).
 */

export const INTRO_SEEN_KEY = 'portfolio:intro:seen:v1'
export const INTRO_DONE = 3
// The launch button's root-node circle. ForceGraph measures it to seed the bloom
// exactly there, so the button visibly *becomes* the root node.
export const INTRO_BUTTON_ID = 'intro-launch-node'

export function shouldRunIntro(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  // On mobile the graph pane is hidden — the sidebar is the interface; no stage.
  if (window.matchMedia('(max-width: 767px)').matches) return false
  // Deep links came for a specific node, not a welcome.
  if (new URLSearchParams(window.location.search).get('focus')) return false
  try {
    if (window.sessionStorage.getItem(INTRO_SEEN_KEY)) return false
  } catch {
    /* storage blocked — run it; worst case it repeats */
  }
  return true
}

// --- external store: is the intro currently running? -------------------------
// null = the explorer hasn't broadcast yet; consumers fall back to predicting
// it themselves (main page + shouldRunIntro), so chrome that mounts before the
// explorer's first broadcast still starts hidden instead of flashing.
let active: boolean | null = null
const listeners = new Set<() => void>()

export function setIntroActive(value: boolean) {
  active = value
  for (const l of listeners) l()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
const getSnapshot = () =>
  active ?? (window.location.pathname === '/' && shouldRunIntro())
const getServerSnapshot = () => false

/** True while the assembly intro is running — global chrome hides itself. */
export function useIntroActive(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
