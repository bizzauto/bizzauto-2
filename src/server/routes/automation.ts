import { Router } from 'express'
import { z } from 'zod'
import { AutomationService } from '../services/automation.service'
import { authenticate, AuthRequest, requireBusinessOwner } from '../middleware/auth'
import { validateBody, validateParams, validateQuery } from '../middleware/validation'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response'
import { createAuditLog } from '../utils/audit'
import { prisma } from '../config/database'

const router = Router()

const automationRuleCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  trigger: z.object({
    type: z.enum(['contact_created', 'contact_updated', 'message_received', 'order_created', 'appointment_created', 'review_received', 'tag_added', 'tag_removed', 'stage_changed', 'custom']),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(['equals', 'contains', 'starts_with', 'ends_with', 'gt', 'lt', 'gte', 'lte', 'in', 'not_in', 'exists']),
      value: z.unknown(),
    })).optional(),
  }),
  actions: z.array(z.object({
    type: z.enum(['send_message', 'send_email', 'add_tag', 'remove_tag', 'update_field', 'create_task', 'assign_to', 'move_stage', 'send_webhook', 'delay', 'ai_reply']),
    config: z.record(z.string(), z.unknown()),
  })),
})

const automationRuleUpdateSchema = automationRuleCreateSchema.partial()

const listQuerySchema = z.object({
  isActive: z.coerce.boolean().optional(),
})

const idParamSchema = z.object({
  id: z.string().uuid(),
})

const runsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  ruleId: z.string().uuid().optional(),
  status: z.string().optional(),
})

router.get('/rules', authenticate, validateQuery(listQuerySchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { isActive } = req.query
    const result = await AutomationService.list(req.user.businessId, isActive)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/rules', authenticate, requireBusinessOwner, validateBody(automationRuleCreateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await AutomationService.create(req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'create',
      entity: 'automation_rule',
      entityId: result.id,
      description: `Automation rule created: ${result.name}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Automation rule created', 201)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.put('/rules/:id', authenticate, requireBusinessOwner, validateParams(idParamSchema), validateBody(automationRuleUpdateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await AutomationService.update(id, req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'automation_rule',
      entityId: id,
      description: `Automation rule updated: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Automation rule updated')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.delete('/rules/:id', authenticate, requireBusinessOwner, validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await AutomationService.delete(id, req.user.businessId)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'delete',
      entity: 'automation_rule',
      entityId: id,
      description: `Automation rule deleted: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Automation rule deleted')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/rules/:id/toggle', authenticate, requireBusinessOwner, validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await AutomationService.toggleActive(id, req.user.businessId)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'automation_rule',
      entityId: id,
      description: `Automation rule toggled: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, `Automation rule ${result.isActive ? 'enabled' : 'disabled'}`)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/runs', authenticate, validateQuery(runsQuerySchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { page, limit, ruleId, status } = req.query
    const skip = (page - 1) * limit
    const where: Record<string, unknown> = { businessId: req.user.businessId }

    if (ruleId) {
      where.ruleId = ruleId
    }

    if (status) {
      where.status = status
    }

    const [runs, total] = await Promise.all([
      prisma.workflowRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { rule: { select: { name: true } } },
      }),
      prisma.workflowRun.count({ where }),
    ])

    paginatedResponse(res, runs, total, page, limit)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

export default router
