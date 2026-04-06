import { Hono } from "hono";
import { and, desc, eq, ilike, or, sql, between } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/roleGuard.js";
import { apiSuccess, apiError } from "../utils/response.js";
import { db } from "../config/db.js";
import { users, events, bookings, venues, categories, promotions, auditLogs, eventShows } from "../db/schema/index.js";
import { getPagination, buildMeta } from "../utils/paginate.js";
import { z } from "zod";
import { AppBindings } from "../types/index.js";

const adminRouter = new Hono<AppBindings>();

// All routes require authentication + admin role
adminRouter.use("*", authMiddleware, requireAdmin);

// ── Platform stats ────────────────────────────────────────────────
adminRouter.get("/stats", async (c) => {
  // Same as before
  const [
    usersCount,
    eventsCount,
    bookingsCount,
    revenueResult,
    pendingVenuesCount,
    pendingEventsCount,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(users),
    db.select({ count: sql<number>`count(*)::int` }).from(events),
    db.select({ count: sql<number>`count(*)::int` }).from(bookings).where(eq(bookings.paymentStatus, "paid")),
    db.select({ total: sql<number>`coalesce(sum(final_amount::float), 0)` }).from(bookings).where(eq(bookings.paymentStatus, "paid")),
    db.select({ count: sql<number>`count(*)::int` }).from(venues).where(eq(venues.isApproved, false)),
    db.select({ count: sql<number>`count(*)::int` }).from(events).where(eq(events.status, "draft")),
  ]);

  return apiSuccess(c, {
    totalUsers: usersCount[0]?.count ?? 0,
    totalEvents: eventsCount[0]?.count ?? 0,
    paidBookings: bookingsCount[0]?.count ?? 0,
    totalRevenue: revenueResult[0]?.total ?? 0,
    pendingVenues: pendingVenuesCount[0]?.count ?? 0,
    pendingEvents: pendingEventsCount[0]?.count ?? 0,
  });
});

