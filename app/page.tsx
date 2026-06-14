import { buildGraph } from '@/lib/graph'
import { GraphExplorer } from '@/components/GraphExplorer'

// The graph is derived from content on the server, then handed to the client
// explorer which manages the overview → focused state. The case study (detail) is
// its own route at /work/[slug].
export default function Home() {
  const graph = buildGraph()
  return <GraphExplorer graph={graph} />
}
