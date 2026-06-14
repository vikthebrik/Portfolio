'use client'

import Link from 'next/link'
import { CATEGORIES, type Category } from '@/lib/categories'
import type { Graph, GraphNode } from '@/lib/graph'

/**
 * ASCII folder-tree sidebar. Mirrors the current location and is the accessible,
 * keyboard-navigable path through everything (CLAUDE.md): a real <nav>/<ul> of
 * <button>s (focus a category) and <Link>s (open a project). The box-drawing
 * connectors (├── └── │) are decorative and aria-hidden. On mobile this is the
 * entire interface — the force graph is hidden.
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
  /** Highlight a project (used when a case study is open). */
  activeSlug?: string
}) {
  const projectsByCategory = (category: Category): GraphNode[] =>
    graph.nodes.filter((n) => n.type === 'project' && n.category === category)

  return (
    <nav aria-label="Project tree" className="text-sm leading-6">
      <ul>
        <li>
          <button
            type="button"
            onClick={() => onFocus(null)}
            aria-current={focus === null ? 'true' : undefined}
            className={
              focus === null ? 'text-clay' : 'text-ink hover:text-clay'
            }
          >
            portfolio
          </button>

          <ul>
            {CATEGORIES.map((category, ci) => {
              const lastCategory = ci === CATEGORIES.length - 1
              const projects = projectsByCategory(category)
              return (
                <li key={category}>
                  <span className="flex items-baseline whitespace-pre">
                    <Connector>{lastCategory ? '└── ' : '├── '}</Connector>
                    <button
                      type="button"
                      onClick={() => onFocus(category)}
                      aria-current={focus === category ? 'true' : undefined}
                      className={
                        focus === category
                          ? 'text-clay'
                          : 'text-ink hover:text-clay'
                      }
                    >
                      {category}
                    </button>
                  </span>

                  <ul>
                    {projects.map((project, pi) => {
                      const lastProject = pi === projects.length - 1
                      const guide = lastCategory ? '    ' : '│   '
                      const leaf = lastProject ? '└── ' : '├── '
                      const isActive = project.id === activeSlug
                      return (
                        <li key={project.id}>
                          <span className="flex items-baseline whitespace-pre">
                            <Connector>{guide + leaf}</Connector>
                            <Link
                              href={project.url ?? `/work/${project.id}`}
                              aria-current={isActive ? 'page' : undefined}
                              className={
                                isActive
                                  ? 'text-clay'
                                  : 'text-muted hover:text-clay'
                              }
                            >
                              {project.id}
                            </Link>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              )
            })}
          </ul>
        </li>
      </ul>
    </nav>
  )
}

function Connector({ children }: { children: string }) {
  return (
    <span aria-hidden className="text-faint select-none">
      {children}
    </span>
  )
}
