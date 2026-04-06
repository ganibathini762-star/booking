import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../config/db.js";
import { events, eventShows, ticketTiers } from "../db/schema/index.js";
import { getPagination, buildMeta } from "../utils/paginate.js";
import { slugify } from "../utils/slugify.js";
import { meilisearch } from "../config/meilisearch.js";
import { AppBindings } from "../types/index.js";
import type { CreateEventInput, CreateShowInput, CreateTicketTierInput } from "../schemas/event.schema.js";

const eventsRouter = new Hono<AppBindings>();
const notificationsRouter = new Hono<AppBindings>();

function toMsDoc(event: { id: string; title: string; slug: string; status: string; description?: string | null; bannerUrl?: string | null; language?: string | null }) {
  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    status: event.status,
    description: event.description ?? "",
    bannerUrl: event.bannerUrl ?? null,
    language: event.language ?? null,
  };
}

async function syncToMeilisearch(event: Parameters<typeof toMsDoc>[0]) {
  try {
    await meilisearch.index("events").addDocuments([toMsDoc(event)]);
  } catch {
    // non-fatal — DB is source of truth
  }
}

// Convert ISO string to Date for Drizzle timestamp columns
function toDate(s?: string): Date | undefined {
  return s ? new Date(s) : undefined;
}

export const eventService = {
  // ── Public listing ──────────────────────────────────────────
  async list(params: {
    page?: number;
    limit?: number;
    category?: string;
    city?: string;
    q?: string;
    status?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const { offset } = getPagination({ page, limit });

    const where = and(
      params.status
        ? eq(events.status, params.status as "draft" | "published" | "cancelled" | "completed")
        : eq(events.status, "published"),
      params.q
        ? or(ilike(events.title, `%${params.q}%`), ilike(events.description ?? "", `%${params.q}%`))
        : undefined
    );

    const [rows, countResult] = await Promise.all([
      db.query.events.findMany({
        where,
        limit,
        offset,
        orderBy: [desc(events.createdAt)],
        with: { category: true, venue: true },
      }),
      db.select({ count: sql<number>`count(*)::int` }).from(events).where(where),
    ]);

    const filtered = params.city
      ? rows.filter((e) => e.venue?.city?.toLowerCase() === params.city!.toLowerCase())
      : rows;

    return { rows: filtered, meta: buildMeta(countResult[0]?.count ?? 0, { page, limit }) };
  },

  async getFeatured() {
    return db.query.events.findMany({
      where: and(eq(events.status, "published"), eq(events.isFeatured, true)),
      limit: 8,
      orderBy: [desc(events.createdAt)],
      with: { category: true, venue: true },
    });
  },

  async getTrending() {
    return db.query.events.findMany({
      where: eq(events.status, "published"),
      limit: 8,
      orderBy: [desc(events.createdAt)],
      with: { category: true, venue: true },
    });
  },

  async getUpcoming() {
    return db.query.events.findMany({
      where: and(eq(events.status, "published"), sql`${events.startDatetime} > now()`),
      limit: 12,
      orderBy: [sql`${events.startDatetime} asc`],
      with: { category: true, venue: true },
    });
  },

  async findBySlug(slug: string) {
    const event = await db.query.events.findFirst({
      where: eq(events.slug, slug),
      with: {
        category: true,
        venue: { with: { sections: true } },
        organizer: true,
        shows: {
          with: { ticketTiers: true },
          orderBy: (s, { asc }) => [asc(s.showDate), asc(s.showTime)],
        },
        reviews: {
          with: { user: true },
          orderBy: (r, { desc }) => [desc(r.createdAt)],
          limit: 10,
        },
      },
    });
    if (!event) throw Object.assign(new Error("Event not found"), { code: "NOT_FOUND" });
    return event;
  },

  async getShows(eventSlug: string) {
    const event = await db.query.events.findFirst({ where: eq(events.slug, eventSlug) });
    if (!event) throw Object.assign(new Error("Event not found"), { code: "NOT_FOUND" });
    return db.query.eventShows.findMany({
      where: and(eq(eventShows.eventId, event.id), eq(eventShows.status, "active")),
      with: { ticketTiers: true },
      orderBy: (s, { asc }) => [asc(s.showDate), asc(s.showTime)],
    });
  },

  async search(q: string, limit = 10) {
    return db.query.events.findMany({
      where: and(
        eq(events.status, "published"),
        or(ilike(events.title, `%${q}%`), ilike(events.description ?? "", `%${q}%`))
      ),
      limit,
      with: { category: true, venue: true },
    });
  },

  // ── Organizer CRUD ────────────────────────────────────────────
  async getMyEvents(organizerId: string, page: number, limit: number) {
    const { offset, limit: lim } = getPagination({ page, limit });
    const where = eq(events.organizerId, organizerId);
    const [rows, countResult] = await Promise.all([
      db.query.events.findMany({
        where, limit: lim, offset,
        orderBy: [desc(events.createdAt)],
        with: { category: true, venue: true },
      }),
      db.select({ count: sql<number>`count(*)::int` }).from(events).where(where),
    ]);
    return { rows, meta: buildMeta(countResult[0]?.count ?? 0, { page, limit }) };
  },

  async create(organizerId: string, input: CreateEventInput) {
    const slug = await this.uniqueSlug(input.title);
    const [event] = await db.insert(events).values({
      title: input.title,
      slug,
      organizerId,
      description: input.description,
      categoryId: input.categoryId,
      venueId: input.venueId,
      // Convert ISO strings to Date for Drizzle timestamp columns
      startDatetime: toDate(input.startDatetime),
      endDatetime: toDate(input.endDatetime),
      language: input.language,
      ageRating: input.ageRating,
      bannerUrl: input.bannerUrl,
      trailerUrl: input.trailerUrl,
      tags: input.tags,
      metaJson: input.metaJson,
    }).returning();
    await syncToMeilisearch(event);
    return event;
  },

  async update(id: string, organizerId: string, input: Partial<CreateEventInput>, isAdmin = false) {
    const event = await db.query.events.findFirst({ where: eq(events.id, id) });
    if (!event) throw Object.assign(new Error("Event not found"), { code: "NOT_FOUND" });
    if (!isAdmin && event.organizerId !== organizerId)
      throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN" });

    const [updated] = await db.update(events).set({
      title: input.title,
      description: input.description,
      categoryId: input.categoryId,
      venueId: input.venueId,
      startDatetime: toDate(input.startDatetime),
      endDatetime: toDate(input.endDatetime),
      language: input.language,
      ageRating: input.ageRating,
      bannerUrl: input.bannerUrl,
      trailerUrl: input.trailerUrl,
      tags: input.tags,
      metaJson: input.metaJson as any,
      updatedAt: new Date(),
    }).where(eq(events.id, id)).returning();
    await syncToMeilisearch(updated);
    return updated;
  },

  async remove(id: string, organizerId: string, isAdmin = false) {
    const event = await db.query.events.findFirst({ where: eq(events.id, id) });
    if (!event) throw Object.assign(new Error("Event not found"), { code: "NOT_FOUND" });
    if (!isAdmin && event.organizerId !== organizerId)
      throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN" });
    await db.delete(events).where(eq(events.id, id));
  },

  async publish(id: string, organizerId: string) {
    const event = await db.query.events.findFirst({ where: eq(events.id, id) });
    if (!event) throw Object.assign(new Error("Event not found"), { code: "NOT_FOUND" });
    if (event.organizerId !== organizerId)
      throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN" });
    const [updated] = await db.update(events)
      .set({ status: "published", updatedAt: new Date() })
      .where(eq(events.id, id)).returning();
    await syncToMeilisearch(updated);
    return updated;
  },

  async cancel(id: string, actorId: string, isAdmin = false) {
    const event = await db.query.events.findFirst({ where: eq(events.id, id) });
    if (!event) throw Object.assign(new Error("Event not found"), { code: "NOT_FOUND" });
    if (!isAdmin && event.organizerId !== actorId)
      throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN" });
    const [updated] = await db.update(events)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(events.id, id)).returning();
    await syncToMeilisearch(updated);
    return updated;
  },

  async setFeatured(id: string, featured: boolean) {
    const [updated] = await db.update(events)
      .set({ isFeatured: featured, updatedAt: new Date() })
      .where(eq(events.id, id)).returning();
    if (!updated) throw Object.assign(new Error("Event not found"), { code: "NOT_FOUND" });
    return updated;
  },

  // ── Shows ─────────────────────────────────────────────────────
  async addShow(eventId: string, organizerId: string, input: CreateShowInput) {
    const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
    if (!event) throw Object.assign(new Error("Event not found"), { code: "NOT_FOUND" });
    if (event.organizerId !== organizerId)
      throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN" });
    const [show] = await db.insert(eventShows).values({ ...input, eventId }).returning();
    return show;
  },

  async updateShow(eventId: string, showId: string, organizerId: string, input: Partial<CreateShowInput>) {
    const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
    if (!event) throw Object.assign(new Error("Event not found"), { code: "NOT_FOUND" });
    if (event.organizerId !== organizerId)
      throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN" });
    const [updated] = await db.update(eventShows).set(input)
      .where(and(eq(eventShows.id, showId), eq(eventShows.eventId, eventId))).returning();
    if (!updated) throw Object.assign(new Error("Show not found"), { code: "NOT_FOUND" });
    return updated;
  },

  async removeShow(eventId: string, showId: string, organizerId: string) {
    const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
    if (!event) throw Object.assign(new Error("Event not found"), { code: "NOT_FOUND" });
    if (event.organizerId !== organizerId)
      throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN" });
    await db.delete(eventShows).where(
      and(eq(eventShows.id, showId), eq(eventShows.eventId, eventId))
    );
  },

  // ── Ticket Tiers ──────────────────────────────────────────────
  async addTier(eventId: string, showId: string, organizerId: string, input: CreateTicketTierInput) {
    const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
    if (!event) throw Object.assign(new Error("Event not found"), { code: "NOT_FOUND" });
    if (event.organizerId !== organizerId)
      throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN" });

    const [tier] = await db.insert(ticketTiers).values({
      showId,
      name: input.name,
      price: String(input.price),
      totalQuantity: input.totalQuantity,
      availableQuantity: input.totalQuantity,
      maxPerBooking: input.maxPerBooking ?? 10,
      sectionId: input.sectionId,
      saleStartAt: toDate(input.saleStartAt),
      saleEndAt: toDate(input.saleEndAt),
    }).returning();
    return tier;
  },

  async updateTier(eventId: string, showId: string, tierId: string, organizerId: string, input: Partial<CreateTicketTierInput>) {
    const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
    if (!event) throw Object.assign(new Error("Event not found"), { code: "NOT_FOUND" });
    if (event.organizerId !== organizerId)
      throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN" });

    const [updated] = await db.update(ticketTiers).set({
      name: input.name,
      price: input.price != null ? String(input.price) : undefined,
      totalQuantity: input.totalQuantity,
      maxPerBooking: input.maxPerBooking,
      sectionId: input.sectionId,
      saleStartAt: toDate(input.saleStartAt),
      saleEndAt: toDate(input.saleEndAt),
      updatedAt: new Date(),
    }).where(and(eq(ticketTiers.id, tierId), eq(ticketTiers.showId, showId))).returning();
    if (!updated) throw Object.assign(new Error("Tier not found"), { code: "NOT_FOUND" });
    return updated;
  },

  async removeTier(eventId: string, showId: string, tierId: string, organizerId: string) {
    const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
    if (!event) throw Object.assign(new Error("Event not found"), { code: "NOT_FOUND" });
    if (event.organizerId !== organizerId)
      throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN" });
    await db.delete(ticketTiers).where(
      and(eq(ticketTiers.id, tierId), eq(ticketTiers.showId, showId))
    );
  },

  // ── Helpers ───────────────────────────────────────────────────
  async uniqueSlug(title: string): Promise<string> {
    let slug = slugify(title);
    const existing = await db.query.events.findFirst({ where: eq(events.slug, slug) });
    if (existing) slug = `${slug}-${Date.now()}`;
    return slug;
  },
};
