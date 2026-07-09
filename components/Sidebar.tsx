'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { CATEGORIES, type Category } from '@/lib/categories'
import type { Graph, GraphNode } from '@/lib/graph'

/**
 * Names-only file tree — the accessible, keyboard-navigable mirror of the graph and,
 * on mobile, the entire interface. A search box filters the tree (and highlights the
 * graph via the shared query); below it, a `portfolio` root, the four categories
 * (buttons that re-root the graph on that hub), each category's projects (links by
 * title, sorted by `order`), and a "how it works" link. `center` is the re-rooted node
 * id (matches the graph); it highlights the current hub/project here too.
 */
export function Sidebar({
  graph,
  center,
  onCenter,
  query,
  onQueryChange,
  activeSlug,
}: {
  graph: Graph
  center: string | null
  onCenter: (id: string | null) => void
  query: string
  onQueryChange: (value: string) => void
  activeSlug?: string
}) {
  const q = query.trim().toLowerCase()

  // Skills strip — the recurring tags across projects, straight from frontmatter
  // (auto-derived, like everything else). Each chip is a canned search: clicking
  // it drives the shared query, so the graph lights every project carrying the
  // skill — proficiency shown as evidence, not claimed with meters.
  const skills = useMemo(() => {
    const counts = new Map<string, number>()
    for (const n of graph.nodes) {
      if (n.type !== 'project') continue
      for (const t of n.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1)
    }
    return [...counts.entries()]
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10)
  }, [graph])

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

      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-0.5">
        {skills.map(([tag, count]) => (
          <button
            key={tag}
            type="button"
            onClick={() => onQueryChange(q === tag ? '' : tag)}
            aria-pressed={q === tag}
            title={`${count} projects`}
            className={
              'font-mono text-xs leading-6 ' +
              (q === tag ? 'text-clay' : 'text-faint hover:text-clay')
            }
          >
            #{tag}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onCenter(null)}
        aria-current={center === null ? 'true' : undefined}
        className={center === null ? 'text-clay' : 'text-ink hover:text-clay'}
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
                onClick={() => onCenter(center === category ? null : category)}
                aria-current={center === category ? 'true' : undefined}
                className={
                  'pl-3 ' +
                  (center === category ? 'text-clay' : 'text-ink hover:text-clay')
                }
              >
                {category}
              </button>

              <ul>
                {projects.map((project) => {
                  const active =
                    project.id === activeSlug || project.id === center
                  return (
                    <li key={project.id}>
                      <Link
                        href={project.url ?? `/work/${project.id}`}
                        aria-current={
                          project.id === activeSlug ? 'page' : undefined
                        }
                        className={
                          'block pl-7 ' +
                          (active ? 'text-clay' : 'text-muted hover:text-clay')
                        }
                      >
                        {project.label}
                      </Link>
                    </li>
                  )
                })}
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
