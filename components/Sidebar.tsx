'use client'

import Link from 'next/link'
import { CATEGORIES, type Category } from '@/lib/categories'
import type { Graph, GraphNode } from '@/lib/graph'

/**
 * Names-only file tree — the accessible, keyboard-navigable mirror of the graph and,
 * on mobile, the entire interface. A search box filters the tree (and highlights the
 * graph via the shared query); below it, a `portfolio` root, the four categories
 * (buttons that set soft focus), each category's projects (links by title, sorted by
 * `order`), and a "how it works" link.
 */
export function Sidebar({
  graph,
  focus,
  onFocus,
  query,
  onQueryChange,
  activeSlug,
}: {
  graph: Graph
  focus: Category | null
  onFocus: (category: Category | null) => void
  query: string
  onQueryChange: (value: string) => void
  activeSlug?: string
}) {
  const q = query.trim().toLowerCase()
  const matches = (n: GraphNode) =>
    !q ||
    n.label.toLowerCase().includes(q) ||
    (n.tags?.some((t) => t.toLowerCase().includes(q)) ?? false)

  const projectsIn = (category: Category): GraphNode[] =>
    graph.nodes
      .filter(
        (n) => n.type === 'project' && n.category === category && matches(n),
      )
      .sort(
        (a, b) =>
          (a.order ?? Number.POSITIVE_INFINITY) -
            (b.order ?? Number.POSITIVE_INFINITY) ||
          a.label.localeCompare(b.label),
      )

  return (
    <nav aria-label="Project tree" className="text-sm leading-7">
      <input
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="search"
        aria-label="Search projects"
        className="mb-3 w-full border border-line bg-paper px-2 py-1 text-sm text-ink placeholder:text-faint"
      />

      <button
        type="button"
        onClick={() => onFocus(null)}
        aria-current={focus === null ? 'true' : undefined}
        className={focus === null ? 'text-clay' : 'text-ink hover:text-clay'}
      >
        portfolio
      </button>

      <ul className="mt-1">
        {CATEGORIES.map((category) => {
          const projects = projectsIn(category)
          // While searching, hide categories with no matching projects.
          if (q && projects.length === 0) return null
          return (
            <li key={category} className="mt-1">
              <button
                type="button"
                onClick={() => onFocus(category)}
                aria-current={focus === category ? 'true' : undefined}
                className={
                  'pl-3 ' +
                  (focus === category ? 'text-clay' : 'text-ink hover:text-clay')
                }
              >
                {category}
              </button>

              <ul>
                {projects.map((project) => (
                  <li key={project.id}>
                    <Link
                      href={project.url ?? `/work/${project.id}`}
                      aria-current={
                        project.id === activeSlug ? 'page' : undefined
                      }
                      className={
                        'block pl-7 ' +
                        (project.id === activeSlug
                          ? 'text-clay'
                          : 'text-muted hover:text-clay')
                      }
                    >
                      {project.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          )
        })}

        {!q && (
          <li className="mt-1">
            <Link href="/about" className="block pl-3 text-ink hover:text-clay">
              how it works
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
