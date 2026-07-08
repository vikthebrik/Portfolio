import { ImageResponse } from 'next/og'
import { projects } from '#site/content'
import { OG_SIZE, OgCard, ogFonts } from '@/lib/og-card'

// Per-project social cards, statically generated alongside the case-study pages.
export const alt = 'Project case study'
export const size = OG_SIZE
export const contentType = 'image/png'

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }))
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const project = projects.find((p) => p.slug === slug)
  const summary = project?.summary ?? ''
  return new ImageResponse(
    (
      <OgCard
        path={`portfolio / ${project?.category ?? 'work'}`}
        title={project?.title ?? 'Case study'}
        subtitle={summary.length > 150 ? `${summary.slice(0, 147)}…` : summary}
        tags={project?.tags}
      />
    ),
    { ...OG_SIZE, fonts: await ogFonts() },
  )
}
