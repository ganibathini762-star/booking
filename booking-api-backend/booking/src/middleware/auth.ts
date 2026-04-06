import { createMiddleware } from "hono/factory";
import { verifyAccessToken } from "../utils/token.js";
import { apiError } from "../utils/response.js";

export type AuthUser = {
  id: string;
  email: string;
  role: "user" | "organizer" | "admin";
};

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const authorization = c.req.header("Authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return apiError(c, "UNAUTHORIZED", "Authentication required", 401);
  }

  const token = authorization.slice(7);

  const payload = await verifyAccessToken(token);
  if (!payload) {
    return apiError(c, "INVALID_TOKEN", "Invalid or expired token", 401);
  }

  c.set("user", {
    id: payload.sub as string,
    email: payload.email as string,
    role: payload.role as AuthUser["role"],
  });

  await next();
});
