import { Router } from 'express'
import { z } from 'zod'
import { ReviewsService } from '../services/reviews.service'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validateBody, validateQuery } from '../middleware/validation'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response'
import { createAuditLog } from '../utils/audit'
import { prisma } from '../config/database'

const router = Router()

const replySchema = z.object({
  reviewId: z.string().uuid(),
  replyText: z.string().min(1),
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  platform: z.string().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  isRead: z.coerce.boolean().optional(),
})

const syncSchema = z.object({
  platform: z.enum(['google', 'facebook', 'yelp', 'trustpilot', 'other']),
  reviews: z.array(z.object({
    externalId: z.string(),
    reviewerName: z.string(),
    reviewerEmail: z.string().email().optional(),
    rating: z.number().int().min(1).max(5),
    text: z.string().optional(),
    reviewDate: z.string().datetime().optional(),
  })),
})

router.get('/', authenticate, validateQuery(listQuerySchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { page, limit, platform, rating, isRead } = req.query
    const result = await ReviewsService.list(req.user.businessId, page, limit, platform, rating, isRead)

    paginatedResponse(res, result.reviews, result.pagination.total, result.pagination.page, result.pagination.limit)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/reply', authenticate, validateBody(replySchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { reviewId, replyText } = req.body
    const result = await ReviewsService.replyToReview(reviewId, req.user.businessId, req.user.id, replyText)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'review',
      entityId: reviewId,
      description: `Review replied: ${reviewId}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Reply posted')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await ReviewsService.getStats(req.user.businessId)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/sync', authenticate, validateBody(syncSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { platform, reviews } = req.body
    const result = await ReviewsService.syncFromExternal(req.user.businessId, platform, reviews)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'review',
      description: `Reviews synced from ${platform}: ${result.created} created, ${result.updated} updated`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Reviews synced')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

export default router
