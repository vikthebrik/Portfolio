import type { Metadata } from 'next'
import Link from 'next/link'
import { projects } from '#site/content'
import { IDENTITY, LINKS } from '@/lib/links'

export const metadata: Metadata = {
  title: 'How it works — Portfolio',
  description:
    'How to read the project graph — and how it builds itself from content.',
}

// The "how it works" structural node (a spoke off root) routes here. Static RSC.
// Two audiences, one page: how to *read* the graph (everyone), then how it *builds
// itself* (engineers). Quiet style, mirrors the case-study pages.
export default function About() {
  const projectCount = projects.length

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
        This portfolio is a single navigable graph — and the site itself is the first
        exhibit. Everything below is how it actually runs.
      </p>

      <div className="mt-8 space-y-8 leading-7 text-muted">
        <section>
          <h2 className="text-lg text-ink">The web</h2>
          <p className="mt-2">
            At the center is the <span className="text-ink">root</span> node — the
            landing. Five spokes branch from it: the four areas of work (
            <span className="text-ink">tech</span>,{' '}
            <span className="text-ink">design</span>,{' '}
            <span className="text-ink">drone</span>,{' '}
            <span className="text-ink">research</span>) and this page. Each of the{' '}
            {projectCount} projects hangs off its area. Projects that build on each
            other are linked directly; projects that share a topic are joined by
            fainter threads. Those cross-links are what turn four separate clusters
            into one web.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-ink">Moving around</h2>
          <p className="mt-2">
            Hover a node to light up its connections. Click any node to{' '}
            <span className="text-ink">re-root</span> the web on it — the layout
            re-rings by distance from it and the camera glides over; nothing is ever
            hidden, only emphasized. Click a centered project to open its case study.
            Drag nodes to rearrange (your arrangement persists), zoom to reveal
            labels, and use the map in the corner to jump anywhere — even from inside
            a case study. Browser Back/Forward walk your re-root history.
          </p>
          <p className="mt-2">
            Prefer a keyboard? The sidebar is a fully keyboard-navigable tree with
            search. And if you live in a terminal, press{' '}
            <code className="bg-surface px-1 py-0.5 text-[0.85em] text-ink">
              ctrl+`
            </code>{' '}
            — there is a real shell down there (<code className="bg-surface px-1 py-0.5 text-[0.85em] text-ink">ls</code>,{' '}
            <code className="bg-surface px-1 py-0.5 text-[0.85em] text-ink">cd</code>,{' '}
            <code className="bg-surface px-1 py-0.5 text-[0.85em] text-ink">tree</code>,{' '}
            <code className="bg-surface px-1 py-0.5 text-[0.85em] text-ink">cat</code>,{' '}
            <code className="bg-surface px-1 py-0.5 text-[0.85em] text-ink">open</code>
            ). <code className="bg-surface px-1 py-0.5 text-[0.85em] text-ink">cd design</code>{' '}
            re-roots the live graph. In a hurry,{' '}
            <code className="bg-surface px-1 py-0.5 text-[0.85em] text-ink">⌘K</code>{' '}
            opens a command palette that jumps anywhere from any page.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-ink">Under the hood</h2>
          <p className="mt-2">
            The one rule this site is built on:{' '}
            <span className="text-ink">
              the graph is derived from content, never hand-maintained
            </span>
            . Each project is a single MDX file; its frontmatter is the entire
            definition of its node:
          </p>
          <pre className="mt-4 overflow-x-auto border border-line bg-surface p-4 text-sm text-ink">
            {`category: design        # → edge to its hub
related: [mcc-scheduler] # → direct project links
tags: [graphic-design]   # → faint shared-topic threads`}
          </pre>
          <p className="mt-4">
            At build time, Velite validates every file against a Zod schema and emits
            typed JSON; one pure function derives the nodes and edges from it. Adding
            a project means adding one file — the node, its edges, the sidebar entry,
            the terminal&apos;s filesystem, and the case-study route all appear on the
            next build. There is no graph config to keep in sync, so there is nothing
            to drift.
          </p>
          <p className="mt-2">
            The rendering is deliberately small: d3-force for layout and SVG elements
            rendered by React — no canvas, no graph library. Each layout (web, radial,
            tree, cluster) is just a different force configuration on the{' '}
            <em>same running simulation</em>, so switching layouts or re-rooting
            reheats the physics instead of rebuilding the world — which is why your
            hand-dragged pins survive everything. Re-rooting BFS-computes distances
            from the new center and re-rings the web around it; emphasis fades nodes
            by that same distance.
          </p>
          <p className="mt-2">
            The minimap and the main graph never share React state — a ref-based
            bridge passes position snapshots one way and pan/re-root commands the
            other, so sixty-fps physics never cause a render storm. Media lives on a
            CDN, referenced by URL from frontmatter; the repository stays lean enough
            to read in one sitting.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-ink">Who</h2>
          <p className="mt-2">
            <span className="text-ink">{IDENTITY.name}</span> — {IDENTITY.role}.
            Currently: quantitative methods consulting at UO Data Services, External
            Lead at the UO Multicultural Center. Previously: HPC systems
            administration on UO&apos;s Talapas cluster, Public Relations Chair of the
            South Asian Cultural Alliance.
          </p>
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
            {LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target={l.href.startsWith('mailto:') ? undefined : '_blank'}
                rel="noreferrer noopener"
                className="text-clay underline underline-offset-2"
              >
                {l.label} ↗
              </a>
            ))}
          </p>
        </section>

        <section>
          <h2 className="text-lg text-ink">Colophon</h2>
          <p className="mt-2">
            Next.js 16 (App Router, RSC) · Velite · Tailwind CSS v4 · d3-force ·
            Vercel (+ Blob for media). Type is JetBrains Mono. The source — including
            the architecture notes the site is built against — is public:{' '}
            <a
              href="https://github.com/vikthebrik/Portfolio"
              target="_blank"
              rel="noreferrer noopener"
              className="text-clay underline underline-offset-2"
            >
              github.com/vikthebrik/Portfolio ↗
            </a>
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
