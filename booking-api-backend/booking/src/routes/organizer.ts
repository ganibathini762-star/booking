import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { requireOrganizer } from "../middleware/roleGuard.js";
import { apiSuccess, apiError } from "../utils/response.js";
import { db } from "../config/db.js";
import { sql } from "drizzle-orm";
import { AppBindings } from "../types/index.js";
import { events, eventShows, bookings, bookingItems, ticketTiers, users, venues } from "../db/schema/index.js";
import { and, eq, desc } from "drizzle-orm";

const organizerRouter = new Hono<AppBindings>();

// All routes require auth + organizer role
organizerRouter.use("*", authMiddleware, requireOrganizer);

// ── Dashboard stats ───────────────────────────────────────────────────────
organizerRouter.get("/dashboard", async (c) => {
  const userId = c.get("user").id;

  const [
    totalEvents,
    upcomingShows,
    totalBookings,
    totalRevenue,
    pendingBookings,
  ] = await Promise.all([
    // Total events created by this organizer
    db.select({ count: sql<number>`count(*)::int` }).from(events).where(eq(events.organizerId, userId)),
    // Upcoming shows count
    db.select({ count: sql<number>`count(*)::int` }).from(eventShows).where(
      sql`EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = event_shows.event_id
        AND e.organizer_id = ${userId}
        AND e.status = 'published'
      )`
    ),
    // Total bookings for organizer's events
    db.select({ count: sql<number>`count(*)::int` }).from(bookings).where(
      sql`EXISTS (
        SELECT 1 FROM events e
        JOIN event_shows es ON es.event_id = e.id
        WHERE e.organizer_id = ${userId}
        AND bookings.show_id = es.id
      )`
    ),
    // Total revenue (paid bookings only)
    db.select({ total: sql<number>`coalesce(sum(final_amount::float), 0)` }).from(bookings).where(
      sql`EXISTS (
        SELECT 1 FROM events e
        JOIN event_shows es ON es.event_id = e.id
        WHERE e.organizer_id = ${userId}
        AND bookings.show_id = es.id
        AND bookings.payment_status = 'paid'
      )`
    ),
    // Pending bookings (status pending, not paid yet)
    db.select({ count: sql<number>`count(*)::int` }).from(bookings).where(
      sql`EXISTS (
        SELECT 1 FROM events e
        JOIN event_shows es ON es.event_id = e.id
        WHERE e.organizer_id = ${userId}
        AND bookings.show_id = es.id
        AND bookings.status = 'pending'
      )`
    ),
  ]);

  return apiSuccess(c, {
    totalEvents: totalEvents[0]?.count ?? 0,
    upcomingShows: upcomingShows[0]?.count ?? 0,
    totalBookings: totalBookings[0]?.count ?? 0,
    totalRevenue: Number(totalRevenue[0]?.total || 0).toFixed(2),
    pendingBookings: pendingBookings[0]?.count ?? 0,
  });
});

