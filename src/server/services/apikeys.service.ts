import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'
import { z } from 'zod'
import { createHash, randomBytes } from 'crypto'

const apiKeyCreateSchema = z.object({
  name: z.string().min(1),
  permissions: z.array(z.string()).default(['read']),
  expiresAt: z.string().datetime().optional(),
})

const apiKeyUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().or(z.literal('')),
})

function generateApiKey(): { key: string; prefix: string } {
  const rawKey = randomBytes(32).toString('hex')
  const prefix = rawKey.substring(0, 8)
  const hashedKey = createHash('sha256').update(rawKey).digest('hex')
  return { key: rawKey, prefix: `ba_${prefix}` }
}

export class ApiKeysService {
  static async getById(apiKeyId: string, businessId: string) {
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: apiKeyId, businessId },
    })

    if (!apiKey) {
      throw new Error('API key not found')
    }

    return apiKey
  }

  static async create(businessId: string, userId: string, data: z.infer<typeof apiKeyCreateSchema>) {
    const validated = apiKeyCreateSchema.parse(data)

    const { key, prefix } = generateApiKey()

    const apiKey = await prisma.apiKey.create({
      data: {
        businessId,
        name: validated.name,
        key,
        prefix,
        permissions: validated.permissions as any,
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
        createdById: userId,
      },
    })

    logger.info('API key created', { apiKeyId: apiKey.id, businessId, prefix })

    return {
      ...apiKey,
      key,
    }
  }

  static async update(apiKeyId: string, businessId: string, data: z.infer<typeof apiKeyUpdateSchema>) {
    const validated = apiKeyUpdateSchema.parse(data)

    const existing = await prisma.apiKey.findFirst({
      where: { id: apiKeyId, businessId },
    })

    if (!existing) {
      throw new Error('API key not found')
    }

    const updateData: Record<string, unknown> = { ...validated }

    if (validated.expiresAt === '') {
      updateData.expiresAt = null
    }

    const updated = await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: updateData,
    })

    logger.info('API key updated', { apiKeyId })
    return updated
  }

  static async delete(apiKeyId: string, businessId: string) {
    const existing = await prisma.apiKey.findFirst({
      where: { id: apiKeyId, businessId },
    })

    if (!existing) {
      throw new Error('API key not found')
    }

    await prisma.apiKey.delete({
      where: { id: apiKeyId },
    })

    logger.info('API key deleted', { apiKeyId })
    return { success: true }
  }

  static async list(businessId: string) {
    return prisma.apiKey.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        permissions: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
    })
  }

  static async validateKey(key: string) {
    const hashedKey = createHash('sha256').update(key).digest('hex')

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        key: hashedKey,
        isActive: true,
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    })

    if (!apiKey) {
      return null
    }

    if (!apiKey.business?.isActive) {
      throw new Error('Business is not active')
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new Error('API key has expired')
    }

    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })

    return {
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        permissions: apiKey.permissions,
      },
      business: apiKey.business,
    }
  }

  static async trackUsage(apiKeyId: string, endpoint: string, method: string) {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: apiKeyId },
    })

    if (!apiKey) {
      throw new Error('API key not found')
    }

    await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { lastUsedAt: new Date() },
    })

    logger.info('API key usage tracked', { apiKeyId, endpoint, method })
  }

  static async revoke(apiKeyId: string, businessId: string) {
    const existing = await prisma.apiKey.findFirst({
      where: { id: apiKeyId, businessId },
    })

    if (!existing) {
      throw new Error('API key not found')
    }

    return prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { isActive: false },
    })
  }
}
