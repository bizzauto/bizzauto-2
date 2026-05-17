import { Router } from 'express'
import { z } from 'zod'
import { WhatsAppService } from '../services/whatsapp.service'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validateBody, validateParams, validateQuery } from '../middleware/validation'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response'
import { createAuditLog } from '../utils/audit'
import { prisma } from '../config/database'

const router = Router()

const sendTextSchema = z.object({
  contactPhone: z.string().min(1),
  content: z.string().min(1),
})

const sendTemplateSchema = z.object({
  contactPhone: z.string().min(1),
  templateName: z.string().min(1),
  language: z.string().default('en'),
  params: z.array(z.string()).default([]),
})

const sendMediaSchema = z.object({
  contactPhone: z.string().min(1),
  type: z.enum(['image', 'video', 'document', 'audio']),
  mediaUrl: z.string().url(),
  caption: z.string().optional(),
})

const autoReplySchema = z.object({
  enabled: z.boolean(),
  message: z.string().optional(),
})

const templateCreateSchema = z.object({
  name: z.string().min(1),
  language: z.string().default('en'),
  category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']),
  components: z.array(z.record(z.string(), z.unknown())),
})

const idParamSchema = z.object({
  id: z.string().uuid(),
})

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
})

router.get('/qr', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: {
        waPhoneNumberId: true,
        waAccessToken: true,
        waPhoneNumber: true,
        wabaId: true,
      },
    })

    if (!business) {
      return errorResponse(res, 'Business not found', 404)
    }

    const isConnected = !!(business.waPhoneNumberId && business.waAccessToken)

    successResponse(res, {
      isConnected,
      phoneNumberId: business.waPhoneNumberId,
      phoneNumber: business.waPhoneNumber,
      wabaId: business.wabaId,
    })
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/send/text', authenticate, validateBody(sendTextSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { contactPhone, content } = req.body
    const result = await WhatsAppService.sendTextMessage(req.user.businessId, contactPhone, content)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'create',
      entity: 'message',
      description: `WhatsApp text sent to ${contactPhone}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Message sent')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/send/template', authenticate, validateBody(sendTemplateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { contactPhone, templateName, language, params } = req.body
    const result = await WhatsAppService.sendTemplateMessage(req.user.businessId, contactPhone, templateName, language, params)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'create',
      entity: 'message',
      description: `WhatsApp template sent to ${contactPhone}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Template message sent')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/send/media', authenticate, validateBody(sendMediaSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { contactPhone, type, mediaUrl, caption } = req.body
    const result = await WhatsAppService.sendMediaMessage(req.user.businessId, contactPhone, type, mediaUrl, caption)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'create',
      entity: 'message',
      description: `WhatsApp ${type} sent to ${contactPhone}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Media message sent')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/messages/:contactId', authenticate, validateParams(z.object({ contactId: z.string() })), validateQuery(paginationQuerySchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { contactId } = req.params
    const { page, limit } = req.query

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, businessId: req.user.businessId },
    })

    if (!contact) {
      return errorResponse(res, 'Contact not found', 404)
    }

    const result = await WhatsAppService.getConversationHistory(contactId, page, limit)
    paginatedResponse(res, result.messages, result.pagination.total, result.pagination.page, result.pagination.limit)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/webhook', async (req, res) => {
  try {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query

    if (!mode || !token) {
      return res.status(400).send('Missing parameters')
    }

    const secret = process.env.WHATSAPP_WEBHOOK_SECRET || 'default_verify_token'
    const result = await WhatsAppService.verifyWebhook(mode as string, token as string, challenge as string, secret)
    res.send(result)
  } catch (error: any) {
    res.status(403).send('Verification failed')
  }
})

router.post('/webhook', async (req, res) => {
  try {
    const body = req.body

    if (body.object === 'whatsapp_business_account' && body.entry) {
      for (const entry of body.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'messages' && change.value?.messages) {
              const businessId = entry.id

              for (const message of change.value.messages) {
                await WhatsAppService.processIncomingMessage(businessId, {
                  from: message.from,
                  type: message.type || 'text',
                  text: message.text,
                  image: message.image,
                  video: message.video,
                  document: message.document,
                  audio: message.audio,
                  button: message.button,
                  interactive: message.interactive,
                  timestamp: message.timestamp,
                })
              }
            }

            if (change.field === 'messages' && change.value?.statuses) {
              for (const status of change.value.statuses) {
                if (status.id) {
                  await WhatsAppService.updateMessageStatus(status.id, status.status)
                }
              }
            }
          }
        }
      }
    }

    res.status(200).send('EVENT_RECEIVED')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/templates', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { wabaId: true, waAccessToken: true },
    })

    if (!business?.wabaId || !business?.waAccessToken) {
      return errorResponse(res, 'WhatsApp not configured', 400)
    }

    const axios = await import('axios')
    const response = await axios.default.get(
      `https://graph.facebook.com/v18.0/${business.wabaId}/message_templates`,
      {
        headers: {
          Authorization: `Bearer ${business.waAccessToken}`,
        },
      }
    )

    successResponse(res, response.data.data || [])
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/templates', authenticate, validateBody(templateCreateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { wabaId: true, waAccessToken: true },
    })

    if (!business?.wabaId || !business?.waAccessToken) {
      return errorResponse(res, 'WhatsApp not configured', 400)
    }

    const { name, language, category, components } = req.body

    const axios = await import('axios')
    const response = await axios.default.post(
      `https://graph.facebook.com/v18.0/${business.wabaId}/message_templates`,
      {
        name,
        language,
        category,
        components,
      },
      {
        headers: {
          Authorization: `Bearer ${business.waAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    successResponse(res, response.data, 'Template created', 201)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/auto-reply', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { autoReplyEnabled: true, autoReplyMessage: true },
    })

    if (!business) {
      return errorResponse(res, 'Business not found', 404)
    }

    successResponse(res, {
      enabled: business.autoReplyEnabled,
      message: business.autoReplyMessage,
    })
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/auto-reply', authenticate, validateBody(autoReplySchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { enabled, message } = req.body
    const result = await WhatsAppService.checkAutoReply(req.user.businessId, '')

    const updated = await prisma.business.update({
      where: { id: req.user.businessId },
      data: {
        autoReplyEnabled: enabled,
        autoReplyMessage: message !== undefined ? message : undefined,
      },
    })

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'auto_reply',
      description: `Auto-reply ${enabled ? 'enabled' : 'disabled'}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, { enabled: updated.autoReplyEnabled, message: updated.autoReplyMessage }, 'Auto-reply updated')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

export default router
