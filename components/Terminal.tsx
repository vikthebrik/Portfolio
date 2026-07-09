'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { projects } from '#site/content'
import { CATEGORIES, type Category } from '@/lib/categories'
import { useIntroActive } from '@/lib/intro'
import { IDENTITY, LINKS } from '@/lib/links'
import { useGraphBridge } from './GraphBridge'
import { TOGGLE_TERMINAL_EVENT } from './CommandPalette'

/**
 * A unix-style shell over the portfolio's content tree — the IDE-familiar way in.
 * Categories are directories, projects are .mdx files, `how-it-works.md` routes to
 * /about. Traversal only: ls/cd/pwd/tree/cat/open (+ help/clear/exit). `cd` into a
 * category re-roots the main graph through the bridge when it's on screen; `open`
 * navigates for real. Pulled up/down with ctrl+` (VS Code's binding) or the bottom-left
 * tab; `exit` and Escape also close it. Keyboard: ↑/↓ history, Tab completion.
 *
 * Desktop-only (hidden on mobile — it's a keyboard instrument). Mounted once in
 * app/layout.tsx so it persists across page navigations, like the minimap.
 */

const HOW_IT_WORKS = 'how-it-works.md'

type FsFile = {
  name: string // e.g. "mcc-scheduler.mdx"
  title: string
  summary: string
  tags: readonly string[]
  year?: number
  links?: Record<string, string | undefined>
  url: string // route to open
}

type Line = { id: number; kind: 'cmd' | 'out' | 'err'; text: string }

