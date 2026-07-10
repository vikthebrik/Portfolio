'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { projects } from '#site/content'
import { CATEGORIES } from '@/lib/categories'
import { LINKS } from '@/lib/links'
import { useGraphBridge } from './GraphBridge'

/**
 * ⌘K / ctrl+K command palette — the fastest way in. Everything it can reach exists
 * elsewhere (graph, sidebar, terminal); this is pure acceleration, so it stays a
 * navigation palette: jump to a project's case study, re-root the graph on a hub
 * (through the bridge when the graph is on screen, via ?focus= otherwise), open the
 * contact links, toggle the terminal. Mounted once in app/layout.tsx so it persists
 * across pages, like the minimap and terminal.
 */

export const TOGGLE_TERMINAL_EVENT = 'portfolio:toggle-terminal'
export const TOGGLE_PALETTE_EVENT = 'portfolio:toggle-palette'

type Item = {
  id: string
  group: 'work' | 'go' | 'links' | 'commands'
  label: string
  hint: string
  keywords: string
  run: () => void
}

const GROUP_LABEL: Record<Item['group'], string> = {
  work: 'work',
  go: 'go to',
  links: 'links',
  commands: 'commands',
}

export function CommandPalette() {
  const router = useRouter()
  const pathname = usePathname()
  const bridge = useGraphBridge()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const items = useMemo<Item[]>(() => {
    const close = () => setOpen(false)
    const go = (url: string) => {
      close()
      router.push(url)
    }
    // Re-root in place when the main graph is on screen; deep-link otherwise.
    const reRoot = (id: string | null) => {
      close()
      if (pathname === '/') bridge?.setCenter(id)
      else router.push(id ? `/?focus=${id}` : '/')
    }
    return [
      ...projects.map(
        (p): Item => ({
          id: p.slug,
          group: 'work',
          label: p.title,
          hint: p.category,
          keywords: `${p.category} ${p.tags.join(' ')}`,
          run: () => go(p.url),
        })
      ),
      {
        id: 'overview',
        group: 'go',
        label: 'overview',
        hint: 'the full web',
        keywords: 'home root graph',
        run: () => reRoot(null),
      },
      ...CATEGORIES.map(
        (c): Item => ({
          id: `hub-${c}`,
          group: 'go',
          label: c,
          hint: 're-root the web',
          keywords: 'category hub focus',
          run: () => reRoot(c),
        })
      ),
      {
        id: 'about',
        group: 'go',
        label: 'about',
        hint: '/about',
        keywords: 'about bio resume engineering colophon',
        run: () => go('/about'),
      },
      ...LINKS.map(
        (l): Item => ({
          id: `link-${l.label}`,
          group: 'links',
          label: l.label,
          hint: l.href.startsWith('mailto:') ? l.href.slice(7) : new URL(l.href).hostname,
          keywords: 'contact link',
          run: () => {
            close()
            if (l.href.startsWith('mailto:')) window.location.href = l.href
            else window.open(l.href, '_blank', 'noopener,noreferrer')
          },
        })
      ),
      {
        id: 'terminal',
        group: 'commands',
        label: 'toggle terminal',
        hint: 'ctrl+`',
        keywords: 'shell cli ide',
        run: () => {
          close()
          window.dispatchEvent(new Event(TOGGLE_TERMINAL_EVENT))
        },
      },
    ]
  }, [router, pathname, bridge])

  const matches = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return items
    return items.filter((it) => {
      const haystack = `${it.label} ${it.keywords}`.toLowerCase()
      return tokens.every((t) => haystack.includes(t))
    })
  }, [items, query])

  // ⌘K / ctrl+K from anywhere; Escape closes. A visible trigger (e.g. the
  // sidebar's ⌘k button, for mobile taps where there's no keyboard) dispatches
  // the same open/close via TOGGLE_PALETTE_EVENT.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
        setQuery('')
        setSelected(0)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    const onToggle = () => {
      setOpen((o) => !o)
      setQuery('')
      setSelected(0)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener(TOGGLE_PALETTE_EVENT, onToggle)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(TOGGLE_PALETTE_EVENT, onToggle)
    }
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const clamp = (i: number) => Math.min(Math.max(i, 0), Math.max(matches.length - 1, 0))
  const select = (i: number) => {
    const next = clamp(i)
    setSelected(next)
    listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' })
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      select(selected + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      select(selected - 1)
    } else if (e.key === 'Enter') {
      matches[clamp(selected)]?.run()
    }
  }

  if (!open) return null

  const sel = clamp(selected)

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/20"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="mx-auto mt-[18vh] w-full max-w-lg border border-line bg-paper shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelected(0)
          }}
          onKeyDown={onKeyDown}
          placeholder="jump to…"
          aria-label="Search commands"
          className="w-full border-b border-line bg-paper px-4 py-3 font-mono text-sm text-ink outline-none placeholder:text-faint"
        />
        <ul ref={listRef} role="listbox" aria-label="Results" className="max-h-[40vh] overflow-y-auto py-1">
          {matches.length === 0 && (
            <li className="px-4 py-3 font-mono text-xs text-faint">no matches</li>
          )}
          {matches.map((it, i) => {
            const first = i === 0 || matches[i - 1].group !== it.group
            return (
              <li key={it.id} role="option" aria-selected={i === sel}>
                {first && (
                  <div className="px-4 pb-1 pt-2 font-mono text-[10px] uppercase tracking-wider text-faint">
                    {GROUP_LABEL[it.group]}
                  </div>
                )}
                <button
                  type="button"
                  onClick={it.run}
                  onMouseMove={() => setSelected(i)}
                  className={`flex w-full items-baseline justify-between gap-4 px-4 py-1.5 text-left font-mono text-sm ${
                    i === sel ? 'bg-surface text-clay' : 'text-ink'
                  }`}
                >
                  <span className="truncate">{it.label}</span>
                  <span className="shrink-0 text-xs text-faint">{it.hint}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <div className="border-t border-line px-4 py-2 font-mono text-[10px] text-faint">
          ↑↓ navigate · ↵ open · esc close
        </div>
      </div>
    </div>
  )
}
