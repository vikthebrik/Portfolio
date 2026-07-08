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
dims the rest; clicking any node **re-roots** the web on it (reheats the layout to
center on it, glides the camera, emphasizes its cluster) while the whole web stays on
screen — no filtering. A names-only file tree in the sidebar is the accessible,
keyboard-navigable path through everything.

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

The store is **Vercel Blob**. Upload with `npm run media:upload -- <file-or-dir>
[--prefix <folder>]` (`scripts/upload-media.mjs`; reads `BLOB_READ_WRITE_TOKEN`
from `.env`) — deterministic paths (`portfolio/<prefix>/<name>`, overwrite on
re-upload → stable URLs), prints each URL plus a ready-to-paste `<Figure>`
snippet with the sniffed aspect ratio. In MDX bodies, images go through the
**`<Figure>` / `<Gallery>`** components (`components/mdx/`, registered in
`MDXContent.tsx`): `Figure` is a captioned, never-cropping (object-contain)
frame — pass the true `ratio` to avoid letterboxing; a PDF is represented by a
preview image with the PDF's Blob URL as `href` ("view full ↗"). `Gallery` is a
responsive 1–3-column grid of Figures — the backbone of design case studies.

## Design language

Warm-analog, restrained, Obsidian-style — quiet "Claude Code" feel. The single
signature element is the navigable graph; everything else stays quiet.

Tokens (see `app/globals.css` for the canonical values):
paper `#FAF9F5`, surface `#EFEEE5`, ink `#1F1E1A`, muted `#6B6862`,
line `#DAD7CD`, clay accent `#C15F3C` (active/highlighted nodes & links only — use
sparingly).

Type stays mono-forward (JetBrains Mono) for labels and UI. The graph is **Obsidian-
style**, not ASCII:

- Nodes are **circles** sized by **layer** (root largest → hubs → projects; small
  degree bump for projects) with the **title only** beneath — no `[ brackets ]`, no
  summary on the node.
- **Root, hubs, and how-it-works are always on**: fixed full opacity and always
  labelled — the structural skeleton never fades. The opacity controls (projects
  slider × folder sliders) only dim *projects*.
- Project labels **fade in/out with zoom** (a `pinned`, hovered, or search-matched
  project always shows its label).
- Links are **soft curved** paths (quadratic bézier), not dashed line-art.
- **Hover** highlights a node's connections and dims the rest; **re-root** (clicking any
  node) recenters the web on it and fades/minimizes the unrelated nodes; **search**
  emphasizes matches. Clay marks only what's emphasized (the centered node included).

The sidebar is a **clean names-only file tree** (project titles, no descriptions, no
box-drawing glyphs) with a **search** box at its top. Resist adding color; the
restraint is the point.

(Pivoted 2026-06: away from the earlier full-ASCII treatment — bracket nodes,
box-drawing sidebar, dashed line-art edges — toward this Obsidian-style graph.)

Quality floor, non-negotiable: responsive down to mobile (graph collapses to the
sidebar list on small screens — do not cram the force graph onto a phone),
visible keyboard focus, `prefers-reduced-motion` respected (no drift animation,
instant state transitions).

## Navigation

One always-visible web; navigation is emphasis + routing, not subgraph filtering:

