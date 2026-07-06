import { projects } from '#site/content'
import { CATEGORIES, type Category } from '@/lib/categories'

/**
 * The ONLY place nodes/edges are built. Keep this pure and deterministic.
 *
 * Project nodes are derived 1:1 from MDX frontmatter (see CLAUDE.md). The few
 * STRUCTURAL nodes — the `root` landing node, the four `category` hubs, and the
 * `about` ("how it works") node — are defined here in code. Together they form one
 * connected web: root is the center, with five spokes (4 hubs + about); projects hang
 * off their hub; related/tag edges cross-link the categories.
 */

export const ROOT_ID = 'root'
export const ABOUT_ID = 'how-it-works'

export type NodeType = 'root' | 'category' | 'project' | 'about'

export type GraphNode = {
  id: string // slug for projects; 'root' / category name / 'how-it-works' otherwise
  label: string
  type: NodeType
  category?: Category // undefined for root + about
  url?: string
  featured: boolean
  pinned: boolean // force-show (manual override)
  order?: number // manual sort within a category
  degree: number // populated after edges are built; drives node size
  layer: number // BFS depth from root (0 root, 1 hubs+about, 2 projects); drives layout rings + per-layer opacity
}

export type EdgeKind = 'spoke' | 'membership' | 'related' | 'tag'

export type GraphEdge = {
  source: string
  target: string
  kind: EdgeKind
  weight: number // spoke 1.0, membership 0.9, related 0.6, tag 0.2 — tune in the sim
}

export type Graph = { nodes: GraphNode[]; edges: GraphEdge[] }

const undirectedKey = (a: string, b: string) => [a, b].sort().join('::')

export function buildGraph(): Graph {
  const nodeMap = new Map<string, GraphNode>()
  const edgeMap = new Map<string, GraphEdge>()

  // 0. Root node — the landing, center of the web.
  nodeMap.set(ROOT_ID, {
    id: ROOT_ID,
    label: 'portfolio',
    type: 'root',
    url: '/',
    featured: false,
    pinned: true,
    degree: 0,
    layer: 0,
  })

  // 1. Hub nodes, one per category, plus a spoke from root.
  for (const category of CATEGORIES) {
    nodeMap.set(category, {
      id: category,
      label: category,
      type: 'category',
      category,
      featured: false,
      pinned: false,
      degree: 0,
      layer: 1,
    })
    edgeMap.set(undirectedKey(ROOT_ID, category), {
      source: ROOT_ID,
      target: category,
      kind: 'spoke',
      weight: 1.0,
    })
  }

  // 2. "How it works" structural node — the fifth spoke, routes to /about.
  nodeMap.set(ABOUT_ID, {
    id: ABOUT_ID,
    label: 'how it works',
    type: 'about',
    url: '/about',
    featured: false,
    pinned: true,
    degree: 0,
    layer: 1,
  })
  edgeMap.set(undirectedKey(ROOT_ID, ABOUT_ID), {
    source: ROOT_ID,
    target: ABOUT_ID,
    kind: 'spoke',
    weight: 1.0,
  })

  // 3. Project nodes + membership edges to their category hub.
  for (const p of projects) {
    nodeMap.set(p.slug, {
      id: p.slug,
      label: p.title,
      type: 'project',
      category: p.category,
      url: p.url,
      featured: p.featured,
      pinned: p.pinned,
      order: p.order,
      degree: 0,
      layer: 2,
    })

    edgeMap.set(undirectedKey(p.slug, p.category), {
      source: p.slug,
      target: p.category,
      kind: 'membership',
      weight: 0.9,
    })
  }

  // 4. Explicit related edges (project <-> project). Highest priority among the
  //    cross-links: a tag edge that would duplicate one of these is skipped.
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

  // 5. Faint shared-tag edges — these weave the web. Skip pairs already linked.
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
        if (edgeMap.has(key)) continue // don't overwrite spoke/membership/related
        edgeMap.set(key, {
          source: slugs[i],
          target: slugs[j],
          kind: 'tag',
          weight: 0.2,
        })
      }
    }
  }

  // 6. Degree pass — node size in the render reflects connectedness.
  const edges = [...edgeMap.values()]
  for (const e of edges) {
    nodeMap.get(e.source)!.degree++
    nodeMap.get(e.target)!.degree++
  }

  // 7. Layer pass — BFS depth from root drives the layout rings + per-layer opacity.
  //    Authoritative (the literal `layer` above is just a type-satisfying default);
  //    deriving it keeps depth correct if the topology ever changes.
  const adjacency = new Map<string, string[]>()
  for (const id of nodeMap.keys()) adjacency.set(id, [])
  for (const e of edges) {
    adjacency.get(e.source)!.push(e.target)
    adjacency.get(e.target)!.push(e.source)
  }
  const queue: string[] = [ROOT_ID]
  const seen = new Set<string>([ROOT_ID])
  nodeMap.get(ROOT_ID)!.layer = 0
  while (queue.length) {
    const id = queue.shift()!
    const depth = nodeMap.get(id)!.layer
    for (const next of adjacency.get(id)!) {
      if (seen.has(next)) continue
      seen.add(next)
      nodeMap.get(next)!.layer = depth + 1
      queue.push(next)
    }
  }

  return { nodes: [...nodeMap.values()], edges }
}
