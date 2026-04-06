import { z } from "zod";

export const lockSeatsSchema = z.object({
  showId: z.string().uuid(),
  items: z
    .array(
      z.object({
        tierId: z.string().uuid(),
        quantity: z.number().int().min(1).max(20),
      })
    )
    .min(1)
    .max(10),
});

export const createOrderSchema = z.object({
  showId: z.string().uuid(),
  lockId: z.string().min(1),
  items: z
    .array(
      z.object({
        tierId: z.string().uuid(),
        quantity: z.number().int().min(1),
      })
    )
    .min(1),
  couponCode: z.string().optional(),
});

export const verifyPaymentSchema = z.object({
  bookingId: z.string().uuid(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().optional(),
});

export const bookingListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const applyCouponSchema = z.object({
  code: z.string().min(1).max(50),
  amount: z.number().min(0),
});

export type LockSeatsInput = z.infer<typeof lockSeatsSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
