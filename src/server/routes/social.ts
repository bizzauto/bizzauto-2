import { Router } from 'express'
import { z } from 'zod'
import { SocialService } from '../services/social.service'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validateBody, validateParams, validateQuery } from '../middleware/validation'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response'
import { createAuditLog } from '../utils/audit'
import { prisma } from '../config/database'

const router = Router()

const postCreateSchema = z.object({
  content: z.string().min(1),
  mediaUrls: z.array(z.string()).default([]),
  link: z.string().url().optional().or(z.literal('')),
  platforms: z.array(z.enum(['facebook', 'instagram', 'linkedin', 'twitter', 'google'])),
  scheduledAt: z.string().datetime().optional(),
})

const postUpdateSchema = postCreateSchema.partial()

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
})

const idParamSchema = z.object({
  id: z.string().uuid(),
})

router.get('/posts', authenticate, validateQuery(listQuerySchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { page, limit, status } = req.query
    const result = await SocialService.list(req.user.businessId, page, limit, status)

    paginatedResponse(res, result.posts, result.pagination.total, result.pagination.page, result.pagination.limit)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/posts', authenticate, validateBody(postCreateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await SocialService.create(req.user.businessId, req.user.id, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'create',
      entity: 'social_post',
      entityId: result.id,
      description: `Social post created for ${result.platforms.join(', ')}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Post created', 201)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.put('/posts/:id', authenticate, validateParams(idParamSchema), validateBody(postUpdateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await SocialService.update(id, req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'social_post',
      entityId: id,
      description: `Social post updated: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Post updated')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.delete('/posts/:id', authenticate, validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await SocialService.delete(id, req.user.businessId)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'delete',
      entity: 'social_post',
      entityId: id,
      description: `Social post deleted: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Post deleted')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/posts/:id/publish', authenticate, validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await SocialService.publish(id, req.user.businessId)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'social_post',
      entityId: id,
      description: `Social post published: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Post published')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/platforms/status', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: {
        fbPageId: true,
        fbAccessToken: true,
        igUserId: true,
        igAccessToken: true,
        linkedinPageId: true,
        linkedinAccessToken: true,
        twitterUserId: true,
        twitterAccessToken: true,
        gbpAccessToken: true,
        gbpLocationId: true,
      },
    })

    if (!business) {
      return errorResponse(res, 'Business not found', 404)
    }

    const platforms = {
      facebook: {
        connected: !!(business.fbPageId && business.fbAccessToken),
        pageId: business.fbPageId,
      },
      instagram: {
        connected: !!(business.igUserId && business.igAccessToken),
        userId: business.igUserId,
      },
      linkedin: {
        connected: !!(business.linkedinPageId && business.linkedinAccessToken),
        pageId: business.linkedinPageId,
      },
      twitter: {
        connected: !!(business.twitterUserId && business.twitterAccessToken),
        userId: business.twitterUserId,
      },
      google: {
        connected: !!(business.gbpAccessToken && business.gbpLocationId),
        locationId: business.gbpLocationId,
      },
    }

    successResponse(res, platforms)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

export default router
