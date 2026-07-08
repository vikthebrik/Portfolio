import type { NextConfig } from 'next'

/**
 * Velite runs the content pipeline from here so `next dev` also rebuilds the typed
 * content layer in `.velite` (watch mode). For production builds this hook is racy
 * (fired async, un-awaited — a fresh clone can compile before content exists), so
 * `npm run build` runs `velite --clean` first and sets VELITE_STARTED=1 to skip it.
 * (Official Turbopack-compatible pattern — see Velite "with Next.js" docs.)
 */
const isDev = process.argv.includes('dev')
const isBuild = process.argv.includes('build')
if (!process.env.VELITE_STARTED && (isDev || isBuild)) {
  process.env.VELITE_STARTED = '1'
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  import('velite').then((m) => m.build({ watch: isDev, clean: !isDev }))
}

const nextConfig: NextConfig = {
  images: {
    // Per CLAUDE.md media strategy: high-res images/video live on a CDN / stream
    // host, referenced by URL in frontmatter — never bundled. Allow those hosts.
    remotePatterns: [
      // Vercel Blob
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      // Cloudflare R2
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      // Mux / Cloudflare Stream thumbnails (poster frames)
      { protocol: 'https', hostname: 'image.mux.com' },
      { protocol: 'https', hostname: '*.cloudflarestream.com' },
      // Placeholder hosts used by seed content during local dev
      { protocol: 'https', hostname: 'cdn.example.com' },
      { protocol: 'https', hostname: 'stream.example.com' },
    ],
  },
}

export default nextConfig
