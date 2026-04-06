import type { ErrorHandler } from "hono";
import { ZodError } from "zod";
import { logger } from "./logger.js";

export const errorHandler: ErrorHandler = (err, c) => {
  // Zod validation errors
  if (err instanceof ZodError) {
    return c.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: err.flatten().fieldErrors,
        },
      },
      422
    );
  }

  // Log unexpected errors
  logger.error({ err, url: c.req.url, method: c.req.method }, "Unhandled error");

  return c.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    },
    500
  );
};
