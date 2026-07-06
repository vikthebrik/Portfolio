# CLAUDE.md — Portfolio project memory

Read this first. It encodes the decisions that keep the codebase coherent. When
something here conflicts with an instinct to do it differently, follow this file
or propose a change to it explicitly.

## What this is

A CS/DSCI portfolio that presents work as an **explorable network graph** in the
Obsidian style. The landing view is a single living web centered on a **ROOT node**
(the landing itself) with **five spokes**: the four category hubs plus a
`how it works` node. Projects hang off their category; `related`/`tag` edges
cross-link everything into a web. Hovering a node highlights its connections and
dims the rest; clicking a category sets a soft focus that fades/minimizes the
unrelated nodes (no filtering — the whole web stays on screen). A names-only file
tree in the sidebar is the accessible, keyboard-navigable path through everything.

Four top-level categories (hub nodes): `tech`, `design`, `drone`, `research`.

The single most important rule: **project content is derived from content, never
hand-maintained.** Adding a project = adding one MDX file; its node and edges
rebuild from frontmatter. Do not introduce a hand-edited graph config for projects.
*Structural/navigational* nodes — `root`, `how it works`, and the category hubs — are
the one exception: they're defined in code (`lib/graph.ts`), exactly as the category
hubs already are. Content vs. structure is the line; projects never get hand-placed.

## Stack

- Next.js 16, App Router, React Server Components.
- Velite for the typed content layer (Zod schemas, validates frontmatter at
  build, emits typed JSON to `.velite/`). Imported via the `#site/content` alias.
- Tailwind CSS v4, CSS-first config. Design tokens live in `app/globals.css`
  under `@theme`. Never hardcode a hex value in a component — use a token.
- Graph rendering: `d3-force` (layout) + `d3-zoom` (pan/zoom, and the zoom scale that
  drives label-fade) + SVG. At our node count (~12) the renderer is state-driven
  (React renders nodes/edges from simulation positions on a rAF-coalesced tick) so
  hover/focus/zoom styling composes cleanly. Node drag is hand-rolled (pointer events
  + `getScreenCTM()` on the zoomed `<g>`). Escape hatch if we ever exceed ~150 nodes:
  `react-force-graph` (canvas) with a custom `nodeCanvasObject`. Don't reach for it
  prematurely.
- Deploy: Vercel (per-PR preview deploys).

## Content schema

Defined in `velite.config.ts`. One MDX file per project under
`content/projects/`. Frontmatter drives the graph:

- `category` → membership edge to a hub node.
- `related` (array of project slugs) → project↔project edges.
- shared `tags` → faint secondary edges (these weave the web).
- `order` (optional int) → manual sort within a category (sidebar order; ties broken
  by title).
- `pinned` (optional bool) → force-show. Today it keeps a node's label always visible;
  the planned view-controls filters (next session) will also keep pinned nodes shown.

Adding a project never touches component code.

## Topology

One connected web, built in `lib/graph.ts`:

- **root** — the landing node (`id: root`, routes to `/`). Center of the web.
- **five spokes** from root: the four category hubs + a **how it works** node
  (`id: how-it-works`, routes to `/about`). These are `spoke` edges.
- **projects** hang off their category hub (`membership` edges).
- **related** (project↔project) and shared **tags** add cross-links that weave the
  categories together into a web rather than four separate stars.

`root`, `how it works`, and the hubs are structural nodes defined in code; only
projects are content-derived. There is no `focused`/filtered subgraph — the whole web
is always rendered (see Navigation).

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

Warm-analog, restrained, Obsidian-style — quiet "Claude Code" feel. The single
signature element is the navigable graph; everything else stays quiet.

Tokens (see `app/globals.css` for the canonical values):
paper `#FAF9F5`, surface `#EFEEE5`, ink `#1F1E1A`, muted `#6B6862`,
line `#DAD7CD`, clay accent `#C15F3C` (active/highlighted nodes & links only — use
sparingly).

Type stays mono-forward (JetBrains Mono) for labels and UI. The graph is **Obsidian-
style**, not ASCII:

- Nodes are **circles** (radius by degree/type: root largest → hubs → projects) with
  the **title only** beneath — no `[ brackets ]`, no summary on the node.
- Labels **fade in/out with zoom**: structural labels (root/hubs/how-it-works) always
  show; project labels fade in as you zoom in (and a `pinned` project always shows).
- Links are **soft curved** paths (quadratic bézier), not dashed line-art.
- **Hover** highlights a node's connections and dims the rest; **soft focus** (clicking
  a category) fades/minimizes the unrelated nodes. Clay marks only what's emphasized.

