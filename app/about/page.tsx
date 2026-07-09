import type { Metadata } from 'next'
import Link from 'next/link'
import { projects } from '#site/content'
import { COURSEWORK, IDENTITY, LINKS } from '@/lib/links'

export const metadata: Metadata = {
  title: 'About Vikram Thirumaran',
  description:
    'Vikram Thirumaran — Computer Science and Data Science student at the University of Oregon.',
}

// The "about" structural node (a spoke off root) routes here. Static RSC.
export default function About() {
  const projectCount = projects.length

  return (
    <article className="mx-auto max-w-2xl px-6 py-16">
      <nav aria-label="Breadcrumb" className="text-xs text-faint">
        <Link href="/" className="hover:text-clay">
          portfolio
        </Link>
        {' / '}
        <span className="text-muted">about</span>
      </nav>

      <h1 className="mt-6 text-3xl tracking-wide text-ink">Vikram Thirumaran</h1>
      <p className="mt-3 text-muted leading-7">
        I am a Computer Science &amp; Data Science student at the University of Oregon (Class of 2027) minoring in Mathematics and Cognitive Science. I blend software development, data science, and systems administration to design and build highly optimized applications and platforms.
      </p>

      <div className="mt-8 space-y-10 leading-7 text-muted">
        {/* Contact Links */}
        <section>
          <p className="flex flex-wrap gap-x-5 gap-y-1">
            {LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target={l.href.startsWith('mailto:') ? undefined : '_blank'}
                rel="noreferrer noopener"
                className="text-clay underline underline-offset-2 hover:text-ink transition-colors"
              >
                {l.label} ↗
              </a>
            ))}
          </p>
        </section>

        {/* Experience Section */}
        <section>
          <h2 className="text-lg font-bold text-ink uppercase tracking-wide border-b border-line pb-1 mb-4">Experience</h2>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-baseline flex-wrap">
                <h3 className="text-ink font-semibold">Quantitative Peer Methods Consultant</h3>
                <span className="text-xs text-faint">April 2026 - Present</span>
              </div>
              <p className="text-xs italic text-muted font-mono">UO Data Services</p>
              <ul className="mt-2 list-disc list-outside pl-4 text-sm space-y-1">
                <li>Provide specialized consultation on statistical methods (descriptive, modeling, visualization) for completing theses and dissertations.</li>
                <li>Develop reference and instructional materials for research methodologies using R, Python, and SQL.</li>
                <li>Support data management workflows and facilitate workshops on statistical software (SPSS, Jamovi, Excel).</li>
              </ul>
            </div>

            <div>
              <div className="flex justify-between items-baseline flex-wrap">
                <h3 className="text-ink font-semibold">External Lead</h3>
                <span className="text-xs text-faint">February 2024 - June 2026</span>
              </div>
              <p className="text-xs italic text-muted font-mono">UO Multicultural Center</p>
              <ul className="mt-2 list-disc list-outside pl-4 text-sm space-y-1">
                <li>Liaised between the Multicultural Center and unions, utilizing digital tools and collaborative strategies to increase membership.</li>
                <li>Spearheaded large-scale programming and summits to enhance student engagement and institutional support.</li>
                <li>Managed center operations, adapting service models to meet the evolving needs of a diverse student body.</li>
              </ul>
            </div>

            <div>
              <div className="flex justify-between items-baseline flex-wrap">
                <h3 className="text-ink font-semibold">Student Assistant Systems Administrator</h3>
                <span className="text-xs text-faint">September 2024 - July 2025</span>
              </div>
              <p className="text-xs italic text-muted font-mono">UO Research Advanced Computing Services</p>
              <ul className="mt-2 list-disc list-outside pl-4 text-sm space-y-1">
                <li>Managed HPC cluster health through hardware deployment, software provisioning, and routine system maintenance for the Talapas (T2) heterogeneous environment.</li>
                <li>Streamlined research workflows by documenting complex system processes and developing API-driven scripts to automate administrative tasks and module testing.</li>
                <li>Optimized system performance and load management by evaluating new HPC technologies and benchmarking system architectures.</li>
                <li>Led technical instruction for the &quot;Introduction to HPC&quot; workshop series, providing expert consultation to researchers and faculty across diverse research disciplines.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Technical Skills */}
        <section>
          <h2 className="text-lg font-bold text-ink uppercase tracking-wide border-b border-line pb-1 mb-4">Technical Skills</h2>
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <h4 className="text-ink font-semibold">Languages &amp; Core Tools</h4>
              <p className="mt-1">Python (NumPy, Pandas, Matplotlib, Seaborn), Java, C, C++, C#, SQL, R, HTML/CSS, Git, GitHub</p>
            </div>
            <div>
              <h4 className="text-ink font-semibold">Web &amp; Systems</h4>
              <p className="mt-1">React, Next.js, Node.js, Express, Supabase (PostgreSQL), Slurm HPC Cluster Admin, Unix/Linux (Shell Scripting)</p>
            </div>
            <div>
              <h4 className="text-ink font-semibold">Methodologies</h4>
              <p className="mt-1">Statistical Modeling, Machine Learning, Data Visualization, Project Management, Technical Documentation</p>
            </div>
            <div>
              <h4 className="text-ink font-semibold">Other Technologies</h4>
              <p className="mt-1">Server Installation, PC Building, BambuLab 3D Printing, Microsoft Office Suite, Canva</p>
            </div>
          </div>
        </section>

        {/* Leadership & Impact */}
        <section>
          <h2 className="text-lg font-bold text-ink uppercase tracking-wide border-b border-line pb-1 mb-4">Leadership &amp; Impact</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-baseline flex-wrap">
                <h4 className="text-ink font-semibold">Public Relations Chair · UO South Asian Cultural Alliance</h4>
                <span className="text-xs text-faint">2024 - 2025</span>
              </div>
              <p className="mt-1 text-sm">Co-founded the SSWANA Center, establishing the framework for a new campus department and a permanent cultural center. Scaled social media presence to 1,000+ followers.</p>
            </div>
            <div>
              <div className="flex justify-between items-baseline flex-wrap">
                <h4 className="text-ink font-semibold">Co-Founder, Coach &amp; Volunteer · Pinnacle Hoops</h4>
                <span className="text-xs text-faint">2020 - 2023</span>
              </div>
              <p className="mt-1 text-sm">Founded a 501(c)(3) nonprofit organization that raised and donated $30,000 to local causes by coaching basketball in small sessions and large summer camps.</p>
            </div>
          </div>
        </section>

        {/* Selected Coursework */}
        <section>
          <h2 className="text-lg font-bold text-ink uppercase tracking-wide border-b border-line pb-1 mb-4">Selected Coursework</h2>
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 text-sm">
            {COURSEWORK.map((c) => (
              <li key={c.code}>
                <span className="text-ink font-mono">{c.code}</span>{' '}
                <span className="text-muted">{c.title}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Divider and website workings */}
        <hr className="border-line" />

        <section id="website-workings">
          <h2 className="text-lg font-bold text-ink uppercase tracking-wide mb-4">
            How this website works <span className="text-faint normal-case font-normal">(keep reading to find more!)</span>
          </h2>
          <p className="mt-2 text-sm leading-6">
            This portfolio is a single navigable graph — and the site itself is the first
            exhibit. Everything below is how it actually runs.
          </p>

          <div className="mt-6 space-y-6 text-sm leading-6">
            <div>
              <h3 className="font-semibold text-ink">The web</h3>
              <p className="mt-1">
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
            </div>

            <div>
              <h3 className="font-semibold text-ink">Moving around</h3>
              <p className="mt-1">
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
                search, and the graph itself is too — Tab to a node, arrows walk the
                edges, Enter re-roots. And if you live in a terminal, press{' '}
                <code className="bg-surface px-1 py-0.5 text-[0.85em] text-ink font-mono">
                  ctrl+`
                </code>{' '}
                — there is a real shell down there (<code className="bg-surface px-1 py-0.5 text-[0.85em] text-ink font-mono">ls</code>,{' '}
                <code className="bg-surface px-1 py-0.5 text-[0.85em] text-ink font-mono">cd</code>,{' '}
                <code className="bg-surface px-1 py-0.5 text-[0.85em] text-ink font-mono">tree</code>,{' '}
                <code className="bg-surface px-1 py-0.5 text-[0.85em] text-ink font-mono">cat</code>,{' '}
                <code className="bg-surface px-1 py-0.5 text-[0.85em] text-ink font-mono">open</code>
                ). <code className="bg-surface px-1 py-0.5 text-[0.85em] text-ink font-mono">cd design</code>{' '}
                re-roots the live graph. In a hurry,{' '}
                <code className="bg-surface px-1 py-0.5 text-[0.85em] text-ink font-mono">⌘K</code>{' '}
                opens a command palette that jumps anywhere from any page.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-ink">Under the hood</h3>
              <p className="mt-1">
                The one rule this site is built on:{' '}
                <span className="text-ink">
                  the graph is derived from content, never hand-maintained
                </span>
                . Each project is a single MDX file; its frontmatter is the entire
                definition of its node:
              </p>
              <pre className="mt-3 overflow-x-auto border border-line bg-surface p-4 text-xs font-mono text-ink">
                {`category: design        # → edge to its hub
related: [mcc-scheduler] # → direct project links
tags: [graphic-design]   # → faint shared-topic threads`}
              </pre>
              <p className="mt-3">
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
            </div>

            <div>
              <h3 className="font-semibold text-ink">Colophon</h3>
              <p className="mt-1">
                Next.js 16 (App Router, RSC) · Velite · Tailwind CSS v4 · d3-force ·
                Vercel (+ Blob for media). Type is JetBrains Mono. The source — including
                the architecture notes the site is built against — is public:{' '}
                <a
                  href="https://github.com/vikthebrik/Portfolio"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-clay underline underline-offset-2 hover:text-ink"
                >
                  github.com/vikthebrik/Portfolio ↗
                </a>
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-12 border-t border-line pt-6">
        <Link href="/" className="text-sm text-clay hover:underline">
          ← back to the graph
        </Link>
      </div>
    </article>
  )
}
