// Server-side SEO for every product page: <title>, description, Open Graph/Twitter card, canonical URL and
// schema.org Product JSON-LD. The page itself is still a client component, so none of the UI changes.
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { getProductBySlug } from '@/lib/repo/products'
import { productMetadata, productJsonLd, jsonLdString } from '@/lib/seo'

export const dynamic = 'force-dynamic'

// one DB lookup shared by generateMetadata and the layout within a request
const load = cache(async (slug) => {
  try { return { product: await getProductBySlug(slug) } }
  catch (e) { console.error('[product seo] lookup failed:', e.message); return { failed: true } }
})

export async function generateMetadata({ params }) {
  const { product, failed } = await load((await params).slug)
  if (failed) return {}                                                    // DB hiccup: fall back to site defaults
  if (!product) return { title: 'Product not found', robots: { index: false, follow: false } }
  return productMetadata(product)
}

export default async function ProductLayout({ children, params }) {
  const { product, failed } = await load((await params).slug)
  if (!failed && !product) notFound()                                      // real 404 for missing products (not a soft 404)
  return (
    <>
      {product && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(productJsonLd(product)) }} />}
      {children}
    </>
  )
}