import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
  date,
  time,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { categories } from "./categories.js";
import { venues } from "./venues.js";

export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "published",
  "cancelled",
  "completed",
]);

export const showStatusEnum = pgEnum("show_status", [
  "active",
  "cancelled",
  "housefull",
  "soldout",
]);

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 300 }).notNull().unique(),
  description: text("description"),
  categoryId: uuid("category_id").references(() => categories.id),
  organizerId: uuid("organizer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  venueId: uuid("venue_id").references(() => venues.id),
  startDatetime: timestamp("start_datetime"),
  endDatetime: timestamp("end_datetime"),
  language: varchar("language", { length: 50 }),
  ageRating: varchar("age_rating", { length: 10 }),
  status: eventStatusEnum("status").default("draft").notNull(),
  bannerUrl: varchar("banner_url", { length: 500 }),
  trailerUrl: varchar("trailer_url", { length: 500 }),
  tags: text("tags").array().default([]),
  isFeatured: boolean("is_featured").default(false).notNull(),
  metaJson: jsonb("meta_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const eventShows = pgTable("event_shows", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  showDate: date("show_date").notNull(),
  showTime: time("show_time").notNull(),
  status: showStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
