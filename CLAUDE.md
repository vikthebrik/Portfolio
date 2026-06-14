# CLAUDE.md — Portfolio project memory

Read this first. It encodes the decisions that keep the codebase coherent. When
something here conflicts with an instinct to do it differently, follow this file
or propose a change to it explicitly.

## What this is

A CS/DSCI portfolio that presents work as an **explorable network graph**.
The landing view is a dense force-directed graph of every project; the user
clicks to simplify it down to a category, then to a single project's case study.
A sidebar mirrors the current location as a folder tree and doubles as the
accessible, keyboard-navigable path through everything.

Four top-level categories (hub nodes): `tech`, `design`, `drone`, `research`.

The single most important rule: **the graph is derived from content, never
hand-maintained.** Adding a project = adding one MDX file. Nodes and edges
rebuild from its frontmatter. Do not introduce a separate hand-edited graph
config.

## Stack

- Next.js 16, App Router, React Server Components.
- Velite for the typed content layer (Zod schemas, validates frontmatter at
  build, emits typed JSON to `.velite/`). Imported via the `#site/content` alias.
- Tailwind CSS v4, CSS-first config. Design tokens live in `app/globals.css`
  under `@theme`. Never hardcode a hex value in a component — use a token.
- Graph rendering: `d3-force` + SVG (crisp monospace labels at our node count).
  Escape hatch if we ever exceed ~150 nodes: `react-force-graph` (canvas) with a
  custom `nodeCanvasObject`. Don't reach for it prematurely.
- Deploy: Vercel (per-PR preview deploys).

## Content schema

Defined in `velite.config.ts`. One MDX file per project under
`content/projects/`. Frontmatter drives the graph:

- `category` → membership edge to a hub node.
- `related` (array of project slugs) → project↔project edges.
- shared `tags` → faint secondary edges (these create the "dense network" on load).

Adding a project never touches component code.

## Media strategy (important)

High-res images and video do **not** live in the repo or `public/`. They bloat
Git, builds, and deploys.

- Images: store on a CDN/blob store (Vercel Blob, Cloudflare R2, or S3).
  Reference by URL in frontmatter (`cover`, `poster`). Serve through
  `next/image` with `remotePatterns` configured in `next.config.ts`.
- Video: use a streaming host (Mux or Cloudflare Stream), not raw MP4 files.
  Reference the playback URL in frontmatter (`video`).
- Only small inline diagrams (<200KB, e.g. an architecture sketch) may live
  beside the MDX and be processed by Velite's `s.image()`.

## Design language

Warm-analog, ASCII-forward, restrained — the "Claude Code" feel. The single
signature element is the navigable graph; everything else stays quiet.

Tokens (see `app/globals.css` for the canonical values):
paper `#FAF9F5`, surface `#EFEEE5`, ink `#1F1E1A`, muted `#6B6862`,
line `#DAD7CD`, clay accent `#C15F3C` (active nodes/links only — use sparingly).

Type is mono-forward (JetBrains Mono). Nodes render as `[ project_name ]`.
Sidebar uses box-drawing characters (`├──`, `└──`). Edges are thin/dashed to
read as ASCII line-art. Resist adding color; the restraint is the point.

Quality floor, non-negotiable: responsive down to mobile (graph collapses to the
sidebar list on small screens — do not cram the force graph onto a phone),
visible keyboard focus, `prefers-reduced-motion` respected (no drift animation,
instant state transitions).

## Navigation state machine

Three states: `overview` (full graph) → `focused` (one category cluster) →
`detail` (one project's case study). The sidebar breadcrumb reflects state. The
force simulation re-runs on the filtered subgraph on each transition.

## Repo conventions

- `lib/graph.ts` is the only place that builds nodes/edges. Keep it pure.
- Conventional commits. Public repo — treat the repo itself as a portfolio piece
  (clean structure, strong README).
- CI (GitHub Actions): lint, typecheck, build, Lighthouse budget, Playwright
  visual-regression on the graph.

## Tool division of labor

- **Claude Code**: the content pipeline, `lib/graph.ts`, the graph state machine,
  tests, refactors. Precision work.
- **Antigravity**: visual iteration via its Browser Subagent (it drives real
  Chrome and self-debugs UI), and parallel build-out of the four category
  sections. Restart its window often — context grows and it gets heavy.
- **MCP servers** (keep the set small — each costs context):
  GitHub, Context7 (current d3/Next/Velite docs), Playwright (UI verification),
  Figma Dev Mode (pull real design tokens for the design pillar). Skip Filesystem
  MCP — Claude Code has built-in file tools.

## Custom skill to build

An `add-project` skill that knows this frontmatter schema and scaffolds a new
MDX file + asset references + suggested `related` links in one command. This is
the "adaptable" workflow made concrete.
