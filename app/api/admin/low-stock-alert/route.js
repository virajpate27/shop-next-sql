import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/auth/guards'
import { sendLowStockAlert } from '@/lib/lowStock'
// Admin dashboard button — authenticated by session, so no secret ever reaches the browser
export const POST = withAdmin(async () => NextResponse.json({ success: true, ...(await sendLowStockAlert()) }))
