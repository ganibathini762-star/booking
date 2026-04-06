import { createMiddleware } from "hono/factory";
import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

export const requestLogger = createMiddleware(async (c, next) => {
  const start = Date.now();
  const { method, url } = c.req;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  logger.info({
    method,
    url,
    status,
    duration: `${duration}ms`,
  });
});
