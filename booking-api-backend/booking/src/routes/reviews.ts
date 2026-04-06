import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { apiSuccess, apiError } from "../utils/response.js";
import { db } from "../config/db.js";
import { reviews, bookings, events, eventShows } from "../db/schema/index.js";
import { AppBindings } from "../types/index.js";

const reviewsRouter = new Hono<AppBindings>();

// POST /reviews — authenticated, must have a confirmed booking for the event
reviewsRouter.post("/", authMiddleware, async (c) => {
  const userId = c.get("user").id;
  const body = await c.req.json<{ eventId: string; rating: number; content?: string }>();

  const { eventId, rating, content } = body;

  if (!eventId || typeof rating !== "number" || rating < 1 || rating > 5) {
    return apiError(c, "INVALID_INPUT", "eventId and rating (1–5) are required", 400);
  }

  // Verify event exists
  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
  if (!event) return apiError(c, "NOT_FOUND", "Event not found", 404);

  // Check user has a confirmed booking for any show of this event
  const confirmedBooking = await db.query.bookings.findFirst({
    where: and(eq(bookings.userId, userId), eq(bookings.status, "confirmed")),
    with: { show: true },
  });

  const hasAttended =
    confirmedBooking &&
    confirmedBooking.show &&
    (confirmedBooking.show as { eventId: string }).eventId === eventId;

  // Check for duplicate review
  const existing = await db.query.reviews.findFirst({
    where: and(eq(reviews.userId, userId), eq(reviews.eventId, eventId)),
  });
  if (existing) return apiError(c, "ALREADY_REVIEWED", "You have already reviewed this event", 409);

  const [review] = await db
    .insert(reviews)
    .values({
      userId,
      eventId,
      rating,
      content: content?.trim() || null,
      isVerified: !!hasAttended,
    })
    .returning();

  return apiSuccess(c, review, "Review submitted", 201);
});

// GET /reviews/event/:eventId — public list of reviews for an event
reviewsRouter.get("/event/:eventId", async (c) => {
  const { eventId } = c.req.param();
  const rows = await db.query.reviews.findMany({
    where: eq(reviews.eventId, eventId),
    with: { user: { columns: { id: true, name: true, avatarUrl: true } } },
    orderBy: (r, { desc }) => [desc(r.createdAt)],
    limit: 50,
  });
  return apiSuccess(c, rows);
});

// PUT /reviews/:id — update own review
reviewsRouter.put("/:id", authMiddleware, async (c) => {
  const userId = c.get("user").id;
  const { id } = c.req.param();
  const body = await c.req.json<{ rating?: number; content?: string }>();

  const { rating, content } = body;

  if (rating !== undefined && (rating < 1 || rating > 5)) {
    return apiError(c, "INVALID_INPUT", "Rating must be between 1 and 5", 400);
  }

  // Verify review exists and belongs to user
  const existing = await db.query.reviews.findFirst({
    where: and(eq(reviews.id, id), eq(reviews.userId, userId)),
  });

  if (!existing) {
    return apiError(c, "NOT_FOUND", "Review not found or you don't have permission", 404);
  }

  const [updated] = await db
    .update(reviews)
    .set({
      ...(rating !== undefined && { rating }),
      ...(content !== undefined && { content: content?.trim() || null }),
      updatedAt: new Date(),
    } as any) // Type assertion for conditional properties
    .where(eq(reviews.id, id))
    .returning();

  return apiSuccess(c, updated, "Review updated");
});

// DELETE /reviews/:id — delete own review
reviewsRouter.delete("/:id", authMiddleware, async (c) => {
  const userId = c.get("user").id;
  const { id } = c.req.param();

  const result = await db
    .delete(reviews)
    .where(and(eq(reviews.id, id), eq(reviews.userId, userId)))
    .execute();

  if ((result as any).rowCount === 0) {
    return apiError(c, "NOT_FOUND", "Review not found or you don't have permission", 404);
  }

  return apiSuccess(c, null, "Review deleted");
});

export default reviewsRouter;
