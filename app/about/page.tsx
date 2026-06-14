import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'How it works — Portfolio',
  description: 'How to read and navigate the project graph.',
}

// The "how it works" structural node (a spoke off root) routes here. Static RSC,
// intentionally quiet — mirrors the calm style of the case-study pages.
export default function About() {
  return (
    <article className="mx-auto max-w-2xl px-6 py-16">
      <nav aria-label="Breadcrumb" className="text-xs text-faint">
        <Link href="/" className="hover:text-clay">
          portfolio
        </Link>
        {' / '}
        <span className="text-muted">how it works</span>
      </nav>

      <h1 className="mt-6 text-2xl tracking-wide text-ink">How it works</h1>
      <p className="mt-3 text-muted">
        This portfolio is a single navigable graph. Everything connects back to one
        place.
      </p>

      <div className="mt-8 space-y-6 leading-7 text-muted">
        <section>
          <h2 className="text-lg text-ink">The web</h2>
          <p className="mt-2">
            At the center is the <span className="text-ink">root</span> node — the
            landing. Five spokes branch from it: the four areas of work (
            <span className="text-ink">tech</span>,{' '}
            <span className="text-ink">design</span>,{' '}
            <span className="text-ink">drone</span>,{' '}
            <span className="text-ink">research</span>) and this page. Each project
            hangs off its area.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-ink">The threads between projects</h2>
          <p className="mt-2">
            Projects that build on each other are linked directly; projects that share
            a topic are joined by fainter threads. Those cross-links are what turn four
            separate clusters into one web.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-ink">Moving around</h2>
          <p className="mt-2">
            Hover a node to light up its connections. Click an area to bring its work
            forward and quiet the rest. Zoom in to reveal more labels, drag a node to
            reposition it, and click any project to open its case study. Prefer a list?
            The sidebar mirrors the whole graph and is fully keyboard-navigable.
          </p>
        </section>
      </div>

      <div className="mt-12">
        <Link href="/" className="text-sm text-clay hover:underline">
          ← back to the graph
        </Link>
      </div>
    </article>
  )
}
