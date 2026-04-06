import crypto from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { redis, REDIS_TTL } from "../config/redis.js";
import { createMockOrder, createMockPaymentId, isMockPayment, getRazorpay } from "../config/razorpay.js";
import { env } from "../config/env.js";
import { ticketQueue } from "../config/queue.js";
import {
  bookings,
  bookingItems,
  ticketTiers,
  eventShows,
  promotions,
  notifications,
} from "../db/schema/index.js";
import { getPagination, buildMeta } from "../utils/paginate.js";
import type { CreateOrderInput, LockSeatsInput, VerifyPaymentInput } from "../schemas/booking.schema.js";

// ── Redis key for seat/tier advisory lock ────────────────────────
const LOCK_PREFIX = (lockId: string) => `booking:lock:${lockId}`;

function makeLockId(userId: string, showId: string) {
  return `${userId}:${showId}:${Date.now()}`;
}

function makeBookingRef() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TF-${ts}-${rand}`;
}

export const bookingService = {
  // ── Show availability ──────────────────────────────────────────
  async getShowAvailability(showId: string) {
    const show = await db.query.eventShows.findFirst({
      where: eq(eventShows.id, showId),
      with: {
        ticketTiers: true,
        event: { with: { venue: { with: { sections: true } } } },
      },
    });
    if (!show) throw Object.assign(new Error("Show not found"), { code: "NOT_FOUND" });
    return show;
  },

  // ── Lock tiers in Redis (advisory lock, 10 min) ────────────────
  async lockSeats(userId: string, input: LockSeatsInput) {
    const { showId, items } = input;

    // Verify show exists and tiers belong to it
    const tiers = await db.query.ticketTiers.findMany({
      where: eq(ticketTiers.showId, showId),
    });
    const tierMap = new Map(tiers.map((t) => [t.id, t]));

    for (const item of items) {
      const tier = tierMap.get(item.tierId);
      if (!tier) throw Object.assign(new Error(`Tier ${item.tierId} not found`), { code: "NOT_FOUND" });
      if (tier.availableQuantity < item.quantity)
        throw Object.assign(new Error(`Not enough seats for ${tier.name}`), { code: "INSUFFICIENT_SEATS" });
      if (item.quantity > tier.maxPerBooking)
        throw Object.assign(new Error(`Max ${tier.maxPerBooking} tickets per booking for ${tier.name}`), {
          code: "MAX_EXCEEDED",
        });
    }

    const lockId = makeLockId(userId, showId);
    const expiresAt = new Date(Date.now() + REDIS_TTL.seatLock * 1000);

    await redis.set(
      LOCK_PREFIX(lockId),
      JSON.stringify({ userId, showId, items, expiresAt: expiresAt.toISOString() }),
      'EX', REDIS_TTL.seatLock
    );

    return { lockId, expiresAt };
  },

  // ── Create Razorpay order + pending booking ────────────────────
  async createOrder(userId: string, input: CreateOrderInput) {
    const { showId, lockId, items, couponCode } = input;

    // Verify lock still valid
    const lockRaw = await redis.get(LOCK_PREFIX(lockId));
    if (!lockRaw) throw Object.assign(new Error("Seat lock expired. Please reselect."), { code: "LOCK_EXPIRED" });

    const lock = typeof lockRaw === "string" ? JSON.parse(lockRaw) : lockRaw as { userId: string; showId: string };
    if (lock.userId !== userId || lock.showId !== showId)
      throw Object.assign(new Error("Invalid lock"), { code: "INVALID_LOCK" });

    // Verify tiers + compute amounts
    const tiers = await db.query.ticketTiers.findMany({
      where: eq(ticketTiers.showId, showId),
    });
    const tierMap = new Map(tiers.map((t) => [t.id, t]));

    let totalAmount = 0;
    const orderItems: { tier: typeof tiers[number]; quantity: number }[] = [];

    for (const item of items) {
      const tier = tierMap.get(item.tierId);
      if (!tier) throw Object.assign(new Error("Tier not found"), { code: "NOT_FOUND" });
      if (tier.availableQuantity < item.quantity)
        throw Object.assign(new Error(`Not enough seats for ${tier.name}`), { code: "INSUFFICIENT_SEATS" });
      totalAmount += parseFloat(tier.price) * item.quantity;
      orderItems.push({ tier, quantity: item.quantity });
    }

    // Apply coupon discount
    let couponDiscount = 0;
    if (couponCode) {
      const promo = await db.query.promotions.findFirst({
        where: and(
          eq(promotions.code, couponCode.toUpperCase()),
          eq(promotions.isActive, true)
        ),
      });
      if (promo) {
        const minOrder = promo.minOrderAmount ? parseFloat(promo.minOrderAmount) : 0;
        if (totalAmount >= minOrder) {
          if (promo.type === "flat") couponDiscount = Math.min(parseFloat(promo.value), totalAmount);
          else if (promo.type === "percent") couponDiscount = totalAmount * (parseFloat(promo.value) / 100);
        }
      }
    }

    const convenienceFee = Math.round(totalAmount * 0.02 * 100) / 100;
    const taxableAmount = totalAmount - couponDiscount;
    const taxAmount = Math.round(taxableAmount * 0.18 * 100) / 100;
    const finalAmount = Math.round((taxableAmount + convenienceFee + taxAmount) * 100) / 100;

    const bookingRef = makeBookingRef();
    const amountInPaise = Math.round(finalAmount * 100);

    // Create payment order — mock or real Razorpay
    let rzpOrder: { id: string; amount: number; currency: string };
    if (isMockPayment()) {
      rzpOrder = createMockOrder(amountInPaise, bookingRef);
    } else {
      rzpOrder = await getRazorpay().orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: bookingRef,
      });
    }

    // Create pending booking in DB
    const [booking] = await db
      .insert(bookings)
      .values({
        bookingRef,
        userId,
        showId,
        status: "pending",
        totalAmount: String(totalAmount),
        convenienceFee: String(convenienceFee),
        taxAmount: String(taxAmount),
        finalAmount: String(finalAmount),
        razorpayOrderId: rzpOrder.id,
      })
      .returning();

    // Insert booking items
    await db.insert(bookingItems).values(
      orderItems.map((oi) => ({
        bookingId: booking.id,
        tierId: oi.tier.id,
        quantity: oi.quantity,
        unitPrice: oi.tier.price,
        totalPrice: String(parseFloat(oi.tier.price) * oi.quantity),
      }))
    );

    return {
      bookingId: booking.id,
      bookingRef,
      razorpayOrderId: rzpOrder.id,
      amount: Math.round(finalAmount * 100),
      currency: "INR",
      keyId: env.RAZORPAY_KEY_ID,
    };
  },

  // ── Verify payment + confirm booking ──────────────────────────
  async verifyPayment(userId: string, input: VerifyPaymentInput) {
    const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = input;

    if (!isMockPayment() && razorpaySignature) {
      // HMAC verification only for real Razorpay
      const expectedSig = crypto
        .createHmac("sha256", env.RAZORPAY_KEY_SECRET!)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      if (expectedSig !== razorpaySignature)
        throw Object.assign(new Error("Payment verification failed"), { code: "PAYMENT_INVALID" });
    }

    // Load booking
    const booking = await db.query.bookings.findFirst({
      where: and(eq(bookings.id, bookingId), eq(bookings.userId, userId)),
      with: { items: true },
    });
    if (!booking) throw Object.assign(new Error("Booking not found"), { code: "NOT_FOUND" });
    if (booking.status !== "pending")
      throw Object.assign(new Error("Booking already processed"), { code: "ALREADY_PROCESSED" });

    // Update booking status
    const [confirmed] = await db
      .update(bookings)
      .set({
        status: "confirmed",
        paymentStatus: "paid",
        paymentMethod: "razorpay",
        razorpayPaymentId,
        bookedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId))
      .returning();

    // Decrement available quantity for each tier
    for (const item of booking.items) {
      await db
        .update(ticketTiers)
        .set({
          availableQuantity: sql`${ticketTiers.availableQuantity} - ${item.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(ticketTiers.id, item.tierId));
    }

    // Enqueue ticket generation + email notification
    await ticketQueue.add(
      "generate-tickets",
      { bookingId, userId },
      { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
    );

    // Insert in-app notification
    await db.insert(notifications).values({
      userId,
      type: "push",
      title: "Booking Confirmed!",
      body: `Your booking ${confirmed.bookingRef} has been confirmed. Check My Bookings for your tickets.`,
    });

    return confirmed;
  },

  // ── User booking list ──────────────────────────────────────────
  async getMyBookings(userId: string, page: number, limit: number) {
    const { offset } = getPagination({ page, limit });
    const where = eq(bookings.userId, userId);

    const [rows, countResult] = await Promise.all([
      db.query.bookings.findMany({
        where,
        limit,
        offset,
        orderBy: [desc(bookings.createdAt)],
        with: {
          show: {
            with: { event: { with: { venue: true } } },
          },
          items: { with: { tier: true } },
        },
      }),
      db.select({ count: sql<number>`count(*)::int` }).from(bookings).where(where),
    ]);

    return { rows, meta: buildMeta(countResult[0]?.count ?? 0, { page, limit }) };
  },

  // ── Single booking detail ──────────────────────────────────────
  async getBooking(bookingId: string, userId: string) {
    const booking = await db.query.bookings.findFirst({
      where: and(eq(bookings.id, bookingId), eq(bookings.userId, userId)),
      with: {
        show: {
          with: {
            event: { with: { venue: true, category: true } },
          },
        },
        items: { with: { tier: true, tickets: true } },
      },
    });
    if (!booking) throw Object.assign(new Error("Booking not found"), { code: "NOT_FOUND" });
    return booking;
  },

  // ── Cancel booking ─────────────────────────────────────────────
  async cancelBooking(bookingId: string, userId: string) {
    const booking = await db.query.bookings.findFirst({
      where: and(eq(bookings.id, bookingId), eq(bookings.userId, userId)),
      with: { items: true },
    });
    if (!booking) throw Object.assign(new Error("Booking not found"), { code: "NOT_FOUND" });
    if (booking.status !== "pending" && booking.status !== "confirmed")
      throw Object.assign(new Error("Booking cannot be cancelled"), { code: "CANNOT_CANCEL" });

    const [updated] = await db
      .update(bookings)
      .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
      .where(eq(bookings.id, bookingId))
      .returning();

    // Restore quantities only if it was confirmed
    if (booking.status === "confirmed") {
      for (const item of booking.items) {
        await db
          .update(ticketTiers)
          .set({
            availableQuantity: sql`${ticketTiers.availableQuantity} + ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(ticketTiers.id, item.tierId));
      }
    }

    return updated;
  },

  // ── Admin: all bookings for a show ─────────────────────────────
  async getShowBookings(showId: string, page: number, limit: number) {
    const { offset } = getPagination({ page, limit });
    const where = eq(bookings.showId, showId);

    const [rows, countResult] = await Promise.all([
      db.query.bookings.findMany({
        where,
        limit,
        offset,
        orderBy: [desc(bookings.createdAt)],
        with: { items: { with: { tier: true } }, show: true },
      }),
      db.select({ count: sql<number>`count(*)::int` }).from(bookings).where(where),
    ]);

    return { rows, meta: buildMeta(countResult[0]?.count ?? 0, { page, limit }) };
  },

  // ── Validate coupon ────────────────────────────────────────────
  async validateCoupon(code: string, amount: number) {
    const promo = await db.query.promotions.findFirst({
      where: and(
        eq(promotions.code, code.toUpperCase()),
        eq(promotions.isActive, true)
      ),
    });

    if (!promo) return { valid: false, message: "Invalid coupon code" };

    const now = new Date();
    if (promo.validFrom && now < promo.validFrom) return { valid: false, message: "Coupon not yet active" };
    if (promo.validUntil && now > promo.validUntil) return { valid: false, message: "Coupon expired" };
    if (promo.maxUses != null && promo.usedCount >= promo.maxUses)
      return { valid: false, message: "Coupon usage limit reached" };

    const minOrder = promo.minOrderAmount ? parseFloat(promo.minOrderAmount) : 0;
    if (amount < minOrder)
      return { valid: false, message: `Minimum order ₹${minOrder} required` };

    let discount = 0;
    if (promo.type === "flat") discount = Math.min(parseFloat(promo.value), amount);
    else if (promo.type === "percent") discount = amount * (parseFloat(promo.value) / 100);

    return {
      valid: true,
      discount: Math.round(discount * 100) / 100,
      type: promo.type,
      value: parseFloat(promo.value),
      message: `Coupon applied! You save ₹${discount.toFixed(2)}`,
    };
  },
};
