import { Router } from 'express'
import { z } from 'zod'
import { SuperAdminService } from '../services/superadmin.service'
import { authenticate, AuthRequest, requireRole } from '../middleware/auth'
import { validateBody, validateParams, validateQuery } from '../middleware/validation'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response'
import { createAuditLog } from '../utils/audit'
import { prisma } from '../config/database'
import { Role, Plan } from '@prisma/client'

const router = Router()

const roleUpdateSchema = z.object({
  role: z.nativeEnum(Role),
})

const businessUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  plan: z.nativeEnum(Plan).optional(),
  isActive: z.boolean().optional(),
  contactsLimit: z.number().int().positive().optional(),
  messagesLimit: z.number().int().positive().optional(),
  usersLimit: z.number().int().positive().optional(),
  aiCreditsLimit: z.number().int().positive().optional(),
})

const businessesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  plan: z.nativeEnum(Plan).optional(),
  isActive: z.coerce.boolean().optional(),
})

const usersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.nativeEnum(Role).optional(),
  isActive: z.coerce.boolean().optional(),
  businessId: z.string().uuid().optional(),
})

const idParamSchema = z.object({
  id: z.string().uuid(),
})

router.use(authenticate, requireRole(Role.SUPER_ADMIN))

router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const result = await SuperAdminService.getPlatformStats()
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/businesses', validateQuery(businessesQuerySchema), async (req: AuthRequest, res) => {
  try {
    const { page, limit, plan, isActive } = req.query
    const result = await SuperAdminService.listAllBusinesses(page, limit, plan, isActive)

    paginatedResponse(res, result.businesses, result.pagination.total, result.pagination.page, result.pagination.limit)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/businesses/:id', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const result = await SuperAdminService.getBusinessDetails(id)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.put('/businesses/:id', validateParams(idParamSchema), validateBody(businessUpdateSchema), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const { plan, isActive, ...rest } = req.body

    let result

    if (plan) {
      result = await SuperAdminService.updateBusinessPlan(id, plan)
    } else if (isActive !== undefined) {
      result = await SuperAdminService.toggleBusinessActive(id, isActive)
    } else {
      result = await prisma.business.update({
        where: { id },
        data: rest,
      })
    }

    await createAuditLog({
      businessId: id,
      action: 'update',
      entity: 'business',
      entityId: id,
      description: `Business updated by superadmin`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Business updated')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/users', validateQuery(usersQuerySchema), async (req: AuthRequest, res) => {
  try {
    const { page, limit, role, isActive, businessId } = req.query
    const result = await SuperAdminService.listAllUsers(page, limit, role, isActive, businessId)

    paginatedResponse(res, result.users, result.pagination.total, result.pagination.page, result.pagination.limit)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.put('/users/:id/role', validateParams(idParamSchema), validateBody(roleUpdateSchema), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const { role } = req.body
    const result = await SuperAdminService.updateUserRole(id, role)

    await createAuditLog({
      businessId: result.businessId || '',
      action: 'update',
      entity: 'user',
      entityId: id,
      description: `User role updated to ${role} by superadmin`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'User role updated')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.delete('/users/:id', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const result = await SuperAdminService.deactivateUser(id)

    await createAuditLog({
      businessId: result.businessId || '',
      action: 'delete',
      entity: 'user',
      entityId: id,
      description: 'User deactivated by superadmin',
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'User deactivated')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

export default router
