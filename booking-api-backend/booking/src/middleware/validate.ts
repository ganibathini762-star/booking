import type { Context } from "hono";
import type { ZodSchema } from "zod";
import { apiError } from "../utils/response.js";

export async function parseBody<T>(c: Context, schema: ZodSchema<T>): Promise<T | null> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    await apiError(c, "INVALID_JSON", "Request body must be valid JSON", 400);
    return null;
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    c.res = new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: result.error.flatten().fieldErrors,
        },
      }),
      {
        status: 422,
        headers: { "Content-Type": "application/json" },
      }
    );
    return null;
  }

  return result.data;
}

export function parseQuery<T>(c: Context, schema: ZodSchema<T>): T | null {
  const query = c.req.query();
  const result = schema.safeParse(query);

  if (!result.success) {
    c.res = new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: result.error.flatten().fieldErrors,
        },
      }),
      {
        status: 422,
        headers: { "Content-Type": "application/json" },
      }
    );
    return null;
  }

  return result.data;
}
