import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { UI_ROLE_COOKIE, UI_SESSION_COOKIE } from "@/lib/ui-session-cookie"

const USER_APP_PREFIXES = [
  "/main",
  "/mypage",
  "/compare",
  "/reports",
  "/cases",
  "/evidences",
  "/dashboard",
] as const

function isUserAppPath(pathname: string) {
  return USER_APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function isAdminAppPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/")
}

function isOrgAdminRole(role: string | undefined) {
  const normalized = decodeURIComponent(role ?? "")
    .trim()
    .toUpperCase()
  return (
    normalized === "ORG_ADMIN" ||
    normalized === "ROLE_ORG_ADMIN" ||
    normalized === "ADMIN" ||
    normalized === "ROLE_ADMIN"
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = request.cookies.get(UI_SESSION_COOKIE)?.value === "1"
  const role = request.cookies.get(UI_ROLE_COOKIE)?.value

  if (isUserAppPath(pathname)) {
    if (!hasSession) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = "/login"
      loginUrl.search = ""
      return NextResponse.redirect(loginUrl)
    }
    if (isOrgAdminRole(role)) {
      const adminUrl = request.nextUrl.clone()
      adminUrl.pathname = "/admin"
      adminUrl.search = ""
      return NextResponse.redirect(adminUrl)
    }
  }

  if (isAdminAppPath(pathname)) {
    if (!hasSession) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = "/login"
      loginUrl.search = ""
      return NextResponse.redirect(loginUrl)
    }
    if (!isOrgAdminRole(role)) {
      const homeUrl = request.nextUrl.clone()
      homeUrl.pathname = "/main"
      homeUrl.search = ""
      return NextResponse.redirect(homeUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/main/:path*",
    "/main",
    "/mypage/:path*",
    "/mypage",
    "/compare/:path*",
    "/compare",
    "/reports/:path*",
    "/reports",
    "/cases/:path*",
    "/cases",
    "/evidences/:path*",
    "/evidences",
    "/dashboard/:path*",
    "/dashboard",
    "/admin/:path*",
    "/admin",
  ],
}
