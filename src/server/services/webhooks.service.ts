import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'
import { z } from 'zod'
import { createHmac, timingSafeEqual } from 'crypto'

const webhookCreateSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().min(16).optional(),
})

const webhookUpdateSchema = webhookCreateSchema.partial()

function generateSecret(): string {
  return createHmac('sha256', Date.now().toString()).update(Math.random().toString()).digest('hex')
}

export class WebhooksService {
  static async getById(webhookId: string, businessId: string) {
    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, businessId },
    })

    if (!webhook) {
      throw new Error('Webhook not found')
    }

    return webhook
  }

  static async create(businessId: string, data: z.infer<typeof webhookCreateSchema>) {
    const validated = webhookCreateSchema.parse(data)

    const secret = validated.secret || generateSecret()

    const webhook = await prisma.webhook.create({
      data: {
        businessId,
        url: validated.url,
        events: validated.events as any,
        secret,
      },
    })

    logger.info('Webhook created', { webhookId: webhook.id, businessId })
    return webhook
  }

  static async update(webhookId: string, businessId: string, data: z.infer<typeof webhookUpdateSchema>) {
    const validated = webhookUpdateSchema.parse(data)

    const existing = await prisma.webhook.findFirst({
      where: { id: webhookId, businessId },
    })

    if (!existing) {
      throw new Error('Webhook not found')
    }

    const updated = await prisma.webhook.update({
      where: { id: webhookId },
      data: validated,
    })

    logger.info('Webhook updated', { webhookId })
    return updated
  }

  static async delete(webhookId: string, businessId: string) {
    const existing = await prisma.webhook.findFirst({
      where: { id: webhookId, businessId },
    })

    if (!existing) {
      throw new Error('Webhook not found')
    }

    await prisma.webhook.delete({
      where: { id: webhookId },
    })

    logger.info('Webhook deleted', { webhookId })
    return { success: true }
  }

  static async list(businessId: string) {
    return prisma.webhook.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    })
  }

  static async toggleActive(webhookId: string, businessId: string) {
    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, businessId },
    })

    if (!webhook) {
      throw new Error('Webhook not found')
    }

    return prisma.webhook.update({
      where: { id: webhookId },
      data: { isActive: !webhook.isActive },
    })
  }

  static async triggerWebhook(webhookId: string, event: string, payload: Record<string, unknown>) {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    })

    if (!webhook) {
      throw new Error('Webhook not found')
    }

    if (!webhook.isActive) {
      throw new Error('Webhook is not active')
    }

    const events = webhook.events as unknown as string[]
    if (!events.includes(event)) {
      return { delivered: false, reason: 'Event not subscribed' }
    }

    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    })

    const signature = createHmac('sha256', webhook.secret)
      .update(body)
      .digest('hex')

    try {
      const axios = await import('axios')
      const response = await axios.default.post(webhook.url, JSON.parse(body), {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': event,
        },
        timeout: 10000,
      })

      logger.info('Webhook delivered', { webhookId, event, status: response.status })
      return { delivered: true, status: response.status }
    } catch (error) {
      logger.error('Webhook delivery failed', { webhookId, event, error })
      throw new Error(`Webhook delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  static async triggerEvent(businessId: string, event: string, payload: Record<string, unknown>) {
    const webhooks = await prisma.webhook.findMany({
      where: {
        businessId,
        isActive: true,
      },
    })

    const results: Array<{ webhookId: string; delivered: boolean; error?: string }> = []

    for (const webhook of webhooks) {
      try {
        const result = await this.triggerWebhook(webhook.id, event, payload)
        results.push({ webhookId: webhook.id, delivered: result.delivered })
      } catch (error) {
        results.push({
          webhookId: webhook.id,
          delivered: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return results
  }

  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    try {
      return timingSafeEqual(
        Buffer.from(`sha256=${expectedSignature}`),
        Buffer.from(signature)
      )
    } catch {
      return false
    }
  }
}
