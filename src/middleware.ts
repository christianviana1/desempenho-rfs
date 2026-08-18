import { NextResponse, type NextRequest } from "next/server"

import { Perfil, SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session"

/**
 * Protege /admin/** e /dashboard/** no Edge Runtime, antes de qualquer
 * Server Component ser renderizado. Isso é apenas a primeira camada de
 * defesa: cada Route Handler também revalida a sessão/perfil (ver
 * src/lib/auth.ts), pois o middleware sozinho não é suficiente contra
 * requisições feitas diretamente à API.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAdminRoute = pathname.startsWith("/admin")
  const isDashboardRoute = pathname.startsWith("/dashboard")

  if (!isAdminRoute && !isDashboardRoute) {
    return NextResponse.next()
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = await verifySessionToken(token)

  if (!session) {
    const loginUrl = new URL("/", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAdminRoute && session.perfil !== Perfil.ADMIN) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
}
