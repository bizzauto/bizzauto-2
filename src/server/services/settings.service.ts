import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'
import { z } from 'zod'

const settingsUpdateSchema = z.object({
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

const autopilotSettingsSchema = z.object({
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

const notificationPreferencesSchema = z.object({
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

export class SettingsService {
  static async getBusinessSettings(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    return business
  }

  static async updateBusinessSettings(businessId: string, data: z.infer<typeof settingsUpdateSchema>) {
    const validated = settingsUpdateSchema.parse(data)

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

    logger.info('Business settings updated', { businessId })
    return updated
  }

  static async getAutopilotSettings(businessId: string) {
    const settings = await prisma.autopilotSettings.findUnique({
      where: { businessId },
    })

    if (!settings) {
      return await prisma.autopilotSettings.create({
        data: { businessId },
      })
    }

    return settings
  }

  static async updateAutopilotSettings(businessId: string, data: z.infer<typeof autopilotSettingsSchema>) {
    const validated = autopilotSettingsSchema.parse(data)

    const existing = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!existing) {
      throw new Error('Business not found')
    }

    const settings = await prisma.autopilotSettings.upsert({
      where: { businessId },
      update: validated,
      create: {
        businessId,
        ...validated,
      },
    })

    logger.info('Autopilot settings updated', { businessId })
    return settings
  }

  static async getNotificationPreferences(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    return {
      emailNotifications: true,
      smsNotifications: false,
      whatsappNotifications: true,
      newContactAlert: true,
      newReviewAlert: true,
      orderAlert: true,
      appointmentAlert: true,
      campaignReport: true,
      paymentAlert: true,
    }
  }

  static async updateNotificationPreferences(userId: string, data: z.infer<typeof notificationPreferencesSchema>) {
    const validated = notificationPreferencesSchema.parse(data)

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('User not found')
    }

    logger.info('Notification preferences updated', { userId })
    return validated as Record<string, boolean>
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
      data: { businessHours: hours as any },
    })
  }
}
