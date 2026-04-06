import {
  pgTable,
  uuid,
  integer,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { events } from "./events.js";

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  content: text("content"),
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