// ── User management ───────────────────────────────────────────────
adminRouter.get("/users", async (c) => {
  const page = Number(c.req.query("page") ?? 1);
  const limit = Number(c.req.query("limit") ?? 20);
  const q = c.req.query("q");
  const { offset } = getPagination({ page, limit });

  const where = q ? or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`)) : undefined;

  const [rows, countResult] = await Promise.all([
    db.query.users.findMany({
      where,
      limit,
      offset,
      orderBy: [desc(users.createdAt)],
      columns: { passwordHash: false },
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(users).where(where),
  ]);

  return apiSuccess(c, rows, undefined, 200, buildMeta(countResult[0]?.count ?? 0, { page, limit }));
});

adminRouter.get("/users/:id", async (c) => {
  const { id } = c.req.param();
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { passwordHash: false },
  });
  if (!user) return apiError(c, "NOT_FOUND", "User not found", 404);
  return apiSuccess(c, user);
});

adminRouter.patch("/users/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<{ name?: string; email?: string; phone?: string }>();
  const updates: any = { updatedAt: new Date() };
  if (body.name) updates.name = body.name;
  if (body.email) updates.email = body.email;
  if (body.phone) updates.phone = body.phone;

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, id))
    .returning();
  if (!updated) return apiError(c, "NOT_FOUND", "User not found", 404);
  return apiSuccess(c, updated, "User updated");
});

adminRouter.post("/users/:id/ban", async (c) => {
  const { id } = c.req.param();
  await db.update(users).set({ isBanned: true, updatedAt: new Date() }).where(eq(users.id, id));
  return apiSuccess(c, null, "User banned");
});

adminRouter.post("/users/:id/unban", async (c) => {
  const { id } = c.req.param();
  await db.update(users).set({ isBanned: false, updatedAt: new Date() }).where(eq(users.id, id));
  return apiSuccess(c, null, "User unbanned");
});

adminRouter.delete("/users/:id", async (c) => {
  const { id } = c.req.param();
  await db.delete(users).where(eq(users.id, id)).execute();
  return apiSuccess(c, null, "User deleted");
});

// ── Event management ──────────────────────────────────────────────
adminRouter.get("/events", async (c) => {
  const page = Number(c.req.query("page") ?? 1);
  const limit = Number(c.req.query("limit") ?? 20);
  const status = c.req.query("status") as "draft" | "published" | "cancelled" | "completed" | undefined;
  const { offset } = getPagination({ page, limit });

  const where = status ? eq(events.status, status) : undefined;

  const [rows, countResult] = await Promise.all([
    db.query.events.findMany({
      where,
      limit,
      offset,
      orderBy: [desc(events.createdAt)],
      with: {
        category: true,
        venue: true,
        organizer: { columns: { id: true, name: true, email: true } },
      },
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(events).where(where),
  ]);

  return apiSuccess(c, rows, undefined, 200, buildMeta(countResult[0]?.count ?? 0, { page, limit }));
});

adminRouter.get("/venues", async (c) => {
  const page = Number(c.req.query("page") ?? 1);
  const limit = Number(c.req.query("limit") ?? 20);
  const status = c.req.query("status") === "pending" ? false : undefined; // false = not approved
  const { offset } = getPagination({ page, limit });

  const where = status !== undefined ? eq(venues.isApproved, status) : undefined;

  const [rows, countResult] = await Promise.all([
    db.query.venues.findMany({
      where,
      limit,
      offset,
      orderBy: [desc(venues.createdAt)],
      with: {
        organizer: { columns: { id: true, name: true, email: true } },
      },
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(venues).where(where),
  ]);

  return apiSuccess(c, rows, undefined, 200, buildMeta(countResult[0]?.count ?? 0, { page, limit }));
});

adminRouter.get("/coupons", async (c) => {
  const page = Number(c.req.query("page") ?? 1);
  const limit = Number(c.req.query("limit") ?? 20);
  const { offset } = getPagination({ page, limit });

  const [rows, countResult] = await Promise.all([
    db.query.promotions.findMany({
      limit,
      offset,
      orderBy: [desc(promotions.createdAt)],
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(promotions),
  ]);

  return apiSuccess(c, rows, undefined, 200, buildMeta(countResult[0]?.count ?? 0, { page, limit }));
});

// ── Event actions (already existed) ─────────────────────────────────
adminRouter.post("/events/:id/approve", async (c) => {
  const { id } = c.req.param();
  const [updated] = await db.update(events).set({ status: "published", updatedAt: new Date() }).where(eq(events.id, id)).returning();
  if (!updated) return apiError(c, "NOT_FOUND", "Event not found", 404);
  return apiSuccess(c, updated, "Event approved and published");
});

adminRouter.post("/events/:id/feature", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<{ featured: boolean }>();
  const [updated] = await db.update(events).set({ isFeatured: body.featured, updatedAt: new Date() }).where(eq(events.id, id)).returning();
  if (!updated) return apiError(c, "NOT_FOUND", "Event not found", 404);
  return apiSuccess(c, updated, `Event ${body.featured ? "featured" : "unfeatured"}`);
});

adminRouter.post("/events/:id/cancel", async (c) => {
  const { id } = c.req.param();
  const [updated] = await db.update(events).set({ status: "cancelled", updatedAt: new Date() }).where(eq(events.id, id)).returning();
  if (!updated) return apiError(c, "NOT_FOUND", "Event not found", 404);
  return apiSuccess(c, updated, "Event cancelled");
});

// ── Venue approvals ──────────────────────────────────────────────────
adminRouter.post("/venues/:id/approve", async (c) => {
  const { id } = c.req.param();
  const [updated] = await db.update(venues).set({ isApproved: true, updatedAt: new Date() }).where(eq(venues.id, id)).returning();
  if (!updated) return apiError(c, "NOT_FOUND", "Venue not found", 404);
  return apiSuccess(c, updated, "Venue approved");
});

adminRouter.post("/venues/:id/reject", async (c) => {
  const { id } = c.req.param();
  await db.delete(venues).where(eq(venues.id, id)).execute();
  return apiSuccess(c, null, "Venue rejected and deleted");
});

// ── Analytics ─────────────────────────────────────────────────────────
adminRouter.get("/analytics/revenue", async (c) => {
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  let whereClause = sql`bookings.payment_status = 'paid'`;
  if (startDate && endDate) {
    whereClause = sql`${whereClause} AND bookings.booked_at BETWEEN ${startDate} AND ${endDate}`;
  }

  const [total, daily, byEvent] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(final_amount::float), 0)` }).from(bookings).where(whereClause),
    db
      .select({
        date: sql<Date>`date(booked_at)`,
        revenue: sql<number>`coalesce(sum(final_amount::float), 0)`,
        bookings: sql<number>`count(*)`,
      })
      .from(bookings)
      .where(whereClause)
      .groupBy(sql`date(booked_at)`)
      .orderBy(desc(sql`date(booked_at)`))
      .limit(90),
    db
      .select({
        eventId: events.id,
        eventTitle: events.title,
        revenue: sql<number>`coalesce(sum(final_amount::float), 0)`,
        bookings: sql<number>`count(*)`,
      })
      .from(bookings)
      .innerJoin(eventShows, eq(bookings.showId, eventShows.id))
      .innerJoin(events, eq(eventShows.eventId, events.id))
      .where(whereClause)
      .groupBy(events.id, events.title)
      .orderBy(desc(sql`sum(final_amount)`))
      .limit(20),
  ]);

  return apiSuccess(c, {
    totalRevenue: Number(total[0]?.total ?? 0).toFixed(2),
    daily,
    byEvent,
  });
});

