import {
  pgTable,
  uuid,
  varchar,
  integer,
  decimal,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { eventShows } from "./events.js";
import { ticketTiers } from "./ticketTiers.js";
import { seats } from "./seats.js";

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "cancelled",
  "refunded",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingRef: varchar("booking_ref", { length: 50 }).notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  showId: uuid("show_id")
    .notNull()
    .references(() => eventShows.id),
  status: bookingStatusEnum("status").default("pending").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  convenienceFee: decimal("convenience_fee", { precision: 10, scale: 2 }).default("0").notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: paymentStatusEnum("payment_status").default("pending").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  razorpayOrderId: varchar("razorpay_order_id", { length: 100 }),
  razorpayPaymentId: varchar("razorpay_payment_id", { length: 100 }),
  bookedAt: timestamp("booked_at"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bookingItems = pgTable("booking_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  tierId: uuid("tier_id")
    .notNull()
    .references(() => ticketTiers.id),
  seatId: uuid("seat_id").references(() => seats.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});
