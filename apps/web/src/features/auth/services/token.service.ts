"use client";

import Cookies from "js-cookie";

// ── Cookie names ──────────────────────────────────────────────────────────────
// Intentionally opaque — no hint of their purpose to a casual observer.
const SESSION_COOKIE = "cf_session"; // httpOnly hint — set by Route Handler
const ACCESS_COOKIE = "cf_at"; // short-lived access token (15 min)

// ── In-memory access token ────────────────────────────────────────────────────
// The access token is kept in module scope — never touches localStorage.
// This prevents XSS from reading it via document APIs.
// Trade-off: cleared on page refresh → automatic silent refresh on mount.
let _accessToken: string | null = null;

export const tokenService = {
  // ── Access token ────────────────────────────────────────────────────────

  /** Current in-memory access token. Null if not authenticated or after refresh. */
  getAccessToken(): string | null {
    return _accessToken;
  },

  setAccessToken(token: string): void {
    _accessToken = token;
    // Also persist in a SameSite=Strict cookie so middleware can read it
    // for auth-guard redirects. It is NOT HttpOnly so middleware (edge)
    // can access it. XSS risk is minimised by the 15-minute TTL.
    Cookies.set(ACCESS_COOKIE, token, {
      expires: 1 / 96, // 15 minutes expressed as fraction of a day
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
  },

  // ── Session hint cookie (set server-side via Route Handler) ──────────────
  // The Route Handler sets `cf_session` as HttpOnly so JS cannot clear it
  // on XSS — but we CAN clear it from client-side JS via the Route Handler.

  hasSession(): boolean {
    if (typeof document === "undefined") return false;
    return document.cookie.includes(SESSION_COOKIE);
  },

  // ── Clear everything ───────────────────────────────────────────────────

  clearAll(): void {
    _accessToken = null;
    Cookies.remove(ACCESS_COOKIE);
    // The HttpOnly cf_session cookie can only be removed server-side.
    // Trigger the logout Route Handler to clear it.
  },
};
