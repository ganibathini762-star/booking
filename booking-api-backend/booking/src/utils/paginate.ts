import type { PaginationMeta } from "./response.js";

export type PaginationParams = {
  page: number;
  limit: number;
};

export function getPagination(params: PaginationParams): { offset: number; limit: number } {
  const limit = Math.min(Math.max(params.limit, 1), 100);
  const page = Math.max(params.page, 1);
  const offset = (page - 1) * limit;
  return { offset, limit };
}

export function buildMeta(total: number, params: PaginationParams): PaginationMeta {
  const limit = Math.min(Math.max(params.limit, 1), 100);
  const page = Math.max(params.page, 1);
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
