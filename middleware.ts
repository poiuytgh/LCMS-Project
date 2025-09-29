import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;
  const adminSession = req.cookies.get("admin_session")?.value === "true";

  if (pathname === "/admin") {
    const url = req.nextUrl.clone();
    url.pathname = adminSession ? "/admin/dashboard" : "/login/admin";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin/")) {
    if (!adminSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/login/admin";
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/user")) {
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  const isAuthPage = pathname === "/login" || pathname === "/register";
  if (session && isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/user/dashboard";
    return NextResponse.redirect(url);
  }

  if (pathname === "/login/admin") {
    if (adminSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/admin",            
    "/admin/:path*",     
    "/user/:path*",      
    "/login",            
    "/register",         
    "/login/admin",      
    "/update-password",  
  ],
};
