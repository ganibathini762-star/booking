import { createMiddleware } from "hono/factory";
import { redis } from "../config/redis.js";
import { apiError } from "../utils/response.js";

type RateLimitOptions = {
  windowMs: number;  // milliseconds
  max: number;
  keyPrefix?: string;
};

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, keyPrefix = "rl" } = options;
  const windowSec = Math.ceil(windowMs / 1000);

  return createMiddleware(async (c, next) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      "unknown";

    const key = `${keyPrefix}:${ip}:${c.req.routePath}`;

    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSec);
    }

    c.res.headers.set("X-RateLimit-Limit", String(max));
    c.res.headers.set("X-RateLimit-Remaining", String(Math.max(0, max - count)));

    if (count > max) {
      return apiError(c, "RATE_LIMIT_EXCEEDED", "Too many requests. Please try again later.", 429);
    }

    await next();
  });
}

// Preset limiters
export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: "rl:auth" });
export const generalLimiter = rateLimit({ windowMs: 60 * 1000, max: 100, keyPrefix: "rl:general" });
