'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORIES, type Category } from '@/lib/categories'
import type { Graph, GraphNode } from '@/lib/graph'
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
 * Drives the one-web model. The full graph is always rendered; `focus` (a category) is
 * a soft emphasis — it dims the unrelated nodes, it does NOT filter them. Focus is
 * mirrored to the URL as ?c=<category> via the History API (shareable, Back/Forward
 * work) without remounting the graph. Activating a node routes by node type.
 */
export function GraphExplorer({ graph }: { graph: Graph }) {
  const router = useRouter()
  const [focus, setFocusState] = useState<Category | null>(null)

  useEffect(() => {
    setFocusState(readFocusFromUrl())
    const onPop = () => setFocusState(readFocusFromUrl())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

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
          // toggle: clicking the focused category again clears focus
          setFocusState((prev) => {
            const next = prev === node.category ? null : node.category!
            window.history.pushState(null, '', next ? `/?c=${next}` : '/')
            return next
          })
          break
        case 'about':
          router.push(node.url ?? '/about')
          break
        case 'project':
          router.push(node.url ?? `/work/${node.id}`)
          break
      }
    },
    [router, setFocus],
  )

  return (
    <div className="flex h-[100dvh] flex-col md:flex-row">
      <aside className="shrink-0 overflow-auto border-line p-5 md:w-72 md:border-r md:bg-surface/40">
        <p className="mb-3 text-xs uppercase tracking-wide text-faint">
          {focus ? `focus · ${focus}` : 'overview'}
        </p>
        <Sidebar graph={graph} focus={focus} onFocus={setFocus} />
      </aside>

      <main className="relative hidden flex-1 md:block">
        <ForceGraph
          graph={graph}
          activeFocus={focus}
          onActivateNode={activateNode}
        />
      </main>
    </div>
  )
}
