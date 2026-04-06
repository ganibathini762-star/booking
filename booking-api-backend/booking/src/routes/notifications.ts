import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { apiSuccess, apiError } from "../utils/response.js";
import { db } from "../config/db.js";
import { notifications } from "../db/schema/index.js";
import { AppBindings } from "../types/index.js";

const notificationsRouter = new Hono<AppBindings>();

// All routes require auth
notificationsRouter.use("*", authMiddleware);

// GET /notifications/my — list my notifications (latest 30)
notificationsRouter.get("/my", async (c) => {
  const userId = c.get("user").id;
  const rows = await db.query.notifications.findMany({
    where: eq(notifications.userId, userId),
    orderBy: [desc(notifications.createdAt)],
    limit: 30,
  });
  const unreadCount = rows.filter((n) => !n.isRead).length;
  return apiSuccess(c, { notifications: rows, unreadCount });
});

// PATCH /notifications/:id/read — mark single notification read
notificationsRouter.patch("/:id/read", async (c) => {
  const userId = c.get("user").id;
  const { id } = c.req.param();
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  return apiSuccess(c, null, "Marked as read");
});

// PATCH /notifications/read-all — mark all read
notificationsRouter.patch("/read-all", async (c) => {
  const userId = c.get("user").id;
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return apiSuccess(c, null, "All notifications marked as read");
});

// DELETE /notifications/:id — delete notification
notificationsRouter.delete("/:id", async (c) => {
  const userId = c.get("user").id;
  const { id } = c.req.param();

  const result = await db
    .delete(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .execute();

  if ((result as any).rowCount === 0) {
    return apiError(c, "NOT_FOUND", "Notification not found", 404);
  }

  return apiSuccess(c, null, "Notification deleted");
});

export default notificationsRouter;
