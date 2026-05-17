import { Request, Response, NextFunction } from 'express'
import { logger } from '../config/logger'

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error(`Error: ${error.message}`, {
    stack: error.stack,
    path: req.path,
    method: req.method,
  })

  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any
    switch (prismaError.code) {
      case 'P2002':
        return res.status(409).json({
          success: false,
          error: 'A record with this value already exists',
          field: prismaError.meta?.target?.[0],
        })
      case 'P2025':
        return res.status(404).json({
          success: false,
          error: 'Record not found',
        })
      case 'P2003':
        return res.status(400).json({
          success: false,
          error: 'Invalid reference to related record',
        })
      default:
        return res.status(500).json({
          success: false,
          error: 'Database error',
        })
    }
  }

  if (error.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: (error as any).errors,
    })
  }

  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
    })
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
    })
  }

  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message,
  })
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  })
}
