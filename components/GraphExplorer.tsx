'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ROOT_ID, type Graph, type GraphNode } from '@/lib/graph'
import { INTRO_DONE, INTRO_SEEN_KEY, setIntroActive, shouldRunIntro } from '@/lib/intro'
import { IDENTITY, LINKS } from '@/lib/links'
import { chooseDefaultLayout, type LayoutKind } from '@/lib/layouts'
import { useIsMobile } from '@/lib/viewport'
import { TOGGLE_PALETTE_EVENT } from './CommandPalette'
import { ForceGraph, POSITIONS_KEY } from './ForceGraph'
import { useGraphBridge } from './GraphBridge'
import { IntroOverlay } from './IntroOverlay'
import { Sidebar } from './Sidebar'
import { ViewControls } from './ViewControls'

// The re-rooted center is any node id (root/overview = no param). Validated against the
// live node set so a stale/hand-edited `?focus=` can't wedge the view.
const readCenterFromUrl = (graph: Graph): string | null => {
  if (typeof window === 'undefined') return null
  const v = new URLSearchParams(window.location.search).get('focus')
  if (!v || v === ROOT_ID) return null
  return graph.nodes.some((n) => n.id === v) ? v : null
}

const VIEW_KEY = 'portfolio:graph:view:v1'

type ViewState = {
  layout: 'auto' | LayoutKind
  quietLabels: boolean // hide project labels at overview zoom (appear on zoom/hover/focus)
  muteEdges: boolean // resting edges stay faint until a cluster is emphasized
  cameraNav: boolean // selection glides the camera over a stable web; off = re-root reheat
}

const defaultView = (): ViewState => ({
  layout: 'auto',
  quietLabels: true,
  muteEdges: true,
  cameraNav: true,
})

/**
 * Drives the one-web model plus the view controls. The full graph is always the
 * resting state; the `revealed` set below is the *bloom engine* — empty only while
 * the launch intro's skeleton stage plays, then flipped to every project so they
 * fan out of their hubs (ForceGraph's reveal-sync grows newcomers in place).
 * Selecting a node frames it: by default (camera nav) the web never rearranges — the
 * camera glides + gently zooms to the node's cluster and softly emphasizes it; with
 * camera nav off, selection **re-roots** the layout on the node instead (pins it,
 * rings the web by distance from it). `center` is synced to the URL as `?focus=<id>`,
 * so browser Back/Forward (and the in-graph ‹ › buttons) traverse the history for
 * free. `view` (layout + display toggles) persists to localStorage.
 */
