'use client'

import { useEffect, useState } from 'react'
import { IDENTITY } from '@/lib/links'

/**
 * The launch screen (stage 0): the name types out with a terminal cursor, then
 * the tagline, a two-line introduction, and a root-node-shaped "click to
 * launch" button reveal beneath it. Launching (the button, or any click —
 * GraphExplorer owns that) releases the frozen sim and the web grows out of
 * this exact spot: the overlay is `fixed` and viewport-centered (the sidebar
 * is invisible during the intro but still reserves its column, so centering in
 * the pane reads off-center), and ForceGraph seeds the bloom at the same
 * viewport center. At stage 1 the overlay fades; by stage 2 it unmounts.
 */
export function IntroOverlay({
  stage,
  onLaunch,
}: {
  stage: number
  onLaunch: () => void
}) {
  const name = IDENTITY.name.toLowerCase()
  const [chars, setChars] = useState(0)

  useEffect(() => {
    if (stage !== 0) return
    const timer = window.setInterval(() => {
      setChars((c) => {
        if (c >= name.length) {
          window.clearInterval(timer)
          return c
        }
        return c + 1
      })
    }, 45)
    return () => window.clearInterval(timer)
  }, [stage, name.length])

  if (stage < 0 || stage >= 2) return null
  const typed = chars >= name.length
  const revealed = typed ? 'opacity-100' : 'opacity-0'

  return (
    <div
      aria-hidden={stage >= 1 || undefined}
      className={`fixed inset-0 z-20 flex flex-col items-center justify-center transition-opacity duration-700 ${
        stage >= 1 ? 'pointer-events-none opacity-0' : ''
      }`}
    >
      <p className="font-mono text-2xl tracking-wide text-ink">
        {name.slice(0, chars)}
        <span className="animate-pulse text-clay">▍</span>
      </p>
      <p
        className={`mt-3 font-mono text-xs text-muted transition-opacity duration-500 ${revealed}`}
      >
        {IDENTITY.tagline}
      </p>
      <p
        className={`mt-6 max-w-md px-6 text-center text-sm leading-7 text-muted transition-opacity delay-200 duration-700 ${revealed}`}
      >
        {IDENTITY.intro}
      </p>
      <button
        type="button"
        onClick={onLaunch}
        disabled={stage !== 0}
        autoFocus
        aria-label="Launch the project graph"
        className={`group mt-10 flex cursor-pointer flex-col items-center gap-3 px-8 py-5 outline-none transition-opacity delay-500 duration-700 ${revealed}`}
      >
        {/* The root node, waiting — the web grows out of this circle. */}
        <span className="block h-7 w-7 rounded-full bg-ink transition-transform duration-300 group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-clay group-focus-visible:ring-offset-2" />
        <span className="font-mono text-xs text-muted transition-colors group-hover:text-clay group-focus-visible:text-clay">
          click to launch ↵
        </span>
      </button>
    </div>
  )
}
