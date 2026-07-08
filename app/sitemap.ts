import type { MetadataRoute } from 'next'
import { projects } from '#site/content'

const BASE = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'http://localhost:3000'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/about`, changeFrequency: 'monthly', priority: 0.8 },
    ...projects.map((p) => ({
      url: `${BASE}${p.url}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}
