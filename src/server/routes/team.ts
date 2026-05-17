import { Router } from 'express'
import { z } from 'zod'
import { UserService } from '../services/user.service'
import { ApiKeysService } from '../services/apikeys.service'
import { authenticate, AuthRequest, requireBusinessOwner, requireRole } from '../middleware/auth'
import { validateBody, validateParams, validateQuery } from '../middleware/validation'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response'
import { createAuditLog } from '../utils/audit'
import { prisma } from '../config/database'
import { Role } from '@prisma/client'

const router = Router()

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(Role),
})

const roleUpdateSchema = z.object({
  role: z.nativeEnum(Role),
})

const apiKeyCreateSchema = z.object({
  name: z.string().min(1),
  permissions: z.array(z.string()).default(['read']),
  expiresAt: z.string().datetime().optional(),
})

const idParamSchema = z.object({
  id: z.string().uuid(),
})

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

router.get('/members', authenticate, validateQuery(paginationQuerySchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { page, limit } = req.query
    const result = await UserService.listTeamMembers(req.user.businessId, page, limit)

    paginatedResponse(res, result.users, result.pagination.total, result.pagination.page, result.pagination.limit)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/invite', authenticate, requireBusinessOwner, validateBody(inviteSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { email, role } = req.body
    const result = await UserService.inviteMember(req.user.businessId, email, role)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'create',
      entity: 'team_member',
      entityId: result.user.id,
      description: `Team member invited: ${email}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, result.isNew ? 'Invitation sent' : 'User added to team', 201)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.put('/:id/role', authenticate, requireBusinessOwner, validateParams(idParamSchema), validateBody(roleUpdateSchema), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const { role } = req.body

    const result = await UserService.updateRole(id, role)

    await createAuditLog({
      businessId: req.user.businessId!,
      action: 'update',
      entity: 'team_member',
      entityId: id,
      description: `Role updated to ${role}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Role updated')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.delete('/:id', authenticate, requireBusinessOwner, validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params

    const result = await UserService.removeMember(id)

    await createAuditLog({
      businessId: req.user.businessId!,
      action: 'delete',
      entity: 'team_member',
      entityId: id,
      description: 'Team member removed',
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Member removed')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/api-keys', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await ApiKeysService.list(req.user.businessId)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/api-keys', authenticate, requireBusinessOwner, validateBody(apiKeyCreateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await ApiKeysService.create(req.user.businessId, req.user.id, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'create',
      entity: 'api_key',
      description: `API key created: ${result.name}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'API key created', 201)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.delete('/api-keys/:id', authenticate, requireBusinessOwner, validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await ApiKeysService.delete(id, req.user.businessId)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'delete',
      entity: 'api_key',
      entityId: id,
      description: 'API key deleted',
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'API key deleted')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/audit-logs', authenticate, validateQuery(paginationQuerySchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { page, limit } = req.query
    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { businessId: req.user.businessId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({
        where: { businessId: req.user.businessId },
      }),
    ])

    paginatedResponse(res, logs, total, page, limit)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

export default router
