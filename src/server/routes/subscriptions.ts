import { Router } from 'express'
import { z } from 'zod'
import { SubscriptionService } from '../services/subscription.service'
import { RazorpayService } from '../services/razorpay.service'
import { authenticate, AuthRequest, requireBusinessOwner } from '../middleware/auth'
import { validateBody, validateQuery } from '../middleware/validation'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response'
import { createAuditLog } from '../utils/audit'
import { prisma } from '../config/database'
import { Plan } from '@prisma/client'

const router = Router()

const upgradeSchema = z.object({
  plan: z.nativeEnum(Plan),
})

const cancelSchema = z.object({
  reason: z.string().optional(),
})

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

router.get('/plan', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const [current, limits, history] = await Promise.all([
      SubscriptionService.getCurrentSubscription(req.user.businessId),
      SubscriptionService.checkPlanLimits(req.user.businessId),
      SubscriptionService.getSubscriptionHistory(req.user.businessId),
    ])

    successResponse(res, { current, limits, history })
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/upgrade', authenticate, requireBusinessOwner, validateBody(upgradeSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { plan } = req.body
    const result = await SubscriptionService.upgradePlan(req.user.businessId, plan)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'subscription',
      description: `Plan upgraded to ${plan}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Plan upgraded successfully')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/cancel', authenticate, requireBusinessOwner, validateBody(cancelSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { reason } = req.body
    const result = await SubscriptionService.cancel(req.user.businessId, reason)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'subscription',
      description: `Subscription cancelled: ${reason || 'No reason provided'}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Subscription cancelled')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/invoices', authenticate, validateQuery(paginationQuerySchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { page, limit } = req.query
    const skip = (page - 1) * limit

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: { businessId: req.user.businessId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.invoice.count({
        where: { businessId: req.user.businessId },
      }),
    ])

    paginatedResponse(res, invoices, total, page, limit)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string
    const payload = JSON.stringify(req.body)

    if (signature) {
      const isValid = RazorpayService.verifyWebhookSignature(payload, signature)
      if (!isValid) {
        return errorResponse(res, 'Invalid webhook signature', 401)
      }
    }

    const event = req.body.event as string
    const businessId = req.body.payload?.payment?.entity?.notes?.business_id ||
      req.body.payload?.subscription?.entity?.notes?.business_id || ''

    if (businessId) {
      await RazorpayService.handleWebhook(businessId, event, req.body.payload)
    }

    successResponse(res, { received: true }, 'Webhook received', 200)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

export default router
