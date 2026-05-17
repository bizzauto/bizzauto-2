import { Router } from 'express'
import { z } from 'zod'
import { ChatbotService } from '../services/chatbot.service'
import { authenticate, AuthRequest, requireBusinessOwner } from '../middleware/auth'
import { validateBody, validateParams } from '../middleware/validation'
import { successResponse, errorResponse } from '../utils/response'
import { createAuditLog } from '../utils/audit'

const router = Router()

const chatbotFlowCreateSchema = z.object({
  name: z.string().min(1),
  trigger: z.enum(['keyword', 'button', 'ai', 'welcome']).default('keyword'),
  keywords: z.array(z.string()).default([]),
  triggerValue: z.string().optional(),
  response: z.string().min(1),
  aiEnabled: z.boolean().default(false),
  nodes: z.array(z.record(z.string(), z.unknown())).optional(),
  edges: z.array(z.record(z.string(), z.unknown())).optional(),
  flowData: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().default(true),
})

const chatbotFlowUpdateSchema = chatbotFlowCreateSchema.partial()

const testSchema = z.object({
  message: z.string().min(1),
  contactId: z.string().optional(),
})

const idParamSchema = z.object({
  id: z.string().uuid(),
})

router.get('/flows', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { isActive } = req.query
    const result = await ChatbotService.list(req.user.businessId, isActive as unknown as boolean | undefined)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/flows', authenticate, requireBusinessOwner, validateBody(chatbotFlowCreateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await ChatbotService.create(req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'create',
      entity: 'chatbot_flow',
      entityId: result.id,
      description: `Chatbot flow created: ${result.name}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Chatbot flow created', 201)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.put('/flows/:id', authenticate, requireBusinessOwner, validateParams(idParamSchema), validateBody(chatbotFlowUpdateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await ChatbotService.update(id, req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'chatbot_flow',
      entityId: id,
      description: `Chatbot flow updated: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Chatbot flow updated')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.delete('/flows/:id', authenticate, requireBusinessOwner, validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await ChatbotService.delete(id, req.user.businessId)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'delete',
      entity: 'chatbot_flow',
      entityId: id,
      description: `Chatbot flow deleted: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Chatbot flow deleted')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/flows/:id/toggle', authenticate, requireBusinessOwner, validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await ChatbotService.toggleActive(id, req.user.businessId)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'chatbot_flow',
      entityId: id,
      description: `Chatbot flow toggled: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, `Chatbot flow ${result.isActive ? 'enabled' : 'disabled'}`)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/test', authenticate, validateBody(testSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { message, contactId } = req.body
    const result = await ChatbotService.executeFlow(req.user.businessId, message, contactId)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

export default router
