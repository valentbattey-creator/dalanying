// In-memory rate limiter (survives across requests in same server instance)
// For Vercel serverless, each instance has its own memory, but it still helps

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number;   // Time window in ms
  maxRequests: number; // Max requests per window
}

// Default limits for different route types
export const RATE_LIMITS = {
  api: { windowMs: 60000, maxRequests: 60 },        // 60 req/min for general API
  auth: { windowMs: 300000, maxRequests: 10 },       // 10 req/5min for auth
  upload: { windowMs: 60000, maxRequests: 10 },      // 10 req/min for uploads
  write: { windowMs: 60000, maxRequests: 30 },       // 30 req/min for writes
} as const;

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.api
): { allowed: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const key = identifier;
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, retryAfter: 0 };
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, retryAfter: 0 };
}

// Get client IP from request
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

// Suspicious patterns that indicate scraping
const SCRAPE_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /scrape/i, /curl/i, /wget/i,
  /python-requests/i, /httpclient/i, /java\//i, /go-http/i,
];

export function isSuspiciousRequest(req: Request): boolean {
  const ua = req.headers.get("user-agent") || "";
  // Allow empty UA (some mobile browsers) but flag known scraping tools
  if (SCRAPE_PATTERNS.some(p => p.test(ua))) return true;
  // Flag requests with no referer on API calls (not foolproof but helps)
  return false;
}
