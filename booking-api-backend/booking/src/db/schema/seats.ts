import {
  pgTable,
  uuid,
  varchar,
  real,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { venueSections } from "./venues.js";

export const seatTypeEnum = pgEnum("seat_type", [
  "regular",
  "premium",
  "disabled",
  "blocked",
]);

export const seats = pgTable("seats", {
  id: uuid("id").primaryKey().defaultRandom(),
  sectionId: uuid("section_id")
    .notNull()
    .references(() => venueSections.id, { onDelete: "cascade" }),
  row: varchar("row", { length: 10 }).notNull(),
  seatNumber: varchar("seat_number", { length: 10 }).notNull(),
  seatType: seatTypeEnum("seat_type").default("regular").notNull(),
  xPosition: real("x_position"),
  yPosition: real("y_position"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