adminRouter.get("/analytics/users", async (c) => {
  const [total, byRole, byDate] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(users),
    db
      .select({
        role: users.role,
        count: sql<number>`count(*)`,
      })
      .from(users)
      .groupBy(users.role),
    db
      .select({
        date: sql<Date>`date(created_at)`,
        count: sql<number>`count(*)`,
      })
      .from(users)
      .groupBy(sql`date(created_at)`)
      .orderBy(desc(sql`date(created_at)`))
      .limit(30),
  ]);

  return apiSuccess(c, { total: total[0]?.count ?? 0, byRole, byDate });
});

adminRouter.get("/analytics/events", async (c) => {
  const [total, byStatus, byCategory] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(events),
    db
      .select({
        status: events.status,
        count: sql<number>`count(*)`,
      })
      .from(events)
      .groupBy(events.status),
    db
      .select({
        categoryName: categories.name,
        count: sql<number>`count(*)`,
      })
      .from(events)
      .innerJoin(categories, eq(events.categoryId, categories.id))
      .groupBy(categories.name)
      .orderBy(desc(sql`count(*)`))
      .limit(10),
  ]);

  return apiSuccess(c, { total: total[0]?.count ?? 0, byStatus, byCategory });
});

adminRouter.get("/analytics/cities", async (c) => {
  const topCities = await db
    .select({
      city: venues.city,
      eventCount: sql<number>`count(DISTINCT events.id)`,
      bookingCount: sql<number>`count(DISTINCT bookings.id)`,
      revenue: sql<number>`coalesce(sum(final_amount::float), 0)`,
    })
    .from(venues)
    .innerJoin(events, eq(venues.id, events.venueId))
    .leftJoin(eventShows, eq(events.id, eventShows.eventId))
    .leftJoin(bookings, and(
      eq(eventShows.id, bookings.showId),
      eq(bookings.paymentStatus, "paid")
    ))
    .where(eq(venues.country, "India"))
    .groupBy(venues.city)
    .orderBy(desc(sql`coalesce(sum(final_amount::float), 0)`))
    .limit(20);

  return apiSuccess(c, topCities);
});

// ── Audit logs ───────────────────────────────────────────────────────
adminRouter.get("/audit-logs", async (c) => {
  const page = Number(c.req.query("page") ?? 1);
  const limit = Number(c.req.query("limit") ?? 50);
  const { offset } = getPagination({ page, limit });

  const [rows, countResult] = await Promise.all([
    db.query.auditLogs.findMany({
      limit,
      offset,
      orderBy: [desc(auditLogs.createdAt)],
      with: {
        actor: {
          columns: { id: true, name: true, email: true },
        },
      },
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(auditLogs),
  ]);

  return apiSuccess(c, rows, undefined, 200, buildMeta(countResult[0]?.count ?? 0, { page, limit }));
});

// ── Settings ───────────────────────────────────────────────────────────
// Simple key-value settings stored in memory/Redis (persistent in prod)
const SETTINGS_CACHE = new Map<string, string>();

adminRouter.get("/settings", async (c) => {
  // Return current settings (could be from DB or Redis)
  const settings = {
    platformFee: process.env.PLATFORM_FEE || "2.00",
    taxRate: process.env.TAX_RATE || "18.00",
    maintenanceMode: SETTINGS_CACHE.get("maintenance_mode") === "true",
    allowedCities: process.env.ALLOWED_CITIES?.split(",") || ["Mumbai", "Delhi", "Bangalore"],
    emailFrom: process.env.EMAIL_FROM || "TicketFlow <noreply@ticketflow.app>",
  };
  return apiSuccess(c, settings);
});

adminRouter.put("/settings", async (c) => {
  const body = await c.req.json<{
    platformFee?: string;
    taxRate?: string;
    maintenanceMode?: boolean;
    allowedCities?: string[];
    emailFrom?: string;
  }>();

  // In production, this would persist to a settings table or env
  // For now, just update cache
  if (body.platformFee) SETTINGS_CACHE.set("platform_fee", body.platformFee);
  if (body.taxRate) SETTINGS_CACHE.set("tax_rate", body.taxRate);
  if (body.maintenanceMode !== undefined) SETTINGS_CACHE.set("maintenance_mode", String(body.maintenanceMode));
  if (body.allowedCities) SETTINGS_CACHE.set("allowed_cities", JSON.stringify(body.allowedCities));
  if (body.emailFrom) SETTINGS_CACHE.set("email_from", body.emailFrom);

  return apiSuccess(c, null, "Settings updated");
});

// ── Maintenance mode ─────────────────────────────────────────────────────
adminRouter.post("/maintenance", async (c) => {
  const body = await c.req.json<{ enabled: boolean }>();
  SETTINGS_CACHE.set("maintenance_mode", String(body.enabled));
  // In production, this would also set a flag that middleware checks
  return apiSuccess(c, { maintenanceMode: body.enabled }, `Maintenance mode ${body.enabled ? "enabled" : "disabled"}`);
});

export default adminRouter;
