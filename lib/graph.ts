import { projects } from '#site/content'
import { CATEGORIES, type Category } from '@/lib/categories'

/**
 * The ONLY place nodes/edges are built. Keep this pure and deterministic so the
 * graph is fully derived from content (see CLAUDE.md). Adding a project file is
 * the only action needed to grow the network.
 */

export type GraphNode = {
  id: string // slug for projects, category name for hubs
  label: string
  type: 'category' | 'project'
  category: Category
  url?: string
  featured: boolean
  degree: number // populated after edges are built; drives node size
}

export type EdgeKind = 'membership' | 'related' | 'tag'

export type GraphEdge = {
  source: string
  target: string
  kind: EdgeKind
  weight: number // membership 1.0, related 0.6, tag 0.2 — tune in the sim
}

export type Graph = { nodes: GraphNode[]; edges: GraphEdge[] }

const undirectedKey = (a: string, b: string) => [a, b].sort().join('::')

export function buildGraph(): Graph {
  const nodeMap = new Map<string, GraphNode>()
  const edgeMap = new Map<string, GraphEdge>()

  // 1. Hub nodes, one per category.
  for (const category of CATEGORIES) {
    nodeMap.set(category, {
      id: category,
      label: category,
      type: 'category',
      category,
      featured: false,
      degree: 0,
    })
  }

  // 2. Project nodes + membership edges to their category hub.
  for (const p of projects) {
    nodeMap.set(p.slug, {
      id: p.slug,
      label: p.title,
      type: 'project',
      category: p.category,
      url: p.url,
      featured: p.featured,
      degree: 0,
    })

    const key = undirectedKey(p.slug, p.category)
    edgeMap.set(key, {
      source: p.slug,
      target: p.category,
      kind: 'membership',
      weight: 1.0,
    })
  }

  // 3. Explicit related edges (project <-> project). Highest priority: if a tag
  //    edge would duplicate one of these, the related edge wins.
  for (const p of projects) {
    for (const relatedSlug of p.related) {
      if (!nodeMap.has(relatedSlug)) continue // ignore dangling references
      const key = undirectedKey(p.slug, relatedSlug)
      edgeMap.set(key, {
        source: p.slug,
        target: relatedSlug,
        kind: 'related',
        weight: 0.6,
      })
    }
  }

  // 4. Faint shared-tag edges — these create the dense "complex network" on load.
  //    Skip pairs already linked by a related edge.
  const byTag = new Map<string, string[]>()
  for (const p of projects) {
    for (const tag of p.tags) {
      const list = byTag.get(tag) ?? []
      list.push(p.slug)
      byTag.set(tag, list)
    }
  }
  for (const slugs of byTag.values()) {
    for (let i = 0; i < slugs.length; i++) {
      for (let j = i + 1; j < slugs.length; j++) {
        const key = undirectedKey(slugs[i], slugs[j])
        if (edgeMap.has(key)) continue // don't overwrite membership/related
        edgeMap.set(key, {
          source: slugs[i],
          target: slugs[j],
          kind: 'tag',
          weight: 0.2,
        })
      }
    }
  }

  // 5. Degree pass — node size in the render reflects connectedness.
  const edges = [...edgeMap.values()]
  for (const e of edges) {
    nodeMap.get(e.source)!.degree++
    nodeMap.get(e.target)!.degree++
  }

  return { nodes: [...nodeMap.values()], edges }
}

/** Subgraph for the `focused` state: one category hub + its projects + their edges. */
export function focusCategory(graph: Graph, category: Category): Graph {
  const keep = new Set(
    graph.nodes
      .filter((n) => n.category === category)
      .map((n) => n.id),
  )
  return {
    nodes: graph.nodes.filter((n) => keep.has(n.id)),
    edges: graph.edges.filter((e) => keep.has(e.source) && keep.has(e.target)),
  }
}
