import { Router } from 'express'
import { z } from 'zod'
import { AIService } from '../services/ai.service'
import { BusinessService } from '../services/business.service'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validateBody, validateQuery } from '../middleware/validation'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response'
import { createAuditLog } from '../utils/audit'
import { prisma } from '../config/database'

const router = Router()

const generateSchema = z.object({
  prompt: z.string().min(1),
  type: z.enum(['text', 'social_post', 'email', 'ad_copy', 'product_description', 'blog', 'whatsapp_message', 'campaign_content', 'reply']),
  model: z.enum(['openrouter', 'ollama', 'grok']).optional(),
  maxTokens: z.number().int().min(1).max(4096).default(1024),
  temperature: z.number().min(0).max(2).default(0.7),
  systemPrompt: z.string().optional(),
  context: z.string().optional(),
})

const hashtagsSchema = z.object({
  topic: z.string().min(1),
  count: z.number().int().min(1).max(30).default(10),
  platform: z.enum(['instagram', 'twitter', 'linkedin', 'facebook']).optional(),
})

const replySchema = z.object({
  message: z.string().min(1),
  context: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'friendly', 'formal']).default('professional'),
  language: z.string().default('en'),
})

const posterSchema = z.object({
  prompt: z.string().min(1),
  style: z.enum(['realistic', 'artistic', 'minimalist', 'vibrant', 'corporate']).default('realistic'),
  size: z.enum(['512x512', '1024x1024', '1792x1024', '1024x1792']).default('1024x1024'),
})

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

const creditsPurchaseSchema = z.object({
  amount: z.number().int().positive(),
  paymentMethod: z.string().optional(),
})

router.post('/generate', authenticate, validateBody(generateSchema), async (req, res) => {
  try {
    const authReq = req as AuthRequest
    if (!authReq.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await AIService.generateContent(authReq.user.id, authReq.user.businessId, req.body)

    await createAuditLog({
      businessId: authReq.user.businessId,
      action: 'create',
      entity: 'ai_content',
      description: `AI content generated: ${req.body.type}`,
      userId: authReq.user.id,
      userEmail: authReq.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Content generated')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/hashtags', authenticate, validateBody(hashtagsSchema), async (req, res) => {
  try {
    const authReq = req as AuthRequest
    if (!authReq.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { topic, count, platform } = req.body

    const platformContext = platform ? ` for ${platform}` : ''
    const prompt = `Generate ${count} relevant and trending hashtags${platformContext} for: ${topic}. Return only the hashtags separated by spaces, no explanations.`

    const result = await AIService.generateContent(authReq.user.id, authReq.user.businessId, {
      prompt,
      type: 'social_post',
      maxTokens: 256,
      temperature: 0.8,
    })

    const hashtags = result.content.trim().split(/\s+/).filter((h: string) => h.startsWith('#'))

    successResponse(res, { hashtags, count: hashtags.length })
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/reply', authenticate, validateBody(replySchema), async (req, res) => {
  try {
    const authReq = req as AuthRequest
    if (!authReq.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { message, context, tone, language } = req.body

    const systemPrompt = `You are a customer support assistant. Respond in a ${tone} tone in ${language}. Be professional, empathetic, and helpful.`

    const result = await AIService.generateContent(authReq.user.id, authReq.user.businessId, {
      prompt: message,
      type: 'reply',
      systemPrompt,
      context,
      maxTokens: 512,
      temperature: 0.7,
    })

    successResponse(res, { reply: result.content })
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/poster', authenticate, validateBody(posterSchema), async (req, res) => {
  try {
    const authReq = req as AuthRequest
    if (!authReq.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { prompt, style, size } = req.body

    const enhancedPrompt = `Create a ${style} poster image: ${prompt}. High quality, professional design.`

    const result = await AIService.generateContent(authReq.user.id, authReq.user.businessId, {
      prompt: enhancedPrompt,
      type: 'text',
      maxTokens: 512,
      temperature: 0.7,
      systemPrompt: 'You are an image prompt enhancer. Create detailed, vivid image generation prompts.',
    })

    await createAuditLog({
      businessId: authReq.user.businessId,
      action: 'create',
      entity: 'ai_content',
      description: `AI poster prompt generated`,
      userId: authReq.user.id,
      userEmail: authReq.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, { prompt: result.content, style, size }, 'Poster prompt generated')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/history', authenticate, validateQuery(paginationQuerySchema), async (req, res) => {
  try {
    const authReq = req as AuthRequest
    if (!authReq.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const page = req.query.page
    const limit = req.query.limit
    const skip = (page - 1) * limit

    const [history, total] = await Promise.all([
      prisma.aIContent.findMany({
        where: { userId: authReq.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.aIContent.count({
        where: { userId: authReq.user.id },
      }),
    ])

    paginatedResponse(res, history, total, page, limit)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/credits', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await AIService.getUsage(req.user.id, req.user.businessId)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/credits/purchase', authenticate, validateBody(creditsPurchaseSchema), async (req, res) => {
  try {
    const authReq = req as AuthRequest
    if (!authReq.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { amount } = req.body
    const result = await BusinessService.updateAICredits(authReq.user.businessId, amount)

    await createAuditLog({
      businessId: authReq.user.businessId,
      action: 'update',
      entity: 'ai_credits',
      description: `Purchased ${amount} AI credits`,
      userId: authReq.user.id,
      userEmail: authReq.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, { creditsPurchased: amount, aiCreditsPurchased: result.aiCreditsPurchased }, 'Credits purchased')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

export default router