The sidebar is a **clean names-only file tree** (project titles, no descriptions, no
box-drawing glyphs). Resist adding color; the restraint is the point.

(Pivoted 2026-06: away from the earlier full-ASCII treatment — bracket nodes,
box-drawing sidebar, dashed line-art edges — toward this Obsidian-style graph.)

Quality floor, non-negotiable: responsive down to mobile (graph collapses to the
sidebar list on small screens — do not cram the force graph onto a phone),
visible keyboard focus, `prefers-reduced-motion` respected (no drift animation,
instant state transitions).

## Navigation

One always-visible web; navigation is emphasis + routing, not subgraph filtering:

- **overview** — the full web. No node is hidden.
- **soft focus** — clicking a category hub emphasizes that cluster (hub + its projects
  + their edges + the root spoke) and fades/minimizes everything else. Synced to the
  URL as `?c=<category>` (a shareable deep link; Back/Forward work) via the History
  API, so the graph never remounts. Clicking root (or the focused category again)
  clears focus.
- **detail** — a project's case study at `/work/[slug]` (RSC, unchanged). `how it
  works` routes to `/about`.

The simulation runs once over the full web and does **not** re-run on focus — focus
and hover only change styling. (`focusCategory()` from the old filtered-subgraph model
is retired.)

## Manual control (override the auto-derivation)

Auto-derivation is the default; these let a human override it:

- `order` frontmatter — manual sort within a category (sidebar; seeds nothing else yet).
- `pinned` frontmatter — force-show (today: label always visible; later: survives filters).
- **Layout** — the view panel picks a layout: `auto` (content-based default) or a manual
  override (`web` / `radial` / `tree` / `cluster`). Persisted in `view:v1` (below).
- **Per-layer opacity** — depth (root / hubs / projects) × folder (the four categories);
  a node's opacity is `depth[layer] × folder[category]`. This is how the graph reads as
  deliberate layers without hiding anything. Persisted in `view:v1`.
- **Hand-dragged node positions** — dragging a node pins it (`fx/fy`) and persists to
  `localStorage['portfolio:graph:positions:v1']` as `{ [id]: {x, y} }`, reapplied on
  load. Pins win over the layout (the ultimate override); switching layout only
  arranges the *un*pinned nodes. "Reset positions" in the panel clears them. Intentional
  client-only state that can diverge from the derived layout.

## Layouts

`lib/layouts.ts` (client-only; imports `d3-force`) owns the graph arrangements. Each is a
*reconfiguration of the simulation's forces* (never static positions) so switching just
reheats — node objects and drag pins survive. `layer` (BFS depth from root, computed in
`lib/graph.ts`: root 0, hubs+about 1, projects 2) drives the concentric layouts and the
per-layer opacity.

- **web** — root pinned center + mild radial-by-layer → centralized organic web (fixes the
  old "chain" look).
- **radial** — strong radial-by-layer → clean concentric rings.
- **cluster** — each folder anchored around the center → folders separate spatially.
- **tree** — root top-center, y by layer → rough top-down hierarchy (a force approximation).

`chooseDefaultLayout(graph)` is the "dynamic default": no cross-links → tree; densely
interlinked → web; evenly spread → radial; else cluster. The panel's `auto` chip always
shows this pick; a manual choice overrides the render but not the chip.

## View controls (panel — part 1 built, rest deferred)

`components/ViewControls.tsx` — a collapsible Obsidian-like panel, persisted to
`localStorage['portfolio:graph:view:v1']` (`{ layout, depthOpacity, folderOpacity }`).

- **Built:** the layout selector (auto + manual) and the per-layer opacity sliders (see
  Manual control), plus "reset positions".
- **Still deferred (next pass):** sliders for repel force / link distance / center force;
  node-size scaling; label-fade threshold; filters by category / tag / search; toggle
  tag-edges; show/hide orphans. Persist all to `localStorage`.

## Repo conventions

- `lib/graph.ts` is the only place that builds nodes/edges. Keep it pure. It emits the
  structural nodes (root, how-it-works, category hubs) plus the content-derived project
  nodes; project data comes only from MDX frontmatter.
- Shared graph constants (e.g. `CATEGORIES` / the `Category` type) live in
  `lib/categories.ts`, not `velite.config.ts`. `lib/graph.ts` runs inside the app
  bundle, and importing `velite.config.ts` there drags Velite's build tooling
  (esbuild's native binary) into the bundle and breaks `next build`. `velite.config.ts`
  imports the categories from `lib/categories.ts`, so there is still one source of truth.
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
