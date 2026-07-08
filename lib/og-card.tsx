import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Shared Open Graph card (1200×630) in the site's design language: paper ground,
 * JetBrains Mono, a quiet web motif on the right, clay only for what matters.
 * Rendered by next/og (satori) from app/opengraph-image.tsx and
 * app/work/[slug]/opengraph-image.tsx — both statically generated at build.
 */

export const OG_SIZE = { width: 1200, height: 630 }

// Tokens (mirror app/globals.css — satori can't read CSS custom properties).
const PAPER = '#FAF9F5'
const INK = '#1F1E1A'
const MUTED = '#6B6862'
const FAINT = '#8F8B82'
const LINE = '#DAD7CD'
const CLAY = '#C15F3C'

export async function ogFonts() {
  const dir = join(process.cwd(), 'assets', 'fonts')
  const [regular, bold] = await Promise.all([
    readFile(join(dir, 'JetBrainsMono-Regular.ttf')),
    readFile(join(dir, 'JetBrainsMono-Bold.ttf')),
  ])
  return [
    { name: 'JetBrains Mono', data: regular, weight: 400 as const },
    { name: 'JetBrains Mono', data: bold, weight: 700 as const },
  ]
}

/** The web, as a motif: root + spokes + satellites, echoing the live graph. */
function WebMotif() {
  return (
    <svg
      width="460"
      height="630"
      viewBox="0 0 460 630"
      style={{ position: 'absolute', right: 0, top: 0 }}
    >
      <g stroke={LINE} strokeWidth="2" fill="none">
        <path d="M300 315 L170 180" />
        <path d="M300 315 L420 140" />
        <path d="M300 315 L440 380" />
        <path d="M300 315 L200 480" />
        <path d="M300 315 L390 520" />
        <path d="M170 180 L420 140" />
        <path d="M200 480 L390 520" />
        <path d="M420 140 L440 380" />
      </g>
      <circle cx="170" cy="180" r="11" fill={INK} />
      <circle cx="420" cy="140" r="11" fill={INK} />
      <circle cx="440" cy="380" r="11" fill={INK} />
      <circle cx="200" cy="480" r="11" fill={INK} />
      <circle cx="390" cy="520" r="8" fill={MUTED} />
      <circle cx="300" cy="315" r="18" fill={CLAY} />
    </svg>
  )
}

export function OgCard({
  path,
  title,
  subtitle,
  tags,
}: {
  path: string // breadcrumb, e.g. "portfolio / design"
  title: string
  subtitle: string
  tags?: readonly string[]
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: PAPER,
        fontFamily: 'JetBrains Mono',
        position: 'relative',
      }}
    >
      <WebMotif />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          width: 820,
        }}
      >
        <div style={{ display: 'flex', fontSize: 24, color: FAINT }}>{path}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div
            style={{
              display: 'flex',
              fontSize: title.length > 32 ? 52 : 64,
              fontWeight: 700,
              color: INK,
              lineHeight: 1.15,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 26,
              color: MUTED,
              lineHeight: 1.5,
              maxWidth: 680,
            }}
          >
            {subtitle}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {tags && tags.length > 0 ? (
            <div style={{ display: 'flex', gap: 16, fontSize: 22, color: CLAY }}>
              {tags.slice(0, 4).map((t) => (
                <span key={t}>{`#${t}`}</span>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', fontSize: 22, color: FAINT }}>
              tech · design · drone · research
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
