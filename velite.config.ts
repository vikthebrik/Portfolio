import { defineConfig, defineCollection, s } from 'velite'

// Single source of truth for the four categories. Defined in its own module so
// lib/graph.ts can import them without dragging Velite's build tooling into the
// Next.js app bundle. See lib/categories.ts for the why.
import { CATEGORIES } from './lib/categories'
export { CATEGORIES, type Category } from './lib/categories'

/**
 * One MDX file per project under content/projects/.
 * Frontmatter here is what drives the network graph:
 *   - `category` -> membership edge to a hub node
 *   - `related`  -> project<->project edges (slugs)
 *   - `tags`     -> faint shared-tag edges (the "dense network" on first load)
 *
 * Media (cover/poster/video) are EXTERNAL URLs (CDN / stream host), not bundled.
 * See CLAUDE.md "Media strategy". Use `s.image()` only for tiny inline diagrams.
 */
const projects = defineCollection({
  name: 'Project',
  pattern: 'projects/**/*.mdx',
  schema: s
    .object({
      title: s.string().max(100),
      slug: s.slug('project'), // unique slug, e.g. "autonomous-mapping-drone"
      category: s.enum(CATEGORIES),
      summary: s.string().max(280), // one-line for node hover + cards
      tags: s.array(s.string()).default([]),
      related: s.array(s.string()).default([]), // slugs of related projects
      year: s.number().int().optional(),
      featured: s.boolean().default(false),

      // Manual overrides on the auto-derived graph (see CLAUDE.md "Manual control").
      order: s.number().int().optional(), // manual sort within a category
      pinned: s.boolean().default(false), // force-show (label always visible for now)

      // External media (CDN / stream host) — referenced by URL, never bundled.
      cover: s.string().url().optional(),
      poster: s.string().url().optional(),
      video: s.string().url().optional(),

      links: s
        .object({
          repo: s.string().url(),
          demo: s.string().url(),
          paper: s.string().url(),
          live: s.string().url(),
        })
        .partial()
        .optional(),

      body: s.mdx(),
      metadata: s.metadata(), // readingTime, wordCount, etc.
    })
    // Derive the route once, here, so components never reconstruct it.
    .transform((data) => ({ ...data, url: `/work/${data.slug}` })),
})

export default defineConfig({
  root: 'content',
  output: {
    data: '.velite',
    assets: 'public/static',
    base: '/static/',
    clean: true,
  },
  collections: { projects },
  mdx: {
    // Add remark/rehype plugins here (e.g. rehype-pretty-code for syntax).
    remarkPlugins: [],
    rehypePlugins: [],
  },
})
