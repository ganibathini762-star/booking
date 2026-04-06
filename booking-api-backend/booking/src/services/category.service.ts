import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { categories } from "../db/schema/index.js";
import type { CreateCategoryInput, UpdateCategoryInput } from "../schemas/category.schema.js";

export const categoryService = {
  async list() {
    return db.query.categories.findMany({
      where: eq(categories.isActive, true),
      orderBy: (c, { asc }) => [asc(c.name)],
    });
  },

  async listAll() {
    return db.query.categories.findMany({
      orderBy: (c, { asc }) => [asc(c.name)],
    });
  },

  async findBySlug(slug: string) {
    const category = await db.query.categories.findFirst({
      where: eq(categories.slug, slug),
    });
    if (!category) throw Object.assign(new Error("Category not found"), { code: "NOT_FOUND" });
    return category;
  },

  async create(input: CreateCategoryInput) {
    const existing = await db.query.categories.findFirst({
      where: eq(categories.slug, input.slug),
    });
    if (existing) throw Object.assign(new Error("Slug already exists"), { code: "SLUG_EXISTS" });

    const [cat] = await db.insert(categories).values(input).returning();
    return cat;
  },

  async update(id: string, input: UpdateCategoryInput) {
    const [updated] = await db
      .update(categories)
      .set(input)
      .where(eq(categories.id, id))
      .returning();
    if (!updated) throw Object.assign(new Error("Category not found"), { code: "NOT_FOUND" });
    return updated;
  },

  async remove(id: string) {
    const [deleted] = await db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning();
    if (!deleted) throw Object.assign(new Error("Category not found"), { code: "NOT_FOUND" });
  },
};
