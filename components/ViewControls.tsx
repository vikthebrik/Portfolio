'use client'

import { useState } from 'react'
import { LAYOUTS, type LayoutKind } from '@/lib/layouts'

/**
 * Obsidian-style view panel: layout selector + display toggles. The old opacity/fade
 * sliders are gone — projects opacity and focus fade are fixed constants in ForceGraph;
 * the toggles are the remaining experiments (quiet labels, muted edges) kept switchable
 * until a winner is baked in. State + persistence live in GraphExplorer. Collapsible so
 * it stays out of the way. Tokens + mono only.
 */
export function ViewControls({
  layout,
  autoDefault,
  onLayoutChange,
  quietLabels,
  onQuietLabelsChange,
  muteEdges,
  onMuteEdgesChange,
  onResetPositions,
  onReplayIntro,
}: {
  layout: 'auto' | LayoutKind
  autoDefault: LayoutKind // what 'auto' resolves to for this content (always shown on the Auto chip)
  onLayoutChange: (next: 'auto' | LayoutKind) => void
  quietLabels: boolean
  onQuietLabelsChange: (value: boolean) => void
  muteEdges: boolean
  onMuteEdgesChange: (value: boolean) => void
  onResetPositions: () => void
  onReplayIntro: () => void
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

          <Section label="display">
            <Toggle
              label="quiet labels"
              hint="project names appear on zoom or focus"
              checked={quietLabels}
              onChange={onQuietLabelsChange}
            />
            <Toggle
              label="muted edges"
              hint="resting links stay faint until emphasized"
              checked={muteEdges}
              onChange={onMuteEdgesChange}
            />
          </Section>

          <button
            type="button"
            onClick={onResetPositions}
            className="mt-1 w-full border border-line py-1 text-muted hover:text-clay"
          >
            reset positions
          </button>
          <button
            type="button"
            onClick={onReplayIntro}
            className="mt-1 w-full border border-line py-1 text-muted hover:text-clay"
          >
            replay intro
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

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="flex w-full items-baseline gap-2 py-0.5 text-left"
    >
      <span
        className={
          'shrink-0 border px-1.5 ' +
          (checked ? 'border-clay text-clay' : 'border-line text-faint')
        }
      >
        {checked ? 'on' : 'off'}
      </span>
      <span className="text-muted">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right text-faint">{hint}</span>
    </button>
  )
}
