# Portfolio — explorable work graph

A CS/DSCI portfolio that presents work as a navigable force-directed network.
Landing view is the full graph of every project; it simplifies to a category,
then to a single case study, with an ASCII folder-tree sidebar tracking location.

> Architecture decisions live in **[CLAUDE.md](./CLAUDE.md)** — read that first.

## Stack

- **Next.js 16** (App Router, RSC)
- **Velite** — typed content layer; validates MDX frontmatter, emits typed JSON
- **Tailwind v4** — tokens in `app/globals.css`
- **d3-force + SVG** — graph rendering
- **Vercel** — hosting + preview deploys

## Structure

```
content/projects/      one .mdx per project — the source of truth
velite.config.ts       content schema (the graph derives from this)
lib/graph.ts           pure node/edge derivation + focus subgraph
app/globals.css        design tokens (warm-analog / ASCII)
CLAUDE.md              project memory for Claude Code / Antigravity
```

## Add a project

Drop a new file in `content/projects/`. Set `category`, `summary`, `tags`, and
`related`. The graph rebuilds itself — no component or config edits. See
`mcc-scheduler.mdx` for the shape.

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

## Build order

Phases are tracked in GitHub Projects. Current foundation covers Phase 0–1:
schema, derivation, tokens. Next: the graph component and its
overview → focused → detail state machine.
