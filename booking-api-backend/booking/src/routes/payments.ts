import { Hono } from "hono";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { apiSuccess, apiError } from "../utils/response.js";
import { db } from "../config/db.js";
import { env } from "../config/env.js";
import { isMockPayment, createMockPaymentId } from "../config/razorpay.js";
import { bookings, ticketTiers, bookingItems } from "../db/schema/index.js";
import { ticketQueue } from "../config/queue.js";
import { sql } from "drizzle-orm";

const paymentsRouter = new Hono();

// ── Mock confirm endpoint (only active when MOCK_PAYMENT=true) ────────────────
// POST /payments/mock-confirm
// Body: { bookingId: string }
// Instantly confirms a pending booking — for testing without a real payment gateway
paymentsRouter.post("/mock-confirm", async (c) => {
  if (!isMockPayment()) {
    return apiError(c, "FORBIDDEN", "Mock payments are disabled", 403);
  }

  const { bookingId } = await c.req.json();
  if (!bookingId) return apiError(c, "BAD_REQUEST", "bookingId required", 400);

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { items: true },
  });

  if (!booking) return apiError(c, "NOT_FOUND", "Booking not found", 404);
  if (booking.status !== "pending") {
    return apiError(c, "ALREADY_PROCESSED", "Booking already processed", 409);
  }

  const mockPaymentId = createMockPaymentId();

  // Confirm the booking
  const [confirmed] = await db
    .update(bookings)
    .set({
      status: "confirmed",
      paymentStatus: "paid",
      paymentMethod: "mock",
      razorpayPaymentId: mockPaymentId,
      bookedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, bookingId))
    .returning();

  // Decrement ticket tier quantities
  for (const item of booking.items) {
    await db
      .update(ticketTiers)
      .set({
        availableQuantity: sql`${ticketTiers.availableQuantity} - ${item.quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(ticketTiers.id, item.tierId));
  }

  // Enqueue ticket generation
  await ticketQueue.add(
    "generate-tickets",
    { bookingId: booking.id, userId: booking.userId },
    { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
  );

  return apiSuccess(c, {
    bookingRef: confirmed.bookingRef,
    status: confirmed.status,
    paymentId: mockPaymentId,
  }, "Booking confirmed (mock payment)");
});

// ── Razorpay webhook (used when real Razorpay is active) ─────────────────────
// POST /payments/webhook
paymentsRouter.post("/webhook", async (c) => {
  // In mock mode, webhook is not used — return early
  if (isMockPayment()) {
    return c.json({ received: true, note: "mock mode active" });
  }

  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  const body = await c.req.text();
  const signature = c.req.header("x-razorpay-signature");

  if (!signature) {
    return c.json({ success: false, error: "Missing signature" }, 400);
  }

  if (secret) {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return c.json({ success: false, error: "Invalid signature" }, 401);
    }
  }

  const event = JSON.parse(body);

  switch (event.event) {
    case "payment.captured":
      await handlePaymentCaptured(event.payload.payment.entity);
      break;
    case "payment.failed":
      await handlePaymentFailed(event.payload.payment.entity);
      break;
    case "refund.processed":
      await handleRefundProcessed(event.payload.refund.entity);
      break;
    default:
      console.log(`[webhook] Unhandled event: ${event.event}`);
  }

  return c.json({ received: true });
});

// ── Webhook handlers ──────────────────────────────────────────────────────────

async function handlePaymentCaptured(payment: any) {
  const razorpayOrderId = payment.order_id;
  const razorpayPaymentId = payment.id;
  if (payment.status !== "captured") return;

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.razorpayOrderId, razorpayOrderId),
  });
  if (!booking || booking.status === "confirmed") return;

  await db
    .update(bookings)
    .set({ status: "confirmed", paymentStatus: "paid", razorpayPaymentId, bookedAt: new Date(), updatedAt: new Date() })
    .where(eq(bookings.id, booking.id));

  const items = await db.query.bookingItems.findMany({
    where: (bi, { eq }) => eq(bi.bookingId, booking.id),
  });
  for (const item of items) {
    await db
      .update(ticketTiers)
      .set({ availableQuantity: sql`${ticketTiers.availableQuantity} - ${item.quantity}`, updatedAt: new Date() })
      .where(eq(ticketTiers.id, item.tierId));
  }

  await ticketQueue.add("generate-tickets", { bookingId: booking.id, userId: booking.userId }, {
    attempts: 3, backoff: { type: "exponential", delay: 5000 },
  });
}

async function handlePaymentFailed(payment: any) {
  await db
    .update(bookings)
    .set({ paymentStatus: "failed", updatedAt: new Date() })
    .where(eq(bookings.razorpayOrderId, payment.order_id));
}

async function handleRefundProcessed(refund: any) {
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.razorpayPaymentId, refund.payment_id),
  });
  if (!booking) return;

  const amountRefunded = parseFloat(refund.amount);
  const originalAmount = parseFloat(booking.finalAmount);

  if (amountRefunded >= originalAmount) {
    await db
      .update(bookings)
      .set({ status: "refunded", paymentStatus: "refunded", updatedAt: new Date() })
      .where(eq(bookings.id, booking.id));

    const items = await db.query.bookingItems.findMany({
      where: (bi, { eq }) => eq(bi.bookingId, booking.id),
    });
    for (const item of items) {
      await db
        .update(ticketTiers)
        .set({ availableQuantity: sql`${ticketTiers.availableQuantity} + ${item.quantity}`, updatedAt: new Date() })
        .where(eq(ticketTiers.id, item.tierId));
    }
  }
}

export default paymentsRouter;
