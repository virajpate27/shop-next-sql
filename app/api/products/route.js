import { NextResponse } from 'next/server'
import { listProducts, getProductBySlug, createProduct } from '@/lib/repo/products'
import { withAdmin } from '@/lib/auth/guards'

// GET /api/products?category=&search=&sortBy=&featured=1&pageSize=&offset=&exclude=<id>   |  ?slug=<slug>
export async function GET(req) {
  const sp = new URL(req.url).searchParams
  if (sp.get('slug')) {
    const product = await getProductBySlug(sp.get('slug'))
    return product ? NextResponse.json({ product }) : NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const data = await listProducts({
    category: sp.get('category') || null, search: sp.get('search') || null, sortBy: sp.get('sortBy') || 'newest',
    featured: sp.get('featured') === '1', pageSize: sp.get('pageSize') || 12, offset: sp.get('offset') || 0,
    excludeId: sp.get('exclude') || null,
  })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } })
}

export const POST = withAdmin(async (req) => {
  const id = await createProduct(await req.json())
  return NextResponse.json({ id }, { status: 201 })
})
