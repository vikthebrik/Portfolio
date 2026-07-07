---
name: import-github
description: Import GitHub repositories into the portfolio as project MDX files, and keep them in sync as the work evolves. Use when the user wants to pull their real work in from GitHub, "import my repos", turn a repo into a case study, or refresh imported projects. Curated and re-runnable — one repo becomes one content/projects/<slug>.mdx whose node and edges rebuild from frontmatter; re-running syncs objective fields without clobbering hand-written prose. The GitHub front-end to the same pipeline as add-project.
---

# import-github

Turn GitHub repos into portfolio projects. This is the **GitHub front-end to the same
one-MDX-file pipeline as [[add-project]]** — it produces `content/projects/<slug>.mdx`
files with the exact same frontmatter contract, so the graph node and every edge rebuild
automatically. You never touch `lib/graph.ts`, a component, or graph config.

Read `CLAUDE.md`'s "Content schema", "Media strategy", and "Topology" sections and the
`add-project` skill first — this skill reuses that file template and media rules rather than
repeating them.

## What makes this different from add-project

- **Source is a repo**, not a blank form. Enrich each project from the repo's README,
  language, description, and homepage — never fabricate.
- **Curated, never bulk.** A user's account is full of coursework repos, forks, and
  experiments. Importing all of them floods the web and cheapens it. Always select; 5–10
  strong projects beat every repo.
- **Re-runnable / syncable.** The user wants a *living* representation of current work.
  Re-running must **reconcile**, not duplicate — refresh objective fields, preserve prose.
- **Provenance = `links.repo`.** The repo URL in frontmatter is the identity key: a re-run
  matches an existing project to its repo by that URL. No new schema field; renaming the
  slug or title never creates a duplicate as long as `links.repo` is stable.

## Tools

Prefer the **GitHub MCP** (`mcp__github__*`): `get_me` (the login), `search_repositories`
(`user:<login> fork:false`, `sort: updated`), `get_file_contents` (README). Fall back to the
`gh` CLI only if the MCP is unavailable. Don't clone repos — metadata + README is enough.

## Step 1 — Discover

List the user's own repos (`user:<login> fork:false`, sorted by `updated`). For each capture:
name, description, primary language, topics, homepage, `created_at`, `pushed_at`, `archived`,
`fork`, stars. **Drop** forks, archived repos, and the portfolio repo itself.

Reality check (do not assume otherwise until you've looked): many accounts have **no topics
and empty/thin descriptions**. When that's the case, the README is your only real source —
plan to read it (Step 3). Don't derive tags from an empty description.

## Step 2 — Select (the human's call)

Never import the whole list. Present the candidates grouped by likely portfolio-worthiness
and let the user choose the set. GitHub gives no reliable "importance" signal (stars are
often zero), so **this is their judgment, not yours** — propose, don't decide.

Watch for **course-container repos** (a whole-term dump like `CS330`, `DSCI311`): these are
usually *folders of assignments*, not one project. Offer three options per such repo:
1. **Skip** (default for pure coursework dumps).
2. **Import one standout subproject** within it — set `links.repo` to the repo and note the
   subpath in the body; the project is the artifact, not the course.
3. **Collapse the course into one project** only if it genuinely reads as a cohesive body of
   work worth a node.

## Step 3 — Enrich per repo (from the README)

Fetch the README (`get_file_contents` `README.md`, try `readme`/`README.mdx` as fallback) and
distill — honestly, no marketing copy, no invented metrics:

- **`summary`** (≤ 280, one line): what it *is* and *does*. Distill the README's opening /
  the repo description; don't paste a paragraph.
- **`body`**: seed the case study from the README's real sections (Overview / Approach /
  Outcome). Lightly edit for the portfolio's voice, keep it truthful, and tell the user it's
  an imported draft to refine. Never fabricate accomplishments.
- **`tags`** (lowercase kebab): start from the **primary language** (`python`, `typescript`,
  `c`, `jupyter-notebook` → prefer a clean form like `data-science` when the language is a
  proxy for the domain), then add concrete nouns from the README (`algorithms`, `computer-vision`,
  `web`, `ai`). **Reuse the existing tag vocabulary** wherever honest — read `tags` across
  `content/projects/*.mdx` first; shared tags are what weave the web ([[add-project]] Step 2).
