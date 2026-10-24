import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

async function valid(token) {
  if (!token) return false
  try { await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET)); return true } catch { return false }
}

export async function middleware(req) {
  const authed = await valid(req.cookies.get('session')?.value)
  const { pathname } = req.nextUrl
  const needsLogin = ['/checkout', '/orders', '/profile', '/wishlist', '/admin'].some((r) => pathname.startsWith(r))
  const isAuthPage = ['/login', '/register'].some((r) => pathname.startsWith(r))

  if (needsLogin && !authed) {                       // (was commented out before — re-enabled)
    const url = new URL('/login', req.url)
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }
  if (isAuthPage && authed) return NextResponse.redirect(new URL('/', req.url))
  return NextResponse.next()
}

export const config = { matcher: ['/checkout/:path*', '/orders/:path*', '/profile/:path*', '/wishlist/:path*', '/admin/:path*', '/login', '/register'] }
