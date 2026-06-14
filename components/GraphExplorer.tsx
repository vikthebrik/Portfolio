'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORIES, type Category } from '@/lib/categories'
import { focusCategory, type Graph } from '@/lib/graph'
import { ForceGraph } from './ForceGraph'
import { Sidebar } from './Sidebar'

const asCategory = (value: string | null): Category | null =>
  value && (CATEGORIES as readonly string[]).includes(value)
    ? (value as Category)
    : null

const readFocusFromUrl = (): Category | null =>
  typeof window === 'undefined'
    ? null
    : asCategory(new URLSearchParams(window.location.search).get('c'))

/**
 * Orchestrates the overview → focused states over one live graph. Focus is held in
 * client state and mirrored to the URL via the native History API (?c=drone) so the
 * graph never remounts and there's no RSC round-trip, while links stay shareable and
 * Back/Forward work. Opening a project is a real navigation to /work/[slug].
 */
export function GraphExplorer({ graph }: { graph: Graph }) {
  const router = useRouter()
  const [focus, setFocusState] = useState<Category | null>(null)

  // Initialize from the URL after mount (avoids SSR/CSR hydration mismatch), and
  // keep in sync when the user uses Back/Forward.
  useEffect(() => {
    setFocusState(readFocusFromUrl())
    const onPop = () => setFocusState(readFocusFromUrl())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const setFocus = useCallback((next: Category | null) => {
    setFocusState(next)
    const url = next ? `/?c=${next}` : '/'
    window.history.pushState(null, '', url)
  }, [])

  const openProject = useCallback(
    (slug: string) => router.push(`/work/${slug}`),
    [router],
  )

  const subgraph = focus ? focusCategory(graph, focus) : graph

  return (
    <div className="flex h-[100dvh] flex-col md:flex-row">
      <aside className="shrink-0 overflow-auto border-line p-5 md:w-72 md:border-r md:bg-surface/40">
        <p className="mb-3 text-xs uppercase tracking-wide text-faint">
          {focus ? `focused · ${focus}` : 'overview'}
        </p>
        <Sidebar graph={graph} focus={focus} onFocus={setFocus} />
      </aside>

      <main className="relative hidden flex-1 md:block">
        <ForceGraph
          graph={subgraph}
          activeFocus={focus}
          onFocusCategory={setFocus}
          onOpenProject={openProject}
        />
      </main>
    </div>
  )
}
