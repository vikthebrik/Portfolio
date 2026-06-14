// TEMPORARY debug route. Renders the output of buildGraph() so we can confirm the
// content→graph derivation is correct before the real force-directed visualization
// exists. Delete this whole folder once the graph component lands.

import { buildGraph, type EdgeKind } from '@/lib/graph'

export const dynamic = 'force-static'

export default function GraphDebugPage() {
  const graph = buildGraph()

  const edgesByKind = graph.edges.reduce<Record<EdgeKind, number>>(
    (acc, e) => {
      acc[e.kind] = (acc[e.kind] ?? 0) + 1
      return acc
    },
    { membership: 0, related: 0, tag: 0 },
  )

  const hubs = graph.nodes.filter((n) => n.type === 'category').length
  const projects = graph.nodes.filter((n) => n.type === 'project').length

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-xl tracking-wide text-ink">[ graph-debug ]</h1>
      <p className="mt-2 text-sm text-muted">
        Derived from <code className="text-ink">content/projects/</code> via{' '}
        <code className="text-ink">lib/graph.ts</code>. Temporary — delete once the
        real graph renders.
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
        <Stat label="nodes" value={graph.nodes.length} />
        <Stat label="edges" value={graph.edges.length} />
        <Stat label="hubs" value={hubs} />
        <Stat label="projects" value={projects} />
        <Stat label="membership edges" value={edgesByKind.membership} />
        <Stat label="related edges" value={edgesByKind.related} />
        <Stat label="tag edges" value={edgesByKind.tag} />
      </dl>

      <h2 className="mt-10 text-sm uppercase tracking-wide text-muted">
        nodes (id · type · degree)
      </h2>
      <ul className="mt-2 text-sm text-ink">
        {graph.nodes
          .slice()
          .sort((a, b) => b.degree - a.degree)
          .map((n) => (
            <li key={n.id}>
              {n.type === 'category' ? '#' : '·'} {n.id} — {n.type} (deg{' '}
              {n.degree})
            </li>
          ))}
      </ul>

      <h2 className="mt-10 text-sm uppercase tracking-wide text-muted">
        raw JSON
      </h2>
      <pre className="mt-2 overflow-x-auto border border-line bg-surface p-4 text-xs text-ink">
        {JSON.stringify(graph, null, 2)}
      </pre>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between border-b border-line py-1">
      <dt className="text-muted">{label}</dt>
      <dd className="text-ink tabular-nums">{value}</dd>
    </div>
  )
}
