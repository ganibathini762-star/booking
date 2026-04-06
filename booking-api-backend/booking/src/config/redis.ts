import { Redis as IORedis } from "ioredis";
import { env } from "./env.js";

// Single ioredis client for all operations (caching, seat locks, BullMQ, pub/sub)
// Uses the standard rediss:// URL which works directly with ioredis + Upstash
export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: false,
  enableReadyCheck: false,
});

redis.on("error", (err) => {
  // Suppress connection error noise in logs — ioredis retries automatically
  if (process.env.NODE_ENV !== "test") {
    console.error("[redis] connection error:", err.message);
  }
});

// Alias for BullMQ and WebSocket (they import ioRedis by name)
export const ioRedis = redis;

// Key prefixes for namespacing
export const REDIS_KEYS = {
  seatLock: (showId: string, seatId: string) => `seat:lock:${showId}:${seatId}`,
  refreshToken: (userId: string) => `refresh:${userId}`,
  emailOtp: (email: string) => `otp:email:${email}`,
  passwordReset: (token: string) => `pwd:reset:${token}`,
  rateLimitRegister: (ip: string) => `rl:register:${ip}`,
  session: (sessionId: string) => `session:${sessionId}`,
} as const;

export const REDIS_TTL = {
  seatLock: 600,        // 10 minutes
  refreshToken: 604800, // 7 days
  emailOtp: 600,        // 10 minutes
  passwordReset: 3600,  // 1 hour
} as const;
