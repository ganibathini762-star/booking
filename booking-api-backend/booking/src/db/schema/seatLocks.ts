import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { seats } from "./seats.js";
import { eventShows } from "./events.js";
import { users } from "./users.js";

export const seatLocks = pgTable("seat_locks", {
  id: uuid("id").primaryKey().defaultRandom(),
  seatId: uuid("seat_id")
    .notNull()
    .references(() => seats.id, { onDelete: "cascade" }),
  showId: uuid("show_id")
    .notNull()
    .references(() => eventShows.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  lockedAt: timestamp("locked_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});
