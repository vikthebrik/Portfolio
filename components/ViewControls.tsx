'use client'

import { useState } from 'react'
import { CATEGORIES, type Category } from '@/lib/categories'
import { LAYOUTS, type LayoutKind } from '@/lib/layouts'

const DEPTH_LABELS = ['root', 'hubs', 'projects'] as const

/**
 * Obsidian-style view panel (part 1): layout selector + per-layer opacity. Everything
 * here is a manual override on top of the dynamic defaults — state + persistence live
 * in GraphExplorer. Collapsible so it stays out of the way. Tokens + mono only.
 */
export function ViewControls({
  layout,
  autoDefault,
  onLayoutChange,
  depthOpacity,
  onDepthChange,
  folderOpacity,
  onFolderChange,
  onResetPositions,
}: {
  layout: 'auto' | LayoutKind
  autoDefault: LayoutKind // what 'auto' resolves to for this content (always shown on the Auto chip)
  onLayoutChange: (next: 'auto' | LayoutKind) => void
  depthOpacity: number[]
  onDepthChange: (index: number, value: number) => void
  folderOpacity: Record<Category, number>
  onFolderChange: (category: Category, value: number) => void
  onResetPositions: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="absolute right-4 top-4 z-10 text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="border border-line bg-surface px-3 py-1 uppercase tracking-wide text-muted hover:text-clay"
      >
        view {open ? '▴' : '▾'}
      </button>

      {open && (
        <div className="mt-1 w-64 border border-line bg-surface p-3">
          <Section label="layout">
            <div className="flex flex-wrap gap-1">
              {(['auto', ...LAYOUTS] as const).map((opt) => {
                const active = layout === opt
                const text = opt === 'auto' ? `auto (${autoDefault})` : opt
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onLayoutChange(opt)}
                    aria-pressed={active}
                    className={
                      'border px-2 py-0.5 ' +
                      (active
                        ? 'border-clay text-clay'
                        : 'border-line text-muted hover:text-clay')
                    }
                  >
                    {text}
                  </button>
                )
              })}
            </div>
          </Section>

          <Section label="opacity · depth">
            {DEPTH_LABELS.map((lbl, i) => (
              <Slider
                key={lbl}
                label={lbl}
                value={depthOpacity[i] ?? 1}
                onChange={(v) => onDepthChange(i, v)}
              />
            ))}
          </Section>

          <Section label="opacity · folder">
            {CATEGORIES.map((cat) => (
              <Slider
                key={cat}
                label={cat}
                value={folderOpacity[cat] ?? 1}
                onChange={(v) => onFolderChange(cat, v)}
              />
            ))}
          </Section>

          <button
            type="button"
            onClick={onResetPositions}
            className="mt-1 w-full border border-line py-1 text-muted hover:text-clay"
          >
            reset positions
          </button>
        </div>
      )}
    </div>
  )
}

function Section({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1 uppercase tracking-wide text-faint">{label}</p>
      {children}
    </div>
  )
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="flex items-center gap-2 py-0.5">
      <span className="w-14 shrink-0 text-muted">{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 min-w-0 flex-1 accent-clay"
        aria-label={`${label} opacity`}
      />
      <span className="w-9 shrink-0 text-right tabular-nums text-faint">
        {value.toFixed(2)}
      </span>
    </label>
  )
}
