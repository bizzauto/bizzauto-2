export interface PaginationResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export function paginate(
  page: number = 1,
  limit: number = 20,
  total: number
): PaginationResult<any> {
  const totalPages = Math.ceil(total / limit)
  return {
    data: [],
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}

export function getPaginationParams(query: any): PaginationParams {
  return {
    page: Math.max(1, parseInt(query.page) || 1),
    limit: Math.min(100, Math.max(1, parseInt(query.limit) || 20)),
    search: query.search || undefined,
    sortBy: query.sortBy || 'createdAt',
    sortOrder: (query.sortOrder === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
  }
}
