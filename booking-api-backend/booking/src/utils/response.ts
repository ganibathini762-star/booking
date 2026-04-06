import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  message?: string;
  meta?: PaginationMeta;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function apiSuccess<T>(
  c: Context,
  data: T,
  message?: string,
  status: ContentfulStatusCode = 200,
  meta?: PaginationMeta
) {
  const body: ApiResponse<T> = { success: true, data };
  if (message) body.message = message;
  if (meta) body.meta = meta;
  return c.json(body, status);
}

export function apiError(
  c: Context,
  code: string,
  message: string,
  status: ContentfulStatusCode = 400,
  details?: unknown
) {
  const body: ApiResponse = {
    success: false,
    error: { code, message },
  };
  if (details !== undefined) body.error!.details = details;
  return c.json(body, status);
}
