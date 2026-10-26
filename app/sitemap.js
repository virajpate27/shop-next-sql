// src/app/sitemap.js
import { query } from '@/lib/db'

// Rendered per request (DB isn't reachable at build time)
export const dynamic = 'force-dynamic'

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/products`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]

  let productPages = []
  try {
    const rows = await query("SELECT slug, updated_at FROM products WHERE slug <> ''")
    productPages = rows.map((p) => ({
      url: `${baseUrl}/products/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }))
  } catch (err) {
    console.error('[sitemap] product query failed:', err.message)
  }

  return [...staticPages, ...productPages]
}
