import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withAdmin } from '@/lib/auth/guards'
import { splitCategory } from '@/lib/repo/categories'

export const PUT = withAdmin(async (req, { params }) => {
  const c = splitCategory(await req.json())
  if (!c.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  try { await query('UPDATE categories SET name=?, slug=?, data=? WHERE id=?', [c.name, c.slug, c.data, (await params).id]) }
  catch (e) { if (e.code === 'ER_DUP_ENTRY') return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 }); throw e }
  return NextResponse.json({ ok: true })
})
export const DELETE = withAdmin(async (_req, { params }) => {
  await query('DELETE FROM categories WHERE id=?', [(await params).id]); return NextResponse.json({ ok: true })
})
