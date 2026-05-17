import { Router } from 'express'
import { z } from 'zod'
import { WebhooksService } from '../services/webhooks.service'
import { authenticate, AuthRequest, requireBusinessOwner } from '../middleware/auth'
import { validateBody, validateParams } from '../middleware/validation'
import { successResponse, errorResponse } from '../utils/response'
import { createAuditLog } from '../utils/audit'

const router = Router()

const webhookCreateSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().min(16).optional(),
})

const webhookUpdateSchema = webhookCreateSchema.partial()

const idParamSchema = z.object({
  id: z.string().uuid(),
})

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await WebhooksService.list(req.user.businessId)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/', authenticate, requireBusinessOwner, validateBody(webhookCreateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await WebhooksService.create(req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'create',
      entity: 'webhook',
      entityId: result.id,
      description: `Webhook created: ${result.url}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Webhook created', 201)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.put('/:id', authenticate, requireBusinessOwner, validateParams(idParamSchema), validateBody(webhookUpdateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await WebhooksService.update(id, req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'webhook',
      entityId: id,
      description: `Webhook updated: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Webhook updated')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.delete('/:id', authenticate, requireBusinessOwner, validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await WebhooksService.delete(id, req.user.businessId)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'delete',
      entity: 'webhook',
      entityId: id,
      description: `Webhook deleted: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Webhook deleted')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/:id/test', authenticate, requireBusinessOwner, validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const webhook = await WebhooksService.getById(id, req.user.businessId)

    const result = await WebhooksService.triggerWebhook(id, 'test', {
      businessId: req.user.businessId,
      userId: req.user.id,
      timestamp: new Date().toISOString(),
    })

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'webhook',
      entityId: id,
      description: `Webhook tested: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Webhook test triggered')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

export default router
