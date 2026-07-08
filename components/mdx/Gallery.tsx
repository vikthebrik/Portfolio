import type { ReactNode } from 'react'

/**
 * A responsive grid of <Figure>s for design case studies. Collapses to one
 * column on small screens. `columns` is the max at full width (the article
 * column is 672px, so keep it 2–3).
 */
const COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
}

export function Gallery({
  columns = 2,
  children,
}: {
  columns?: 1 | 2 | 3
  children: ReactNode
}) {
  return (
    <div className={`mt-6 grid gap-4 ${COLS[columns] ?? COLS[2]} [&>figure]:mt-0`}>
      {children}
    </div>
  )
}
