# Portfolio — explorable work graph

A CS/DSCI portfolio presented as one living, Obsidian-style web. Every project is
a node; category hubs, `related` links, and shared tags weave them together.
Clicking any node **re-roots** the web on it (the layout re-rings by graph
distance, the camera glides); clicking a centered project opens its case study.
Nothing is ever filtered out — navigation is emphasis, not hiding.

Four ways in, all keyboard-friendly:

- **the graph** — hover to light up connections, click to re-root, drag to
  rearrange (pins persist), arrows walk edges, Enter opens
- **⌘K** — a command palette that jumps anywhere from any page
- **ctrl+`** — a real terminal over the content tree (`ls`, `cd`, `tree`,
  `cat`, `open`); `cd design` re-roots the live graph
- **the sidebar** — a names-only tree with search, and the accessible path
  through everything

> Architecture decisions live in **[CLAUDE.md](./CLAUDE.md)** — read that first.

## Stack

- **Next.js 16** (App Router, RSC)
- **Velite** — typed content layer; validates MDX frontmatter, emits typed JSON
- **Tailwind v4** — design tokens in `app/globals.css`
- **d3-force + SVG** — one long-lived simulation; layouts are force
  reconfigurations, never remounts
- **Vercel** — hosting, preview deploys, Blob for media

## Structure

```
content/projects/      one .mdx per project — the source of truth
velite.config.ts       content schema (the graph derives from this)
lib/graph.ts           pure node/edge derivation (structural nodes + content)
lib/layouts.ts         force layouts (web / radial / tree / cluster) + auto pick
components/            ForceGraph, Minimap, Terminal, CommandPalette, …
app/globals.css        design tokens (warm-analog, mono-forward)
tests/e2e/             Playwright smoke tests (structure + behavior, no pixels)
CLAUDE.md              project memory for Claude Code
```

## Add a project

Drop a new file in `content/projects/`. Set `category`, `summary`, `tags`, and
`related`. The node and its edges rebuild from frontmatter — no component or
config edits. See `mcc-scheduler.mdx` for the shape.

## Media (read before uploading anything large)

High-res images and video do **not** go in this repo or `public/`.

- **Images** → CDN / blob store (Vercel Blob, Cloudflare R2, S3). Reference the
  URL in frontmatter `cover` / `poster`; add the host to `next.config.ts`
  `images.remotePatterns` and serve via `next/image`.
- **Video** → a streaming host (Mux, Cloudflare Stream), referenced by playback
  URL in frontmatter `video`. Don't commit raw MP4s.
- Only tiny inline diagrams (<200KB) may sit beside the MDX.

To upload: `npm run media:upload -- <file-or-dir> [--prefix <folder>]` (needs
`BLOB_READ_WRITE_TOKEN` in `.env`). It prints each file's Blob URL plus a
ready-to-paste `<Figure>` snippet with the true aspect ratio. In MDX bodies use
`<Figure>` / `<Gallery>` (see `components/mdx/`) for images and PDF previews —
for a PDF, show a preview image and pass the PDF's URL as `href`.

## Getting started

```bash
npm install
npm run dev        # velite runs in watch mode alongside next dev
```

## Checks

```bash
npm run lint       # eslint, zero-warning gate
npm run typecheck
npm run build      # velite --clean first — content layer before pages
npm run test:e2e   # Playwright against the production build
```

CI (GitHub Actions) runs all four on every push and PR.