// ── My Events (alias for /events/my, but scoped to organizer) ─────────────
organizerRouter.get("/events", async (c) => {
  const userId = c.get("user").id;
  const page = Number(c.req.query("page") ?? 1);
  const limit = Number(c.req.query("limit") ?? 20);
  const { offset } = getPagination({ page, limit });

  const [rows, countResult] = await Promise.all([
    db.query.events.findMany({
      where: eq(events.organizerId, userId),
      limit,
      offset,
      orderBy: [desc(events.createdAt)],
      with: {
        category: true,
        venue: true,
      },
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(events).where(eq(events.organizerId, userId)),
  ]);

  return apiSuccess(c, rows, undefined, 200, buildMeta(countResult[0]?.count ?? 0, { page, limit }));
});

// ── Revenue Report ────────────────────────────────────────────────────────
organizerRouter.get("/revenue", async (c) => {
  const userId = c.get("user").id;
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  let whereConditions = sql`EXISTS (
    SELECT 1 FROM events e
    JOIN event_shows es ON es.event_id = e.id
    WHERE e.organizer_id = ${userId}
    AND bookings.show_id = es.id
    AND bookings.payment_status = 'paid'
  )`;

  if (startDate && endDate) {
    whereConditions = sql`(${whereConditions}) AND bookings.booked_at BETWEEN ${startDate} AND ${endDate}`;
  }

  const [summary, byEvent, byDay] = await Promise.all([
    // Total revenue
    db.select({ total: sql<number>`coalesce(sum(final_amount::float), 0)` }).from(bookings).where(whereConditions),
    // Revenue by event
    db
      .select({
        eventId: events.id,
        eventTitle: events.title,
        revenue: sql<number>`coalesce(sum(bookings.final_amount::float), 0)`,
        bookingsCount: sql<number>`count(*)`,
      })
      .from(bookings)
      .innerJoin(eventShows, eq(bookings.showId, eventShows.id))
      .innerJoin(events, eq(eventShows.eventId, events.id))
      .where(whereConditions)
      .groupBy(events.id, events.title)
      .orderBy(desc(sql`sum(bookings.final_amount)`))
      .limit(20),
    // Revenue by day
    db
      .select({
        date: sql<Date>`date(bookings.booked_at)`,
        revenue: sql<number>`coalesce(sum(final_amount::float), 0)`,
      })
      .from(bookings)
      .where(whereConditions)
      .groupBy(sql`date(bookings.booked_at)`)
      .orderBy(desc(sql`date(bookings.booked_at)`))
      .limit(30),
  ]);

  return apiSuccess(c, {
    totalRevenue: Number(summary[0]?.total || 0).toFixed(2),
    byEvent: byEvent,
    byDay: byDay,
  });
});

// ── Attendee List ─────────────────────────────────────────────────────────
organizerRouter.get("/attendees", async (c) => {
  const userId = c.get("user").id;
  const eventId = c.req.query("eventId");
  const showId = c.req.query("showId");
  const page = Number(c.req.query("page") ?? 1);
  const limit = Number(c.req.query("limit") ?? 50);
  const { offset } = getPagination({ page, limit });

  // Build query to get all confirmed bookings for organizer's events
  const conditions: any[] = [
    eq(bookings.paymentStatus, "paid"),
    eq(bookings.status, "confirmed"),
  ];

  const joinClause = sql`INNER JOIN event_shows es ON bookings.show_id = es.id INNER JOIN events e ON es.event_id = e.id`;

  if (eventId) {
    conditions.push(eq(events.id, eventId));
  }
  if (showId) {
    conditions.push(eq(eventShows.id, showId));
  }

  const [rows, countResult] = await Promise.all([
    db
      .select({
        bookingId: bookings.id,
        bookingRef: bookings.bookingRef,
        bookedAt: bookings.bookedAt,
        userName: users.name,
        userEmail: users.email,
        userPhone: users.phone,
        eventTitle: events.title,
        showDate: eventShows.showDate,
        showTime: eventShows.showTime,
        venueName: venues.name,
        ticketCount: sql<number>`count(*)`,
        totalAmount: bookings.finalAmount,
      })
      .from(bookings)
      .innerJoin(users, eq(bookings.userId, users.id))
      .innerJoin(eventShows, eq(bookings.showId, eventShows.id))
      .innerJoin(events, and(eq(eventShows.eventId, events.id), eq(events.organizerId, userId)))
      .innerJoin(venues, eq(events.venueId, venues.id))
      .where(sql`${conditions.join(" AND ")}`)
      .groupBy(
        bookings.id,
        bookings.bookingRef,
        bookings.bookedAt,
        users.name,
        users.email,
        users.phone,
        events.title,
        eventShows.showDate,
        eventShows.showTime,
        venues.name,
        bookings.finalAmount
      )
      .orderBy(desc(bookings.bookedAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(DISTINCT bookings.id)::int` }).from(bookings)
      .innerJoin(eventShows, eq(bookings.showId, eventShows.id))
      .innerJoin(events, and(eq(eventShows.eventId, events.id), eq(events.organizerId, userId)))
      .where(sql`${conditions.join(" AND ")}`),
  ]);

  return apiSuccess(c, rows, undefined, 200, buildMeta(countResult[0]?.count ?? 0, { page, limit }));
});

// ── Check-in Stats for a show ─────────────────────────────────────────────
organizerRouter.get("/events/:eventId/check-in", async (c) => {
  const userId = c.get("user").id;
  const { eventId } = c.req.param();

  // Verify event belongs to organizer
  const event = await db.query.events.findFirst({
    where: and(eq(events.id, eventId), eq(events.organizerId, userId)),
  });

  if (!event) {
    return apiError(c, "NOT_FOUND", "Event not found or no permission", 404);
  }

  const showId = c.req.query("showId");

  // Get all shows for this event with ticket stats
  const shows = await db.query.eventShows.findMany({
    where: eq(eventShows.eventId, eventId),
  });

  const showsWithStats = await Promise.all(
    shows.map(async (s) => {
      const bookingItemsForShow = await db.query.bookingItems.findMany({
        where: sql`EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.show_id = ${s.id}
          AND b.status = 'confirmed'
          AND b.payment_status = 'paid'
        )`,
        with: {
          tickets: true,
          tier: true,
        },
      });

      const totalTickets = bookingItemsForShow.reduce((sum, item) => sum + item.quantity, 0);
      const scannedTickets = bookingItemsForShow.reduce((sum, item) => {
        return sum + item.tickets.filter((t) => t.status === "used").length;
      }, 0);

      return {
        showId: s.id,
        showDate: s.showDate,
        showTime: s.showTime,
        totalTickets,
        scannedTickets,
        remaining: totalTickets - scannedTickets,
        checkInRate: totalTickets > 0 ? ((scannedTickets / totalTickets) * 100).toFixed(1) : 0,
      };
    })
  );

  return apiSuccess(c, {
    event: {
      id: event.id,
      title: event.title,
    },
    shows: showsWithStats,
  });
});

// ── Register as Organizer (public but creates application) ────────────────
organizerRouter.post("/register", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ companyName: string; taxId?: string; phone?: string }>();

  // In a full implementation, this would create an organizer application
  // For now, just upgrade user role to organizer (maybe with approval workflow)
  const [updated] = await db
    .update(users)
    .set({ role: "organizer" as const })
    .where(eq(users.id, user.id))
    .returning();

  return apiSuccess(c, updated, "You are now registered as an organizer");
});

export default organizerRouter;

// Helper pagination utilities (duplicate from booking service - could be centralized)
function getPagination({ page, limit }: { page: number; limit: number }) {
  const offset = (page - 1) * limit;
  return { offset, page, limit };
}

function buildMeta(total: number, { page, limit }: { page: number; limit: number }) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
