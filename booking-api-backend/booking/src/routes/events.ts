import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { requireAdmin, requireOrganizer, requireUser } from "../middleware/roleGuard.js";
import { parseBody, parseQuery } from "../middleware/validate.js";
import { apiSuccess, apiError } from "../utils/response.js";
import { AppBindings } from "../types/index.js";
import { eventService } from "../services/event.service.js";
import {
  createEventSchema,
  updateEventSchema,
  createShowSchema,
  createTicketTierSchema,
  eventListQuerySchema,
} from "../schemas/event.schema.js";
import { z } from "zod";

const eventsRouter = new Hono();

// ── Public ────────────────────────────────────────────────────────
eventsRouter.get("/", async (c) => {
  const query = parseQuery(c, eventListQuerySchema);
  if (!query) return c.res;
  const { rows, meta } = await eventService.list(query);
  return apiSuccess(c, rows, undefined, 200, meta);
});

eventsRouter.get("/featured", async (c) => {
  const rows = await eventService.getFeatured();
  return apiSuccess(c, rows);
});

eventsRouter.get("/trending", async (c) => {
  const rows = await eventService.getTrending();
  return apiSuccess(c, rows);
});

eventsRouter.get("/upcoming", async (c) => {
  const rows = await eventService.getUpcoming();
  return apiSuccess(c, rows);
});

// GET /events/my — organizer's own events
eventsRouter.get("/my", authMiddleware, requireOrganizer, async (c) => {
  const user = c.get("user");
  const page = Number(c.req.query("page") ?? 1);
  const limit = Number(c.req.query("limit") ?? 20);
  const { rows, meta } = await eventService.getMyEvents(user.id, page, limit);
  return apiSuccess(c, rows, undefined, 200, meta);
});

// GET /events/pending — admin
eventsRouter.get("/pending", authMiddleware, requireAdmin, async (c) => {
  const { rows } = await eventService.list({ page: 1, limit: 50, status: "draft" });
  return apiSuccess(c, rows);
});

// GET /events/:slug — public
eventsRouter.get("/:slug", async (c) => {
  const { slug } = c.req.param();
  try {
    const event = await eventService.findBySlug(slug);
    return apiSuccess(c, event);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Event not found", 404);
    throw err;
  }
});

// GET /events/:slug/shows — public
eventsRouter.get("/:slug/shows", async (c) => {
  const { slug } = c.req.param();
  try {
    const shows = await eventService.getShows(slug);
    return apiSuccess(c, shows);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Event not found", 404);
    throw err;
  }
});

// ── Organizer CRUD ────────────────────────────────────────────────
eventsRouter.post("/", authMiddleware, requireOrganizer, async (c) => {
  const user = c.get("user");
  const body = await parseBody(c, createEventSchema);
  if (!body) return c.res;
  const event = await eventService.create(user.id, body);
  return apiSuccess(c, event, "Event created", 201);
});

eventsRouter.put("/:id", authMiddleware, requireOrganizer, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const body = await parseBody(c, updateEventSchema);
  if (!body) return c.res;
  try {
    const event = await eventService.update(id, user.id, body, user.role === "admin");
    return apiSuccess(c, event, "Event updated");
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Event not found", 404);
    if (e.code === "FORBIDDEN") return apiError(c, "FORBIDDEN", "Not your event", 403);
    throw err;
  }
});

eventsRouter.delete("/:id", authMiddleware, requireOrganizer, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  try {
    await eventService.remove(id, user.id, user.role === "admin");
    return apiSuccess(c, null, "Event deleted");
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Event not found", 404);
    if (e.code === "FORBIDDEN") return apiError(c, "FORBIDDEN", "Not your event", 403);
    throw err;
  }
});

eventsRouter.post("/:id/publish", authMiddleware, requireOrganizer, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  try {
    const event = await eventService.publish(id, user.id);
    return apiSuccess(c, event, "Event published");
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Event not found", 404);
    if (e.code === "FORBIDDEN") return apiError(c, "FORBIDDEN", "Not your event", 403);
    throw err;
  }
});

