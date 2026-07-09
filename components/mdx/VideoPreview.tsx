'use client'

import { useState, useSyncExternalStore } from 'react'

/**
 * A silent, downscaled preview loop that acts as the button for a full video —
 * the drone pillar's media pattern (see CLAUDE.md "Media strategy"). The tiny
 * loop (a few seconds, ~1–2 MB, made by `npm run video:preview`) lives on Vercel
 * Blob like an image; the full video lives on YouTube and its embed only loads
 * when the viewer clicks. No YouTube chrome, no third-party requests until asked.
 *
 * `ratio` is the frame's aspect ratio ("w/h") — the script prints the true one.
 * Reduced motion: the loop never autoplays; the poster frame stands in and the
 * click-through still works.
 */

const query = '(prefers-reduced-motion: reduce)'
const subscribe = (onChange: () => void) => {
  const mq = window.matchMedia(query)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
const getSnapshot = () => window.matchMedia(query).matches
const getServerSnapshot = () => false

export function VideoPreview({
  preview,
  poster,
  youtubeId,
  title,
  caption,
  ratio = '16/9',
}: {
  preview: string
  poster?: string
  youtubeId: string
  title: string
  caption?: string
  ratio?: string
}) {
  const [playing, setPlaying] = useState(false)
  const reducedMotion = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return (
    <figure className="mt-6">
      <div
        className="relative w-full overflow-hidden border border-line bg-surface"
        style={{ aspectRatio: ratio }}
      >
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play video: ${title}`}
            className="group absolute inset-0 block h-full w-full cursor-pointer"
          >
            <video
              src={preview}
              poster={poster}
              autoPlay={!reducedMotion}
              muted
              loop
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
            <span className="absolute bottom-2 left-2 border border-line bg-paper/90 px-2 py-1 font-mono text-xs text-muted transition-colors group-hover:border-clay group-hover:text-clay group-focus-visible:border-clay group-focus-visible:text-clay">
              ▶ watch
            </span>
          </button>
        )}
      </div>
      {caption || youtubeId ? (
        <figcaption className="mt-2 text-xs leading-5 text-faint">
          {caption}
          {caption ? ' ' : null}
          <a
            href={`https://youtu.be/${youtubeId}`}
            target="_blank"
            rel="noreferrer noopener"
            className="text-clay underline underline-offset-2"
          >
            watch on YouTube ↗
          </a>
        </figcaption>
      ) : null}
    </figure>
  )
}
