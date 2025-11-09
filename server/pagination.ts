import { z } from "zod";

export interface PaginationParams {
  offset: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export const paginationParamsSchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export function parsePaginationParams(query: any): PaginationParams {
  const result = paginationParamsSchema.safeParse(query);
  if (result.success) {
    return result.data;
  }
  return { offset: 0, limit: 50 };
}

export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  offset: number,
  limit: number
): PaginatedResponse<T> {
  return {
    items,
    pagination: {
      offset,
      limit,
      total,
      hasMore: offset + items.length < total,
    },
  };
}
