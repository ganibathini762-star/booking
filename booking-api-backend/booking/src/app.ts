import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { env } from "./config/env.js";
import { logger, requestLogger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import { swaggerUI } from "@hono/swagger-ui";
import { serveStatic } from "@hono/node-server/serve-static";

// Route imports
import authRoutes from "./routes/auth.js";
import categoryRoutes from "./routes/categories.js";
import venueRoutes from "./routes/venues.js";
import eventRoutes from "./routes/events.js";
import searchRoutes from "./routes/search.js";
import locationRoutes from "./routes/locations.js";
import bookingRoutes from "./routes/bookings.js";
import ticketRoutes from "./routes/tickets.js";
import seatsRoutes from "./routes/seats.js";
import couponsRoutes from "./routes/coupons.js";
import paymentsRoutes from "./routes/payments.js";
import uploadsRoutes from "./routes/uploads.js";
import organizerRoutes from "./routes/organizer.js";
import adminRoutes from "./routes/admin.js";
import reviewRoutes from "./routes/reviews.js";
import notificationRoutes from "./routes/notifications.js";
import { AppBindings } from "./types/index.js";

const app = new Hono<AppBindings>();

// ── Global Middleware ────────────────────────────────────────────────────────

app.use("*", cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining"],
}));

app.use("*", secureHeaders());
app.use("*", requestLogger);
app.use("/api/*", generalLimiter);

// Enable multipart form-data for upload routes
import { buildSwaggerDocument } from "./swagger.js";

// ── Swagger Documentation ───────────────────────────────────────────────────

app.get("/swagger", swaggerUI({ url: "/openapi.json" }));

app.get("/openapi.json", (c) => {
  const apiBaseUrl = env.API_URL ?? `http://localhost:${env.PORT}`;
  return c.json(buildSwaggerDocument(apiBaseUrl, env.FRONTEND_URL));
});

import { db } from "./config/db.js";
import { redis } from "./config/redis.js";
import { sql } from "drizzle-orm";

app.get("/health", async (c) => {
  let dbStatus = "up";
  let redisStatus = "up";

  try {
    // Check Database (Neon HTTP)
    await db.execute(sql`SELECT 1`);
  } catch (err) {
    logger.error({ err }, "Health check: Database down");
    dbStatus = "down";
  }

  try {
    await redis.ping();
  } catch (err) {
    logger.error({ err }, "Health check: Redis down");
    redisStatus = "down";
  }

  const isHealthy = dbStatus === "up" && redisStatus === "up";

  return c.json(
    {
      status: isHealthy ? "ok" : "unhealthy",
      timestamp: new Date().toISOString(),
      env: env.NODE_ENV,
      version: "1.0.0",
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
    },
    isHealthy ? 200 : 503
  );
});

// ── API Routes ────────────────────────────────────────────────────────────────

const api = new Hono().basePath("/api/v1");

api.route("/auth", authRoutes);
api.route("/categories", categoryRoutes);
api.route("/venues", venueRoutes);
api.route("/events", eventRoutes);
api.route("/shows", seatsRoutes);
api.route("/search", searchRoutes);
api.route("/locations", locationRoutes);
api.route("/bookings", bookingRoutes);
api.route("/tickets", ticketRoutes);
api.route("/coupons", couponsRoutes);
api.route("/payments", paymentsRoutes);
api.route("/uploads", uploadsRoutes);
api.route("/organizer", organizerRoutes);
api.route("/admin", adminRoutes);
api.route("/reviews", reviewRoutes);
api.route("/notifications", notificationRoutes);

api.get("/", (c) => c.json({ message: "TicketFlow API v1", version: "1.0.0" }));

app.route("/", api);

// ── Root info ────────────────────────────────────────────────────────────────
app.get("/", (c) =>
  c.json({ message: "TicketFlow API", docs: "/swagger", health: "/health", api: "/api/v1/" })
);

// ── Error Handler ─────────────────────────────────────────────────────────────

app.onError(errorHandler);

// ── 404 Handler ──────────────────────────────────────────────────────────────

app.notFound((c) =>
  c.json(
    {
      success: false,
      error: { code: "NOT_FOUND", message: `Route ${c.req.method} ${c.req.path} not found` },
    },
    404
  )
);

export default app;
