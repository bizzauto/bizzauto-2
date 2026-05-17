import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'
import { z } from 'zod'

const campaignCreateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['whatsapp', 'email', 'sms']).default('whatsapp'),
  contactIds: z.array(z.string()).default([]),
  targetTags: z.array(z.string()).default([]),
  targetFilters: z.record(z.string(), z.unknown()).optional(),
  content: z.object({
    type: z.enum(['text', 'template', 'media']),
    body: z.string(),
    mediaUrl: z.string().optional(),
    templateName: z.string().optional(),
    templateLanguage: z.string().optional(),
    templateParams: z.array(z.string()).optional(),
  }),
  scheduledAt: z.string().datetime().optional(),
  dripSteps: z.array(z.object({
    delay: z.number(),
    content: z.string(),
    type: z.string().default('text'),
  })).optional(),
})

const campaignUpdateSchema = campaignCreateSchema.partial()

export class CampaignsService {
  static async getById(campaignId: string, businessId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, businessId },
      include: {
        dripQueueItems: {
          orderBy: { sendAt: 'asc' },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!campaign) {
      throw new Error('Campaign not found')
    }

    return campaign
  }

  static async create(businessId: string, data: z.infer<typeof campaignCreateSchema>) {
    const validated = campaignCreateSchema.parse(data)

    let targetCount = validated.contactIds.length

    if (validated.targetTags.length > 0) {
      const tagContacts = await prisma.contact.count({
        where: {
          businessId,
          tags: { hasSome: validated.targetTags },
          status: 'active',
        },
      })
      targetCount = Math.max(targetCount, tagContacts)
    }

    const campaign = await prisma.campaign.create({
      data: {
        businessId,
        name: validated.name,
        type: validated.type,
        status: 'draft',
        contactIds: validated.contactIds,
        targetTags: validated.targetTags,
        targetFilters: validated.targetFilters as any,
        targetCount,
        content: validated.content as any,
        scheduledAt: validated.scheduledAt ? new Date(validated.scheduledAt) : null,
        dripSteps: validated.dripSteps as any,
      },
    })

    logger.info('Campaign created', { campaignId: campaign.id, businessId })
    return campaign
  }

