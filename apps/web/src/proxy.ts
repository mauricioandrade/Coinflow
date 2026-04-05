import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (Next.js 16 name for what was previously "middleware").
 * Runs on every matched request — before any route handler.
 *
 * Responsibilities:
 *  1. Generate a per-request CSP nonce and set the Content-Security-Policy header.
 *  2. Auth guard: redirect unauthenticated users to /login.
 *  3. Redirect already-authenticated users away from auth pages.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // ── 1. CSP nonce ────────────────────────────────────────────────────────
  // A fresh nonce per request prevents replay attacks and satisfies
  // 'strict-dynamic' — only scripts bearing this nonce may execute.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const apiOrigin =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

  const csp = [
    `default-src 'self'`,
    // 'strict-dynamic' lets nonce-trusted scripts load additional scripts.
    // Next.js uses inline scripts for hydration — the nonce covers them.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // Tailwind generates inline styles; 'unsafe-inline' is unavoidable here.
    // Mitigated by object-src 'none' and frame-ancestors 'none'.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    // Only allow fetch/XHR to our own API — no third-party beacon/telemetry.
    `connect-src 'self' ${apiOrigin}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    // Prevents this app from being embedded in iframes (clickjacking).
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  // Forward the nonce to Server Components via a request header.
  // layout.tsx reads it with headers() to pass it to <Script> / <style>.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-pathname", pathname);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", csp);

  // ── 2. Auth guard ────────────────────────────────────────────────────────
  // The middleware cannot verify JWT signatures (no secret in edge runtime).
  // It checks for the presence of the session hint cookie — a lightweight
  // indicator set on login and cleared on logout.
  // Real JWT validation always happens on the API server.
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isApiRoute = pathname.startsWith("/api/");
  const hasSession = request.cookies.has("cf_session");

  // Don't guard Next.js internals or API routes
  if (isApiRoute || pathname.startsWith("/_next/")) {
    return response;
  }

  // Unauthenticated user trying to access a protected page
  if (!hasSession && !isAuthRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already authenticated user hitting an auth page
  if (hasSession && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
