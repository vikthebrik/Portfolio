import { ImageResponse } from 'next/og'
import { OG_SIZE, OgCard, ogFonts } from '@/lib/og-card'

// The site-wide social card (link previews for the landing page).
export const alt = 'Portfolio — explorable work graph'
export const size = OG_SIZE
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <OgCard
        path="vikram thirumaran"
        title="portfolio"
        subtitle="An explorable graph of work — every project a node, every connection real."
      />
    ),
    { ...OG_SIZE, fonts: await ogFonts() },
  )
}
