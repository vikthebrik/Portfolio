'use client'

import { useEffect, useState } from 'react'
import { IDENTITY } from '@/lib/links'

/**
 * Stage 0 of the launch intro: the name types out over blank paper with a
 * terminal cursor, then the tagline fades in beneath it. At stage 1 the whole
 * overlay fades while the web blooms in behind it (the root node's own label
 * takes over as the name); by stage 2 it unmounts. Purely decorative —
 * aria-hidden, pointer-events-none; the sidebar carries the same identity
 * accessibly.
 */
export function IntroOverlay({ stage }: { stage: number }) {
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

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center transition-opacity duration-700 ${
        stage >= 1 ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <p className="font-mono text-2xl tracking-wide text-ink">
        {name.slice(0, chars)}
        <span className="animate-pulse text-clay">▍</span>
      </p>
      <p
        className={`mt-3 font-mono text-xs text-muted transition-opacity duration-500 ${
          typed ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {IDENTITY.tagline}
      </p>
    </div>
  )
}
