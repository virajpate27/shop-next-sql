import { NextResponse } from 'next/server'
import { query, newId } from '@/lib/db'
import { withAdmin } from '@/lib/auth/guards'
import { listCategories, splitCategory } from '@/lib/repo/categories'

export const dynamic = 'force-dynamic'
export async function GET() {
  return NextResponse.json({ categories: await listCategories() }, { headers: { 'Cache-Control': 'no-store' } })
}
export const POST = withAdmin(async (req) => {
  const c = splitCategory(await req.json())
  if (!c.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  const id = newId()
  try { await query('INSERT INTO categories (id,name,slug,data) VALUES (?,?,?,?)', [id, c.name, c.slug, c.data]) }
  catch (e) { if (e.code === 'ER_DUP_ENTRY') return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 }); throw e }
  return NextResponse.json({ id }, { status: 201 })
})
