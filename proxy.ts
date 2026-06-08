import { type NextRequest, NextResponse } from "next/server"

/** Served from /public — must not redirect (e.g. SW registration rejects redirected scripts). */
const PUBLIC_ROOT_FILES = new Set([
  "/sw.js",
  "/manifest.json",
  "/offline.html",
  "/browserconfig.xml",
  "/icon.svg",
  "/placeholder.svg",
  "/placeholder-logo.svg",
  "/school_login_illustration_1778883405545.png",
  "/zetime-logo.png",
  "/branding/app-icon.png",
])

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (PUBLIC_ROOT_FILES.has(pathname)) {
    return NextResponse.next()
  }

  // API authentication will be handled by individual route handlers
  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next()
    // Add security headers
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("X-XSS-Protection", "1; mode=block")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    return response
  }

  // Public paths that don't require authentication
  const publicPaths = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/about", "/privacy", "/terms", "/pricing", "/onboarding"]
  const isPublicPath = publicPaths.includes(pathname)

  // Super admin and protected routes will handle auth on the client side using localStorage
  const isProtectedPath = !isPublicPath && !pathname.startsWith("/super-admin")

  const sessionToken = request.cookies.get("session")?.value

  // Only redirect to login if it's a protected path AND there's no session token
  // For school, super-admin and parent paths, we rely on client-side localStorage auth
  if (isProtectedPath && !sessionToken && !pathname.startsWith('/school/') && !pathname.startsWith('/super-admin') && !pathname.startsWith('/parent/')) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const response = NextResponse.next()
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|offline.html|browserconfig.xml|icon.svg|placeholder.svg|placeholder-logo.svg).*)",
  ],
}
