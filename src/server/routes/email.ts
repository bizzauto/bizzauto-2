import { Router } from 'express'
import { z } from 'zod'
import { EmailService } from '../services/email.service'
import { CampaignsService } from '../services/campaigns.service'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validateBody, validateQuery } from '../middleware/validation'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response'
import { createAuditLog } from '../utils/audit'
import { prisma } from '../config/database'

const router = Router()

const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string(),
  text: z.string().optional(),
})

const testEmailSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().positive(),
  secure: z.boolean().default(true),
  user: z.string().min(1),
  pass: z.string().min(1),
  from: z.string().email(),
})

const configureSchema = testEmailSchema

const emailCampaignCreateSchema = z.object({
  name: z.string().min(1),
  contactIds: z.array(z.string()).default([]),
  targetTags: z.array(z.string()).default([]),
  subject: z.string().min(1),
  html: z.string(),
  text: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
})

const passwordResetSchema = z.object({
  email: z.string().email(),
})

router.post('/send', authenticate, validateBody(sendEmailSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { to, subject, html, text } = req.body

    const smtpConfig = await EmailService.getBusinessSMTPConfig(req.user.businessId)
    const result = await EmailService.sendEmail(to, subject, html, text, smtpConfig || undefined)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'create',
      entity: 'email',
      description: `Email sent to ${to}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Email sent')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/test', authenticate, validateBody(testEmailSchema), async (req: AuthRequest, res) => {
  try {
    const result = await EmailService.testConnection(req.body)
    successResponse(res, result, 'SMTP connection successful')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/configure', authenticate, validateBody(configureSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await EmailService.configureBusinessSMTP(req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'email_config',
      description: 'SMTP configuration updated',
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'SMTP configured')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/campaigns', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const campaigns = await prisma.campaign.findMany({
      where: { businessId: req.user.businessId, type: 'email' },
      orderBy: { createdAt: 'desc' },
    })

    successResponse(res, campaigns)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/campaigns', authenticate, validateBody(emailCampaignCreateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { name, contactIds, targetTags, subject, html, text, scheduledAt } = req.body

    const result = await CampaignsService.create(req.user.businessId, {
      name,
      type: 'email',
      contactIds,
      targetTags,
      content: {
        type: 'text',
        body: html,
      },
      scheduledAt,
    })

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'create',
      entity: 'email_campaign',
      entityId: result.id,
      description: `Email campaign created: ${name}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Email campaign created', 201)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/password-reset', validateBody(passwordResetSchema), async (req, res) => {
  try {
    const { email } = req.body

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    })

    if (!user) {
      return successResponse(res, { success: true }, 'If the email exists, a reset link has been sent')
    }

    const resetToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64')
    const expiresAt = new Date(Date.now() + 3600000)

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt,
      },
    })

    await EmailService.sendPasswordResetEmail(email, resetToken)

    successResponse(res, { success: true }, 'If the email exists, a reset link has been sent')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

export default router
