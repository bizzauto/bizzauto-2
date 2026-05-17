import { Router } from 'express'
import { z } from 'zod'
import { CampaignsService } from '../services/campaigns.service'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validateBody, validateParams, validateQuery } from '../middleware/validation'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response'
import { createAuditLog } from '../utils/audit'
import { prisma } from '../config/database'

const router = Router()

const campaignCreateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['whatsapp', 'email', 'sms']).default('whatsapp'),
  contactIds: z.array(z.string()).default([]),
  targetTags: z.array(z.string()).default([]),
  targetFilters: z.record(z.string(), z.unknown()).optional(),
  content: z.object({
    type: z.enum(['text', 'template', 'media']),
    body: z.string(),
    mediaUrl: z.string().optional(),
    templateName: z.string().optional(),
    templateLanguage: z.string().optional(),
    templateParams: z.array(z.string()).optional(),
  }),
  scheduledAt: z.string().datetime().optional(),
  dripSteps: z.array(z.object({
    delay: z.number(),
    content: z.string(),
    type: z.string().default('text'),
  })).optional(),
})

const campaignUpdateSchema = campaignCreateSchema.partial()

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
})

const idParamSchema = z.object({
  id: z.string().uuid(),
})

router.get('/', authenticate, validateQuery(listQuerySchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { page, limit, status } = req.query
    const result = await CampaignsService.list(req.user.businessId, page, limit, status)

    paginatedResponse(res, result.campaigns, result.pagination.total, result.pagination.page, result.pagination.limit)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/', authenticate, validateBody(campaignCreateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await CampaignsService.create(req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'create',
      entity: 'campaign',
      entityId: result.id,
      description: `Campaign created: ${result.name}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Campaign created', 201)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/:id', authenticate, validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await CampaignsService.getById(id, req.user.businessId)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.put('/:id', authenticate, validateParams(idParamSchema), validateBody(campaignUpdateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await CampaignsService.update(id, req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'campaign',
      entityId: id,
      description: `Campaign updated: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Campaign updated')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.delete('/:id', authenticate, validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await CampaignsService.delete(id, req.user.businessId)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'delete',
      entity: 'campaign',
      entityId: id,
      description: `Campaign deleted: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Campaign deleted')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/:id/start', authenticate, validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await CampaignsService.start(id, req.user.businessId)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'campaign',
      entityId: id,
      description: `Campaign started: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Campaign started')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/:id/pause', authenticate, validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await CampaignsService.pause(id, req.user.businessId)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'campaign',
      entityId: id,
      description: `Campaign paused: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Campaign paused')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/:id/resume', authenticate, validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await CampaignsService.resume(id, req.user.businessId)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'campaign',
      entityId: id,
      description: `Campaign resumed: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Campaign resumed')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/:id/stats', authenticate, validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await CampaignsService.getStats(id, req.user.businessId)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

export default router
