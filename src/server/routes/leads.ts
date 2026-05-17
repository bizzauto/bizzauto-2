import { Router } from 'express'
import { z } from 'zod'
import { authenticate, AuthRequest, requireBusinessOwner } from '../middleware/auth'
import { validateBody, validateParams, validateQuery } from '../middleware/validation'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response'
import { createAuditLog } from '../utils/audit'
import { prisma } from '../config/database'

const router = Router()

const leadCaptureSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  company: z.string().optional(),
  source: z.string().default('manual'),
  sourceId: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.string(), z.unknown()).optional(),
})

const indiaMartSchema = z.object({
  leads: z.array(z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    company: z.string().optional(),
    product: z.string().optional(),
    quantity: z.string().optional(),
    requirements: z.string().optional(),
  })),
})

const justDialSchema = z.object({
  leads: z.array(z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    company: z.string().optional(),
    category: z.string().optional(),
    location: z.string().optional(),
  })),
})

const facebookSchema = z.object({
  leads: z.array(z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    company: z.string().optional(),
    adId: z.string().optional(),
    formId: z.string().optional(),
  })),
})

const instagramSchema = z.object({
  leads: z.array(z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    username: z.string().optional(),
    message: z.string().optional(),
  })),
})

const statsQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  source: z.string().optional(),
})

