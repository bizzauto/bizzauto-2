import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'
import { z } from 'zod'

const contactCreateSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  company: z.string().optional(),
  title: z.string().optional(),
  designation: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  source: z.string().default('manual'),
  sourceId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.string(), z.unknown()).optional(),
  status: z.string().default('active'),
  stage: z.string().optional(),
  assignedTo: z.string().optional(),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  stageName: z.string().optional(),
  dealValue: z.number().default(0),
  dealStage: z.string().optional(),
  whatsappOptIn: z.boolean().default(false),
  emailOptIn: z.boolean().default(false),
})

const contactUpdateSchema = contactCreateSchema.partial()

const contactFilterSchema = z.object({
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  assignedTo: z.string().optional(),
  stage: z.string().optional(),
  pipelineId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  hasPhone: z.boolean().optional(),
  hasEmail: z.boolean().optional(),
  whatsappOptIn: z.boolean().optional(),
})

export class ContactsService {
  static async getById(contactId: string, businessId: string) {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, businessId },
      include: {
        activities: { orderBy: { createdAt: 'desc' }, take: 10 },
        appointments: { orderBy: { startTime: 'desc' }, take: 5 },
        messages: { orderBy: { createdAt: 'desc' }, take: 10 },
        orders: { orderBy: { createdAt: 'desc' }, take: 5 },
        pipeline: { select: { id: true, name: true } },
      },
    })

    if (!contact) {
      throw new Error('Contact not found')
    }

    return contact
  }

  static async create(businessId: string, data: z.infer<typeof contactCreateSchema>) {
    const validated = contactCreateSchema.parse(data)

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { contactsLimit: true },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    const contactCount = await prisma.contact.count({
      where: { businessId, status: 'active' },
    })

    if (contactCount >= business.contactsLimit) {
      throw new Error(`Contact limit reached. Current plan allows ${business.contactsLimit} contacts.`)
    }

    const contact = await prisma.contact.create({
      data: {
        businessId,
        name: validated.name,
        phone: validated.phone || null,
        email: validated.email || null,
        company: validated.company,
        title: validated.title,
        designation: validated.designation,
        city: validated.city,
        state: validated.state,
        source: validated.source,
        sourceId: validated.sourceId,
        tags: validated.tags,
        customFields: validated.customFields as any,
        status: validated.status,
        stage: validated.stage,
        assignedTo: validated.assignedTo,
        pipelineId: validated.pipelineId,
        stageId: validated.stageId,
        stageName: validated.stageName,
        dealValue: validated.dealValue,
        dealStage: validated.dealStage,
        whatsappOptIn: validated.whatsappOptIn,
        emailOptIn: validated.emailOptIn,
      },
    })

    logger.info('Contact created', { contactId: contact.id, businessId })
    return contact
  }

  static async update(contactId: string, businessId: string, data: z.infer<typeof contactUpdateSchema>) {
    const validated = contactUpdateSchema.parse(data)

    const existing = await prisma.contact.findFirst({
      where: { id: contactId, businessId },
    })

    if (!existing) {
      throw new Error('Contact not found')
    }

    const updated = await prisma.contact.update({
      where: { id: contactId },
      data: validated as any,
    })

    logger.info('Contact updated', { contactId })
    return updated
  }

  static async delete(contactId: string, businessId: string) {
    const existing = await prisma.contact.findFirst({
      where: { id: contactId, businessId },
    })

    if (!existing) {
      throw new Error('Contact not found')
    }

    await prisma.contact.delete({
      where: { id: contactId },
    })

    logger.info('Contact deleted', { contactId })
    return { success: true }
  }

  static async list(businessId: string, page = 1, limit = 20, filters?: z.infer<typeof contactFilterSchema>) {
    const skip = (page - 1) * limit
    const where: Record<string, unknown> = { businessId }

    if (filters) {
      const validated = contactFilterSchema.parse(filters)

      if (validated.search) {
        where.OR = [
          { name: { contains: validated.search, mode: 'insensitive' } },
          { phone: { contains: validated.search, mode: 'insensitive' } },
          { email: { contains: validated.search, mode: 'insensitive' } },
          { company: { contains: validated.search, mode: 'insensitive' } },
        ]
      }

      if (validated.tags && validated.tags.length > 0) {
        where.tags = { hasSome: validated.tags }
      }

      if (validated.status) {
        where.status = validated.status
      }

      if (validated.source) {
        where.source = validated.source
      }

      if (validated.city) {
        where.city = { contains: validated.city, mode: 'insensitive' }
      }

      if (validated.state) {
        where.state = { contains: validated.state, mode: 'insensitive' }
      }

      if (validated.assignedTo) {
        where.assignedTo = validated.assignedTo
      }

      if (validated.stage) {
        where.stage = validated.stage
      }

      if (validated.pipelineId) {
        where.pipelineId = validated.pipelineId
      }

      if (validated.dateFrom || validated.dateTo) {
        where.createdAt = {}
        if (validated.dateFrom) {
          (where.createdAt as Record<string, unknown>).gte = new Date(validated.dateFrom)
        }
        if (validated.dateTo) {
          (where.createdAt as Record<string, unknown>).lte = new Date(validated.dateTo)
        }
      }

      if (validated.hasPhone === true) {
        where.phone = { not: null }
      }

      if (validated.hasEmail === true) {
        where.email = { not: null }
      }

      if (validated.whatsappOptIn !== undefined) {
        where.whatsappOptIn = validated.whatsappOptIn
      }
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          company: true,
          city: true,
          state: true,
          tags: true,
          status: true,
          stage: true,
          source: true,
          dealValue: true,
          whatsappOptIn: true,
          emailOptIn: true,
          assignedTo: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.contact.count({ where }),
    ])

    return {
      contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  static async bulkImport(businessId: string, contacts: Array<z.infer<typeof contactCreateSchema>>) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { contactsLimit: true },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    const currentCount = await prisma.contact.count({
      where: { businessId, status: 'active' },
    })

    if (currentCount + contacts.length > business.contactsLimit) {
      throw new Error(
        `Bulk import would exceed contact limit. Current: ${currentCount}, Limit: ${business.contactsLimit}, Trying to add: ${contacts.length}`
      )
    }

    const created = await prisma.contact.createMany({
      data: contacts.map((c) => ({
        businessId,
        name: c.name,
        phone: c.phone || null,
        email: c.email || null,
        company: c.company,
        title: c.title,
        designation: c.designation,
        city: c.city,
        state: c.state,
        source: c.source || 'manual',
        sourceId: c.sourceId,
        tags: c.tags || [],
        customFields: c.customFields as any,
        status: c.status || 'active',
        stage: c.stage,
        assignedTo: c.assignedTo,
        pipelineId: c.pipelineId,
        stageId: c.stageId,
        stageName: c.stageName,
        dealValue: c.dealValue || 0,
        dealStage: c.dealStage,
        whatsappOptIn: c.whatsappOptIn || false,
        emailOptIn: c.emailOptIn || false,
      })),
      skipDuplicates: true,
    })

    logger.info('Bulk contacts imported', { businessId, count: created.count })
    return { success: true, count: created.count }
  }

  static async bulkDelete(contactIds: string[], businessId: string) {
    const result = await prisma.contact.deleteMany({
      where: {
        id: { in: contactIds },
        businessId,
      },
    })

    logger.info('Bulk contacts deleted', { businessId, count: result.count })
    return { success: true, count: result.count }
  }

  static async search(businessId: string, query: string, limit = 10) {
    return prisma.contact.findMany({
      where: {
        businessId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { company: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        company: true,
        tags: true,
        status: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    })
  }

  static async exportCSV(businessId: string, filters?: z.infer<typeof contactFilterSchema>) {
    const where: Record<string, unknown> = { businessId }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags }
    }

    const contacts = await prisma.contact.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        company: true,
        title: true,
        city: true,
        state: true,
        tags: true,
        status: true,
        source: true,
        dealValue: true,
        stage: true,
        assignedTo: true,
        whatsappOptIn: true,
        emailOptIn: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const headers = ['ID', 'Name', 'Phone', 'Email', 'Company', 'Title', 'City', 'State', 'Tags', 'Status', 'Source', 'Deal Value', 'Stage', 'Assigned To', 'WhatsApp Opt-In', 'Email Opt-In', 'Created At']

    const rows = contacts.map((c: { id: string; name: string; phone: string | null; email: string | null; company: string | null; title: string | null; city: string | null; state: string | null; tags: string[]; status: string; source: string; dealValue: number | null; stage: string | null; assignedTo: string | null; whatsappOptIn: boolean; emailOptIn: boolean; createdAt: Date }) => [
      c.id,
      `"${c.name}"`,
      c.phone || '',
      c.email || '',
      c.company || '',
      c.title || '',
      c.city || '',
      c.state || '',
      `"${(c.tags || []).join(', ')}"`,
      c.status,
      c.source,
      c.dealValue?.toString() || '0',
      c.stage || '',
      c.assignedTo || '',
      c.whatsappOptIn ? 'Yes' : 'No',
      c.emailOptIn ? 'Yes' : 'No',
      c.createdAt.toISOString(),
    ])

    const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n')
    return csv
  }

  static async checkContactLimits(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { contactsLimit: true, plan: true },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    const count = await prisma.contact.count({
      where: { businessId, status: 'active' },
    })

    return {
      used: count,
      limit: business.contactsLimit,
      remaining: business.contactsLimit - count,
      plan: business.plan,
      canAdd: count < business.contactsLimit,
    }
  }

  static async getStats(businessId: string) {
    const [total, active, bySource, byStage, withDeals] = await Promise.all([
      prisma.contact.count({ where: { businessId } }),
      prisma.contact.count({ where: { businessId, status: 'active' } }),
      prisma.contact.groupBy({
        by: ['source'],
        where: { businessId },
        _count: true,
      }),
      prisma.contact.groupBy({
        by: ['stage'],
        where: { businessId },
        _count: true,
      }),
      prisma.contact.aggregate({
        where: { businessId, dealValue: { gt: 0 } },
        _sum: { dealValue: true },
        _count: true,
      }),
    ])

    return {
      total,
      active,
      bySource,
      byStage,
      totalDealValue: withDeals._sum.dealValue || 0,
      dealsCount: withDeals._count || 0,
    }
  }
}
