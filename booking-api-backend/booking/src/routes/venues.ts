import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { requireAdmin, requireOrganizer } from "../middleware/roleGuard.js";
import { parseBody, parseQuery } from "../middleware/validate.js";
import { apiSuccess, apiError } from "../utils/response.js";
import { venueService } from "../services/venue.service.js";
import {
  createVenueSchema,
  updateVenueSchema,
  createSectionSchema,
  venueListQuerySchema,
} from "../schemas/venue.schema.js";

const venuesRouter = new Hono();

// GET /venues — public (paginated, filterable)
venuesRouter.get("/", async (c) => {
  const query = parseQuery(c, venueListQuerySchema);
  if (!query) return c.res;
  const { rows, meta } = await venueService.list(query);
  return apiSuccess(c, rows, undefined, 200, meta);
});

// GET /venues/pending — admin
venuesRouter.get("/pending", authMiddleware, requireAdmin, async (c) => {
  const rows = await venueService.listPending();
  return apiSuccess(c, rows);
});

// GET /venues/:id — public
venuesRouter.get("/:id", async (c) => {
  const { id } = c.req.param();
  try {
    const venue = await venueService.findById(id);
    return apiSuccess(c, venue);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Venue not found", 404);
    throw err;
  }
});

// GET /venues/:id/sections — public
venuesRouter.get("/:id/sections", async (c) => {
  const { id } = c.req.param();
  const sections = await venueService.getSections(id);
  return apiSuccess(c, sections);
});

// POST /venues — organizer
venuesRouter.post("/", authMiddleware, requireOrganizer, async (c) => {
  const user = c.get("user");
  const body = await parseBody(c, createVenueSchema);
  if (!body) return c.res;
  const venue = await venueService.create(user.id, body);
  return apiSuccess(c, venue, "Venue created. Pending admin approval.", 201);
});

// PUT /venues/:id — organizer/admin
venuesRouter.put("/:id", authMiddleware, requireOrganizer, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const body = await parseBody(c, updateVenueSchema);
  if (!body) return c.res;
  try {
    const venue = await venueService.update(id, user.id, body, user.role === "admin");
    return apiSuccess(c, venue, "Venue updated");
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Venue not found", 404);
    if (e.code === "FORBIDDEN") return apiError(c, "FORBIDDEN", "Not your venue", 403);
    throw err;
  }
});

// DELETE /venues/:id — organizer/admin
venuesRouter.delete("/:id", authMiddleware, requireOrganizer, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  try {
    await venueService.remove(id, user.id, user.role === "admin");
    return apiSuccess(c, null, "Venue deleted");
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Venue not found", 404);
    if (e.code === "FORBIDDEN") return apiError(c, "FORBIDDEN", "Not your venue", 403);
    throw err;
  }
});

// POST /venues/:id/approve — admin
venuesRouter.post("/:id/approve", authMiddleware, requireAdmin, async (c) => {
  const { id } = c.req.param();
  try {
    const venue = await venueService.approve(id);
    return apiSuccess(c, venue, "Venue approved");
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Venue not found", 404);
    throw err;
  }
});

// POST /venues/:id/reject — admin
venuesRouter.post("/:id/reject", authMiddleware, requireAdmin, async (c) => {
  const { id } = c.req.param();
  try {
    const venue = await venueService.reject(id);
    return apiSuccess(c, venue, "Venue rejected");
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Venue not found", 404);
    throw err;
  }
});

// POST /venues/:id/sections — organizer
venuesRouter.post("/:id/sections", authMiddleware, requireOrganizer, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const body = await parseBody(c, createSectionSchema);
  if (!body) return c.res;
  try {
    const section = await venueService.addSection(id, user.id, body);
    return apiSuccess(c, section, "Section added", 201);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Venue not found", 404);
    if (e.code === "FORBIDDEN") return apiError(c, "FORBIDDEN", "Not your venue", 403);
    throw err;
  }
});

// PUT /venues/:id/sections/:sId — organizer
venuesRouter.put("/:id/sections/:sId", authMiddleware, requireOrganizer, async (c) => {
  const user = c.get("user");
  const { id, sId } = c.req.param();
  const body = await parseBody(c, createSectionSchema.partial());
  if (!body) return c.res;
  try {
    const section = await venueService.updateSection(id, sId, user.id, body);
    return apiSuccess(c, section, "Section updated");
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Not found", 404);
    if (e.code === "FORBIDDEN") return apiError(c, "FORBIDDEN", "Not your venue", 403);
    throw err;
  }
});

// DELETE /venues/:id/sections/:sId — organizer
venuesRouter.delete("/:id/sections/:sId", authMiddleware, requireOrganizer, async (c) => {
  const user = c.get("user");
  const { id, sId } = c.req.param();
  try {
    await venueService.removeSection(id, sId, user.id);
    return apiSuccess(c, null, "Section deleted");
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Not found", 404);
    if (e.code === "FORBIDDEN") return apiError(c, "FORBIDDEN", "Not your venue", 403);
    throw err;
  }
});

export default venuesRouter;