export function GraphExplorer({ graph }: { graph: Graph }) {
  const router = useRouter()
  const bridge = useGraphBridge()
  const isMobile = useIsMobile()
  const [center, setCenterState] = useState<string | null>(null)
  const [view, setView] = useState<ViewState>(defaultView)
  const [query, setQuery] = useState('')
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => new Set())
  const [remountKey, setRemountKey] = useState(0)
  const loaded = useRef(false)

  const allProjects = useMemo(
    () =>
      new Set(graph.nodes.filter((n) => n.type === 'project').map((n) => n.id)),
    [graph],
  )

  const setCenter = useCallback((next: string | null) => {
    setCenterState(next)
    window.history.pushState(
      null,
      '',
      next ? `/?focus=${encodeURIComponent(next)}` : '/',
    )
  }, [])

  // Launch intro (see lib/intro): -1 = pending (first client render, everything
  // hidden — matches the SSR paint, so no hydration mismatch), then either the
  // staged timeline (0 → 1 → 2 → 3) or a straight jump to done.
  const [intro, setIntro] = useState(-1)
  const introTimers = useRef<number[]>([])
  const [hint, setHint] = useState(false)

  const finishIntro = useCallback(
    (showHint: boolean) => {
      for (const t of introTimers.current) window.clearTimeout(t)
      introTimers.current = []
      setIntro(INTRO_DONE)
      setRevealed(allProjects) // fast-forward included: the full web is the end state
      setIntroActive(false)
      if (showHint) setHint(true)
      try {
        window.sessionStorage.setItem(INTRO_SEEN_KEY, '1')
      } catch {
        /* storage blocked — it'll just run again next load */
      }
    },
    [allProjects],
  )

  // Stage 0 is a *launch screen* — it holds until the visitor clicks (the
  // button, or anywhere). Launching releases the frozen sim (stage 1: the web
  // grows out of the button) and the rest of the sequence is timed.
  useEffect(() => {
    if (!shouldRunIntro()) {
      setIntro(INTRO_DONE)
      setRevealed(allProjects) // no intro → the full web, immediately
      return
    }
    setIntroActive(true)
    setIntro(0)
    return () => {
      for (const t of introTimers.current) window.clearTimeout(t)
      setIntroActive(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const launched = useRef(false)
  const launch = useCallback(() => {
    if (launched.current) return
    launched.current = true
    setIntro(1)
    // Stage 1: the skeleton grows slowly out of the button. Stage 2: every project
    // blooms out of its hub (the reveal below) while the chrome fades in. Done is
    // timed past the last project's stagger so nothing snaps mid-growth.
    introTimers.current = [
      window.setTimeout(() => {
        setIntro(2)
        setRevealed(allProjects)
      }, 3000),
      window.setTimeout(() => finishIntro(true), 7400),
    ]
  }, [finishIntro, allProjects])

  // Replay the launch sequence on demand (view panel → "replay intro"): back to
  // blank paper, everything regrows.
  const replayIntro = useCallback(() => {
    setCenter(null)
    setQuery('')
    setHint(false)
    setRevealed(new Set())
    launched.current = false
    setIntroActive(true)
    setIntro(0)
  }, [setCenter])

  // Clicks during the intro: on the launch screen they launch; mid-bloom they
  // fast-forward. The hint retires itself once the visitor does the thing it
  // teaches (or after a few quiet seconds).
  const onIntroPointerDown = () => {
    if (intro === 0) launch()
    else if (intro > 0 && intro < INTRO_DONE) finishIntro(false)
  }
  useEffect(() => {
    if (!hint) return
    const t = window.setTimeout(() => setHint(false), 7000)
    return () => window.clearTimeout(t)
  }, [hint])
  useEffect(() => {
    if (center || query) setHint(false)
  }, [center, query])

  // Init from URL + storage after mount (avoids SSR/CSR hydration mismatch).
  useEffect(() => {
    setCenterState(readCenterFromUrl(graph))
    const onPop = () => setCenterState(readCenterFromUrl(graph))
    window.addEventListener('popstate', onPop)
    try {
      const saved = window.localStorage.getItem(VIEW_KEY)
      if (saved) {
        // Pick fields explicitly: stale keys from the old slider era (opacity,
        // focusDim) must not shadow the now-fixed view tuning.
        const parsed = JSON.parse(saved) as Partial<ViewState>
        const d = defaultView()
        setView({
          layout: parsed.layout ?? d.layout,
          quietLabels: parsed.quietLabels ?? d.quietLabels,
          muteEdges: parsed.muteEdges ?? d.muteEdges,
          cameraNav: parsed.cameraNav ?? d.cameraNav,
        })
      }
    } catch {
      /* ignore malformed storage */
    }
    loaded.current = true
    return () => window.removeEventListener('popstate', onPop)
  }, [graph])

  // Persist view once we've hydrated from storage (so we don't clobber it on mount).
  useEffect(() => {
    if (!loaded.current) return
    window.localStorage.setItem(VIEW_KEY, JSON.stringify(view))
  }, [view])



  // Let the minimap re-root the main graph (it lives outside this tree, in app/layout).
  useEffect(() => {
    if (!bridge) return
    bridge.setCenterHandler(setCenter)
    return () => bridge.setCenterHandler(null)
  }, [bridge, setCenter])

  const activateNode = useCallback(
    (node: GraphNode) => {
      switch (node.type) {
        case 'root':
          setCenter(null)
          break
        case 'category':
          // Toggle: re-root on the hub, or clear back to overview if it's already center.
          setCenter(center === node.id ? null : node.id)
          break
        case 'about':
          router.push(node.url ?? '/about')
          break
        case 'project':
          setCenter(node.id)
          router.push(node.url ?? `/work/${node.id}`)
          break
      }
    },
    [router, setCenter, center],
  )

  const centerNode = useMemo(
    () => (center ? (graph.nodes.find((n) => n.id === center) ?? null) : null),
    [graph, center],
  )

  // What 'auto' resolves to for this content (always shown on the Auto chip) vs. the
  // layout actually rendered (auto's pick, or the manual override).
  const autoDefault: LayoutKind = useMemo(
    () => chooseDefaultLayout(graph),
    [graph],
  )
  const resolvedLayout: LayoutKind =
    view.layout === 'auto' ? autoDefault : view.layout

  const resetPositions = useCallback(() => {
    try {
      window.localStorage.removeItem(POSITIONS_KEY)
    } catch {
      /* ignore */
    }
    setRemountKey((k) => k + 1) // remount ForceGraph → rebuild sim without saved pins
  }, [])

  return (
    <div className="flex h-[100dvh] flex-col md:flex-row">
      {/* Chrome (sidebar, nav, view panel) joins at intro stage 2 — the first
          frames belong to the name and the blooming web. Desktop-only fade: on
          mobile the sidebar IS the interface and the intro never runs. */}
      <aside
        // inert while invisible: the launch screen's only tabstop should be the
        // launch button, not a column of hidden links. (0/1 are client-only
        // stages — SSR renders -1, so no-JS readers get a live sidebar.)
        inert={intro >= 0 && intro < 2 ? true : undefined}
        className={`flex shrink-0 flex-col overflow-auto border-line p-5 transition-opacity duration-700 md:w-72 md:border-r md:bg-surface/40 ${
          intro < 2 ? 'md:pointer-events-none md:opacity-0' : ''
        }`}
      >
        <header className="mb-4 flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-sm text-ink">
              {IDENTITY.name.toLowerCase()}
            </p>
            <p className="mt-1 font-mono text-xs leading-5 text-muted">
              {IDENTITY.tagline}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(TOGGLE_PALETTE_EVENT))}
            aria-label="Open command palette"
            className="shrink-0 border border-line px-2 py-1 font-mono text-xs text-muted hover:text-clay"
          >
            ⌘k
          </button>
        </header>
        {/* Mobile: the graph pane is hidden, so back/forward + breadcrumb live
            here instead — the only place they'd otherwise be unreachable. */}
        <div className="mb-3 flex flex-wrap items-center gap-3 border-b border-line pb-3 md:hidden">
          <BackForwardCrumb graph={graph} center={center} onCenter={setCenter} />
        </div>
        <p className="mb-3 hidden text-xs uppercase tracking-wide text-faint md:block">
          {centerNode ? `rooted · ${centerNode.label}` : 'overview'}
        </p>
        <Sidebar
          graph={graph}
          center={center}
          onCenter={setCenter}
          query={query}
          onQueryChange={setQuery}
        />
        {/* Contact footer — quiet, names-only, same restraint as the tree.
            Bottom padding clears the fixed `>_ terminal` tab (desktop only). */}
        <footer className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-4 font-mono text-xs md:pb-10">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target={l.href.startsWith('mailto:') ? undefined : '_blank'}
              rel="noreferrer noopener"
              className="text-faint hover:text-clay"
            >
              {l.label}
            </a>
          ))}
        </footer>
      </aside>

      <main
        className="relative hidden flex-1 md:block"
        onPointerDownCapture={onIntroPointerDown}
      >
        <IntroOverlay stage={intro} onLaunch={launch} />
        <div
          aria-hidden
          className={`pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 border border-line bg-surface/90 px-3 py-1.5 font-mono text-xs text-muted transition-opacity duration-700 ${
            hint ? 'opacity-100' : 'opacity-0'
          }`}
        >
          click a node to re-center · ⌘k to jump
        </div>
        <div
          inert={intro >= 0 && intro < 2 ? true : undefined}
          className={`transition-opacity duration-700 ${
            intro < 2 ? 'pointer-events-none opacity-0' : ''
          }`}
        >
          <GraphNav graph={graph} center={center} onCenter={setCenter} onReplayIntro={replayIntro} />
          <ViewControls
            layout={view.layout}
            autoDefault={autoDefault}
            cameraNav={view.cameraNav}
            onLayoutChange={(next) => setView((v) => ({ ...v, layout: next }))}
            onToggleCameraNav={(next) => setView((v) => ({ ...v, cameraNav: next }))}
            onResetPositions={resetPositions}
            onReplayIntro={replayIntro}
          />
        </div>
        {/* <main> is already hidden below md; skip mounting the simulation
            entirely on mobile so its rAF tick loop doesn't run while invisible. */}
        {!isMobile && (
          <ForceGraph
            key={remountKey}
            graph={graph}
            layout={resolvedLayout}
            quietLabels={view.quietLabels}
            muteEdges={view.muteEdges}
            cameraNav={view.cameraNav}
            center={center}
            query={query}
            intro={intro}
            revealed={revealed}
            onActivateNode={activateNode}
          />
        )}
      </main>
    </div>
  )
}

