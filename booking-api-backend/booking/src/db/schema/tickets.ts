import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { bookingItems } from "./bookings.js";
import { seats } from "./seats.js";
import { users } from "./users.js";

export const ticketStatusEnum = pgEnum("ticket_status", [
  "valid",
  "used",
  "cancelled",
  "expired",
]);

export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingItemId: uuid("booking_item_id")
    .notNull()
    .references(() => bookingItems.id, { onDelete: "cascade" }),
  ticketCode: varchar("ticket_code", { length: 50 }).notNull().unique(),
  seatId: uuid("seat_id").references(() => seats.id),
  qrUrl: varchar("qr_url", { length: 500 }),
  pdfUrl: varchar("pdf_url", { length: 500 }),
  status: ticketStatusEnum("status").default("valid").notNull(),
  scannedAt: timestamp("scanned_at"),
  scannedBy: uuid("scanned_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
