import { Router } from 'express'
import { z } from 'zod'
import { NotificationsService } from '../services/notifications.service'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validateBody, validateParams, validateQuery } from '../middleware/validation'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response'
import { prisma } from '../config/database'

const router = Router()

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isRead: z.coerce.boolean().optional(),
  type: z.string().optional(),
})

const idParamSchema = z.object({
  id: z.string().uuid(),
})

router.get('/', authenticate, validateQuery(listQuerySchema), async (req: AuthRequest, res) => {
  try {
    const { page, limit, isRead, type } = req.query
    const result = await NotificationsService.list(req.user.id, page, limit, isRead, type)

    paginatedResponse(res, result.notifications, result.pagination.total, result.pagination.page, result.pagination.limit)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.patch('/:id/read', authenticate, validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const result = await NotificationsService.markAsRead(id, req.user.id)
    successResponse(res, result, 'Notification marked as read')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/read-all', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await NotificationsService.markAllAsRead(req.user.id)
    successResponse(res, result, `${result.count} notifications marked as read`)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.delete('/:id', authenticate, validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const result = await NotificationsService.delete(id, req.user.id)
    successResponse(res, result, 'Notification deleted')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

export default router
