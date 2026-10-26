import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withAdmin } from '@/lib/auth/guards'
import { getShippingConfigServer } from '@/lib/repo/shippingConfig'
import { DEFAULT_SHIPPING } from '@/lib/shipping'

export const dynamic = 'force-dynamic'
export async function GET() {
  return NextResponse.json({ config: await getShippingConfigServer() }, { headers: { 'Cache-Control': 'no-store' } })
}
export const PUT = withAdmin(async (req) => {
  const body = await req.json()
  const cfg = {}
  for (const k of Object.keys(DEFAULT_SHIPPING)) if (body[k] !== undefined) cfg[k] = body[k]   // only known keys
  await query("INSERT INTO settings (`key`, value) VALUES ('shipping', ?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [JSON.stringify(cfg)])
  return NextResponse.json({ ok: true })
})
