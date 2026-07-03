import type { NextConfig } from "next";

// ponytail: security headers only; CORS/rate-limit/CSP details live in
// lib/rate-limit.ts and route handlers per ARCHITECTURE.md §11.
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; img-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
