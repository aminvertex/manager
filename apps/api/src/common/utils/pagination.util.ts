export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export function getPaginationParams(query: {
  page?: number;
  limit?: number;
}): { skip: number; take: number; page: number; limit: number } {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  return { skip: (page - 1) * limit, take: limit, page, limit };
}