- **`year`**: `created_at` year (or `pushed_at` if that reads truer for ongoing work).
- **`links`**: `repo` = the repo's `html_url` (**always** — it's the provenance key);
  `live`/`demo` = `homepage` if set and plausibly a real deploy (this user's `InterviewProj`
  has a Vercel homepage, for example).
- **Media**: leave `cover`/`video` out unless the user has *hosted* assets. A repo image
  (`raw.githubusercontent.com/...`) is **not** a media host — don't hotlink it as a hero.
  Follow [[add-project]] Step 3 (external CDN/stream URLs, never commit, whitelist the host in
  `next.config.ts`).

## Step 4 — Category (propose, confirm)

GitHub has no notion of the four hubs, so infer and **confirm with the user**:

- **research** — ML / AI / data / notebooks / analysis / a paper (Jupyter language is a strong hint).
- **tech** — systems / web / apps / compilers / embedded / algorithms / general software.
- **design** — UI / UX / design systems / frontend-forward / Figma work.
- **drone** — UAV / robotics / SLAM / flight / mapping.

State the signal you used ("Jupyter + a fairness analysis README → research") and let the user
override. It's a one-word judgment call; don't agonize, but don't silently guess either.

## Step 5 — Title, slug, related

- **Title**: a readable human title, *not* a cryptic repo name — propose "Knight's Tour Solver"
  for `Knights_Tour`, "AI Club Interview Case Study" for `InterviewProj`. Confirm.
- **Slug**: kebab of the title, **unique** across `content/projects/`. This is the node id and
  `/work/<slug>` route.
- **`related`**: rank existing projects by shared-tag overlap; promote the top 1–3, biasing
  toward **≥ 1 cross-pillar** link so the web stays connected ([[add-project]] Step 2). Only
  ever reference existing slugs.

## Step 6 — Reconcile on re-run (sync, don't duplicate)

Before writing, scan `content/projects/*.mdx` for one whose `links.repo` equals this repo's
`html_url`. If found, this is a **sync, not an add**:

- **Preserve (human-owned):** `title`, `summary`, `category`, `tags`, `related`, `order`,
  `pinned`, `featured`, `cover`/`poster`/`video`, and the **MDX body**. A hand-edited summary
  or case study must never be silently overwritten.
- **Refresh (objective):** canonical `links.repo`, `links.live`/`demo` from `homepage`, and —
  *offer* — `year`. If the README changed materially, offer to refresh `summary`/`tags`/body,
  but only with the user's OK, shown as a diff.
- Show a **field-level diff** and confirm before overwriting anything.

This is what makes the representation "dynamic": run the skill again after pushing work and it
reconciles the portfolio to GitHub without erasing your writing.

## Step 7 — Write, validate, commit

Write each `content/projects/<slug>.mdx` using [[add-project]]'s template (omit optional keys
the repo doesn't justify).

> **MDX body comments use `{/* … */}`, not `<!-- … -->`.** HTML comments are a parse error in
> MDX. If you leave an "imported draft — refine this" note in the body, it must be a JSX
> comment or Velite rejects the whole file.

Then:

1. **Validate with `npx velite` directly**, not `next build`. This repo fires Velite
   *async and un-awaited* from `next.config.ts`, so `next build` can race: it may report a
   green build while silently reading the *previous* `.velite` output and swallowing frontmatter
   /MDX errors in the new files. `npx velite --clean` runs the content pipeline synchronously
   and prints per-file schema errors — that's the real gate. (**Stop `next dev` first** — a
   concurrent watcher races over `.velite`.) Confirm the new slugs appear, e.g.
   `node -e "console.log(require('./.velite/projects.json').length)"`.
2. Optionally run `npm run build` afterward (now `.velite` is already fresh) and open `/` to
   confirm each node lands in its hub with the expected edges, and `/work/<slug>` renders.
3. **Conventional commit, one repo per commit** (public repo — keep the history clean):
   - new: `content(projects): import <slug> from github (<category>)`
   - sync: `content(projects): sync <slug> from github`

Never stage media files. If a README references an in-repo image you want as a hero, route it
through [[add-project]] Step 3 (host it externally) — don't commit it.

## Step 8 — Batch

To import several at once, loop Steps 3–7 per repo, but still **confirm category + related per
repo** and keep **one commit each**. The goal is a curated, densely-linked web of your real
work — not a mirror of every repo you own.
