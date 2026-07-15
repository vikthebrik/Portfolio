'use client'

import { useState } from 'react'
import { LAYOUTS, type LayoutKind } from '@/lib/layouts'

/**
 * Obsidian-style view panel: layout selector + the navigation-mode toggle. The old
 * opacity/fade sliders are gone — projects opacity and focus fade are fixed constants
 * in ForceGraph. Camera nav (default on) keeps the web stable and moves the camera on
 * selection; off restores the re-root reheat. State + persistence live in
 * GraphExplorer. Collapsible so it stays out of the way. Tokens + mono only.
 */
export function ViewControls({
  layout,
  autoDefault,
  cameraNav,
  onLayoutChange,
  onToggleCameraNav,
  onResetPositions,
  onReplayIntro,
}: {
  layout: 'auto' | LayoutKind
  autoDefault: LayoutKind // what 'auto' resolves to for this content (always shown on the Auto chip)
  cameraNav: boolean // on: selection glides the camera over a stable web; off: re-root reheat
  onLayoutChange: (next: 'auto' | LayoutKind) => void
  onToggleCameraNav: (next: boolean) => void
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

          <Section label="navigation">
            <Toggle
              label="camera nav"
              hint="off: re-root"
              checked={cameraNav}
              onChange={onToggleCameraNav}
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