export function Terminal() {
  const router = useRouter()
  const pathname = usePathname()
  const bridge = useGraphBridge()

  const [open, setOpen] = useState(false)
  // The pull tab hides while the launch intro runs (like the minimap).
  const introActive = useIntroActive()
  const [cwd, setCwd] = useState<'' | Category>('') // '' = root
  const [lines, setLines] = useState<Line[]>([])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const histIdx = useRef(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(0)

  // The virtual filesystem, derived from content (same source as the graph).
  const fs = useMemo(() => {
    const byCategory = new Map<Category, FsFile[]>()
    for (const c of CATEGORIES) byCategory.set(c, [])
    for (const p of projects) {
      byCategory.get(p.category)?.push({
        name: `${p.slug}.mdx`,
        title: p.title,
        summary: p.summary,
        tags: p.tags,
        year: p.year,
        links: p.links,
        url: p.url,
      })
    }
    for (const list of byCategory.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name))
    }
    return byCategory
  }, [])

  const print = useCallback((kind: Line['kind'], text: string) => {
    setLines((ls) => {
      const added = text
        .split('\n')
        .map((t) => ({ id: nextId.current++, kind, text: t }))
      return [...ls, ...added].slice(-400) // cap scrollback
    })
  }, [])

  // --- path helpers -----------------------------------------------------------

  const prompt = (dir: string) => `guest@portfolio:${dir === '' ? '~' : `~/${dir}`}$`

  /** Resolve a path arg against cwd → { dir } | { dir, file } | null (not found). */
  const resolve = (
    arg: string,
  ): { dir: '' | Category; file?: FsFile | 'about' } | null => {
    const parts = (arg.startsWith('/') ? arg : `${cwd}/${arg}`)
      .split('/')
      .filter((s) => s !== '' && s !== '.')
    const stack: string[] = []
    for (const part of parts) {
      if (part === '..') stack.pop()
      else if (part === '~') stack.length = 0
      else stack.push(part)
    }
    if (stack.length === 0) return { dir: '' }
    if (stack.length === 1) {
      const [name] = stack
      if ((CATEGORIES as readonly string[]).includes(name))
        return { dir: name as Category }
      if (name === HOW_IT_WORKS || name === 'how-it-works')
        return { dir: '', file: 'about' }
      const file = findFile('', name)
      return file ? { dir: '', file } : null
    }
    if (stack.length === 2) {
      const [dir, name] = stack
      if (!(CATEGORIES as readonly string[]).includes(dir)) return null
      const file = findFile(dir as Category, name)
      return file ? { dir: dir as Category, file } : null
    }
    return null
  }

  /** Find a project file by name — forgiving about the .mdx suffix and the folder. */
  const findFile = (dir: '' | Category, name: string): FsFile | undefined => {
    const norm = name.endsWith('.mdx') ? name : `${name}.mdx`
    const pools = dir === '' ? [...fs.values()] : [fs.get(dir) ?? []]
    for (const pool of pools) {
      const hit = pool.find((f) => f.name === norm)
      if (hit) return hit
    }
    return undefined
  }

  const listDir = (dir: '' | Category): string[] => {
    if (dir === '') return [...CATEGORIES.map((c) => `${c}/`), HOW_IT_WORKS]
    return (fs.get(dir) ?? []).map((f) => f.name)
  }

  // --- commands ----------------------------------------------------------------

  const run = (raw: string) => {
    const text = raw.trim()
    print('cmd', `${prompt(cwd)} ${raw}`)
    if (!text) return
    setHistory((h) => (h[h.length - 1] === text ? h : [...h, text]))
    histIdx.current = -1

    const [cmd, ...args] = text.split(/\s+/)
    const arg = args.join(' ')

    switch (cmd) {
      case 'help':
        print(
          'out',
          [
            'ls [path]        list directory',
            'cd <path>        change directory (re-roots the graph when it is on screen)',
            'pwd              print working directory',
            'tree             the whole portfolio at a glance',
            'cat <file>       peek at a project (frontmatter)',
            'open <path>      open a project / category / how-it-works for real',
            'contact          links: github, linkedin, resume, email',
            'clear            clear the scrollback',
            'exit             close the terminal (ctrl+` toggles it)',
          ].join('\n'),
        )
        break

      case 'ls': {
        const target = arg ? resolve(arg) : { dir: cwd }
        if (!target) return print('err', `ls: ${arg}: No such file or directory`)
        if (target.file)
          return print(
            'out',
            target.file === 'about' ? HOW_IT_WORKS : target.file.name,
          )
        print('out', listDir(target.dir).join('\n'))
        break
      }

      case 'cd': {
        if (!arg || arg === '~' || arg === '/') {
          setCwd('')
          if (pathname === '/') bridge?.setCenter(null)
          return
        }
        const target = resolve(arg)
        if (!target) return print('err', `cd: ${arg}: No such file or directory`)
        if (target.file)
          return print('err', `cd: ${arg}: Not a directory (try: open ${arg})`)
        setCwd(target.dir)
        // Keep the graph in step: cd into a category re-roots it (home page only —
        // the bridge handler is registered by the on-screen GraphExplorer).
        if (pathname === '/') bridge?.setCenter(target.dir === '' ? null : target.dir)
        break
      }

      case 'pwd':
        print('out', cwd === '' ? '/' : `/${cwd}`)
        break

      case 'tree': {
        // how-it-works.md is always the final entry, so every category is `├──`.
        const out: string[] = ['.']
        for (const c of CATEGORIES) {
          out.push(`├── ${c}/`)
          const files = fs.get(c) ?? []
          files.forEach((f, j) => {
            out.push(`│   ${j === files.length - 1 ? '└──' : '├──'} ${f.name}`)
          })
        }
        out.push(`└── ${HOW_IT_WORKS}`)
        print('out', out.join('\n'))
        break
      }

      case 'cat': {
        if (!arg) return print('err', 'cat: missing operand')
        const target = resolve(arg)
        if (!target?.file) return print('err', `cat: ${arg}: No such file`)
        if (target.file === 'about')
          return print(
            'out',
            'How this site works — content-derived graph, one MDX per project.\nRun `open how-it-works.md` for the full story.',
          )
        const f = target.file
        const links = Object.entries(f.links ?? {})
          .filter(([, v]) => v)
          .map(([k, v]) => `#   ${k}: ${v}`)
        print(
          'out',
          [
            '---',
            `# title:   ${f.title}`,
            `# year:    ${f.year ?? '—'}`,
            `# tags:    ${f.tags.join(', ')}`,
            ...links,
            '---',
            f.summary,
            '',
            `(full case study: open ${f.name})`,
          ].join('\n'),
        )
        break
      }

      case 'open': {
        if (!arg || arg === '.') {
          if (cwd === '') return print('err', 'open: nothing to open here (try a path)')
          router.push(`/?focus=${cwd}`)
          return
        }
        const target = resolve(arg)
        if (!target) return print('err', `open: ${arg}: No such file or directory`)
        if (target.file === 'about') return router.push('/about')
        if (target.file) return router.push(target.file.url)
        router.push(target.dir === '' ? '/' : `/?focus=${target.dir}`)
        break
      }

      case 'clear':
        setLines([])
        break

      case 'exit':
        setOpen(false)
        break

      case 'contact':
        print(
          'out',
          [
            `${IDENTITY.name} — ${IDENTITY.role}`,
            ...LINKS.map((l) => `  ${l.label.padEnd(12)}${l.href.replace('mailto:', '')}`),
          ].join('\n'),
        )
        break

      case 'whoami':
        print('out', 'guest — the interesting one is in the file tree. try `contact`.')
        break

      case 'sudo':
        print('err', 'Permission denied: this incident will be reported to the hiring committee.')
        break

      default:
        print('err', `${cmd}: command not found (try \`help\`)`)
    }
  }

  // --- completion --------------------------------------------------------------

  const complete = () => {
    const parts = input.split(/\s+/)
    const isFirst = parts.length <= 1
    const partial = parts[parts.length - 1] ?? ''
    const candidates = isFirst
      ? ['help', 'ls', 'cd', 'pwd', 'tree', 'cat', 'open', 'contact', 'clear', 'exit'].filter(
          (c) => c.startsWith(partial),
        )
      : completePath(partial)
    if (candidates.length === 1) {
      parts[parts.length - 1] = candidates[0]
      setInput(parts.join(' ') + (candidates[0].endsWith('/') ? '' : ' '))
    } else if (candidates.length > 1) {
      // Extend to the longest common prefix, and show the options.
      let prefix = candidates[0]
      for (const c of candidates)
        while (!c.startsWith(prefix)) prefix = prefix.slice(0, -1)
      if (prefix.length > partial.length) {
        parts[parts.length - 1] = prefix
        setInput(parts.join(' '))
      } else {
        print('out', candidates.join('   '))
      }
    }
  }

  const completePath = (partial: string): string[] => {
    const slash = partial.lastIndexOf('/')
    const dirPart = slash >= 0 ? partial.slice(0, slash + 1) : ''
    const namePart = slash >= 0 ? partial.slice(slash + 1) : partial
    const base = dirPart ? resolve(dirPart) : { dir: cwd }
    if (!base || base.file) return []
    return listDir(base.dir)
      .filter((e) => e.startsWith(namePart))
      .map((e) => dirPart + e)
  }

  // --- wiring ------------------------------------------------------------------

  // ctrl+` toggles, from anywhere (VS Code's muscle memory) — and so does the
  // command palette, through a window event.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '`' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    const onToggle = () => setOpen((o) => !o)
    window.addEventListener('keydown', onKey)
    window.addEventListener(TOGGLE_TERMINAL_EVENT, onToggle)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(TOGGLE_TERMINAL_EVENT, onToggle)
    }
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Greet once, on first open.
  const greeted = useRef(false)
  useEffect(() => {
    if (open && !greeted.current) {
      greeted.current = true
      print('out', 'portfolio shell — `help` for commands, `tree` for the map.')
    }
  }, [open, print])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [lines])

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      run(input)
      setInput('')
    } else if (e.key === 'Tab') {
      e.preventDefault()
      complete()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const i = histIdx.current
      const next = i === -1 ? history.length - 1 : Math.max(i - 1, 0)
      histIdx.current = next
      setInput(history[next] ?? '')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const i = histIdx.current
      const next = i === -1 ? -1 : i + 1
      histIdx.current = next >= history.length ? -1 : next
      setInput(next >= history.length ? '' : (history[next] ?? ''))
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const lineClass: Record<Line['kind'], string> = {
    cmd: 'text-ink',
    out: 'text-muted',
    err: 'text-clay',
  }

  return (
    <div className="hidden md:block">
      {/* pull tab — bottom-left, mirrors the minimap's bottom-right panel */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={
            'fixed bottom-4 left-4 z-20 border border-line bg-surface px-2.5 py-1.5 font-mono text-xs text-muted hover:text-clay' +
            (introActive
              ? ' pointer-events-none opacity-0'
              : ' transition-opacity duration-700')
          }
          aria-label="Open terminal (ctrl+`)"
        >
          &gt;_ terminal <span className="text-faint">⌃`</span>
        </button>
      )}

      <section
        aria-label="Portfolio terminal"
        // React 19 supports the boolean `inert` attribute: closed = out of the a11y
        // tree and untabbable, while staying mounted so the slide transition runs.
        inert={!open}
        className={`fixed inset-x-0 bottom-0 z-30 flex h-[38vh] flex-col border-t border-line bg-paper/95 backdrop-blur-sm transition-transform duration-300 motion-reduce:transition-none ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex items-center justify-between border-b border-line px-3 py-1">
          <span className="font-mono text-xs uppercase tracking-wide text-faint">
            terminal
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="font-mono text-xs text-muted hover:text-clay"
            aria-label="Close terminal"
          >
            ▾
          </button>
        </div>

        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          className="min-h-0 flex-1 overflow-y-auto px-3 py-2 font-mono text-xs leading-5"
        >
          {lines.map((l) => (
            <div key={l.id} className={`whitespace-pre-wrap ${lineClass[l.kind]}`}>
              {l.text || ' '}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t border-line px-3 py-2 font-mono text-xs">
          <span className="shrink-0 text-clay">{prompt(cwd)}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-faint"
            placeholder="help"
            aria-label="Terminal input"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </section>
    </div>
  )
}