  static async update(campaignId: string, businessId: string, data: z.infer<typeof campaignUpdateSchema>) {
    const validated = campaignUpdateSchema.parse(data)

    const existing = await prisma.campaign.findFirst({
      where: { id: campaignId, businessId },
    })

    if (!existing) {
      throw new Error('Campaign not found')
    }

    if (existing.status !== 'draft') {
      throw new Error('Can only update draft campaigns')
    }

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: validated as any,
    })

    logger.info('Campaign updated', { campaignId })
    return updated
  }

  static async delete(campaignId: string, businessId: string) {
    const existing = await prisma.campaign.findFirst({
      where: { id: campaignId, businessId },
    })

    if (!existing) {
      throw new Error('Campaign not found')
    }

    if (existing.status === 'running') {
      throw new Error('Cannot delete a running campaign. Pause it first.')
    }

    await prisma.dripQueue.deleteMany({
      where: { campaignId },
    })

    await prisma.campaign.delete({
      where: { id: campaignId },
    })

    logger.info('Campaign deleted', { campaignId })
    return { success: true }
  }

  static async list(businessId: string, page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit
    const where: Record<string, unknown> = { businessId }

    if (status) {
      where.status = status
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.campaign.count({ where }),
    ])

    return {
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  static async start(campaignId: string, businessId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, businessId },
    })

    if (!campaign) {
      throw new Error('Campaign not found')
    }

    if (campaign.status !== 'draft') {
      throw new Error('Campaign must be in draft status to start')
    }

    let contactIds = campaign.contactIds

    if (campaign.targetTags.length > 0) {
      const tagContacts = await prisma.contact.findMany({
        where: {
          businessId,
          tags: { hasSome: campaign.targetTags },
          status: 'active',
        },
        select: { id: true },
      })
      contactIds = [...new Set([...contactIds, ...tagContacts.map((c: { id: string }) => c.id)])]
    }

    if (contactIds.length === 0) {
      throw new Error('No contacts targeted for this campaign')
    }

    const now = new Date()

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'running',
        startedAt: now,
        totalContacts: contactIds.length,
        contactIds,
      },
    })

    await this.createDripQueueEntries(campaignId, businessId, contactIds, campaign.content as any, campaign.dripSteps as any)

    logger.info('Campaign started', { campaignId, contactCount: contactIds.length })
    return this.getById(campaignId, businessId)
  }

  static async pause(campaignId: string, businessId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, businessId },
    })

    if (!campaign) {
      throw new Error('Campaign not found')
    }

    if (campaign.status !== 'running') {
      throw new Error('Campaign must be running to pause')
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'paused' },
    })

    await prisma.dripQueue.updateMany({
      where: { campaignId, status: 'pending' },
      data: { status: 'paused' },
    })

    logger.info('Campaign paused', { campaignId })
    return { success: true }
  }

  static async resume(campaignId: string, businessId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, businessId },
    })

    if (!campaign) {
      throw new Error('Campaign not found')
    }

    if (campaign.status !== 'paused') {
      throw new Error('Campaign must be paused to resume')
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'running' },
    })

    await prisma.dripQueue.updateMany({
      where: { campaignId, status: 'paused' },
      data: { status: 'pending' },
    })

    logger.info('Campaign resumed', { campaignId })
    return { success: true }
  }

  static async getStats(campaignId: string, businessId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, businessId },
    })

    if (!campaign) {
      throw new Error('Campaign not found')
    }

    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      totalContacts: campaign.totalContacts,
      totalSent: campaign.totalSent,
      totalDelivered: campaign.totalDelivered,
      totalRead: campaign.totalRead,
      totalReplied: campaign.totalReplied,
      totalFailed: campaign.totalFailed,
      deliveryRate: campaign.totalSent > 0 ? ((campaign.totalDelivered / campaign.totalSent) * 100).toFixed(2) : '0',
      readRate: campaign.totalDelivered > 0 ? ((campaign.totalRead / campaign.totalDelivered) * 100).toFixed(2) : '0',
      replyRate: campaign.totalSent > 0 ? ((campaign.totalReplied / campaign.totalSent) * 100).toFixed(2) : '0',
      failureRate: campaign.totalSent > 0 ? ((campaign.totalFailed / campaign.totalSent) * 100).toFixed(2) : '0',
      startedAt: campaign.startedAt,
      completedAt: campaign.completedAt,
    }
  }

  static async complete(campaignId: string) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    })

    logger.info('Campaign completed', { campaignId })
  }

  static async incrementSent(campaignId: string) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { totalSent: { increment: 1 } },
    })
  }

  static async incrementDelivered(campaignId: string) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { totalDelivered: { increment: 1 } },
    })
  }

  static async incrementRead(campaignId: string) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { totalRead: { increment: 1 } },
    })
  }

  static async incrementReplied(campaignId: string) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { totalReplied: { increment: 1 } },
    })
  }

  static async incrementFailed(campaignId: string) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { totalFailed: { increment: 1 } },
    })
  }

  static async addError(campaignId: string, error: Record<string, unknown>) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { errors: true },
    })

    if (!campaign) {
      throw new Error('Campaign not found')
    }

    const errors = campaign.errors as unknown as Array<Record<string, unknown>>
    errors.push(error)

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { errors: errors as any },
    })
  }

  private static async createDripQueueEntries(
    campaignId: string,
    businessId: string,
    contactIds: string[],
    content: Record<string, unknown>,
    dripSteps?: Array<{ delay: number; content: string; type: string }>
  ) {
    if (!dripSteps || dripSteps.length === 0) {
      const entries = contactIds.map((contactId) => ({
        campaignId,
        contactId,
        businessId,
        step: 0,
        stepIndex: 0,
        stepData: content as any,
        sendAt: new Date(),
        status: 'pending',
      }))

      if (entries.length > 0) {
        await prisma.dripQueue.createMany({ data: entries })
      }
      return
    }

    const allEntries: Array<{
      campaignId: string
      contactId: string
      businessId: string
      step: number
      stepIndex: number
      stepData: any
      sendAt: Date
      status: string
    }> = []

    contactIds.forEach((contactId) => {
      dripSteps.forEach((step, index) => {
        allEntries.push({
          campaignId,
          contactId,
          businessId,
          step: index,
          stepIndex: index,
          stepData: { content: step.content, type: step.type } as any,
          sendAt: new Date(Date.now() + step.delay * 60 * 1000),
          status: 'pending',
        })
      })
    })

    if (allEntries.length > 0) {
      await prisma.dripQueue.createMany({ data: allEntries })
    }
  }
}
