import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { parseBody } from "../middleware/validate.js";
import { apiSuccess, apiError } from "../utils/response.js";
import { seatService } from "../services/seat.service.js";
import {
  lockSeatsSchema,
  // add unlock schema if needed
} from "../schemas/booking.schema.js";
import { AppBindings } from "../types/index.js";

const seatsRouter = new Hono<AppBindings>();

// GET /shows/:showId/seats — public (seat map with availability)
seatsRouter.get("/:showId/seats", async (c) => {
  const { showId } = c.req.param();
  try {
    const seatMap = await seatService.getSeatMap(showId);
    return apiSuccess(c, seatMap);
  } catch (err: unknown) {
    const e = err as any;
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", e.message || "Show not found", 404);
    throw err;
  }
});

// GET /shows/:showId/availability — public (summary)
seatsRouter.get("/:showId/availability", async (c) => {
  const { showId } = c.req.param();
  try {
    const summary = await seatService.getAvailabilitySummary(showId);
    return apiSuccess(c, summary);
  } catch (err: unknown) {
    const e = err as any;
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", e.message || "Show not found", 404);
    throw err;
  }
});

// POST /shows/:showId/seats/lock — auth required
seatsRouter.post("/:showId/seats/lock", authMiddleware, async (c) => {
  const user = c.get("user");
  const { showId } = c.req.param();
  const body = await parseBody(c, lockSeatsSchema.omit({ showId: true }));
  if (!body) return c.res;

  try {
    // Merge showId from path with body items
    const result = await seatService.lockSeats(user.id, showId, body.items);
    return apiSuccess(c, result, "Seats locked for 10 minutes");
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", e.message ?? "Not found", 404);
    if (e.code === "INSUFFICIENT_SEATS") return apiError(c, "INSUFFICIENT_SEATS", e.message ?? "Not enough seats", 409);
    if (e.code === "MAX_EXCEEDED") return apiError(c, "MAX_EXCEEDED", e.message ?? "Max tickets exceeded", 409);
    throw err;
  }
});

// DELETE /shows/:showId/seats/unlock — auth required
seatsRouter.delete("/:showId/seats/unlock", authMiddleware, async (c) => {
  const user = c.get("user");
  const { showId } = c.req.param();
  const lockId = c.req.query("lockId");

  if (!lockId) {
    return apiError(c, "BAD_REQUEST", "lockId query parameter required", 400);
  }

  try {
    const success = await seatService.unlockSeats(user.id, lockId);
    if (!success) {
      return apiError(c, "NOT_FOUND", "Lock not found or already expired", 404);
    }
    return apiSuccess(c, null, "Seats unlocked");
  } catch (err: unknown) {
    const e = err as any;
    if (e.code === "FORBIDDEN") return apiError(c, "FORBIDDEN", e.message || "Unauthorized", 403);
    throw err;
  }
});

export default seatsRouter;
