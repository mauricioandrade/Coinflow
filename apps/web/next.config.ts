import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // ── Production compiler optimizations ────────────────────────────────────
  compiler: {
    // Strip ALL console.* calls in production builds.
    // Prevents sensitive financial data from leaking through logs.
    removeConsole: isDev ? false : { exclude: ["error"] },
  },

  // ── Image optimization ────────────────────────────────────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    // Only allow images from trusted domains. Extend as needed.
    remotePatterns: [],
  },

  // ── Strict mode for React ─────────────────────────────────────────────────
  reactStrictMode: true,

  // ── Security headers ──────────────────────────────────────────────────────
  // Full CSP via middleware.ts (Phase 2). These headers are a baseline.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Clickjacking protection
          { key: "X-Frame-Options", value: "DENY" },
          // HTTPS only for 1 year, include subdomains
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          // Stop leaking origin in Referer header to third-parties
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable FLoC / Topics API
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
