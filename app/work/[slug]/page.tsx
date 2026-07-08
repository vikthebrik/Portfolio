import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { projects } from '#site/content'
import { MDXContent } from '@/components/MDXContent'

// Statically generate one page per project (the `detail` state of the machine).
export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }))
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  return params.then(({ slug }) => {
    const project = projects.find((p) => p.slug === slug)
    if (!project) return {}
    return { title: `${project.title} — Portfolio`, description: project.summary }
  })
}

export default async function CaseStudy({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const project = projects.find((p) => p.slug === slug)
  if (!project) notFound()

  const related = project.related
    .map((s) => projects.find((p) => p.slug === s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))

  return (
    <article className="mx-auto max-w-2xl px-6 py-16">
      <nav aria-label="Breadcrumb" className="text-xs text-faint">
        <Link href="/" className="hover:text-clay">
          portfolio
        </Link>
        {' / '}
        <Link href={`/?focus=${project.category}`} className="hover:text-clay">
          {project.category}
        </Link>
        {' / '}
        <span className="text-muted">{project.slug}</span>
      </nav>

      <h1 className="mt-6 text-2xl tracking-wide text-ink">{project.title}</h1>
      <p className="mt-3 text-muted">{project.summary}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
        {project.year ? <span>{project.year}</span> : null}
        <span>{project.metadata.readingTime} min read</span>
        {project.tags.length > 0 ? (
          <span className="text-muted">
            {project.tags.map((t) => `#${t}`).join('  ')}
          </span>
        ) : null}
      </div>

      {project.links ? (
        <div className="mt-3 flex flex-wrap gap-x-4 text-sm">
          {Object.entries(project.links).map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="text-clay underline underline-offset-2"
              target="_blank"
              rel="noreferrer noopener"
            >
              {label} ↗
            </a>
          ))}
        </div>
      ) : null}

      {project.cover ? (
        // Contain, never crop — covers are real work (posters are often portrait),
        // so letterbox on surface instead of guillotining them. Same rule as <Figure>.
        <div className="relative mt-8 aspect-[16/10] w-full border border-line bg-surface">
          <Image
            src={project.cover}
            alt={`${project.title} cover`}
            fill
            sizes="(max-width: 768px) 100vw, 672px"
            className="object-contain"
          />
        </div>
      ) : null}

      <div className="mt-8 border-t border-line pt-8">
        <MDXContent code={project.body} />
      </div>

      {related.length > 0 ? (
        <section className="mt-12 border-t border-line pt-6">
          <h2 className="text-xs uppercase tracking-wide text-faint">related</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {related.map((r) => (
              <li key={r.slug}>
                <span aria-hidden className="text-faint select-none">
                  ·{' '}
                </span>
                <Link href={r.url} className="text-muted hover:text-clay">
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-12">
        <Link
          href={`/?focus=${project.category}`}
          className="text-sm text-clay hover:underline"
        >
          ← back to {project.category}
        </Link>
      </div>
    </article>
  )
}