/**
 * Back/forward + breadcrumb for the re-root history. Back/forward just drive the browser
 * history (Back/Forward keys work identically); the crumb shows the current root and,
 * when a project is centered, an explicit "open" affordance into its case study (since a
 * single click centers rather than opens). No positioning classes of its own — callers
 * (the desktop floating GraphNav, and the mobile crumb inside <aside>) wrap it differently.
 */
function BackForwardCrumb({
  graph,
  center,
  onCenter,
}: {
  graph: Graph
  center: string | null
  onCenter: (id: string | null) => void
}) {
  const node = center ? (graph.nodes.find((n) => n.id === center) ?? null) : null
  const crumb = 'font-mono text-xs'
  const btn = 'text-muted hover:text-clay'

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => window.history.back()}
          aria-label="Back"
          className={`${btn} px-1 text-base leading-none`}
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => window.history.forward()}
          aria-label="Forward"
          className={`${btn} px-1 text-base leading-none`}
        >
          ›
        </button>
      </div>

      <div className={`${crumb} flex flex-wrap items-center gap-1`}>
        <button type="button" onClick={() => onCenter(null)} className={btn}>
          overview
        </button>
        {node?.type === 'category' && (
          <>
            <span className="text-faint">›</span>
            <span className="text-clay">{node.label}</span>
          </>
        )}
        {node?.type === 'project' && (
          <>
            <span className="text-faint">›</span>
            {node.category && (
              <button
                type="button"
                onClick={() => onCenter(node.category!)}
                className={btn}
              >
                {node.category}
              </button>
            )}
            <span className="text-faint">›</span>
            <span className="text-clay">{node.label}</span>
          </>
        )}
      </div>

      {node?.type === 'project' && (
        <Link
          href={node.url ?? `/work/${node.id}`}
          className="font-mono text-xs text-clay hover:underline"
        >
          open ↵
        </Link>
      )}
    </>
  )
}

/** Desktop-only floating wrapper around BackForwardCrumb, plus the replay-intro control. */
function GraphNav({
  graph,
  center,
  onCenter,
  onReplayIntro,
}: {
  graph: Graph
  center: string | null
  onCenter: (id: string | null) => void
  onReplayIntro: () => void
}) {
  return (
    <div className="pointer-events-auto absolute left-4 top-4 z-10 flex items-center gap-3 border border-line bg-surface/90 px-2.5 py-1.5 backdrop-blur-sm">
      <BackForwardCrumb graph={graph} center={center} onCenter={onCenter} />

      <div className="h-3 w-px bg-line" />
      <button
        type="button"
        onClick={onReplayIntro}
        title="Replay intro animation"
        aria-label="Replay intro animation"
        className="font-mono text-xs text-muted hover:text-clay flex items-center gap-1 cursor-pointer"
      >
        <span>⟲</span>
        <span className="hidden sm:inline">replay</span>
      </button>
    </div>
  )
}
