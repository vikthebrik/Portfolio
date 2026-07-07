---
name: add-project
description: Scaffold a new portfolio project. Use when the user wants to add a project, case study, or piece of work to the graph — creates one content/projects/<slug>.mdx with validated frontmatter, external media references, and suggested `related` links derived from shared tags. The node and its edges rebuild automatically from the frontmatter; no component or graph config is ever touched.
---

# add-project

Adding a project to this portfolio is **one MDX file**. Its graph node and every edge
(membership, related, shared-tag) rebuild from frontmatter — you never edit `lib/graph.ts`,
a component, or any graph config. This skill scaffolds that file correctly and wires the
cross-links that keep the web dense.

Read `CLAUDE.md` if you haven't this session — the "Content schema", "Media strategy", and
"Topology" sections are the contract this skill upholds.

## Step 1 — Gather the essentials

Ask the user for anything not already given. Only `title`, `category`, and `summary` are
strictly required to produce a valid file; everything else improves the graph.

| Field | Required | Notes |
|---|---|---|
| `title` | ✅ | ≤ 100 chars. Human title (e.g. "Embedded Graph Query Engine"). |
| `category` | ✅ | Exactly one of `tech` · `design` · `drone` · `research` (from `lib/categories.ts`). This is the hub the node hangs off. |
| `summary` | ✅ | ≤ 280 chars, one line. Shows on node hover + the case-study header. |
| `slug` | derived | Kebab-case from the title unless the user gives one. **Must be unique** across `content/projects/`. This is the node id and the `/work/<slug>` route. |
| `tags` | strongly encouraged | Lowercase kebab. These weave the web — shared tags create faint cross-links between projects. Reuse existing tags where honest (see Step 2). |
| `related` | suggested | Array of **existing project slugs**. Explicit project↔project edges. Suggest these in Step 2; confirm with the user. |
| `year` | optional | Integer. |
| `featured` | optional | Boolean; default false. |
| `order` | optional | Integer — manual sort within the category's sidebar list (ties broken by title). |
| `pinned` | optional | Boolean; keeps the node's label always visible. Use sparingly. |
| `links` | optional | Any of `repo` / `demo` / `paper` / `live`, each a full URL. |
| `cover` / `poster` / `video` | optional | **External URLs only** — see Step 3. |

## Step 2 — Suggest `related` links from the existing web

Read the frontmatter of every file in `content/projects/*.mdx` (title, slug, category,
tags). Then propose `related` slugs for the new project:

1. **Tag overlap** — rank existing projects by how many `tags` they share with the new one.
   The top 1–3 are natural `related` candidates (and even without listing them, shared tags
   already create faint edges — but promoting the strongest into `related` makes a solid link).
2. **Cross-pillar bias** — prefer at least one `related` link that reaches a *different*
   category. The whole design goal is a web, not four separate stars (CLAUDE.md "Topology").
3. Present the candidates with the shared tags as justification; let the user confirm/edit.
   `related` is symmetric in effect (the edge renders regardless of direction), so you only
   need to add the slug on one side — but if the counterpart clearly belongs, offer to add
   the back-reference too.

Do **not** invent slugs. Every entry in `related` must be an existing file's slug.

## Step 3 — Media (do NOT commit files)

Per CLAUDE.md "Media strategy", high-res images and video never live in the repo or
`public/`. In frontmatter they are **external URLs**:

- **Images** (`cover`, `poster`): host on Vercel Blob (easiest given the Vercel deploy),
  Cloudflare R2, or S3. `next.config.ts` `remotePatterns` must allow the host — if the URL's
  domain isn't already whitelisted there, tell the user to add it (don't silently skip it).
- **Video** (`video`): a streaming host (Mux / Cloudflare Stream) playback URL, not a raw MP4.
- The only media that may live beside the MDX is a **tiny inline diagram** (< 200 KB) via
  Velite's `s.image()` — architecture sketches, nothing photographic.

If the user has no hosted URLs yet, scaffold the file **without** the media keys (they're all
optional) and leave a comment noting where to paste them once hosted. Never fabricate a media
URL that won't resolve.

## Step 4 — Write the file

Create `content/projects/<slug>.mdx`. Omit optional keys the user didn't supply rather than
writing empty placeholders (except a media comment per Step 3). Template:

```mdx
---
title: <Title>
slug: <slug>
category: <tech|design|drone|research>
summary: <one line, ≤280 chars>
tags: [<tag>, <tag>]
related: [<existing-slug>]
year: <YYYY>
# featured: true       # optional — bias toward always-visible
# order: 1             # optional — manual sidebar sort within the category
# pinned: true         # optional — label always shown
# External media — host on a CDN/stream, never commit. Add the host to
# next.config.ts remotePatterns if it's new.
# cover: https://<blob-host>/<path>.webp
# video: https://<stream-host>/<id>
links:
  repo: https://github.com/<you>/<repo>
---

## Overview

<Case study body in MDX — prose plus any components registered in mdx-components.tsx.>
```

Keep the body real and specific. If the user hasn't written it yet, add a short honest
skeleton (Overview / Approach / Outcome headings) and tell them it's a placeholder to fill —
don't fabricate accomplishments or metrics.

## Step 5 — Verify

1. If `next dev` is running, Velite is in watch mode and revalidates on save — check the
   terminal for a schema error (e.g. summary too long, unknown category, malformed URL).
2. Otherwise run `npm run build` (**stop `next dev` first** — concurrent runs race over
   `.velite`). A green build means the frontmatter validated and the node/edges emit.
3. Optionally open `/` and confirm the node appears in its category with the expected edges,
   and `/work/<slug>` renders.

## Step 6 — Commit

Conventional commit, one project per commit. The repo is public and is itself a portfolio
piece, so keep it clean:

```
content(projects): add <slug> (<category>)
```

Never stage media files. If the user pasted a local image path anywhere, stop and route it
through Step 3 instead.
