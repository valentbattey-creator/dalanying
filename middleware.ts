import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple in-memory rate limiter for middleware (Edge runtime compatible)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getRateLimit(ip: string, windowMs: number, maxReq: number): { ok: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxReq - 1, retryAfter: 0 };
  }
  if (entry.count >= maxReq) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { ok: true, remaining: maxReq - entry.count, retryAfter: 0 };
}

// Cleanup every 5 minutes
let lastCleanup = Date.now();
function maybeCleanup() {
  if (Date.now() - lastCleanup > 300000) {
    lastCleanup = Date.now();
    const now = Date.now();
    for (const [k, v] of rateLimitStore) {
      if (now > v.resetAt) rateLimitStore.delete(k);
    }
  }
}

// Known bad bots / scrapers
const BLOCKED_UA = [
  /semrushbot/i, /ahrefsbot/i, /mj12bot/i, /dotbot/i, /blexbot/i,
  /seekport/i, /serpstatbot/i, /megaindex/i, /yandexbot/i,
  /bytespider/i, /petalbot/i, /gptbot/i, /ccbot/i, /claudebot/i,
  /scrapy/i, /beautifulsoup/i, /mechanize/i,
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ua = req.headers.get("user-agent") || "";

  maybeCleanup();

  // 1. Block known bad bots
  if (BLOCKED_UA.some(p => p.test(ua))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // 2. Block suspicious paths (common exploit scanners)
  const blockedPaths = [
    "/wp-admin", "/wp-login", "/xmlrpc.php", "/.env",
    "/phpmyadmin", "/admin/config", "/.git", "/vendor",
    "/wp-content", "/wp-includes", "/cgi-bin", "/shell",
    "/eval", "/base64", "/cmd", "/exec",
  ];
  if (blockedPaths.some(p => pathname.startsWith(p))) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // 3. Rate limit API routes
  if (pathname.startsWith("/api/")) {
    // Stricter limit for auth-related
    if (pathname.includes("auth") || pathname.includes("profiles")) {
      const rl = getRateLimit(`auth:${ip}`, 300000, 20); // 20 req/5min
      if (!rl.ok) {
        return new NextResponse(
          JSON.stringify({ error: "请求过于频繁，请稍后再试" }),
          { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rl.retryAfter) } }
        );
      }
    }
    // Upload routes
    if (pathname.includes("upload")) {
      const rl = getRateLimit(`upload:${ip}`, 60000, 10); // 10/min
      if (!rl.ok) {
        return new NextResponse(
          JSON.stringify({ error: "上传过于频繁，请稍后再试" }),
          { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rl.retryAfter) } }
        );
      }
    }
    // General API
    const rl = getRateLimit(`api:${ip}`, 60000, 100); // 100/min
    if (!rl.ok) {
      return new NextResponse(
        JSON.stringify({ error: "请求过于频繁" }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rl.retryAfter) } }
      );
    }
  }

  // 4. Rate limit page requests (anti-DDoS)
  const pageRl = getRateLimit(`page:${ip}`, 60000, 200); // 200 pages/min
  if (!pageRl.ok) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  // 5. Add security headers to all responses
  const res = NextResponse.next();

  // Anti-clickjacking
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  // Anti-MIME sniffing
  res.headers.set("X-Content-Type-Options", "nosniff");
  // XSS protection
  res.headers.set("X-XSS-Protection", "1; mode=block");
  // Referrer policy
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Permissions policy - restrict camera, mic, geolocation
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // CORS - only allow own domain
  const origin = req.headers.get("origin");
  if (origin && !origin.includes("dalanying.work") && !origin.includes("localhost")) {
    // Block cross-origin requests to API
    if (pathname.startsWith("/api/")) {
      return new NextResponse("CORS Forbidden", { status: 403 });
    }
  }

  return res;
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).)",
  ],
};
