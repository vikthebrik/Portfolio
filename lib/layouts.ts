import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceRadial,
  forceX,
  forceY,
  type Simulation,
  type SimulationNodeDatum,
} from 'd3-force'
import { CATEGORIES, type Category } from '@/lib/categories'
import type { EdgeKind, Graph, GraphEdge, GraphNode } from '@/lib/graph'

/**
 * Graph layouts. Each is expressed as a *reconfiguration of the simulation's forces*
 * (never static positions) so switching layouts just reheats — node objects and any
 * hand-drag pins (fx/fy) survive. Root is the one node a layout pins directly (it's
 * the center/anchor); ForceGraph re-applies saved drags afterwards so a hand-moved
 * root still wins. No new dependency — all d3-force. See CLAUDE.md "Layouts".
 */

export type LayoutKind = 'web' | 'radial' | 'tree' | 'cluster'
export const LAYOUTS: LayoutKind[] = ['web', 'radial', 'tree', 'cluster']

export type SimNode = GraphNode & SimulationNodeDatum

const LINK_DISTANCE: Record<EdgeKind, number> = {
  spoke: 90,
  membership: 70,
  related: 120,
  tag: 200,
}

const RING = 150 // radius added per layer (web/radial)
const ROW = 130 // vertical gap per layer (tree)
const CLUSTER_R = 220 // distance of each folder anchor from center (cluster)

// Node circle radius — layer-first (root biggest → hubs → projects), with a small
// degree bump for projects. Shared by the renderer and the collision force so they agree.
const RADIUS_BY_LAYER = [16, 10, 6]
export const nodeRadius = (n: GraphNode): number => {
  const base = RADIUS_BY_LAYER[Math.min(n.layer, RADIUS_BY_LAYER.length - 1)]
  return n.type === 'project' ? base + Math.min(n.degree, 6) * 0.6 : base
}

/**
 * Content-based default: the "dynamic default" the user layers manual choice on top of.
 *   - no cross-links at all           → tree    (a pure hierarchy)
 *   - densely interlinked projects     → web     (show the web)
 *   - evenly spread across folders      → radial  (clean concentric rings)
 *   - otherwise (lopsided folders)      → cluster (group by folder)
 */
export function chooseDefaultLayout(graph: Graph): LayoutKind {
  const projects = graph.nodes.filter((n) => n.type === 'project')
  const cross = graph.edges.filter(
    (e) => e.kind === 'related' || e.kind === 'tag',
  ).length
  const ratio = cross / Math.max(projects.length, 1)

  const perCategory = CATEGORIES.map(
    (c) => projects.filter((p) => p.category === c).length,
  )
  const balance = Math.max(...perCategory) - Math.min(...perCategory)

  if (cross === 0) return 'tree'
  if (ratio >= 0.9) return 'web'
  if (balance <= 1) return 'radial'
  return 'cluster'
}

type Ctx = { w: number; h: number; edges: GraphEdge[] }

/** (Re)configure `sim`'s forces for the given layout. Call then `sim.alpha(x).restart()`. */
export function applyLayout(
  sim: Simulation<SimNode, undefined>,
  kind: LayoutKind,
  { w, h, edges }: Ctx,
): void {
  const cx = w / 2
  const cy = h / 2

  // Shared forces: links (per-kind distance; strength dialed down where a positional
  // force should dominate) and collision.
  const linkStrengthScale = kind === 'radial' ? 0.3 : kind === 'tree' ? 0.4 : 1
  sim.force(
    'link',
    forceLink<SimNode, GraphEdge>(edges)
      .id((d) => d.id)
      .distance((_l, i) => LINK_DISTANCE[edges[i].kind])
      .strength((_l, i) => edges[i].weight * linkStrengthScale),
  )
  sim.force('collide', forceCollide<SimNode>((n) => nodeRadius(n) + 26))

  // Clear positional forces; each layout re-adds only what it uses.
  sim.force('charge', null)
  sim.force('radial', null)
  sim.force('x', null)
  sim.force('y', null)

  // Root is pinned to the layout's anchor (top-center for tree, center otherwise).
  const root = sim.nodes().find((n) => n.type === 'root')
  const rootY = kind === 'tree' ? cy - ROW : cy
  if (root) {
    root.fx = cx
    root.fy = rootY
  }

  switch (kind) {
    case 'web':
      // Centralized organic web: mild radial rings keep it centered on root, links
      // still bend it into a mesh. (This is the fix for the old "chain" layout.)
      sim.force('charge', forceManyBody<SimNode>().strength(-420))
      sim.force(
        'radial',
        forceRadial<SimNode>((n) => n.layer * RING, cx, cy).strength(0.18),
      )
      break

    case 'radial':
      // Clean concentric rings by depth; charge spreads nodes *around* each ring so
      // they don't pile on one side, while weak links let the radius dominate.
      sim.force('charge', forceManyBody<SimNode>().strength(-320))
      sim.force(
        'radial',
        forceRadial<SimNode>((n) => n.layer * RING, cx, cy).strength(0.95),
      )
      break

    case 'cluster': {
      // Group by folder: each category has an anchor around the center; nodes are
      // pulled toward their folder's anchor (structural nodes toward center).
      const anchor = (n: SimNode) => {
        if (!n.category) return { x: cx, y: cy }
        const i = CATEGORIES.indexOf(n.category as Category)
        const a = (i / CATEGORIES.length) * 2 * Math.PI - Math.PI / 2
        return { x: cx + Math.cos(a) * CLUSTER_R, y: cy + Math.sin(a) * CLUSTER_R }
      }
      sim.force('charge', forceManyBody<SimNode>().strength(-260))
      sim.force('x', forceX<SimNode>((n) => anchor(n).x).strength(0.55))
      sim.force('y', forceY<SimNode>((n) => anchor(n).y).strength(0.55))
      break
    }

    case 'tree':
      // Rough top-down hierarchy: y by layer, mild charge spreads siblings in x, a
      // weak x-pull keeps it centered. A force approximation, not a tidy tree.
      sim.force('charge', forceManyBody<SimNode>().strength(-260))
      sim.force('y', forceY<SimNode>((n) => rootY + n.layer * ROW).strength(0.7))
      sim.force('x', forceX<SimNode>(cx).strength(0.05))
      break
  }
}
