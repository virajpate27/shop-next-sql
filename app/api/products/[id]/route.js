import { NextResponse } from 'next/server'
import { getProductById, updateProduct, deleteProduct } from '@/lib/repo/products'
import { withAdmin } from '@/lib/auth/guards'

export async function GET(_req, { params }) {
  const product = await getProductById((await params).id)
  return product ? NextResponse.json({ product }) : NextResponse.json({ error: 'Not found' }, { status: 404 })
}
export const PUT = withAdmin(async (req, { params }) => { await updateProduct((await params).id, await req.json()); return NextResponse.json({ ok: true }) })
export const DELETE = withAdmin(async (_req, { params }) => { await deleteProduct((await params).id); return NextResponse.json({ ok: true }) })
