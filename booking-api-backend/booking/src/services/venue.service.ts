import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { venues, venueSections } from "../db/schema/index.js";
import { getPagination, buildMeta } from "../utils/paginate.js";
import type { CreateVenueInput, UpdateVenueInput, CreateSectionInput } from "../schemas/venue.schema.js";

export const venueService = {
  async list(params: { page?: number; limit?: number; city?: string; q?: string }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const { offset } = getPagination({ page, limit });

    const where = and(
      eq(venues.isApproved, true),
      params.city ? ilike(venues.city, `%${params.city}%`) : undefined,
      params.q
        ? or(ilike(venues.name, `%${params.q}%`), ilike(venues.city, `%${params.q}%`))
        : undefined
    );

    const [rows, countResult] = await Promise.all([
      db.query.venues.findMany({ where, limit, offset, orderBy: (v, { asc }) => [asc(v.name)] }),
      db.select({ count: sql<number>`count(*)::int` }).from(venues).where(where),
    ]);

    return { rows, meta: buildMeta(countResult[0]?.count ?? 0, { page, limit }) };
  },

  async findById(id: string) {
    const venue = await db.query.venues.findFirst({
      where: eq(venues.id, id),
      with: { sections: true },
    });
    if (!venue) throw Object.assign(new Error("Venue not found"), { code: "NOT_FOUND" });
    return venue;
  },

  async getSections(venueId: string) {
    return db.query.venueSections.findMany({
      where: eq(venueSections.venueId, venueId),
      orderBy: (s, { asc }) => [asc(s.name)],
    });
  },

  async create(organizerId: string, input: CreateVenueInput) {
    const [venue] = await db.insert(venues).values({
      name: input.name,
      address: input.address,
      city: input.city,
      state: input.state,
      country: input.country ?? "India",
      capacity: input.capacity,
      organizerId,
      // Drizzle decimal columns require string
      latitude: input.latitude != null ? String(input.latitude) : undefined,
      longitude: input.longitude != null ? String(input.longitude) : undefined,
      amenities: input.amenities,
    }).returning();
    return venue;
  },

  async update(id: string, organizerId: string, input: UpdateVenueInput, isAdmin = false) {
    const venue = await db.query.venues.findFirst({ where: eq(venues.id, id) });
    if (!venue) throw Object.assign(new Error("Venue not found"), { code: "NOT_FOUND" });
    if (!isAdmin && venue.organizerId !== organizerId)
      throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN" });

    const [updated] = await db.update(venues).set({
      ...input,
      latitude: input.latitude != null ? String(input.latitude) : undefined,
      longitude: input.longitude != null ? String(input.longitude) : undefined,
      updatedAt: new Date(),
    }).where(eq(venues.id, id)).returning();
    return updated;
  },

  async remove(id: string, organizerId: string, isAdmin = false) {
    const venue = await db.query.venues.findFirst({ where: eq(venues.id, id) });
    if (!venue) throw Object.assign(new Error("Venue not found"), { code: "NOT_FOUND" });
    if (!isAdmin && venue.organizerId !== organizerId)
      throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN" });
    await db.delete(venues).where(eq(venues.id, id));
  },

  async approve(id: string) {
    const [updated] = await db.update(venues).set({ isApproved: true }).where(eq(venues.id, id)).returning();
    if (!updated) throw Object.assign(new Error("Venue not found"), { code: "NOT_FOUND" });
    return updated;
  },

  async reject(id: string) {
    const [updated] = await db.update(venues).set({ isApproved: false }).where(eq(venues.id, id)).returning();
    if (!updated) throw Object.assign(new Error("Venue not found"), { code: "NOT_FOUND" });
    return updated;
  },

  async listPending() {
    return db.query.venues.findMany({
      where: eq(venues.isApproved, false),
      orderBy: (v, { desc }) => [desc(v.createdAt)],
    });
  },

  async addSection(venueId: string, organizerId: string, input: CreateSectionInput) {
    const venue = await db.query.venues.findFirst({ where: eq(venues.id, venueId) });
    if (!venue) throw Object.assign(new Error("Venue not found"), { code: "NOT_FOUND" });
    if (venue.organizerId !== organizerId)
      throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN" });
    const [section] = await db.insert(venueSections).values({ ...input, venueId }).returning();
    return section;
  },

  async updateSection(venueId: string, sectionId: string, organizerId: string, input: Partial<CreateSectionInput>) {
    const venue = await db.query.venues.findFirst({ where: eq(venues.id, venueId) });
    if (!venue) throw Object.assign(new Error("Venue not found"), { code: "NOT_FOUND" });
    if (venue.organizerId !== organizerId)
      throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN" });
    const [updated] = await db.update(venueSections).set(input)
      .where(and(eq(venueSections.id, sectionId), eq(venueSections.venueId, venueId))).returning();
    if (!updated) throw Object.assign(new Error("Section not found"), { code: "NOT_FOUND" });
    return updated;
  },

  async removeSection(venueId: string, sectionId: string, organizerId: string) {
    const venue = await db.query.venues.findFirst({ where: eq(venues.id, venueId) });
    if (!venue) throw Object.assign(new Error("Venue not found"), { code: "NOT_FOUND" });
    if (venue.organizerId !== organizerId)
      throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN" });
    await db.delete(venueSections).where(
      and(eq(venueSections.id, sectionId), eq(venueSections.venueId, venueId))
    );
  },
};
