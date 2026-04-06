import {
  pgTable,
  uuid,
  varchar,
  integer,
  decimal,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { events } from "./events.js";
import { users } from "./users.js";

export const couponTypeEnum = pgEnum("coupon_type", ["flat", "percent", "bogo"]);

export const promotions = pgTable("promotions", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  type: couponTypeEnum("type").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0).notNull(),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  eventId: uuid("event_id").references(() => events.id),
  organizerId: uuid("organizer_id").references(() => users.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
