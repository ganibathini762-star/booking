import {
  pgTable,
  uuid,
  varchar,
  integer,
  decimal,
  timestamp,
} from "drizzle-orm/pg-core";
import { eventShows } from "./events.js";
import { venueSections } from "./venues.js";

export const ticketTiers = pgTable("ticket_tiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  showId: uuid("show_id")
    .notNull()
    .references(() => eventShows.id, { onDelete: "cascade" }),
  sectionId: uuid("section_id").references(() => venueSections.id),
  name: varchar("name", { length: 100 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  totalQuantity: integer("total_quantity").notNull(),
  availableQuantity: integer("available_quantity").notNull(),
  saleStartAt: timestamp("sale_start_at"),
  saleEndAt: timestamp("sale_end_at"),
  maxPerBooking: integer("max_per_booking").default(10).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
