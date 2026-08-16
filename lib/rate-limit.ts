// lib/rate-limit.ts
// Simple in-memory rate limiter for Vercel serverless functions.
// For production at scale, consider Upstash Redis (@upstash/ratelimit).

import "server-only";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup to avoid memory leaks in long-running dev server
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed within the window. */
  maxRequests: number;
  /** Time window in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check whether a request from `identifier` (typically an IP) is within rate limits.
 * Returns `{ allowed, remaining, resetAt }`.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const existing = store.get(identifier);

  if (!existing || existing.resetAt < now) {
    // New window
    const entry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    store.set(identifier, entry);
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: entry.resetAt };
  }

  existing.count += 1;

  if (existing.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Extract client IP from Next.js request headers.
 * Works with Vercel (x-forwarded-for) and local development.
 */
export function getClientIp(request: Request): string {
  const cfConnecting = request.headers.get("cf-connecting-ip");
  if (cfConnecting) return cfConnecting.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
