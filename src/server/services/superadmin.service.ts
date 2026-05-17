import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'
import { z } from 'zod'
import { Role, Plan } from '@prisma/client'

const updateRoleSchema = z.object({
  role: z.nativeEnum(Role),
})

export class SuperAdminService {
  static async listAllBusinesses(page = 1, limit = 20, plan?: Plan, isActive?: boolean) {
    const skip = (page - 1) * limit
    const where: Record<string, unknown> = {}

    if (plan) {
      where.plan = plan
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          type: true,
          email: true,
          phone: true,
          city: true,
          state: true,
          plan: true,
          isActive: true,
          contactsLimit: true,
          messagesLimit: true,
          usersLimit: true,
          aiCreditsUsed: true,
          aiCreditsLimit: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              users: true,
              contacts: true,
              campaigns: true,
            },
          },
        },
      }),
      prisma.business.count({ where }),
    ])

    return {
      businesses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  static async listAllUsers(page = 1, limit = 20, role?: Role, isActive?: boolean, businessId?: string) {
    const skip = (page - 1) * limit
    const where: Record<string, unknown> = {}

    if (role) {
      where.role = role
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    if (businessId) {
      where.businessId = businessId
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          businessId: true,
          isActive: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          business: {
            select: {
              id: true,
              name: true,
              plan: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ])

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  static async updateUserRole(userId: string, newRole: Role) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        businessId: true,
      },
    })

    logger.info('User role updated by superadmin', { userId, newRole })
    return updated
  }

  static async toggleBusinessActive(businessId: string, active: boolean) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: { isActive: active },
    })

    logger.info('Business toggled by superadmin', { businessId, active })
    return updated
  }

  static async getPlatformStats() {
    const [
      totalBusinesses,
      activeBusinesses,
      totalUsers,
      activeUsers,
      totalContacts,
      totalMessages,
      totalCampaigns,
      totalOrders,
      totalRevenue,
      businessesByPlan,
      usersByRole,
      recentSignups,
    ] = await Promise.all([
      prisma.business.count(),
      prisma.business.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.contact.count(),
      prisma.message.count(),
      prisma.campaign.count(),
      prisma.order.count(),
      prisma.order.aggregate({
        where: { paymentStatus: 'paid' },
        _sum: { total: true },
      }),
      prisma.business.groupBy({
        by: ['plan'],
        _count: true,
      }),
      prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      prisma.business.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ])

    return {
      businesses: {
        total: totalBusinesses,
        active: activeBusinesses,
        byPlan: businessesByPlan.map((b: { plan: Plan; _count: number }) => ({ plan: b.plan, count: b._count })),
        recentSignups,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        byRole: usersByRole.map((u: { role: Role; _count: number }) => ({ role: u.role, count: u._count })),
      },
      contacts: {
        total: totalContacts,
      },
      messages: {
        total: totalMessages,
      },
      campaigns: {
        total: totalCampaigns,
      },
      orders: {
        total: totalOrders,
        revenue: totalRevenue._sum.total || 0,
      },
    }
  }

  static async getBusinessDetails(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            contacts: true,
            campaigns: true,
            appointments: true,
            reviews: true,
          },
        },
      },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    return business
  }

  static async getUserDetails(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            plan: true,
            isActive: true,
          },
        },
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    return user
  }

  static async deactivateUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('User not found')
    }

    return prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    })
  }

  static async activateUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('User not found')
    }

    return prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    })
  }

  static async updateBusinessPlan(businessId: string, plan: Plan) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    const PLAN_LIMITS: Record<Plan, { contacts: number; messages: number; users: number; aiCredits: number }> = {
      FREE: { contacts: 500, messages: 1000, users: 1, aiCredits: 100 },
      STARTER: { contacts: 2500, messages: 5000, users: 3, aiCredits: 500 },
      GROWTH: { contacts: 10000, messages: 25000, users: 10, aiCredits: 2000 },
      PRO: { contacts: 50000, messages: 100000, users: 25, aiCredits: 10000 },
      AGENCY: { contacts: 200000, messages: 500000, users: 100, aiCredits: 50000 },
    }

    const limits = PLAN_LIMITS[plan]

    return prisma.business.update({
      where: { id: businessId },
      data: {
        plan,
        contactsLimit: limits.contacts,
        messagesLimit: limits.messages,
        usersLimit: limits.users,
        aiCreditsLimit: limits.aiCredits,
      },
    })
  }

  static async deleteBusiness(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    await prisma.business.delete({
      where: { id: businessId },
    })

    logger.info('Business deleted by superadmin', { businessId })
    return { success: true }
  }
}
