import type { NextConfig } from 'next'

/**
 * Velite runs the content pipeline from here so a single `next dev` / `next build`
 * also (re)builds the typed content layer in `.velite`. In dev it watches; in build
 * it does one clean pass. Guarded so it only fires once per process.
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
