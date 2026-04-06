import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/roleGuard.js";
import { parseBody } from "../middleware/validate.js";
import { apiSuccess, apiError } from "../utils/response.js";
import { categoryService } from "../services/category.service.js";
import { createCategorySchema, updateCategorySchema } from "../schemas/category.schema.js";

const categories = new Hono();

// GET /categories — public
categories.get("/", async (c) => {
  const all = await categoryService.list();
  return apiSuccess(c, all);
});

// GET /categories/all — admin (includes inactive)
categories.get("/all", authMiddleware, requireAdmin, async (c) => {
  const all = await categoryService.listAll();
  return apiSuccess(c, all);
});

// GET /categories/:slug — public
categories.get("/:slug", async (c) => {
  const { slug } = c.req.param();
  try {
    const cat = await categoryService.findBySlug(slug);
    return apiSuccess(c, cat);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Category not found", 404);
    throw err;
  }
});

// POST /categories — admin only
categories.post("/", authMiddleware, requireAdmin, async (c) => {
  const body = await parseBody(c, createCategorySchema);
  if (!body) return c.res;
  try {
    const cat = await categoryService.create(body);
    return apiSuccess(c, cat, "Category created", 201);
  } catch (err: unknown) {
    const e = err as { code?: string; message: string };
    if (e.code === "SLUG_EXISTS") return apiError(c, "SLUG_EXISTS", e.message, 409);
    throw err;
  }
});

// PUT /categories/:id — admin only
categories.put("/:id", authMiddleware, requireAdmin, async (c) => {
  const { id } = c.req.param();
  const body = await parseBody(c, updateCategorySchema);
  if (!body) return c.res;
  try {
    const cat = await categoryService.update(id, body);
    return apiSuccess(c, cat, "Category updated");
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Category not found", 404);
    throw err;
  }
});

// DELETE /categories/:id — admin only
categories.delete("/:id", authMiddleware, requireAdmin, async (c) => {
  const { id } = c.req.param();
  try {
    await categoryService.remove(id);
    return apiSuccess(c, null, "Category deleted");
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "NOT_FOUND") return apiError(c, "NOT_FOUND", "Category not found", 404);
    throw err;
  }
});

export default categories;
