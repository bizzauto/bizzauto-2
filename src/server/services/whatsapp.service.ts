import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'
import { z } from 'zod'
import axios from 'axios'

const sendMessageSchema = z.object({
  contactPhone: z.string(),
  content: z.string(),
  type: z.enum(['text', 'image', 'video', 'document', 'audio']).default('text'),
  mediaUrl: z.string().optional(),
  templateName: z.string().optional(),
  templateLanguage: z.string().default('en').optional(),
  templateParams: z.array(z.string()).optional(),
})

const processMessageSchema = z.object({
  from: z.string(),
  type: z.string().default('text'),
  text: z.object({ body: z.string() }).optional(),
  image: z.object({ url: z.string(), mime_type: z.string().optional(), caption: z.string().optional() }).optional(),
  video: z.object({ url: z.string(), mime_type: z.string().optional(), caption: z.string().optional() }).optional(),
  document: z.object({ url: z.string(), filename: z.string().optional(), caption: z.string().optional() }).optional(),
  audio: z.object({ url: z.string(), mime_type: z.string().optional() }).optional(),
  button: z.object({ payload: z.string(), text: z.string() }).optional(),
  interactive: z.object({ type: z.string(), button_reply: z.object({ id: z.string(), title: z.string() }).optional(), list_reply: z.object({ id: z.string(), title: z.string() }).optional() }).optional(),
  timestamp: z.string().optional(),
})

export class WhatsAppService {
  static getApiUrl(businessId: string): string {
    return env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0'
  }

  static async getBusinessWhatsApp(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        waPhoneNumberId: true,
        waAccessToken: true,
        waWebhookSecret: true,
        waPhoneNumber: true,
        wabaId: true,
        autoReplyEnabled: true,
        autoReplyMessage: true,
      },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    if (!business.waPhoneNumberId || !business.waAccessToken) {
      throw new Error('WhatsApp not configured for this business')
    }

