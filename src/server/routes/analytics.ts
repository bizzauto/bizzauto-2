import { Router } from 'express'
import { z } from 'zod'
import { AnalyticsService } from '../services/analytics.service'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validateQuery } from '../middleware/validation'
import { successResponse, errorResponse } from '../utils/response'

const router = Router()

const periodQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
})

const daysQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).default(30),
})

router.get('/dashboard', authenticate, validateQuery(periodQuerySchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { period } = req.query
    const result = await AnalyticsService.getDashboardStats(req.user.businessId, period)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/contacts', authenticate, validateQuery(daysQuerySchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { days } = req.query

    const [growth, sources, statusDist, topContacts] = await Promise.all([
      AnalyticsService.getContactGrowth(req.user.businessId, days),
      AnalyticsService.getContactSources(req.user.businessId),
      AnalyticsService.getContactStatusDistribution(req.user.businessId),
      AnalyticsService.getTopContacts(req.user.businessId),
    ])

    successResponse(res, {
      growth,
      sources,
      statusDistribution: statusDist,
      topContacts,
    })
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/messages', authenticate, validateQuery(daysQuerySchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { days } = req.query
    const result = await AnalyticsService.getMessageAnalytics(req.user.businessId, days)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/campaigns', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await AnalyticsService.getCampaignPerformance(req.user.businessId)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/revenue', authenticate, validateQuery(daysQuerySchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { days } = req.query
    const result = await AnalyticsService.getRevenueStats(req.user.businessId, days)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

export default router
