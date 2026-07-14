'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

/**
 * Dedicated back + home buttons for detail pages (`/work/[slug]`, `/about`) — a
 * plainer path than the breadcrumb's filesystem traversal. Sticky so it stays
 * reachable on long case studies. `back` uses real history when the visitor came
 * from within the site; a cold deep link falls back to the given href (the
 * project's category focus, or the overview) instead of leaving the site.
 */
export function PageNav({ fallback = '/' }: { fallback?: string }) {
  const router = useRouter()

  const back = () => {
    const sameOrigin =
      !document.referrer || document.referrer.startsWith(window.location.origin)
    if (window.history.length > 1 && sameOrigin) router.back()
    else router.push(fallback)
  }

  const item =
    'border border-line bg-surface px-2.5 py-1 font-mono text-xs text-muted hover:text-clay'

  return (
    <nav
      aria-label="Page navigation"
      className="sticky top-0 z-10 -mx-1 mb-6 flex gap-2 bg-paper/95 px-1 py-2 backdrop-blur-sm"
    >
      <button type="button" onClick={back} className={item}>
        ‹ back
      </button>
      <Link href="/" className={item}>
        ⌂ home
      </Link>
    </nav>
  )
}
