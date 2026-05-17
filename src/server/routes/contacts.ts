import { Router } from 'express'
import { z } from 'zod'
import { ContactsService } from '../services/contacts.service'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validateBody, validateParams, validateQuery } from '../middleware/validation'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response'
import { createAuditLog } from '../utils/audit'
import { prisma } from '../config/database'

const router = Router()

const contactCreateSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  company: z.string().optional(),
  title: z.string().optional(),
  designation: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  source: z.string().default('manual'),
  sourceId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.string(), z.unknown()).optional(),
  status: z.string().default('active'),
  stage: z.string().optional(),
  assignedTo: z.string().optional(),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  stageName: z.string().optional(),
  dealValue: z.number().default(0),
  dealStage: z.string().optional(),
  whatsappOptIn: z.boolean().default(false),
  emailOptIn: z.boolean().default(false),
})

const contactUpdateSchema = contactCreateSchema.partial()

const bulkImportSchema = z.object({
  contacts: z.array(contactCreateSchema).min(1).max(1000),
})

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  tags: z.string().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  assignedTo: z.string().optional(),
  stage: z.string().optional(),
  pipelineId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  hasPhone: z.coerce.boolean().optional(),
  hasEmail: z.coerce.boolean().optional(),
  whatsappOptIn: z.coerce.boolean().optional(),
})

const idParamSchema = z.object({
  id: z.string().uuid(),
})

router.get('/', authenticate, validateQuery(listQuerySchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { page, limit, search, status, source, city, state, assignedTo, stage, pipelineId, dateFrom, dateTo, hasPhone, hasEmail, whatsappOptIn } = req.query
    const tags = req.query.tags ? req.query.tags.split(',').filter(Boolean) : undefined

    const result = await ContactsService.list(req.user.businessId, page, limit, {
      search,
      tags,
      status,
      source,
      city,
      state,
      assignedTo,
      stage,
      pipelineId,
      dateFrom,
      dateTo,
      hasPhone,
      hasEmail,
      whatsappOptIn,
    })

    paginatedResponse(res, result.contacts, result.pagination.total, result.pagination.page, result.pagination.limit)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/', authenticate, validateBody(contactCreateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await ContactsService.create(req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'create',
      entity: 'contact',
      entityId: result.id,
      description: `Contact created: ${result.name}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Contact created', 201)
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
    const result = await ContactsService.getById(id, req.user.businessId)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.put('/:id', authenticate, validateParams(idParamSchema), validateBody(contactUpdateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await ContactsService.update(id, req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'contact',
      entityId: id,
      description: `Contact updated: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Contact updated')
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
    const result = await ContactsService.delete(id, req.user.businessId)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'delete',
      entity: 'contact',
      entityId: id,
      description: `Contact deleted: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Contact deleted')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/bulk-import', authenticate, validateBody(bulkImportSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { contacts } = req.body
    const result = await ContactsService.bulkImport(req.user.businessId, contacts)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'create',
      entity: 'contact',
      description: `Bulk imported ${result.count} contacts`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, `${result.count} contacts imported`)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/bulk-delete', authenticate, validateBody(bulkDeleteSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { ids } = req.body
    const result = await ContactsService.bulkDelete(ids, req.user.businessId)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'delete',
      entity: 'contact',
      description: `Bulk deleted ${result.count} contacts`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, `${result.count} contacts deleted`)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/export', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { search, status, source, tags } = req.query
    const tagArray = typeof tags === 'string' ? tags.split(',').filter(Boolean) : undefined

    const csv = await ContactsService.exportCSV(req.user.businessId, {
      search: search as string,
      status: status as string,
      source: source as string,
      tags: tagArray,
    })

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="contacts_${Date.now()}.csv"`)
    res.send(csv)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await ContactsService.getStats(req.user.businessId)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

export default router
