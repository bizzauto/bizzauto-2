import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'
import { z } from 'zod'

const businessUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  logoUrl: z.string().url().optional().or(z.literal('')),
  brandColors: z.record(z.string(), z.string()).optional(),
  timezone: z.string().optional(),
})

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

export class BusinessService {
  static async getById(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        autopilotSettings: true,
      },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    return business
  }

  static async update(businessId: string, data: z.infer<typeof businessUpdateSchema>) {
    const validated = businessUpdateSchema.parse(data)

    const existing = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!existing) {
      throw new Error('Business not found')
    }

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: validated,
    })

    logger.info('Business updated', { businessId })
    return updated
  }

  static async updateWhatsAppConfig(businessId: string, config: z.infer<typeof whatsappConfigSchema>) {
    const validated = whatsappConfigSchema.parse(config)

    const existing = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!existing) {
      throw new Error('Business not found')
    }

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: validated,
    })

    logger.info('WhatsApp config updated', { businessId })
    return updated
  }

  static async updateSocialConfig(businessId: string, config: z.infer<typeof socialConfigSchema>) {
    const validated = socialConfigSchema.parse(config)

    const existing = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!existing) {
      throw new Error('Business not found')
    }

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: validated,
    })

    logger.info('Social config updated', { businessId })
    return updated
  }

  static async getWithLimits(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    const contactCount = await prisma.contact.count({
      where: { businessId, status: 'active' },
    })

    const messageCount = await prisma.message.count({
      where: {
        businessId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    })

    const userCount = await prisma.user.count({
      where: { businessId, isActive: true },
    })

    return {
      business,
      limits: {
        contacts: {
          used: contactCount,
          limit: business.contactsLimit,
          remaining: business.contactsLimit - contactCount,
          exceeded: contactCount >= business.contactsLimit,
        },
        messages: {
          used: messageCount,
          limit: business.messagesLimit,
          remaining: business.messagesLimit - messageCount,
          exceeded: messageCount >= business.messagesLimit,
        },
        users: {
          used: userCount,
          limit: business.usersLimit,
          remaining: business.usersLimit - userCount,
          exceeded: userCount >= business.usersLimit,
        },
        aiCredits: {
          used: business.aiCreditsUsed,
          limit: business.aiCreditsLimit + business.aiCreditsPurchased,
          remaining: business.aiCreditsLimit + business.aiCreditsPurchased - business.aiCreditsUsed,
          exceeded: business.aiCreditsUsed >= business.aiCreditsLimit + business.aiCreditsPurchased,
        },
      },
    }
  }

  static async updateAutoReply(businessId: string, enabled: boolean, message?: string) {
    const existing = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!existing) {
      throw new Error('Business not found')
    }

    return prisma.business.update({
      where: { id: businessId },
      data: {
        autoReplyEnabled: enabled,
        autoReplyMessage: message !== undefined ? message : existing.autoReplyMessage,
      },
    })
  }

  static async updateBusinessHours(businessId: string, hours: Record<string, unknown>) {
    const existing = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!existing) {
      throw new Error('Business not found')
    }

    return prisma.business.update({
      where: { id: businessId },
      data: {
        businessHours: hours as any,
      },
    })
  }

  static async updateAICredits(businessId: string, additionalCredits: number) {
    const existing = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!existing) {
      throw new Error('Business not found')
    }

    return prisma.business.update({
      where: { id: businessId },
      data: {
        aiCreditsPurchased: {
          increment: additionalCredits,
        },
      },
    })
  }

  static async toggleActive(businessId: string, active: boolean) {
    const existing = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!existing) {
      throw new Error('Business not found')
    }

    return prisma.business.update({
      where: { id: businessId },
      data: { isActive: active },
    })
  }

  static async delete(businessId: string) {
    const existing = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!existing) {
      throw new Error('Business not found')
    }

    await prisma.business.delete({
      where: { id: businessId },
    })

    logger.info('Business deleted', { businessId })
    return { success: true }
  }
}
