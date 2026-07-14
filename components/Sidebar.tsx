'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { CATEGORIES, type Category } from '@/lib/categories'
import type { Graph, GraphNode } from '@/lib/graph'

/**
 * Names-only file tree — the accessible, keyboard-navigable mirror of the graph and,
 * on mobile, the entire interface. A search box filters the tree (and highlights the
 * graph via the shared query); below it, a `portfolio` root, the four categories
 * (a chevron collapses/expands its projects, the label re-roots the graph on that
 * hub), each category's projects (links by title, sorted by `order`), and a "how it
 * works" link. `center` is the re-rooted node id (matches the graph); it highlights
 * the current hub/project here too.
 */

const Chevron = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden className={className}>
    <path d="M5 3l6 5-6 5V3z" fill="currentColor" />
  </svg>
)

const FolderIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden className={className}>
    <path
      d="M1.5 3.5A1 1 0 0 1 2.5 2.5h3.4l1.2 1.4h5.4a1 1 0 0 1 1 1v7.1a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1V3.5z"
      fill="currentColor"
    />
  </svg>
)

const Dot = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden className={className}>
    <circle cx="8" cy="8" r="3" fill="currentColor" />
  </svg>
)

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
  const [openCategories, setOpenCategories] = useState<Category[]>([])
  const navRef = useRef<HTMLElement>(null)

  // Auto open the folder for the selected node (and close others)
  useEffect(() => {
    const targetId = activeSlug || center
    if (targetId && targetId !== 'root') {
      const activeProj = graph.nodes.find((n) => n.id === targetId && n.type === 'project')
      const cat = activeProj
        ? (activeProj.category as Category)
        : (CATEGORIES.includes(targetId as Category) ? (targetId as Category) : null)
      if (cat) {
        setOpenCategories([cat])
      }
    } else {
      setOpenCategories([])
    }
  }, [center, activeSlug, graph.nodes])

  // Scroll the selected node into view in the sidebar
  useEffect(() => {
    const timer = setTimeout(() => {
      const activeEl = navRef.current?.querySelector('[aria-current="true"], [aria-current="page"]')
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [center, activeSlug])

  const toggleCollapsed = (category: Category) => {
    setOpenCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    )
  }

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

  const row = (isActive: boolean) =>
    'flex items-center gap-1.5 py-1 ' +
    (isActive ? 'bg-clay-soft/40 text-clay' : 'hover:bg-surface/50 hover:text-clay')

  return (
    <nav ref={navRef} aria-label="Project tree" className="text-sm leading-7">
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
        className={`${row(center === null)} w-full pr-2 text-left`}
      >
        <FolderIcon className="shrink-0" />
        portfolio
      </button>

      <ul className="mt-1">
        {CATEGORIES.map((category) => {
          const projects = projectsIn(category)
          // While searching, hide categories with no matching projects.
          if (q && projects.length === 0) return null

          const containsActive = projects.some(
            (p) => p.id === center || p.id === activeSlug,
          )
          const open = Boolean(q) || category === center || containsActive || openCategories.includes(category)

          return (
            <li key={category} className="mt-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleCollapsed(category)}
                  aria-expanded={open}
                  aria-controls={`sidebar-projects-${category}`}
                  aria-label={`${open ? 'Collapse' : 'Expand'} ${category}`}
                  className="flex h-7 w-5 shrink-0 items-center justify-center text-faint hover:text-clay"
                >
                  <Chevron
                    className={`transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => onCenter(center === category ? null : category)}
                  aria-current={center === category ? 'true' : undefined}
                  className={`${row(center === category)} flex-1 pr-2 text-left`}
                >
                  <FolderIcon className="shrink-0" />
                  {category}
                </button>
              </div>

              <ul id={`sidebar-projects-${category}`} hidden={!open}>
                {projects.map((project) => {
                  const active =
                    project.id === activeSlug || project.id === center
                  return (
                    <li key={project.id}>
                      <Link
                        href={project.url ?? `/work/${project.id}`}
                        aria-current={active ? 'true' : undefined}
                        className={`${row(active)} pl-7 pr-2 ${
                          active ? '' : 'text-muted'
                        }`}
                      >
                        <Dot className="shrink-0" />
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
            <Link href="/about" className={`${row(false)} pl-3 pr-2 text-muted`}>
              <Dot className="shrink-0" />
              about
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
