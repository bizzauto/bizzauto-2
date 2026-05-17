import { Router } from 'express'
import { z } from 'zod'
import { ReportsService } from '../services/reports.service'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validateBody, validateQuery } from '../middleware/validation'
import { successResponse, errorResponse } from '../utils/response'
import { createAuditLog } from '../utils/audit'

const router = Router()

const summaryQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
})

const contactsExportSchema = z.object({
  status: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

router.get('/summary', authenticate, validateQuery(summaryQuerySchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { period } = req.query
    const result = await ReportsService.generateSummaryReport(req.user.businessId, period)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/export/contacts', authenticate, validateBody(contactsExportSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const csv = await ReportsService.exportContactsCSV(req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'export',
      entity: 'contacts',
      description: 'Contacts exported as CSV',
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="contacts_report_${Date.now()}.csv"`)
    res.send(csv)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/export/campaigns', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const csv = await ReportsService.exportCampaignsCSV(req.user.businessId)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'export',
      entity: 'campaigns',
      description: 'Campaigns exported as CSV',
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="campaigns_report_${Date.now()}.csv"`)
    res.send(csv)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/export/orders', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const csv = await ReportsService.exportOrdersCSV(req.user.businessId)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'export',
      entity: 'orders',
      description: 'Orders exported as CSV',
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="orders_report_${Date.now()}.csv"`)
    res.send(csv)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

export default router
