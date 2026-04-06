import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { requireAdmin, requireOrganizer } from "../middleware/roleGuard.js";
import { parseBody, parseQuery } from "../middleware/validate.js";
import { apiSuccess, apiError } from "../utils/response.js";
import { promotionService } from "../services/promotion.service.js";
import { z } from "zod";

const couponsRouter = new Hono();

// Zod schema for coupon create/update
const couponSchema = z.object({
  code: z.string().min(1).max(50),
  type: z.enum(["flat", "percent", "bogo"]),
  value: z.number().nonnegative(),
  minOrderAmount: z.number().nonnegative().optional(),
  maxUses: z.number().int().positive().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  eventId: z.string().uuid().optional(),
});

couponsRouter.use("*", authMiddleware);

// GET /coupons — admin gets all, organizer gets own
couponsRouter.get("/", async (c) => {
  const user = c.get("user");
  const role = user.role as "admin" | "organizer" | "user";
  const rows = await promotionService.list(user.id, role);
  return apiSuccess(c, rows);
});

// GET /coupons/my — organizer's own coupons (explicit)
couponsRouter.get("/my", async (c) => {
  const user = c.get("user");
  if (user.role !== "organizer") {
    return apiError(c, "FORBIDDEN", "Only organizers can access this endpoint", 403);
  }
  const rows = await promotionService.list(user.id, "organizer");
  return apiSuccess(c, rows);
});

// POST /coupons — create (admin or organizer)
couponsRouter.post("/", requireOrganizer, async (c) => {
  const user = c.get("user");
  const body = await parseBody(c, couponSchema);
  if (!body) return c.res;

  const input = {
    ...body,
    validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
    validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
  };

  try {
    const coupon = await promotionService.create(user.id, input);
    return apiSuccess(c, coupon, "Coupon created", 201);
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === "CODE_EXISTS") return apiError(c, "CODE_EXISTS", e.message ?? "Code exists", 409);
    throw err;
  }
});

// PUT /coupons/:id — update
couponsRouter.put("/:id", requireOrganizer, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const body = await parseBody(c, couponSchema.partial());
  if (!body) return c.res;

  const input = {
    ...body,
    validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
    validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
  };

  try {
    const coupon = await promotionService.update(id, user.id, (user.role as "admin" | "organizer"), input);
    return apiSuccess(c, coupon, "Coupon updated");
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", e.message ?? "Not found", 404);
    if (e.code === "FORBIDDEN") return apiError(c, "FORBIDDEN", e.message ?? "Forbidden", 403);
    throw err;
  }
});

// DELETE /coupons/:id — delete
couponsRouter.delete("/:id", requireOrganizer, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  try {
    await promotionService.delete(id, user.id, (user.role as "admin" | "organizer"));
    return apiSuccess(c, null, "Coupon deleted");
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", e.message ?? "Not found", 404);
    if (e.code === "FORBIDDEN") return apiError(c, "FORBIDDEN", e.message ?? "Forbidden", 403);
    throw err;
  }
});

export default couponsRouter;
