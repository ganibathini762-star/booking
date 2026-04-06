import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/roleGuard.js";
import { parseBody, parseQuery } from "../middleware/validate.js";
import { apiSuccess, apiError } from "../utils/response.js";
import { db } from "../config/db.js";
import { bookingService } from "../services/booking.service.js";
import { bookings, bookings as bookingsTable, bookingItems, ticketTiers, eventShows } from "../db/schema/index.js";
import {
  lockSeatsSchema,
  createOrderSchema,
  verifyPaymentSchema,
  bookingListQuerySchema,
  applyCouponSchema,
} from "../schemas/booking.schema.js";


const bookingsRouter = new Hono();

// ── Show availability (public) ────────────────────────────────────
bookingsRouter.get("/shows/:showId/availability", async (c) => {
  const { showId } = c.req.param();
  try {
    const data = await bookingService.getShowAvailability(showId);
    return apiSuccess(c, data);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Show not found", 404);
    throw err;
  }
});

// ── Lock seats (auth required) ─────────────────────────────────────
bookingsRouter.post("/lock", authMiddleware, async (c) => {
  const user = c.get("user");
  const body = await parseBody(c, lockSeatsSchema);
  if (!body) return c.res;
  try {
    const result = await bookingService.lockSeats(user.id, body);
    return apiSuccess(c, result, "Seats locked for 10 minutes");
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", e.message ?? "Not found", 404);
    if (e.code === "INSUFFICIENT_SEATS") return apiError(c, "INSUFFICIENT_SEATS", e.message ?? "Not enough seats", 409);
    if (e.code === "MAX_EXCEEDED") return apiError(c, "MAX_EXCEEDED", e.message ?? "Max tickets exceeded", 409);
    throw err;
  }
});

// ── Validate coupon ────────────────────────────────────────────────
bookingsRouter.post("/validate-coupon", authMiddleware, async (c) => {
  const body = await parseBody(c, applyCouponSchema);
  if (!body) return c.res;
  const result = await bookingService.validateCoupon(body.code, body.amount);
  return apiSuccess(c, result);
});

// ── Create Razorpay order + pending booking ────────────────────────
bookingsRouter.post("/create-order", authMiddleware, async (c) => {
  const user = c.get("user");
  const body = await parseBody(c, createOrderSchema);
  if (!body) return c.res;
  try {
    const result = await bookingService.createOrder(user.id, body);
    return apiSuccess(c, result, "Order created", 201);
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === "LOCK_EXPIRED") return apiError(c, "LOCK_EXPIRED", e.message ?? "Lock expired", 409);
    if (e.code === "INVALID_LOCK") return apiError(c, "INVALID_LOCK", "Invalid lock", 400);
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", e.message ?? "Not found", 404);
    if (e.code === "INSUFFICIENT_SEATS") return apiError(c, "INSUFFICIENT_SEATS", e.message ?? "Not enough seats", 409);
    throw err;
  }
});

// ── Verify payment + confirm booking ──────────────────────────────
bookingsRouter.post("/verify-payment", authMiddleware, async (c) => {
  const user = c.get("user");
  const body = await parseBody(c, verifyPaymentSchema);
  if (!body) return c.res;
  try {
    const booking = await bookingService.verifyPayment(user.id, body);
    return apiSuccess(c, booking, "Payment verified. Booking confirmed!");
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === "PAYMENT_INVALID") return apiError(c, "PAYMENT_INVALID", "Payment verification failed", 400);
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Booking not found", 404);
    if (e.code === "ALREADY_PROCESSED") return apiError(c, "ALREADY_PROCESSED", "Booking already processed", 409);
    throw err;
  }
});

// ── My bookings list ───────────────────────────────────────────────
bookingsRouter.get("/my", authMiddleware, async (c) => {
  const user = c.get("user");
  const query = parseQuery(c, bookingListQuerySchema);
  if (!query) return c.res;
  const { rows, meta } = await bookingService.getMyBookings(user.id, query.page ?? 1, query.limit ?? 10);
  return apiSuccess(c, rows, undefined, 200, meta);
});

// ── Single booking detail ──────────────────────────────────────────
bookingsRouter.get("/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  try {
    const booking = await bookingService.getBooking(id, user.id);
    return apiSuccess(c, booking);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Booking not found", 404);
    throw err;
  }
});

// ── Cancel booking ─────────────────────────────────────────────────
bookingsRouter.post("/:id/cancel", authMiddleware, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  try {
    const booking = await bookingService.cancelBooking(id, user.id);
    return apiSuccess(c, booking, "Booking cancelled");
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Booking not found", 404);
    if (e.code === "CANNOT_CANCEL") return apiError(c, "CANNOT_CANCEL", e.message ?? "Cannot cancel", 409);
    throw err;
  }
});

// ── Get all tickets for a booking ─────────────────────────────────────
bookingsRouter.get("/:id/tickets", authMiddleware, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, id), eq(bookings.userId, user.id)),
    with: {
      items: {
        with: {
          tier: true,
          seat: true,
          tickets: true,
        },
      },
      show: {
        with: {
          event: {
            with: {
              venue: true,
            },
          },
        },
      },
    },
  });

  if (!booking) return apiError(c, "NOT_FOUND", "Booking not found", 404);

  const ticketsList = booking.items.flatMap(item =>
    item.tickets.map(ticket => ({
      ticketCode: ticket.ticketCode,
      status: ticket.status,
      qrUrl: ticket.qrUrl,
      pdfUrl: ticket.pdfUrl,
      scannedAt: ticket.scannedAt,
      seat: item.seat
        ? {
            row: item.seat.row,
            seatNumber: item.seat.seatNumber,
          }
        : null,
      tier: {
        name: item.tier.name,
        price: item.tier.price,
      },
    }))
  );

  return apiSuccess(c, {
    bookingRef: booking.bookingRef,
    eventTitle: booking.show.event.title,
    showDate: booking.show.showDate,
    showTime: booking.show.showTime,
    venueName: booking.show.event.venue?.name || "Venue",
    tickets: ticketsList,
  });
});

// ── Admin: bookings for a show ─────────────────────────────────────
bookingsRouter.get("/admin/show/:showId", authMiddleware, requireAdmin, async (c) => {
  const { showId } = c.req.param();
  const query = parseQuery(c, bookingListQuerySchema);
  if (!query) return c.res;
  const { rows, meta } = await bookingService.getShowBookings(showId, query.page ?? 1, query.limit ?? 10);
  return apiSuccess(c, rows, undefined, 200, meta);
});

export default bookingsRouter;