const exportQuerySchema = z.object({
  source: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

const businessIdParamSchema = z.object({
  businessId: z.string().uuid(),
})

async function ensureBusinessAccess(req: AuthRequest, businessId: string): Promise<boolean> {
  if (req.user.role === 'SUPER_ADMIN') {
    const business = await prisma.business.findUnique({ where: { id: businessId } })
    return !!business
  }

  if (req.user.businessId !== businessId) {
    return false
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { isActive: true },
  })

  return !!business?.isActive
}

router.post('/capture/:businessId', authenticate, validateParams(businessIdParamSchema), validateBody(leadCaptureSchema), async (req: AuthRequest, res) => {
  try {
    const { businessId } = req.params

    const hasAccess = await ensureBusinessAccess(req, businessId)
    if (!hasAccess) {
      return errorResponse(res, 'Access denied', 403)
    }

    const { name, phone, email, company, source, sourceId, notes, tags, customFields } = req.body

    const contact = await prisma.contact.create({
      data: {
        businessId,
        name,
        phone: phone || null,
        email: email || null,
        company,
        source: source || 'manual',
        sourceId,
        tags,
        customFields: customFields as any,
        status: 'active',
        stage: 'new',
        whatsappOptIn: false,
        emailOptIn: false,
      },
    })

    if (notes) {
      await prisma.activity.create({
        data: {
          contactId: contact.id,
          businessId,
          type: 'note',
          description: notes,
        },
      })
    }

    await createAuditLog({
      businessId,
      action: 'create',
      entity: 'lead',
      entityId: contact.id,
      description: `Lead captured: ${name} from ${source}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, contact, 'Lead captured', 201)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/indiamart/:businessId', authenticate, validateParams(businessIdParamSchema), validateBody(indiaMartSchema), async (req: AuthRequest, res) => {
  try {
    const { businessId } = req.params

    const hasAccess = await ensureBusinessAccess(req, businessId)
    if (!hasAccess) {
      return errorResponse(res, 'Access denied', 403)
    }

    const { leads } = req.body
    const created: string[] = []

    for (const lead of leads) {
      const contact = await prisma.contact.create({
        data: {
          businessId,
          name: lead.name,
          phone: lead.phone || null,
          email: lead.email || null,
          company: lead.company,
          source: 'indiamart',
          sourceId: lead.product,
          tags: lead.product ? ['indiamart', lead.product] : ['indiamart'],
          customFields: {
            quantity: lead.quantity,
            requirements: lead.requirements,
          } as any,
          status: 'active',
          stage: 'new',
          whatsappOptIn: false,
          emailOptIn: false,
        },
      })
      created.push(contact.id)
    }

    await createAuditLog({
      businessId,
      action: 'create',
      entity: 'lead',
      description: `IndiaMart leads imported: ${created.length}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, { count: created.length, ids: created }, `${created.length} leads imported from IndiaMart`)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/justdial/:businessId', authenticate, validateParams(businessIdParamSchema), validateBody(justDialSchema), async (req: AuthRequest, res) => {
  try {
    const { businessId } = req.params

    const hasAccess = await ensureBusinessAccess(req, businessId)
    if (!hasAccess) {
      return errorResponse(res, 'Access denied', 403)
    }

    const { leads } = req.body
    const created: string[] = []

    for (const lead of leads) {
      const contact = await prisma.contact.create({
        data: {
          businessId,
          name: lead.name,
          phone: lead.phone || null,
          email: lead.email || null,
          company: lead.company,
          source: 'justdial',
          tags: ['justdial', lead.category || ''].filter(Boolean),
          customFields: {
            category: lead.category,
            location: lead.location,
          } as any,
          status: 'active',
          stage: 'new',
          whatsappOptIn: false,
          emailOptIn: false,
        },
      })
      created.push(contact.id)
    }

    await createAuditLog({
      businessId,
      action: 'create',
      entity: 'lead',
      description: `JustDial leads imported: ${created.length}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, { count: created.length, ids: created }, `${created.length} leads imported from JustDial`)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/facebook/:businessId', authenticate, validateParams(businessIdParamSchema), validateBody(facebookSchema), async (req: AuthRequest, res) => {
  try {
    const { businessId } = req.params

    const hasAccess = await ensureBusinessAccess(req, businessId)
    if (!hasAccess) {
      return errorResponse(res, 'Access denied', 403)
    }

    const { leads } = req.body
    const created: string[] = []

    for (const lead of leads) {
      const contact = await prisma.contact.create({
        data: {
          businessId,
          name: lead.name,
          phone: lead.phone || null,
          email: lead.email || null,
          company: lead.company,
          source: 'facebook',
          sourceId: lead.formId,
          tags: ['facebook', lead.adId || ''].filter(Boolean),
          customFields: {
            adId: lead.adId,
            formId: lead.formId,
          } as any,
          status: 'active',
          stage: 'new',
          whatsappOptIn: false,
          emailOptIn: false,
        },
      })
      created.push(contact.id)
    }

    await createAuditLog({
      businessId,
      action: 'create',
      entity: 'lead',
      description: `Facebook leads imported: ${created.length}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, { count: created.length, ids: created }, `${created.length} leads imported from Facebook`)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/instagram/:businessId', authenticate, validateParams(businessIdParamSchema), validateBody(instagramSchema), async (req: AuthRequest, res) => {
  try {
    const { businessId } = req.params

    const hasAccess = await ensureBusinessAccess(req, businessId)
    if (!hasAccess) {
      return errorResponse(res, 'Access denied', 403)
    }

    const { leads } = req.body
    const created: string[] = []

    for (const lead of leads) {
      const contact = await prisma.contact.create({
        data: {
          businessId,
          name: lead.name,
          phone: lead.phone || null,
          email: lead.email || null,
          source: 'instagram',
          tags: ['instagram'],
          customFields: {
            username: lead.username,
            message: lead.message,
          } as any,
          status: 'active',
          stage: 'new',
          whatsappOptIn: false,
          emailOptIn: false,
        },
      })
      created.push(contact.id)
    }

    await createAuditLog({
      businessId,
      action: 'create',
      entity: 'lead',
      description: `Instagram leads imported: ${created.length}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, { count: created.length, ids: created }, `${created.length} leads imported from Instagram`)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/stats', authenticate, validateQuery(statsQuerySchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { dateFrom, dateTo, source } = req.query
    const where: Record<string, unknown> = { businessId: req.user.businessId, source: { not: 'manual' } }

    if (source) {
      where.source = source
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom)
      }
      if (dateTo) {
        (where.createdAt as Record<string, unknown>).lte = new Date(dateTo)
      }
    }

    const [total, bySource, recentCount] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.groupBy({
        by: ['source'],
        where,
        _count: true,
      }),
      prisma.contact.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ])

    successResponse(res, {
      total,
      bySource: bySource.map((s: { source: string; _count: number }) => ({
        source: s.source,
        count: s._count,
      })),
      last7Days: recentCount,
    })
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/export', authenticate, validateQuery(exportQuerySchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { source, status, dateFrom, dateTo } = req.query
    const where: Record<string, unknown> = { businessId: req.user.businessId, source: { not: 'manual' } }

    if (source) {
      where.source = source
    }

    if (status) {
      where.status = status
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom)
      }
      if (dateTo) {
        (where.createdAt as Record<string, unknown>).lte = new Date(dateTo)
      }
    }

    const leads = await prisma.contact.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        company: true,
        source: true,
        sourceId: true,
        tags: true,
        status: true,
        stage: true,
        city: true,
        state: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const headers = ['ID', 'Name', 'Phone', 'Email', 'Company', 'Source', 'Source ID', 'Tags', 'Status', 'Stage', 'City', 'State', 'Created At']

    const rows = leads.map((l: { id: string; name: string; phone: string | null; email: string | null; company: string | null; source: string; sourceId: string | null; tags: string[]; status: string; stage: string | null; city: string | null; state: string | null; createdAt: Date }) => [
      l.id,
      `"${l.name.replace(/"/g, '""')}"`,
      l.phone || '',
      l.email || '',
      l.company || '',
      l.source,
      l.sourceId || '',
      `"${(l.tags || []).join(', ')}"`,
      l.status,
      l.stage || '',
      l.city || '',
      l.state || '',
      l.createdAt.toISOString(),
    ])

    const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n')

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'export',
      entity: 'leads',
      description: `Leads exported: ${leads.length} records`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="leads_${Date.now()}.csv"`)
    res.send(csv)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

export default router
