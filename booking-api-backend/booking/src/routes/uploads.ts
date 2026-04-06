import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { requireOrganizer } from "../middleware/roleGuard.js";
import { apiSuccess, apiError } from "../utils/response.js";
import { db } from "../config/db.js";
import { uploadToSupabase, STORAGE_PATHS } from "../config/storage.js";
import { v4 as uuidv4 } from "uuid";
import { eq, and, sql } from "drizzle-orm";
import { venues, events as eventsTable, users } from "../db/schema/index.js";

const uploadsRouter = new Hono();

// POST /uploads/venue/:venueId/images — organizer only
uploadsRouter.post("/venue/:venueId/images", authMiddleware, requireOrganizer, async (c) => {
  const user = c.get("user");
  const { venueId } = c.req.param();

  const venue = await db.query.venues.findFirst({
    where: and(eq(venues.id, venueId), eq(venues.organizerId, user.id)),
  });

  if (!venue) {
    return apiError(c, "NOT_FOUND", "Venue not found or you don't have permission", 404);
  }

  const formData = await c.req.raw.formData();
  const file = formData.get("image");
  if (!file) {
    return apiError(c, "BAD_REQUEST", "No image file provided", 400);
  }
  const fileData = file as any;

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  if (!allowedTypes.includes(fileData.type)) {
    return apiError(c, "BAD_REQUEST", "Only JPEG, PNG, WebP, AVIF allowed", 400);
  }

  if (fileData.size > 5 * 1024 * 1024) {
    return apiError(c, "BAD_REQUEST", "Image size must be less than 5MB", 400);
  }

  const ext = fileData.name.split(".").pop() || "jpg";
  const path = `${STORAGE_PATHS.venueImages}/${venueId}/${uuidv4()}.${ext}`;

  try {
    const buffer = Buffer.from(await fileData.arrayBuffer());
    const url = await uploadToSupabase(path, buffer, fileData.type);

    const currentImages = venue.images || [];
    await db
      .update(venues)
      .set({ images: [...currentImages, url] })
      .where(eq(venues.id, venueId));

    return apiSuccess(c, { url }, "Image uploaded", 201);
  } catch (err) {
    console.error("Upload error:", err);
    return apiError(c, "UPLOAD_ERROR", "Failed to upload image", 500);
  }
});

// POST /uploads/events/:eventId/banner — organizer or admin
uploadsRouter.post("/events/:eventId/banner", authMiddleware, async (c) => {
  const user = c.get("user");
  const { eventId } = c.req.param();

  const event = await db.query.events.findFirst({
    where: and(
      eq(eventsTable.id, eventId),
      sql`${eventsTable.organizerId} = ${user.id} OR ${user.role} = 'admin'`
    ),
  });

  if (!event) {
    return apiError(c, "NOT_FOUND", "Event not found or no permission", 404);
  }

  const formData = await c.req.raw.formData();
  const file = formData.get("banner");
  if (!file) {
    return apiError(c, "BAD_REQUEST", "No banner file provided", 400);
  }
  const fileData = file as any;

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(fileData.type)) {
    return apiError(c, "BAD_REQUEST", "Only JPEG, PNG, WebP allowed", 400);
  }

  if (fileData.size > 10 * 1024 * 1024) {
    return apiError(c, "BAD_REQUEST", "Banner must be less than 10MB", 400);
  }

  const ext = fileData.name.split(".").pop() || "jpg";
  const path = `${STORAGE_PATHS.eventBanners}/${eventId}/${uuidv4()}.${ext}`;

  try {
    const buffer = Buffer.from(await fileData.arrayBuffer());
    const url = await uploadToSupabase(path, buffer, fileData.type);

    await db
      .update(eventsTable)
      .set({ bannerUrl: url })
      .where(eq(eventsTable.id, eventId));

    return apiSuccess(c, { url }, "Banner uploaded", 201);
  } catch (err) {
    console.error("Upload error:", err);
    return apiError(c, "UPLOAD_ERROR", "Failed to upload banner", 500);
  }
});

// POST /uploads/avatar — user upload avatar
uploadsRouter.post("/avatar", authMiddleware, async (c) => {
  const user = c.get("user");

  const formData = await c.req.raw.formData();
  const file = formData.get("avatar");
  if (!file) {
    return apiError(c, "BAD_REQUEST", "No avatar file provided", 400);
  }
  const fileData = file as any;

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(fileData.type)) {
    return apiError(c, "BAD_REQUEST", "Only JPEG, PNG, WebP allowed", 400);
  }

  if (fileData.size > 2 * 1024 * 1024) {
    return apiError(c, "BAD_REQUEST", "Avatar must be less than 2MB", 400);
  }

  const ext = fileData.name.split(".").pop() || "jpg";
  const path = `${STORAGE_PATHS.avatars}/${user.id}/${uuidv4()}.${ext}`;

  try {
    const buffer = Buffer.from(await fileData.arrayBuffer());
    const url = await uploadToSupabase(path, buffer, fileData.type);

    await db
      .update(users)
      .set({ avatarUrl: url })
      .where(eq(users.id, user.id));

    return apiSuccess(c, { url }, "Avatar uploaded", 201);
  } catch (err) {
    console.error("Upload error:", err);
    return apiError(c, "UPLOAD_ERROR", "Failed to upload avatar", 500);
  }
});

export default uploadsRouter;
