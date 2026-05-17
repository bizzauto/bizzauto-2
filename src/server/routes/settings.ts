import { Router } from 'express'
import { z } from 'zod'
import { SettingsService } from '../services/settings.service'
import { authenticate, AuthRequest, requireBusinessOwner } from '../middleware/auth'
import { validateBody } from '../middleware/validation'
import { successResponse, errorResponse } from '../utils/response'
import { createAuditLog } from '../utils/audit'

const router = Router()

const businessSettingsSchema = z.object({
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
})

const autopilotSchema = z.object({
  isEnabled: z.boolean().optional(),
  replyDelay: z.number().int().min(0).max(3600).optional(),
  welcomeMessage: z.string().optional(),
  welcomeEnabled: z.boolean().optional(),
  followUpEnabled: z.boolean().optional(),
  followUpDelay: z.number().int().min(0).optional(),
  followUpMessage: z.string().optional(),
  aiEnabled: z.boolean().optional(),
  aiTone: z.enum(['professional', 'casual', 'friendly', 'formal']).optional(),
  aiLanguage: z.string().optional(),
  businessHoursOnly: z.boolean().optional(),
})

const notificationsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  whatsappNotifications: z.boolean().optional(),
  newContactAlert: z.boolean().optional(),
  newReviewAlert: z.boolean().optional(),
  orderAlert: z.boolean().optional(),
  appointmentAlert: z.boolean().optional(),
  campaignReport: z.boolean().optional(),
  paymentAlert: z.boolean().optional(),
})

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const [business, autopilot, notifications] = await Promise.all([
      SettingsService.getBusinessSettings(req.user.businessId),
      SettingsService.getAutopilotSettings(req.user.businessId),
      SettingsService.getNotificationPreferences(req.user.id),
    ])

    successResponse(res, {
      business,
      autopilot,
      notifications,
    })
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.put('/business', authenticate, requireBusinessOwner, validateBody(businessSettingsSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await SettingsService.updateBusinessSettings(req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'settings',
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

router.put('/autopilot', authenticate, requireBusinessOwner, validateBody(autopilotSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await SettingsService.updateAutopilotSettings(req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'autopilot',
      description: 'Autopilot settings updated',
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Autopilot settings updated')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.put('/notifications', authenticate, validateBody(notificationsSchema), async (req: AuthRequest, res) => {
  try {
    const result = await SettingsService.updateNotificationPreferences(req.user.id, req.body)

    await createAuditLog({
      businessId: req.user.businessId!,
      action: 'update',
      entity: 'notifications',
      description: 'Notification preferences updated',
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Notification preferences updated')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

export default router
