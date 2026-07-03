import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "./lib/rate-limit";

// ADR-005: only /api/suggest-recipes is gated — matcher scopes this middleware
// to that route only, so /api/extract-ingredients is never counted or blocked.
export const config = {
  matcher: "/api/suggest-recipes",
};

export function middleware(request: NextRequest): NextResponse {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";

  const { allowed, retryAfterSeconds } = checkRateLimit(ip);

  if (!allowed) {
    // ponytail: Edge runtime has no node:crypto hash API — truncate instead of hashing.
    // Keeps only the first two IPv4 octets (or first segment for IPv6/unknown), never the raw IP.
    const truncatedIp = ip.split(/[.:]/).slice(0, 2).join(".") || "unknown";

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "warn",
        event: "rate_limited",
        requestId: crypto.randomUUID(),
        status: 429,
        durationMs: 0,
        ip: truncatedIp,
      }),
    );

    return NextResponse.json(
      { error: "rate_limited", message: "Too many recipe requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return NextResponse.next();
}
