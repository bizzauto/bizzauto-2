import { Router } from 'express'
import { z } from 'zod'
import { AppointmentsService } from '../services/appointments.service'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validateBody, validateParams, validateQuery } from '../middleware/validation'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response'
import { createAuditLog } from '../utils/audit'
import { prisma } from '../config/database'

const router = Router()

const appointmentCreateSchema = z.object({
  contactId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  service: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  status: z.string().default('pending'),
  location: z.string().optional(),
  isOnline: z.boolean().default(false),
  meetingLink: z.string().optional(),
})

const appointmentUpdateSchema = appointmentCreateSchema.partial()

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

const availableSlotsQuerySchema = z.object({
  date: z.string(),
  duration: z.coerce.number().int().positive().default(30),
  startHour: z.coerce.number().int().min(0).max(23).default(9),
  endHour: z.coerce.number().int().min(0).max(23).default(17),
})

const idParamSchema = z.object({
  id: z.string().uuid(),
})

router.get('/', authenticate, validateQuery(listQuerySchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { page, limit, status, dateFrom, dateTo } = req.query
    const result = await AppointmentsService.list(req.user.businessId, page, limit, status, dateFrom, dateTo)

    paginatedResponse(res, result.appointments, result.pagination.total, result.pagination.page, result.pagination.limit)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/', authenticate, validateBody(appointmentCreateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await AppointmentsService.create(req.user.businessId, req.user.id, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'create',
      entity: 'appointment',
      entityId: result.id,
      description: `Appointment created: ${result.title}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Appointment created', 201)
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
    const result = await AppointmentsService.getById(id, req.user.businessId)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.put('/:id', authenticate, validateParams(idParamSchema), validateBody(appointmentUpdateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await AppointmentsService.update(id, req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'appointment',
      entityId: id,
      description: `Appointment updated: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Appointment updated')
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
    const result = await AppointmentsService.delete(id, req.user.businessId)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'delete',
      entity: 'appointment',
      entityId: id,
      description: `Appointment deleted: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Appointment deleted')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/available-slots', authenticate, validateQuery(availableSlotsQuerySchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { date, duration, startHour, endHour } = req.query
    const result = await AppointmentsService.getAvailableSlots(req.user.businessId, date, duration, startHour, endHour)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

export default router
