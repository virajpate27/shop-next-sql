// lib/seo.js — pure helpers for product metadata + structured data (no imports, safe on server)

export const siteUrl = () => (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '')

/** HTML/whitespace stripped, cut on a word boundary with an ellipsis. */
export function plainText(input, max = 155) {
  const t = String(input ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  const sp = cut.lastIndexOf(' ')
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.;:\-–]+$/, '') + '…'
}

/** 1200×630 crop for social previews when the image is on Cloudinary; otherwise unchanged. */
export function ogImage(url) {
  if (!url) return null
  return /res\.cloudinary\.com\/.+\/image\/upload\//.test(url)
    ? url.replace('/image/upload/', '/image/upload/c_fill,w_1200,h_630,q_auto,f_jpg/')
    : url
}

const inStock = (p) => (p.hasVariations && p.variants?.length ? p.variants.some((v) => Number(v.stock) > 0) : Number(p.stock) > 0)

export function productMetadata(p) {
  const description = plainText(p.description) || `Buy ${p.name} online. Fast delivery across India. Pay via Razorpay or Cash on Delivery.`
  const path = `/products/${p.slug}`
  const img = ogImage(p.images?.[0])
  return {
    title: p.name,                                   // root layout adds " | ShopNext"
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', title: p.name, description, url: path, ...(img ? { images: [{ url: img, width: 1200, height: 630, alt: p.name }] } : {}) },
    twitter: { card: 'summary_large_image', title: p.name, description, ...(img ? { images: [img] } : {}) },
  }
}

/** schema.org Product → eligible for Google rich results (price, availability, stars). */
export function productJsonLd(p) {
  const url = `${siteUrl()}/products/${p.slug}`
  const prices = p.hasVariations && p.variants?.length ? p.variants.map((v) => Number(v.price) || Number(p.price)) : [Number(p.price)]
  const low = Math.min(...prices), high = Math.max(...prices)
  const availability = `https://schema.org/${inStock(p) ? 'InStock' : 'OutOfStock'}`
  const offers = low !== high
    ? { '@type': 'AggregateOffer', priceCurrency: 'INR', lowPrice: low, highPrice: high, offerCount: prices.length, availability, url }
    : { '@type': 'Offer', priceCurrency: 'INR', price: low, availability, itemCondition: 'https://schema.org/NewCondition', url }
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: plainText(p.description, 500) || p.name,
    ...(p.images?.length ? { image: p.images } : {}),
    ...(p.sku ? { sku: p.sku } : {}),
    offers,
    ...(p.reviewCount > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: Number(p.rating), reviewCount: Number(p.reviewCount) } } : {}),
  }
}

/** JSON for a <script type="application/ld+json">: "<" escaped so a product name can never close the tag. */
export const jsonLdString = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c')