// Table definitions (no circular imports)
export * from "./users.js";
export * from "./categories.js";
export * from "./venues.js";
export * from "./events.js";
export * from "./ticketTiers.js";
export * from "./seats.js";
export * from "./seatLocks.js";
export * from "./bookings.js";
export * from "./tickets.js";
export * from "./reviews.js";
export * from "./promotions.js";
export * from "./notifications.js";
export * from "./auditLogs.js";

// Relations (defined here to avoid circular imports between schema files)
import { relations } from "drizzle-orm";
import { users } from "./users.js";
import { categories } from "./categories.js";
import { venues, venueSections } from "./venues.js";
import { events, eventShows } from "./events.js";
import { ticketTiers } from "./ticketTiers.js";
import { seats } from "./seats.js";
import { seatLocks } from "./seatLocks.js";
import { bookings, bookingItems } from "./bookings.js";
import { tickets } from "./tickets.js";
import { reviews } from "./reviews.js";
import { promotions } from "./promotions.js";
import { notifications } from "./notifications.js";
import { auditLogs } from "./auditLogs.js";

export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  reviews: many(reviews),
  notifications: many(notifications),
  venues: many(venues),
  events: many(events),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  events: many(events),
}));

export const venuesRelations = relations(venues, ({ one, many }) => ({
  organizer: one(users, { fields: [venues.organizerId], references: [users.id] }),
  sections: many(venueSections),
  events: many(events),
}));

export const venueSectionsRelations = relations(venueSections, ({ one, many }) => ({
  venue: one(venues, { fields: [venueSections.venueId], references: [venues.id] }),
  seats: many(seats),
  ticketTiers: many(ticketTiers),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  category: one(categories, { fields: [events.categoryId], references: [categories.id] }),
  organizer: one(users, { fields: [events.organizerId], references: [users.id] }),
  venue: one(venues, { fields: [events.venueId], references: [venues.id] }),
  shows: many(eventShows),
  reviews: many(reviews),
}));

export const eventShowsRelations = relations(eventShows, ({ one, many }) => ({
  event: one(events, { fields: [eventShows.eventId], references: [events.id] }),
  ticketTiers: many(ticketTiers),
  bookings: many(bookings),
  seatLocks: many(seatLocks),
}));

export const ticketTiersRelations = relations(ticketTiers, ({ one, many }) => ({
  show: one(eventShows, { fields: [ticketTiers.showId], references: [eventShows.id] }),
  section: one(venueSections, { fields: [ticketTiers.sectionId], references: [venueSections.id] }),
  bookingItems: many(bookingItems),
}));

export const seatsRelations = relations(seats, ({ one, many }) => ({
  section: one(venueSections, { fields: [seats.sectionId], references: [venueSections.id] }),
  seatLocks: many(seatLocks),
  bookingItems: many(bookingItems),
  tickets: many(tickets),
}));

export const seatLocksRelations = relations(seatLocks, ({ one }) => ({
  seat: one(seats, { fields: [seatLocks.seatId], references: [seats.id] }),
  show: one(eventShows, { fields: [seatLocks.showId], references: [eventShows.id] }),
  user: one(users, { fields: [seatLocks.userId], references: [users.id] }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, { fields: [bookings.userId], references: [users.id] }),
  show: one(eventShows, { fields: [bookings.showId], references: [eventShows.id] }),
  items: many(bookingItems),
  tickets: many(tickets),
}));

export const bookingItemsRelations = relations(bookingItems, ({ one, many }) => ({
  booking: one(bookings, { fields: [bookingItems.bookingId], references: [bookings.id] }),
  tier: one(ticketTiers, { fields: [bookingItems.tierId], references: [ticketTiers.id] }),
  seat: one(seats, { fields: [bookingItems.seatId], references: [seats.id] }),
  tickets: many(tickets),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  bookingItem: one(bookingItems, { fields: [tickets.bookingItemId], references: [bookingItems.id] }),
  seat: one(seats, { fields: [tickets.seatId], references: [seats.id] }),
  scannedByUser: one(users, { fields: [tickets.scannedBy], references: [users.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  event: one(events, { fields: [reviews.eventId], references: [events.id] }),
}));

export const promotionsRelations = relations(promotions, ({ one }) => ({
  event: one(events, { fields: [promotions.eventId], references: [events.id] }),
  organizer: one(users, { fields: [promotions.organizerId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, { fields: [auditLogs.actorId], references: [users.id] }),
}));
