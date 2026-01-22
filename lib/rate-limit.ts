import { NextRequest } from "next/server";

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitStore>();

const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS = 10;
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const MAX_ENTRIES = 10000;

let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();

  if (now - lastCleanup < CLEANUP_INTERVAL) {
    return;
  }

  lastCleanup = now;
  const entries = Array.from(rateLimitMap.entries());

  for (const [ip, store] of entries) {
    if (now > store.resetTime) {
      rateLimitMap.delete(ip);
    }
  }

  if (rateLimitMap.size > MAX_ENTRIES) {
    const sortedEntries = Array.from(rateLimitMap.entries()).sort(
      (a, b) => a[1].resetTime - b[1].resetTime
    );

    const toRemove = sortedEntries.slice(0, rateLimitMap.size - MAX_ENTRIES);
    for (const [ip] of toRemove) {
      rateLimitMap.delete(ip);
    }
  }
}

export function rateLimit(request: NextRequest): {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
} {
  cleanupExpiredEntries();

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "unknown";

  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return {
      success: true,
      limit: MAX_REQUESTS,
      remaining: MAX_REQUESTS - 1,
      reset: now + RATE_LIMIT_WINDOW,
    };
  }

  if (userLimit.count >= MAX_REQUESTS) {
    return {
      success: false,
      limit: MAX_REQUESTS,
      remaining: 0,
      reset: userLimit.resetTime,
    };
  }

  userLimit.count++;
  return {
    success: true,
    limit: MAX_REQUESTS,
    remaining: MAX_REQUESTS - userLimit.count,
    reset: userLimit.resetTime,
  };
}

export function isOriginAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  if (!origin && !referer) {
    return false;
  }

  const allowedOrigins = [`http://${host}`, `https://${host}`];

  if (origin && !allowedOrigins.includes(origin)) {
    return false;
  }

  if (referer && !allowedOrigins.some((allowed) => referer.startsWith(allowed))) {
    return false;
  }

  return true;
}
