import type { NextConfig } from "next";

// ponytail: security headers only; CORS/rate-limit/CSP details live in
// lib/rate-limit.ts and route handlers per ARCHITECTURE.md §11.
const nextConfig: NextConfig = {
  async headers() {
    // ponytail: next dev's hot-reload runtime uses eval(); prod CSP stays strict.
    const scriptSrc =
      process.env.NODE_ENV !== "production"
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        : "script-src 'self' 'unsafe-inline'";
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; img-src 'self' data: blob:; ${scriptSrc}; style-src 'self' 'unsafe-inline'; connect-src 'self'`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