- **overview** — the full web, rooted on `root`. No node is hidden.
- **re-root** — clicking **any** node (a category hub *or* a project) makes it the new
  center: the layout reheats so the web rings by graph-distance *from it* (`applyLayout`'s
  `centerId`), and the motion **glides, never snaps** — the center pin travels from the
  node's current spot to the layout anchor while the camera tracks the same target, one
  shared ~900ms eased tween (`GLIDE_MS`; reduced-motion jumps instantly). Its cluster
  (the node + direct neighbors) is emphasized; everything else fades **by graph-distance
  from the center** (see "focus fade" below), so same-ring peers — the other hubs — stay
  readable instead of vanishing. The full web stays on screen — nothing is filtered. Synced to the URL as `?focus=<nodeId>` (a shareable deep
  link) via the History API, so the graph never remounts and **browser Back/Forward — plus
  the in-graph `‹ ›` buttons — traverse the re-root history**. Clicking `root`, the centered
  hub again, or "overview" in the breadcrumb clears back to the root. A *project* takes one
  click to center; clicking the already-centered project (or the breadcrumb's `open ↵`)
  opens its case study.
- **detail** — a project's case study at `/work/[slug]` (RSC, unchanged). `how it
  works` routes to `/about`.
- **search** — the sidebar search box matches project title/tags: the graph emphasizes
  matches (dims the rest, same mechanism as hover/re-root) and the sidebar tree filters to
  matches. Transient, not persisted.
- **keyboard traversal** — the graph is directly keyboard-navigable: roving tabindex (the
  centered node is the single tabstop), **arrows walk edges** to the neighbor whose
  direction best matches the key (cosine against the edge vector), Enter/Space activates
  (same as click). Focus doubles as hover — the emphasis machinery lights the cluster —
  plus a clay focus ring. The sidebar tree remains the linear accessible path.
- **minimap** — a persistent panel bottom-right (`components/Minimap.tsx`, mounted in
  `app/layout.tsx`). On the main graph it mirrors the live layout, **rings the current
  center** (from the bridge snapshot), draws a draggable **viewport box** that pans the big
  graph, and clicking a node re-roots the big graph in place (via the bridge's center
  channel — no page load); on **detail pages** (where the big graph is hidden) it runs its
  own headless layout, highlights the current node, and lets you click any node to traverse
  without going back. Main graph ↔ minimap talk through `components/GraphBridge.tsx` (a
  ref-based bridge: snapshot + pan + center channels — no re-render storms). Hidden on mobile.

The simulation runs once and is never rebuilt on navigation; a re-root **reheats** it
(same node objects, new center pin + ring distances) rather than re-running from scratch —
it only ever changes forces + styling, never filters the web. Hand-drag pins still win over
the center pin. (`focusCategory()` from the old filtered-subgraph model is retired.)

## Terminal (the IDE way in)

`components/Terminal.tsx`, mounted once in `app/layout.tsx` (persists across pages, like
the minimap). A unix-style shell over the content tree — categories are directories,
projects are `.mdx` files, `how-it-works.md` routes to `/about`. **Traversal only**:
`ls` / `cd` / `pwd` / `tree` / `cat` (frontmatter peek) / `open` (real navigation), plus
`help` / `clear` / `exit`. Pulled up/down with **ctrl+`** (VS Code's binding) or the
bottom-left `>_ terminal` tab; Escape and `exit` close it. ↑/↓ history, Tab completion
(commands + paths). `cd` into a category re-roots the main graph through the GraphBridge
center channel when it's on screen (URL stays in sync); on other pages `cd` is
shell-local and `open` navigates. The FS derives from `#site/content` — adding a project
automatically adds its file here too. Desktop-only (hidden on mobile); the panel uses
`inert` when closed so it stays mounted (slide transition) without trapping focus.

## Command palette (⌘K)

`components/CommandPalette.tsx`, mounted once in `app/layout.tsx` like the terminal and
minimap. **Pure acceleration, navigation only** — everything it reaches exists elsewhere:
projects (open case study), hubs + overview (re-root: through the GraphBridge center
channel when the main graph is on screen, `?focus=` deep link otherwise), how-it-works,
the `lib/links.ts` contact links, and a terminal toggle (via the
`portfolio:toggle-terminal` window event — the palette and terminal don't import each
other's state). Hand-rolled (no `cmdk` dep); token-AND substring filter over
label+tags+category; grouped results (`work` / `go to` / `links` / `commands`). Items
derive from `#site/content` + `CATEGORIES` + `LINKS` — adding a project adds its entry.

## Manual control (override the auto-derivation)

Auto-derivation is the default; these let a human override it:

- `order` frontmatter — manual sort within a category (sidebar; seeds nothing else yet).
- `pinned` frontmatter — force-show (today: label always visible; later: survives filters).
- **Layout** — the view panel picks a layout: `auto` (content-based default) or a manual
  override (`web` / `radial` / `tree` / `cluster`). Persisted in `view:v1` (below).
- **Opacity** — root/hubs/how-it-works are always on; a project's opacity is
  `projectOpacity × folderOpacity[category]` (one projects slider + four folder sliders).
  This is how the graph reads as deliberate layers without hiding the structure.
  Persisted in `view:v1`.
- **Focus fade** (`focusDim`, slider in the view panel) — how hard non-cluster nodes fade
  during focus/hover: the multiplier is `(1 - focusDim)^rings` by BFS distance from the
  focal node (floor 0.05), so with the default 0.6 a centered hub keeps its peers at 0.4
  while their projects recede to ~0.16. 0 = no fade; 1 = the old hard dim. Search uses a
  flat two-ring dim (matches are scattered; distance is meaningless). Persisted in
  `view:v1`.
- **Hand-dragged node positions** — dragging a node pins it (`fx/fy`) and persists to
  `localStorage['portfolio:graph:positions:v1']` as `{ [id]: {x, y} }`, reapplied on
  load. Pins win over the layout (the ultimate override); switching layout only
  arranges the *un*pinned nodes. "Reset positions" in the panel clears them. Intentional
  client-only state that can diverge from the derived layout.

## Layouts

`lib/layouts.ts` (client-only; imports `d3-force`) owns the graph arrangements. Each is a
*reconfiguration of the simulation's forces* (never static positions) so switching just
reheats — node objects and drag pins survive. Exactly one node is pinned as the anchor:
the **center** (`applyLayout`'s `centerId`, default `root`). The concentric rings/rows use
**graph-distance from the center** (a BFS in `applyLayout`); when the center *is* root this
equals `layer` (BFS depth from root, computed in `lib/graph.ts`: root 0, hubs+about 1,
projects 2) — one code path. Re-rooting on another node just pins it and re-rings around it.
`layer` still drives per-layer node size + opacity.

- **web** — center pinned + mild radial-by-distance → centralized organic web (fixes the
  old "chain" look).
- **radial** — strong radial-by-distance → clean concentric rings.
- **cluster** — each folder anchored around the center → folders separate spatially.
- **tree** — center top, y by distance-from-center → rough top-down hierarchy rooted at it.

`chooseDefaultLayout(graph)` is the "dynamic default": no cross-links → tree; densely
interlinked → web; evenly spread → radial; else cluster. The panel's `auto` chip always
shows this pick; a manual choice overrides the render but not the chip.

## View controls (panel — part 1 built, rest deferred)

`components/ViewControls.tsx` — a collapsible Obsidian-like panel, persisted to
`localStorage['portfolio:graph:view:v1']` (`{ layout, projectOpacity, folderOpacity }`).

- **Built:** the layout selector (auto + manual); the opacity sliders (one `projects`
  slider + four folder sliders — root/hubs are always on) plus "reset positions". Search
  lives in the sidebar (not this panel); the minimap is its own persistent component.
- **Still deferred (next pass):** sliders for repel force / link distance / center force;
  node-size scaling; label-fade threshold; category/tag filters; toggle tag-edges;
  show/hide orphans. Persist all to `localStorage`.

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
- CI (`.github/workflows/ci.yml`): lint → typecheck → build → Playwright smoke tests.
  `npm run lint` is `eslint . --max-warnings 0` (Next 16 removed `next lint`; flat config
  imports `eslint-config-next`'s native flat presets). The React-Compiler-backed hook
  rules (`react-hooks/refs`/`purity`/`immutability`/`set-state-in-effect`) are scoped
  **off for the four graph components only** — their imperative d3 architecture is
  deliberate; keep the rules on everywhere else. Tests (`tests/e2e/graph.spec.ts`) run
  against the production build (`npm run build` first, then `npm run test:e2e`) with
  reduced motion so the graph is deterministic — smoke assertions on structure and
  behavior, not pixel diffs (the force layout isn't pixel-stable). Lighthouse budget
  still deferred.

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

## Custom skill: add-project (built)

`/add-project` (`.claude/skills/add-project/SKILL.md`) is the "adaptable" workflow made
concrete: it knows this frontmatter schema and scaffolds a new `content/projects/<slug>.mdx`
in one command — gathers the fields, derives a unique slug, suggests `related` links from
shared-tag overlap (biasing toward at least one cross-pillar edge), keeps media as external
URLs (never committed), then validates via build and commits. Adding a project still touches
exactly one file; the node and edges rebuild from frontmatter.
