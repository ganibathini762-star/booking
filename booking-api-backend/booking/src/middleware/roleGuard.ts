import { createMiddleware } from "hono/factory";
import type { AuthUser } from "./auth.js";
import { apiError } from "../utils/response.js";

type Role = AuthUser["role"];

export function requireRole(...roles: Role[]) {
  return createMiddleware(async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return apiError(c, "UNAUTHORIZED", "Authentication required", 401);
    }

    if (!roles.includes(user.role)) {
      return apiError(c, "FORBIDDEN", "Insufficient permissions", 403);
    }

    await next();
  });
}

export const requireAdmin = requireRole("admin");
export const requireOrganizer = requireRole("organizer", "admin");
export const requireUser = requireRole("user", "organizer", "admin");
