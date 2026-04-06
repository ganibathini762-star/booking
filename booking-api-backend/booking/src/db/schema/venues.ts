import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  decimal,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const venues = pgTable("venues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  country: varchar("country", { length: 100 }).default("India").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  capacity: integer("capacity").notNull(),
  amenities: jsonb("amenities").$type<{
    parking?: boolean;
    food?: boolean;
    wheelchair?: boolean;
    wifi?: boolean;
    atm?: boolean;
  }>(),
  images: jsonb("images").$type<string[]>().default([]),
  organizerId: uuid("organizer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  isApproved: boolean("is_approved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const venueSections = pgTable("venue_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  venueId: uuid("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  totalSeats: integer("total_seats").notNull(),
  layoutJson: jsonb("layout_json").$type<{
    rows: number;
    cols: number;
    seatMap?: unknown;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