    return business
  }

  static async sendTextMessage(businessId: string, contactPhone: string, content: string) {
    const business = await this.getBusinessWhatsApp(businessId)

    const response = await axios.post(
      `${this.getApiUrl(businessId)}/${business.waPhoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: contactPhone,
        type: 'text',
        text: { body: content },
      },
      {
        headers: {
          Authorization: `Bearer ${business.waAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const messageId = response.data?.messages?.[0]?.id

    logger.info('WhatsApp text message sent', { businessId, contactPhone, messageId })
    return { messageId, ...response.data }
  }

  static async sendTemplateMessage(
    businessId: string,
    contactPhone: string,
    templateName: string,
    language = 'en',
    params: string[] = []
  ) {
    const business = await this.getBusinessWhatsApp(businessId)

    const components = params.length > 0
      ? [{
          type: 'body',
          parameters: params.map((p) => ({ type: 'text', text: p })),
        }]
      : undefined

    const response = await axios.post(
      `${this.getApiUrl(businessId)}/${business.waPhoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: contactPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language },
          ...(components ? { components } : {}),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${business.waAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const messageId = response.data?.messages?.[0]?.id

    logger.info('WhatsApp template message sent', { businessId, contactPhone, templateName, messageId })
    return { messageId, ...response.data }
  }

  static async sendMediaMessage(
    businessId: string,
    contactPhone: string,
    type: 'image' | 'video' | 'document' | 'audio',
    mediaUrl: string,
    caption?: string
  ) {
    const business = await this.getBusinessWhatsApp(businessId)

    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      to: contactPhone,
      type,
    }

    if (type === 'image') {
      payload.image = { link: mediaUrl, ...(caption ? { caption } : {}) }
    } else if (type === 'video') {
      payload.video = { link: mediaUrl, ...(caption ? { caption } : {}) }
    } else if (type === 'document') {
      payload.document = { link: mediaUrl, ...(caption ? { caption } : {}) }
    } else if (type === 'audio') {
      payload.audio = { link: mediaUrl }
    }

    const response = await axios.post(
      `${this.getApiUrl(businessId)}/${business.waPhoneNumberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${business.waAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const messageId = response.data?.messages?.[0]?.id

    logger.info('WhatsApp media message sent', { businessId, contactPhone, type, messageId })
    return { messageId, ...response.data }
  }

  static async verifyWebhook(mode: string, token: string, challenge: string, secret: string) {
    const verifyToken = env.WHATSAPP_API_KEY || 'default_verify_token'

    if (mode === 'subscribe' && token === verifyToken) {
      logger.info('WhatsApp webhook verified')
      return challenge
    }

    throw new Error('Webhook verification failed')
  }

  static async processIncomingMessage(businessId: string, payload: z.infer<typeof processMessageSchema>) {
    const validated = processMessageSchema.parse(payload)

    const contactPhone = validated.from
    const messageType = validated.type
    let content = ''

    if (messageType === 'text' && validated.text) {
      content = validated.text.body
    } else if (messageType === 'image' && validated.image) {
      content = validated.image.caption || ''
    } else if (messageType === 'video' && validated.video) {
      content = validated.video.caption || ''
    } else if (messageType === 'document' && validated.document) {
      content = validated.document.caption || ''
    } else if (messageType === 'button' && validated.button) {
      content = validated.button.payload
    } else if (messageType === 'interactive' && validated.interactive) {
      if (validated.interactive.button_reply) {
        content = validated.interactive.button_reply.title
      } else if (validated.interactive.list_reply) {
        content = validated.interactive.list_reply.title
      }
    }

    let contact = await prisma.contact.findFirst({
      where: { businessId, phone: contactPhone },
    })

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          businessId,
          name: contactPhone,
          phone: contactPhone,
          source: 'whatsapp',
          status: 'active',
        },
      })
    }

    const message = await prisma.message.create({
      data: {
        contactId: contact.id,
        businessId,
        direction: 'inbound',
        type: messageType,
        content,
        mediaUrl: validated.image?.url || validated.video?.url || validated.document?.url || validated.audio?.url,
        mediaType: validated.image?.mime_type || validated.video?.mime_type || validated.audio?.mime_type,
        status: 'delivered',
        statusUpdatedAt: new Date(),
      },
    })

    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        lastMessageAt: new Date(),
        lastActivity: new Date(),
      },
    })

    const autoReply = await this.checkAutoReply(businessId, content)

    return {
      message,
      contact,
      autoReply,
    }
  }

  static async getConversationHistory(contactId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { contactId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.message.count({ where: { contactId } }),
    ])

    return {
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  static async checkAutoReply(businessId: string, messageContent: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { autoReplyEnabled: true, autoReplyMessage: true },
    })

    if (!business?.autoReplyEnabled || !business.autoReplyMessage) {
      return null
    }

    const autoReplyRule = await prisma.autoReply.findFirst({
      where: {
        businessId,
        isActive: true,
      },
    })

    if (autoReplyRule) {
      const matched = this.matchAutoReplyKeyword(autoReplyRule.keyword, messageContent, autoReplyRule.matchType)
      if (matched) {
        return autoReplyRule.response
      }
    }

    return business.autoReplyMessage
  }

  static async updateMessageStatus(waMessageId: string, status: string) {
    await prisma.message.updateMany({
      where: { waMessageId },
      data: {
        status,
        statusUpdatedAt: new Date(),
      },
    })
  }

  static async updateMessageError(waMessageId: string, errorCode: string, errorMessage: string) {
    await prisma.message.updateMany({
      where: { waMessageId },
      data: {
        status: 'failed',
        errorCode,
        errorMessage,
        statusUpdatedAt: new Date(),
      },
    })
  }

  static async sendMessageRecord(
    contactId: string,
    businessId: string,
    data: {
      direction: string
      type: string
      content?: string
      mediaUrl?: string
      mediaType?: string
      templateName?: string
      templateLanguage?: string
      templateParams?: Record<string, unknown>
      campaignId?: string
      waMessageId?: string
    }
  ) {
    return prisma.message.create({
      data: {
        contactId,
        businessId,
        direction: data.direction,
        type: data.type,
        content: data.content,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        templateName: data.templateName,
        templateLanguage: data.templateLanguage,
        templateParams: data.templateParams as any,
        campaignId: data.campaignId,
        waMessageId: data.waMessageId,
        status: 'sent',
        statusUpdatedAt: new Date(),
      },
    })
  }

  private static matchAutoReplyKeyword(keyword: string, message: string, matchType: string): boolean {
    const lowerKeyword = keyword.toLowerCase()
    const lowerMessage = message.toLowerCase()

    if (matchType === 'exact') {
      return lowerMessage === lowerKeyword
    }

    if (matchType === 'contains') {
      return lowerMessage.includes(lowerKeyword)
    }

    if (matchType === 'starts_with') {
      return lowerMessage.startsWith(lowerKeyword)
    }

    return false
  }
}
