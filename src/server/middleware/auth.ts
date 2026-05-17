import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/database'
import env from '../config/env'
import { Role } from '@prisma/client'

export interface AuthRequest extends Request {
  user: {
    id: string
    email: string
    role: Role
    businessId: string | null
  }
  token: string
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      })
    }

    const token = authHeader.split(' ')[1]

    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string
      email: string
      role: Role
      businessId: string | null
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        businessId: true,
        isActive: true,
      },
    })

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive',
      })
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
    }
    req.token = token

    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
      })
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      })
    }
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
    })
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      })
    }
    next()
  }
}

export function requireBusinessOwner(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (
    req.user.role !== 'OWNER' &&
    req.user.role !== 'ADMIN' &&
    req.user.role !== 'SUPER_ADMIN'
  ) {
    return res.status(403).json({
      success: false,
      error: 'Business owner or admin access required',
    })
  }
  next()
}

export async function requireBusinessAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user.businessId) {
    return res.status(403).json({
      success: false,
      error: 'No business associated with account',
    })
  }

  const business = await prisma.business.findUnique({
    where: { id: req.user.businessId },
    select: { isActive: true },
  })

  if (!business?.isActive) {
    return res.status(403).json({
      success: false,
      error: 'Business is not active',
    })
  }

  next()
}
