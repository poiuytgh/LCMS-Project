import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  if (pathname.startsWith("/admin")) {
    const adminSession = req.cookies.get("admin_session")?.value
    if (!adminSession || adminSession !== "true") {
      const url = req.nextUrl.clone()
      url.pathname = "/login/admin"
      return NextResponse.redirect(url)
    }
  }

  if (pathname.startsWith("/user")) {
    if (!session) {
      const url = req.nextUrl.clone()
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }
  }

  const isAuthPage = pathname === "/login" || pathname === "/register"
  if (session && isAuthPage) {
    const url = req.nextUrl.clone()
    url.pathname = "/user/dashboard"
    return NextResponse.redirect(url)
  }

  if (pathname === "/login/admin") {
    const adminSession = req.cookies.get("admin_session")?.value
    if (adminSession === "true") {
      const url = req.nextUrl.clone()
      url.pathname = "/admin"
      return NextResponse.redirect(url)
    }
  }

  return res
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/user/:path*",
    "/login",
    "/register",
    "/login/admin",
    "/update-password",
  ],
}
