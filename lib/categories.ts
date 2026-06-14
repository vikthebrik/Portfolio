/**
 * The four top-level categories — the hub nodes in the graph.
 *
 * This lives in its own dependency-free module (not velite.config.ts) on purpose:
 * lib/graph.ts runs inside the Next.js app bundle, and importing velite.config.ts
 * there would pull Velite's build tooling (esbuild's native binary) into the bundle
 * and break `next build`. velite.config.ts imports CATEGORIES from here, so there is
 * still a single source of truth — add a category here and the schema + graph both
 * pick it up.
 */
export const CATEGORIES = ['tech', 'design', 'drone', 'research'] as const
export type Category = (typeof CATEGORIES)[number]