eventsRouter.post("/:id/cancel", authMiddleware, requireOrganizer, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  try {
    const event = await eventService.cancel(id, user.id, user.role === "admin");
    return apiSuccess(c, event, "Event cancelled");
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Event not found", 404);
    if (e.code === "FORBIDDEN") return apiError(c, "FORBIDDEN", "Not your event", 403);
    throw err;
  }
});

eventsRouter.post("/:id/feature", authMiddleware, requireAdmin, async (c) => {
  const { id } = c.req.param();
  const { featured } = await c.req.json<{ featured: boolean }>();
  try {
    const event = await eventService.setFeatured(id, featured);
    return apiSuccess(c, event, `Event ${featured ? "featured" : "unfeatured"}`);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Event not found", 404);
    throw err;
  }
});

// POST /events/:id/reject — admin only
eventsRouter.post("/:id/reject", authMiddleware, requireAdmin, async (c) => {
  const { id } = c.req.param();
  const user = c.get("user");
  try {
    const event = await eventService.cancel(id, user.id, true); // Use admin = true
    return apiSuccess(c, event, "Event rejected");
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Event not found", 404);
    throw err;
  }
});

// ── Shows ─────────────────────────────────────────────────────────
eventsRouter.post("/:id/shows", authMiddleware, requireOrganizer, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const body = await parseBody(c, createShowSchema);
  if (!body) return c.res;
  try {
    const show = await eventService.addShow(id, user.id, body);
    return apiSuccess(c, show, "Show added", 201);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Event not found", 404);
    if (e.code === "FORBIDDEN") return apiError(c, "FORBIDDEN", "Not your event", 403);
    throw err;
  }
});

eventsRouter.put("/:id/shows/:showId", authMiddleware, requireOrganizer, async (c) => {
  const user = c.get("user");
  const { id, showId } = c.req.param();
  const body = await parseBody(c, createShowSchema.partial());
  if (!body) return c.res;
  try {
    const show = await eventService.updateShow(id, showId, user.id, body);
    return apiSuccess(c, show, "Show updated");
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Not found", 404);
    if (e.code === "FORBIDDEN") return apiError(c, "FORBIDDEN", "Not your event", 403);
    throw err;
  }
});

eventsRouter.delete("/:id/shows/:showId", authMiddleware, requireOrganizer, async (c) => {
  const user = c.get("user");
  const { id, showId } = c.req.param();
  try {
    await eventService.removeShow(id, showId, user.id);
    return apiSuccess(c, null, "Show deleted");
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Not found", 404);
    if (e.code === "FORBIDDEN") return apiError(c, "FORBIDDEN", "Not your event", 403);
    throw err;
  }
});

// ── Ticket Tiers ──────────────────────────────────────────────────
eventsRouter.post("/:id/shows/:showId/tiers", authMiddleware, requireOrganizer, async (c) => {
  const user = c.get("user");
  const { id, showId } = c.req.param();
  const body = await parseBody(c, createTicketTierSchema);
  if (!body) return c.res;
  try {
    const tier = await eventService.addTier(id, showId, user.id, body);
    return apiSuccess(c, tier, "Ticket tier added", 201);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Not found", 404);
    if (e.code === "FORBIDDEN") return apiError(c, "FORBIDDEN", "Not your event", 403);
    throw err;
  }
});

eventsRouter.put("/:id/shows/:showId/tiers/:tid", authMiddleware, requireOrganizer, async (c) => {
  const user = c.get("user");
  const { id, showId, tid } = c.req.param();
  const body = await parseBody(c, createTicketTierSchema.partial());
  if (!body) return c.res;
  try {
    const tier = await eventService.updateTier(id, showId, tid, user.id, body);
    return apiSuccess(c, tier, "Ticket tier updated");
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Not found", 404);
    if (e.code === "FORBIDDEN") return apiError(c, "FORBIDDEN", "Not your event", 403);
    throw err;
  }
});

eventsRouter.delete("/:id/shows/:showId/tiers/:tid", authMiddleware, requireOrganizer, async (c) => {
  const user = c.get("user");
  const { id, showId, tid } = c.req.param();
  try {
    await eventService.removeTier(id, showId, tid, user.id);
    return apiSuccess(c, null, "Ticket tier deleted");
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Not found", 404);
    if (e.code === "FORBIDDEN") return apiError(c, "FORBIDDEN", "Not your event", 403);
    throw err;
  }
});

export default eventsRouter;
