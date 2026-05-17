import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'
import { z } from 'zod'
import { Role } from '@prisma/client'

const userCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional(),
  role: z.nativeEnum(Role),
})

const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
})

export class UserService {
  static async getById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        businessId: true,
        emailVerified: true,
        avatar: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        twoFactorEnabled: true,
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    return user
  }

  static async create(businessId: string, data: z.infer<typeof userCreateSchema>) {
    const validated = userCreateSchema.parse(data)

    const existing = await prisma.user.findUnique({
      where: { email: validated.email },
    })

    if (existing) {
      throw new Error('User with this email already exists')
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    const userCount = await prisma.user.count({
      where: { businessId, isActive: true },
    })

    if (userCount >= business.usersLimit) {
      throw new Error(`User limit reached. Current plan allows ${business.usersLimit} users.`)
    }

    const user = await prisma.user.create({
      data: {
        email: validated.email,
        name: validated.name,
        phone: validated.phone,
        role: validated.role,
        businessId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        businessId: true,
        isActive: true,
        createdAt: true,
      },
    })

    logger.info('User created', { userId: user.id, businessId })
    return user
  }

  static async update(userId: string, data: z.infer<typeof userUpdateSchema>) {
    const validated = userUpdateSchema.parse(data)

    const existing = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!existing) {
      throw new Error('User not found')
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: validated,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        businessId: true,
        isActive: true,
        updatedAt: true,
      },
    })

    logger.info('User updated', { userId })
    return updated
  }

  static async delete(userId: string) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!existing) {
      throw new Error('User not found')
    }

    await prisma.user.delete({
      where: { id: userId },
    })

    logger.info('User deleted', { userId })
    return { success: true }
  }

  static async inviteMember(businessId: string, email: string, role: Role) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      if (existingUser.businessId === businessId) {
        throw new Error('User is already a member of this business')
      }

      await prisma.user.update({
        where: { id: existingUser.id },
        data: { businessId, role },
      })

      logger.info('Existing user added to business', { userId: existingUser.id, businessId })
      return { user: existingUser, isNew: false }
    }

    const userCount = await prisma.user.count({
      where: { businessId, isActive: true },
    })

    if (userCount >= business.usersLimit) {
      throw new Error(`User limit reached. Current plan allows ${business.usersLimit} users.`)
    }

    const newUser = await prisma.user.create({
      data: {
        email,
        role,
        businessId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        businessId: true,
        createdAt: true,
      },
    })

    logger.info('New user invited', { userId: newUser.id, businessId })
    return { user: newUser, isNew: true }
  }

  static async updateRole(userId: string, newRole: Role) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!existing) {
      throw new Error('User not found')
    }

    if (existing.role === Role.OWNER && newRole !== Role.OWNER) {
      throw new Error('Cannot change role of the business owner')
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

    logger.info('User role updated', { userId, newRole })
    return updated
  }

  static async removeMember(userId: string) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!existing) {
      throw new Error('User not found')
    }

    if (existing.role === Role.OWNER) {
      throw new Error('Cannot remove the business owner')
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        businessId: null,
        role: Role.MEMBER,
      },
    })

    logger.info('Member removed from business', { userId })
    return { success: true }
  }

  static async listTeamMembers(businessId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { businessId },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          emailVerified: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({
        where: { businessId },
      }),
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

  static async getByEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        businessId: true,
        isActive: true,
        emailVerified: true,
        twoFactorEnabled: true,
      },
    })

    return user
  }

  static async listByBusiness(businessId: string) {
    return prisma.user.findMany({
      where: { businessId, isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    })
  }
}
