'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORIES, type Category } from '@/lib/categories'
import type { Graph, GraphNode } from '@/lib/graph'
import { chooseDefaultLayout, type LayoutKind } from '@/lib/layouts'
import { ForceGraph, POSITIONS_KEY } from './ForceGraph'
import { Sidebar } from './Sidebar'
import { ViewControls } from './ViewControls'

const asCategory = (value: string | null): Category | null =>
  value && (CATEGORIES as readonly string[]).includes(value)
    ? (value as Category)
    : null

const readFocusFromUrl = (): Category | null =>
  typeof window === 'undefined'
    ? null
    : asCategory(new URLSearchParams(window.location.search).get('c'))

const VIEW_KEY = 'portfolio:graph:view:v1'

type ViewState = {
  layout: 'auto' | LayoutKind
  depthOpacity: number[] // [root, hubs, projects]
  folderOpacity: Record<Category, number>
}

const defaultView = (): ViewState => ({
  layout: 'auto',
  depthOpacity: [1, 0.95, 0.55], // projects recede by default → calmer overview
  folderOpacity: Object.fromEntries(CATEGORIES.map((c) => [c, 1])) as Record<
    Category,
    number
  >,
})

/**
 * Drives the one-web model plus the view controls. The full graph is always rendered;
 * `focus` softly emphasizes a category, and `view` (layout + per-layer opacity) is the
 * manual customization layered on the content-based defaults. Both persist to
 * localStorage; focus also syncs to the URL.
 */
export function GraphExplorer({ graph }: { graph: Graph }) {
  const router = useRouter()
  const [focus, setFocusState] = useState<Category | null>(null)
  const [view, setView] = useState<ViewState>(defaultView)
  const [remountKey, setRemountKey] = useState(0)
  const loaded = useRef(false)

  // Init from URL + localStorage after mount (avoids SSR/CSR hydration mismatch).
  useEffect(() => {
    setFocusState(readFocusFromUrl())
    const onPop = () => setFocusState(readFocusFromUrl())
    window.addEventListener('popstate', onPop)
    try {
      const saved = window.localStorage.getItem(VIEW_KEY)
      if (saved) setView({ ...defaultView(), ...JSON.parse(saved) })
    } catch {
      /* ignore malformed storage */
    }
    loaded.current = true
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Persist view once we've hydrated from storage (so we don't clobber it on mount).
  useEffect(() => {
    if (!loaded.current) return
    window.localStorage.setItem(VIEW_KEY, JSON.stringify(view))
  }, [view])

  const setFocus = useCallback((next: Category | null) => {
    setFocusState(next)
    window.history.pushState(null, '', next ? `/?c=${next}` : '/')
  }, [])

  const activateNode = useCallback(
    (node: GraphNode) => {
      switch (node.type) {
        case 'root':
          setFocus(null)
          break
        case 'category':
          setFocus(focus === node.category ? null : node.category!)
          break
        case 'about':
          router.push(node.url ?? '/about')
          break
        case 'project':
          router.push(node.url ?? `/work/${node.id}`)
          break
      }
    },
    [router, setFocus, focus],
  )

  const resolvedLayout: LayoutKind = useMemo(
    () => (view.layout === 'auto' ? chooseDefaultLayout(graph) : view.layout),
    [view.layout, graph],
  )

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
          {focus ? `focus · ${focus}` : 'overview'}
        </p>
        <Sidebar graph={graph} focus={focus} onFocus={setFocus} />
      </aside>

      <main className="relative hidden flex-1 md:block">
        <ViewControls
          layout={view.layout}
          resolvedLayout={resolvedLayout}
          onLayoutChange={(next) => setView((v) => ({ ...v, layout: next }))}
          depthOpacity={view.depthOpacity}
          onDepthChange={(i, val) =>
            setView((v) => {
              const depthOpacity = [...v.depthOpacity]
              depthOpacity[i] = val
              return { ...v, depthOpacity }
            })
          }
          folderOpacity={view.folderOpacity}
          onFolderChange={(cat, val) =>
            setView((v) => ({
              ...v,
              folderOpacity: { ...v.folderOpacity, [cat]: val },
            }))
          }
          onResetPositions={resetPositions}
        />
        <ForceGraph
          key={remountKey}
          graph={graph}
          layout={resolvedLayout}
          depthOpacity={view.depthOpacity}
          folderOpacity={view.folderOpacity}
          activeFocus={focus}
          onActivateNode={activateNode}
        />
      </main>
    </div>
  )
}
