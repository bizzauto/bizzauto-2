import { Router } from 'express'
import { z } from 'zod'
import { DocumentsService } from '../services/documents.service'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validateBody, validateParams, validateQuery } from '../middleware/validation'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response'
import { createAuditLog } from '../utils/audit'
import { prisma } from '../config/database'

const router = Router()

const documentCreateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['invoice', 'quote', 'proposal', 'contract', 'receipt', 'other']),
  templateId: z.string().optional(),
  documentNumber: z.string().optional(),
  content: z.record(z.string(), z.unknown()),
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
  clientEmail: z.string().optional(),
  contactId: z.string().optional(),
  amount: z.number().optional(),
})

const documentUpdateSchema = documentCreateSchema.partial()

const templateCreateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['invoice', 'quote', 'proposal', 'contract', 'receipt', 'other']),
  description: z.string().optional(),
  header: z.string().optional(),
  footer: z.string().optional(),
  content: z.string().min(1),
  css: z.string().optional(),
  variables: z.array(z.string()).default([]),
  isDefault: z.boolean().default(false),
})

const templateUpdateSchema = templateCreateSchema.partial()

const generateSchema = z.object({
  templateId: z.string(),
  variables: z.record(z.string(), z.string()),
})

const sendSchema = z.object({
  email: z.string().email(),
  subject: z.string().min(1),
  message: z.string().optional(),
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.string().optional(),
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

    const { page, limit, type, status } = req.query
    const result = await DocumentsService.listDocuments(req.user.businessId, page, limit, type, status)

    paginatedResponse(res, result.documents, result.pagination.total, result.pagination.page, result.pagination.limit)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/', authenticate, validateBody(documentCreateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await DocumentsService.createDocument(req.user.businessId, req.user.id, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'create',
      entity: 'document',
      entityId: result.id,
      description: `Document created: ${result.name}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Document created', 201)
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
    const result = await DocumentsService.getDocument(id, req.user.businessId)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.put('/:id', authenticate, validateParams(idParamSchema), validateBody(documentUpdateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await DocumentsService.updateDocument(id, req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'document',
      entityId: id,
      description: `Document updated: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Document updated')
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
    const result = await DocumentsService.deleteDocument(id, req.user.businessId)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'delete',
      entity: 'document',
      entityId: id,
      description: `Document deleted: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Document deleted')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/:id/generate', authenticate, validateParams(idParamSchema), validateBody(generateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const { templateId, variables } = req.body

    const document = await DocumentsService.getDocument(id, req.user.businessId)

    const html = await DocumentsService.generateHTMLFromTemplate(templateId, variables)

    const updated = await prisma.document.update({
      where: { id },
      data: { html },
    })

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'document',
      entityId: id,
      description: `Document generated from template: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, { html, document: updated }, 'Document generated')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/:id/send', authenticate, validateParams(idParamSchema), validateBody(sendSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const { email, subject, message } = req.body

    const document = await DocumentsService.getDocument(id, req.user.businessId)

    if (!document.html) {
      return errorResponse(res, 'Document has not been generated yet', 400)
    }

    const EmailService = await import('../services/email.service')
    const smtpConfig = await EmailService.EmailService.getBusinessSMTPConfig(req.user.businessId)

    await EmailService.EmailService.sendEmail(
      email,
      subject,
      document.html,
      message,
      smtpConfig || undefined
    )

    await prisma.document.update({
      where: { id },
      data: {
        sentAt: new Date(),
        sentTo: email,
      },
    })

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'document',
      entityId: id,
      description: `Document sent to ${email}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, { sent: true, email }, 'Document sent')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/templates', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { type } = req.query
    const result = await DocumentsService.listTemplates(req.user.businessId, type as string)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/templates', authenticate, validateBody(templateCreateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await DocumentsService.createTemplate(req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'create',
      entity: 'document_template',
      entityId: result.id,
      description: `Document template created: ${result.name}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Template created', 201)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

export default router
