import Link from 'next/link'

// Placeholder landing. The real force-directed graph + overview→focused→detail
// state machine is a later phase (see CLAUDE.md). Kept intentionally quiet.
export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="text-2xl tracking-wide text-ink">[ portfolio ]</h1>
      <p className="mt-4 text-muted">
        An explorable network graph of projects. The graph is derived entirely
        from content in <code className="text-ink">content/projects/</code>.
      </p>
      <p className="mt-8 text-sm text-muted">
        Foundation in place. Inspect the derived graph data at{' '}
        <Link href="/graph-debug" className="text-clay underline">
          /graph-debug
        </Link>
        .
      </p>
    </main>
  )
}
