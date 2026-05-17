import { Response } from 'express'

export function successResponse(
  res: Response,
  data: any,
  message?: string,
  statusCode: number = 200
) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(message && { message }),
  })
}

export function errorResponse(
  res: Response,
  error: string,
  statusCode: number = 400,
  details?: any
) {
  return res.status(statusCode).json({
    success: false,
    error,
    ...(details && { details }),
  })
}

export function paginatedResponse(
  res: Response,
  data: any[],
  total: number,
  page: number,
  limit: number
) {
  const totalPages = Math.ceil(total / limit)
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  })
}
