import { Router } from 'express'
import { z } from 'zod'
import { BusinessService } from '../services/business.service'
import { authenticate, AuthRequest, requireBusinessOwner } from '../middleware/auth'
import { validateBody } from '../middleware/validation'
import { successResponse, errorResponse } from '../utils/response'
import { createAuditLog } from '../utils/audit'
import { prisma } from '../config/database'

const router = Router()

const whatsappConfigSchema = z.object({
  wabaId: z.string().optional(),
  waPhoneNumberId: z.string().optional(),
  waAccessToken: z.string().optional(),
  waWebhookSecret: z.string().optional(),
  waPhoneNumber: z.string().optional(),
})

const socialConfigSchema = z.object({
  fbPageId: z.string().optional(),
  fbAccessToken: z.string().optional(),
  igUserId: z.string().optional(),
  igAccessToken: z.string().optional(),
  linkedinPageId: z.string().optional(),
  linkedinAccessToken: z.string().optional(),
  twitterUserId: z.string().optional(),
  twitterAccessToken: z.string().optional(),
  gbpAccessToken: z.string().optional(),
  gbpAccountId: z.string().optional(),
  gbpLocationId: z.string().optional(),
})

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await BusinessService.getById(req.user.businessId)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.put('/settings', authenticate, requireBusinessOwner, validateBody(z.object({
  name: z.string().min(1).optional(),
  type: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  logoUrl: z.string().url().optional().or(z.literal('')),
  brandColors: z.record(z.string(), z.string()).optional(),
  timezone: z.string().optional(),
})), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await BusinessService.update(req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'business',
      description: 'Business settings updated',
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Business settings updated')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.put('/whatsapp-config', authenticate, requireBusinessOwner, validateBody(whatsappConfigSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await BusinessService.updateWhatsAppConfig(req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'business',
      description: 'WhatsApp configuration updated',
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'WhatsApp configuration updated')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.put('/social-config', authenticate, requireBusinessOwner, validateBody(socialConfigSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await BusinessService.updateSocialConfig(req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'business',
      description: 'Social media configuration updated',
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Social media configuration updated')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/limits', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await BusinessService.getWithLimits(req.user.businessId)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

export default router
