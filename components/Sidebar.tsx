'use client'

import Link from 'next/link'
import { CATEGORIES, type Category } from '@/lib/categories'
import type { Graph, GraphNode } from '@/lib/graph'

/**
 * Names-only file tree — the accessible, keyboard-navigable mirror of the graph and,
 * on mobile, the entire interface. Plain indented <nav>/<ul> of project titles: a
 * `portfolio` root, the four categories (buttons that set soft focus), a "how it
 * works" link, and each category's projects (links by title, sorted by `order`).
 */
export function Sidebar({
  graph,
  focus,
  onFocus,
  activeSlug,
}: {
  graph: Graph
  focus: Category | null
  onFocus: (category: Category | null) => void
  activeSlug?: string
}) {
  const projectsIn = (category: Category): GraphNode[] =>
    graph.nodes
      .filter((n) => n.type === 'project' && n.category === category)
      .sort(
        (a, b) =>
          (a.order ?? Number.POSITIVE_INFINITY) -
            (b.order ?? Number.POSITIVE_INFINITY) ||
          a.label.localeCompare(b.label),
      )

  return (
    <nav aria-label="Project tree" className="text-sm leading-7">
      <button
        type="button"
        onClick={() => onFocus(null)}
        aria-current={focus === null ? 'true' : undefined}
        className={focus === null ? 'text-clay' : 'text-ink hover:text-clay'}
      >
        portfolio
      </button>

      <ul className="mt-1">
        {CATEGORIES.map((category) => (
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
              {projectsIn(category).map((project) => (
                <li key={project.id}>
                  <Link
                    href={project.url ?? `/work/${project.id}`}
                    aria-current={project.id === activeSlug ? 'page' : undefined}
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
        ))}

        <li className="mt-1">
          <Link href="/about" className="block pl-3 text-ink hover:text-clay">
            how it works
          </Link>
        </li>
      </ul>
    </nav>
  )
}
