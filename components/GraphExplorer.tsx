'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CATEGORIES, type Category } from '@/lib/categories'
import { ROOT_ID, type Graph, type GraphNode } from '@/lib/graph'
import { chooseDefaultLayout, type LayoutKind } from '@/lib/layouts'
import { ForceGraph, POSITIONS_KEY } from './ForceGraph'
import { useGraphBridge } from './GraphBridge'
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
  projectOpacity: number // root/hubs always on; only projects are dimmable
  folderOpacity: Record<Category, number>
  focusDim: number // 0..1 — per-ring fade of non-cluster nodes during focus/hover
}

const defaultView = (): ViewState => ({
  layout: 'auto',
  projectOpacity: 0.55, // projects recede by default → calmer overview
  folderOpacity: Object.fromEntries(CATEGORIES.map((c) => [c, 1])) as Record<
    Category,
    number
  >,
  focusDim: 0.6, // same-ring peers stay readable; each further ring fades harder
})

/**
 * Drives the one-web model plus the view controls. The full graph is always rendered;
 * selecting a node **re-roots** the layout on it (pins it, rings the web by distance from
 * it, glides the camera to frame it) and softly emphasizes its cluster — the rest fades
 * but stays on screen (no filtering). `center` is synced to the URL as `?focus=<id>`, so
 * browser Back/Forward (and the in-graph ‹ › buttons) traverse the history for free.
 * `view` (layout + per-project opacity) persists to localStorage.
 */
export function GraphExplorer({ graph }: { graph: Graph }) {
  const router = useRouter()
  const bridge = useGraphBridge()
  const [center, setCenterState] = useState<string | null>(null)
  const [view, setView] = useState<ViewState>(defaultView)
  const [query, setQuery] = useState('')
  const [remountKey, setRemountKey] = useState(0)
  const loaded = useRef(false)

  // Init from URL + localStorage after mount (avoids SSR/CSR hydration mismatch).
  useEffect(() => {
    setCenterState(readCenterFromUrl(graph))
    const onPop = () => setCenterState(readCenterFromUrl(graph))
    window.addEventListener('popstate', onPop)
    try {
      const saved = window.localStorage.getItem(VIEW_KEY)
      if (saved) setView({ ...defaultView(), ...JSON.parse(saved) })
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

  const setCenter = useCallback((next: string | null) => {
    setCenterState(next)
    window.history.pushState(
      null,
      '',
      next ? `/?focus=${encodeURIComponent(next)}` : '/',
    )
  }, [])

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
          // First click re-roots on the project; clicking the centered one opens it.
          if (center === node.id) router.push(node.url ?? `/work/${node.id}`)
          else setCenter(node.id)
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
      <aside className="shrink-0 overflow-auto border-line p-5 md:w-72 md:border-r md:bg-surface/40">
        <p className="mb-3 text-xs uppercase tracking-wide text-faint">
          {centerNode ? `rooted · ${centerNode.label}` : 'overview'}
        </p>
        <Sidebar
          graph={graph}
          center={center}
          onCenter={setCenter}
          query={query}
          onQueryChange={setQuery}
        />
      </aside>

      <main className="relative hidden flex-1 md:block">
        <GraphNav graph={graph} center={center} onCenter={setCenter} />
        <ViewControls
          layout={view.layout}
          autoDefault={autoDefault}
          onLayoutChange={(next) => setView((v) => ({ ...v, layout: next }))}
          projectOpacity={view.projectOpacity}
          onProjectOpacityChange={(val) =>
            setView((v) => ({ ...v, projectOpacity: val }))
          }
          folderOpacity={view.folderOpacity}
          onFolderChange={(cat, val) =>
            setView((v) => ({
              ...v,
              folderOpacity: { ...v.folderOpacity, [cat]: val },
            }))
          }
          focusDim={view.focusDim}
          onFocusDimChange={(val) => setView((v) => ({ ...v, focusDim: val }))}
          onResetPositions={resetPositions}
        />
        <ForceGraph
          key={remountKey}
          graph={graph}
          layout={resolvedLayout}
          projectOpacity={view.projectOpacity}
          folderOpacity={view.folderOpacity}
          focusDim={view.focusDim}
          center={center}
          query={query}
          onActivateNode={activateNode}
        />
      </main>
    </div>
  )
}

/**
 * Back/forward + breadcrumb for the re-root history. Back/forward just drive the browser
 * history (Back/Forward keys work identically); the crumb shows the current root and,
 * when a project is centered, an explicit "open" affordance into its case study (since a
 * single click centers rather than opens).
 */
function GraphNav({
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
    <div className="pointer-events-auto absolute left-4 top-4 z-10 flex items-center gap-3 border border-line bg-surface/90 px-2.5 py-1.5 backdrop-blur-sm">
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

      <div className={`${crumb} flex items-center gap-1`}>
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
    </div>
  )
}
