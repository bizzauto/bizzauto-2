import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'
import { z } from 'zod'
import OpenAI from 'openai'

const generateContentSchema = z.object({
  prompt: z.string().min(1),
  type: z.enum(['text', 'social_post', 'email', 'ad_copy', 'product_description', 'blog', 'whatsapp_message', 'campaign_content', 'reply']),
  model: z.enum(['openrouter', 'ollama', 'grok']).optional(),
  maxTokens: z.number().min(1).max(4096).default(1024),
  temperature: z.number().min(0).max(2).default(0.7),
  systemPrompt: z.string().optional(),
  context: z.string().optional(),
})

const AI_PROVIDERS = {
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: env.OPENROUTER_API_KEY || '',
    model: 'meta-llama/llama-3.3-70b-instruct',
  },
  ollama: {
    baseUrl: env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
    apiKey: 'ollama',
    model: 'llama3',
  },
  grok: {
    baseUrl: 'https://api.x.ai/v1',
    apiKey: env.GROK_API_KEY || '',
    model: 'grok-2-latest',
  },
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export class AIService {
  private static getClient(provider: 'openrouter' | 'ollama' | 'grok'): OpenAI | null {
    const config = AI_PROVIDERS[provider]

    if (!config.apiKey && provider !== 'ollama') {
      return null
    }

    return new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    })
  }

  static async generateContent(
    userId: string,
    businessId: string,
    data: z.infer<typeof generateContentSchema>
  ) {
    const validated = generateContentSchema.parse(data)

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { aiCreditsUsed: true, aiCreditsLimit: true, aiCreditsPurchased: true },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    const totalLimit = business.aiCreditsLimit + business.aiCreditsPurchased
    if (business.aiCreditsUsed >= totalLimit) {
      throw new Error('AI credit limit reached. Purchase more credits or upgrade your plan.')
    }

    const provider = validated.model || 'openrouter'
    const result = await this.tryGenerateWithFallback(validated, provider)

    const tokensUsed = estimateTokens(result.content) + estimateTokens(validated.prompt)

    await prisma.$transaction([
      prisma.aIContent.create({
        data: {
          userId,
          type: validated.type,
          prompt: validated.prompt,
          result: result.content,
          model: result.model,
          tokensUsed,
        },
      }),
      prisma.business.update({
        where: { id: businessId },
        data: {
          aiCreditsUsed: { increment: 1 },
        },
      }),
    ])

    logger.info('AI content generated', { userId, type: validated.type, model: result.model, tokensUsed })

    return {
      content: result.content,
      model: result.model,
      tokensUsed,
      provider: result.provider,
    }
  }

  static async generateContentWithoutTracking(
    data: z.infer<typeof generateContentSchema>
  ) {
    const validated = generateContentSchema.parse(data)
    const provider = validated.model || 'openrouter'
    return this.tryGenerateWithFallback(validated, provider)
  }

  static async estimateTokens(text: string) {
    return estimateTokens(text)
  }

  static async getUsage(userId: string, businessId: string) {
    const [content, business] = await Promise.all([
      prisma.aIContent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.business.findUnique({
        where: { id: businessId },
        select: {
          aiCreditsUsed: true,
          aiCreditsLimit: true,
          aiCreditsPurchased: true,
        },
      }),
    ])

    if (!business) {
      throw new Error('Business not found')
    }

    const totalLimit = business.aiCreditsLimit + business.aiCreditsPurchased
    const tokensTotal = content.reduce((sum: number, c: { tokensUsed: number }) => sum + c.tokensUsed, 0)

    return {
      credits: {
        used: business.aiCreditsUsed,
        limit: totalLimit,
        remaining: totalLimit - business.aiCreditsUsed,
        purchased: business.aiCreditsPurchased,
      },
      tokens: {
        total: tokensTotal,
        averagePerRequest: content.length > 0 ? Math.round(tokensTotal / content.length) : 0,
      },
      history: content,
      totalRequests: content.length,
    }
  }

  static async getFavoriteContent(userId: string) {
    return prisma.aIContent.findMany({
      where: { userId, isFavorite: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  static async toggleFavorite(contentId: string, userId: string) {
    const content = await prisma.aIContent.findFirst({
      where: { id: contentId, userId },
    })

    if (!content) {
      throw new Error('Content not found')
    }

    return prisma.aIContent.update({
      where: { id: contentId },
      data: { isFavorite: !content.isFavorite },
    })
  }

  static async rateContent(contentId: string, userId: string, rating: number) {
    const content = await prisma.aIContent.findFirst({
      where: { id: contentId, userId },
    })

    if (!content) {
      throw new Error('Content not found')
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5')
    }

    return prisma.aIContent.update({
      where: { id: contentId },
      data: { rating },
    })
  }

  static async deleteContent(contentId: string, userId: string) {
    const content = await prisma.aIContent.findFirst({
      where: { id: contentId, userId },
    })

    if (!content) {
      throw new Error('Content not found')
    }

    await prisma.aIContent.delete({
      where: { id: contentId },
    })

    return { success: true }
  }

  private static async tryGenerateWithFallback(
    data: z.infer<typeof generateContentSchema>,
    primaryProvider: 'openrouter' | 'ollama' | 'grok'
  ): Promise<{ content: string; model: string; provider: string }> {
    const providers: Array<'openrouter' | 'ollama' | 'grok'> = [primaryProvider]

    if (primaryProvider !== 'openrouter') providers.unshift('openrouter')
    if (primaryProvider !== 'ollama') providers.push('ollama')
    if (primaryProvider !== 'grok') providers.push('grok')

    const uniqueProviders = [...new Set(providers)]

    for (const provider of uniqueProviders) {
      try {
        const result = await this.generateWithProvider(data, provider)
        if (result) return result
      } catch (error) {
        logger.warn(`AI provider ${provider} failed, trying next`, { error })
        continue
      }
    }

    throw new Error('All AI providers failed. Please try again later.')
  }

  private static async generateWithProvider(
    data: z.infer<typeof generateContentSchema>,
    provider: 'openrouter' | 'ollama' | 'grok'
  ): Promise<{ content: string; model: string; provider: string } | null> {
    const client = this.getClient(provider)
    if (!client) return null

    const config = AI_PROVIDERS[provider]

    const systemPrompt = data.systemPrompt || this.getDefaultSystemPrompt(data.type)

    const userPrompt = data.context
      ? `Context: ${data.context}\n\nTask: ${data.prompt}`
      : data.prompt

    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: data.maxTokens,
      temperature: data.temperature,
    })

    const content = response.choices[0]?.message?.content || ''

    if (!content) {
      throw new Error('Empty response from AI provider')
    }

    return {
      content,
      model: config.model,
      provider,
    }
  }

  private static getDefaultSystemPrompt(type: string): string {
    const prompts: Record<string, string> = {
      text: 'You are a helpful AI assistant. Provide clear, concise, and accurate responses.',
      social_post: 'You are a social media expert. Create engaging, platform-optimized social media posts that drive engagement.',
      email: 'You are an email marketing specialist. Write professional, compelling emails with clear CTAs.',
      ad_copy: 'You are a copywriting expert. Write persuasive ad copy that converts. Keep it concise and impactful.',
      product_description: 'You are an e-commerce copywriter. Write compelling product descriptions that highlight benefits and features.',
      blog: 'You are a content writer. Write well-structured, informative blog posts with proper headings and engaging content.',
      whatsapp_message: 'You are a WhatsApp messaging expert. Write concise, friendly messages optimized for WhatsApp. Keep it under 500 characters.',
      campaign_content: 'You are a campaign strategist. Create compelling campaign content that drives action and engagement.',
      reply: 'You are a customer support assistant. Write professional, empathetic replies to customer messages.',
    }

    return prompts[type] || prompts.text
  }
}
