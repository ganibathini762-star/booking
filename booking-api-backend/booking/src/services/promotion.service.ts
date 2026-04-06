import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { promotions } from "../db/schema/index.js";

export const promotionService = {
  // ── List all coupons (admin sees all, organizer sees own) ─────────────────
  async list(userId: string, role: "admin" | "organizer" | "user") {
    const where = role === "admin" ? undefined : eq(promotions.organizerId, userId);
    return db.query.promotions.findMany({
      where,
      orderBy: [desc(promotions.createdAt)],
    });
  },

  // ── Get single coupon ───────────────────────────────────────────────────
  async get(id: string, userId: string, role: "admin" | "organizer" | "user") {
    const where = role === "admin" ? eq(promotions.id, id) : and(eq(promotions.id, id), eq(promotions.organizerId, userId));
    const coupon = await db.query.promotions.findFirst({ where });
    if (!coupon) throw Object.assign(new Error("Coupon not found"), { code: "NOT_FOUND" });
    return coupon;
  },

  // ── Create coupon ───────────────────────────────────────────────────────
  async create(userId: string, input: {
    code: string;
    type: "flat" | "percent" | "bogo";
    value: number;
    minOrderAmount?: number;
    maxUses?: number;
    validFrom?: Date;
    validUntil?: Date;
    eventId?: string | null;
  }) {
    const existing = await db.query.promotions.findFirst({
      where: eq(promotions.code, input.code.toUpperCase()),
    });
    if (existing) throw Object.assign(new Error("Coupon code already exists"), { code: "CODE_EXISTS" });

    const [coupon] = await db
      .insert(promotions)
      .values({
        code: input.code.toUpperCase(),
        type: input.type,
        value: String(input.value),
        minOrderAmount: input.minOrderAmount != null ? String(input.minOrderAmount) : undefined,
        maxUses: input.maxUses,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        eventId: input.eventId,
        organizerId: userId,
      })
      .returning();

    return coupon;
  },

  // ── Update coupon ───────────────────────────────────────────────────────
  async update(id: string, userId: string, role: "admin" | "organizer", input: Partial<{
    type?: "flat" | "percent" | "bogo";
    value?: number;
    minOrderAmount?: number;
    maxUses?: number;
    validFrom?: Date;
    validUntil?: Date;
    eventId?: string | null;
    isActive?: boolean;
  }>) {
    const where = role === "admin" ? eq(promotions.id, id) : and(eq(promotions.id, id), eq(promotions.organizerId, userId));
    const existing = await db.query.promotions.findFirst({ where });
    if (!existing) throw Object.assign(new Error("Coupon not found"), { code: "NOT_FOUND" });

    const [updated] = await db
      .update(promotions)
      .set({
        type: input.type,
        value: input.value != null ? String(input.value) : undefined,
        minOrderAmount: input.minOrderAmount != null ? String(input.minOrderAmount) : undefined,
        maxUses: input.maxUses,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        eventId: input.eventId,
        isActive: input.isActive,
      })
      .where(where)
      .returning();

    return updated;
  },

  // ── Delete coupon ───────────────────────────────────────────────────────
  async delete(id: string, userId: string, role: "admin" | "organizer") {
    const where = role === "admin" ? eq(promotions.id, id) : and(eq(promotions.id, id), eq(promotions.organizerId, userId));
    const existing = await db.query.promotions.findFirst({ where });
    if (!existing) throw Object.assign(new Error("Coupon not found"), { code: "NOT_FOUND" });

    await db.delete(promotions).where(where);
    return true;
  },

  // ── Increment used count ────────────────────────────────────────────────
  async incrementUsedCount(id: string) {
    await db
      .update(promotions)
      .set({ usedCount: sql`${promotions.usedCount} + 1` })
      .where(eq(promotions.id, id));
  },

  // ── Validate coupon (reuse from bookingService logic) ──────────────────
  async validate(code: string, amount: number) {
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
      return { valid: false, message: `Minimum order ₹${minOrder.toFixed(2)} required` };

    let discount = 0;
    if (promo.type === "flat") discount = Math.min(parseFloat(promo.value), amount);
    else if (promo.type === "percent") discount = amount * (parseFloat(promo.value) / 100);

    return {
      valid: true,
      discount: Math.round(discount * 100) / 100,
      type: promo.type,
      value: parseFloat(promo.value),
      couponId: promo.id,
      message: `Coupon applied! You save ₹${discount.toFixed(2)}`,
    };
  },
};
