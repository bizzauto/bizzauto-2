import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'
import { z } from 'zod'

const notificationCreateSchema = z.object({
  userId: z.string(),
  type: z.enum(['info', 'success', 'warning', 'error']),
  title: z.string().min(1),
  message: z.string().min(1),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  businessId: z.string().optional(),
})

export class NotificationsService {
  static async create(data: z.infer<typeof notificationCreateSchema>) {
    const validated = notificationCreateSchema.parse(data)

    const notification = await prisma.notification.create({
      data: {
        userId: validated.userId,
        type: validated.type,
        title: validated.title,
        message: validated.message,
        entityType: validated.entityType,
        entityId: validated.entityId,
        businessId: validated.businessId,
      },
    })

    logger.info('Notification created', { notificationId: notification.id, userId: validated.userId })
    return notification
  }

  static async getById(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    })

    if (!notification) {
      throw new Error('Notification not found')
    }

    return notification
  }

  static async list(userId: string, page = 1, limit = 20, isRead?: boolean, type?: string) {
    const skip = (page - 1) * limit
    const where: Record<string, unknown> = { userId, isArchived: false }

    if (isRead !== undefined) {
      where.isRead = isRead
    }

    if (type) {
      where.type = type
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false, isArchived: false } }),
    ])

    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  static async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    })

    if (!notification) {
      throw new Error('Notification not found')
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })
  }

  static async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    logger.info('All notifications marked as read', { userId, count: result.count })
    return { count: result.count }
  }

  static async archive(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    })

    if (!notification) {
      throw new Error('Notification not found')
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isArchived: true },
    })
  }

  static async archiveAll(userId: string) {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isArchived: false,
      },
      data: { isArchived: true },
    })

    logger.info('All notifications archived', { userId, count: result.count })
    return { count: result.count }
  }

  static async delete(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    })

    if (!notification) {
      throw new Error('Notification not found')
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    })

    return { success: true }
  }

  static async createForBusiness(businessId: string, type: string, title: string, message: string, entityType?: string, entityId?: string) {
    const users = await prisma.user.findMany({
      where: { businessId, isActive: true },
      select: { id: true },
    })

    const notifications = await prisma.notification.createMany({
      data: users.map((user: { id: string }) => ({
        userId: user.id,
        type: type as 'info' | 'success' | 'warning' | 'error',
        title,
        message,
        entityType,
        entityId,
        businessId,
      })),
    })

    logger.info('Business notifications created', { businessId, count: notifications.count })
    return { count: notifications.count }
  }

  static async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
        isArchived: false,
      },
    })
  }
}
