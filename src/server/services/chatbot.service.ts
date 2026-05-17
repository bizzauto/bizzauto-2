import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'
import { z } from 'zod'

const chatbotFlowCreateSchema = z.object({
  name: z.string().min(1),
  trigger: z.enum(['keyword', 'button', 'ai', 'welcome']).default('keyword'),
  keywords: z.array(z.string()).default([]),
  triggerValue: z.string().optional(),
  response: z.string().min(1),
  aiEnabled: z.boolean().default(false),
  nodes: z.array(z.record(z.string(), z.unknown())).optional(),
  edges: z.array(z.record(z.string(), z.unknown())).optional(),
  flowData: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().default(true),
})

const chatbotFlowUpdateSchema = chatbotFlowCreateSchema.partial()

export class ChatbotService {
  static async getById(flowId: string, businessId: string) {
    const flow = await prisma.chatbotFlow.findFirst({
      where: { id: flowId, businessId },
    })

    if (!flow) {
      throw new Error('Chatbot flow not found')
    }

    return flow
  }

  static async create(businessId: string, data: z.infer<typeof chatbotFlowCreateSchema>) {
    const validated = chatbotFlowCreateSchema.parse(data)

    const flow = await prisma.chatbotFlow.create({
      data: {
        businessId,
        name: validated.name,
        trigger: validated.trigger,
        keywords: validated.keywords,
        triggerValue: validated.triggerValue,
        response: validated.response,
        aiEnabled: validated.aiEnabled,
        nodes: validated.nodes as any,
        edges: validated.edges as any,
        flowData: validated.flowData as any,
        isActive: validated.isActive,
      },
    })

    logger.info('Chatbot flow created', { flowId: flow.id, businessId })
    return flow
  }

  static async update(flowId: string, businessId: string, data: z.infer<typeof chatbotFlowUpdateSchema>) {
    const validated = chatbotFlowUpdateSchema.parse(data)

    const existing = await prisma.chatbotFlow.findFirst({
      where: { id: flowId, businessId },
    })

    if (!existing) {
      throw new Error('Chatbot flow not found')
    }

    const updated = await prisma.chatbotFlow.update({
      where: { id: flowId },
      data: validated as any,
    })

    logger.info('Chatbot flow updated', { flowId })
    return updated
  }

  static async delete(flowId: string, businessId: string) {
    const existing = await prisma.chatbotFlow.findFirst({
      where: { id: flowId, businessId },
    })

    if (!existing) {
      throw new Error('Chatbot flow not found')
    }

    await prisma.chatbotFlow.delete({
      where: { id: flowId },
    })

    logger.info('Chatbot flow deleted', { flowId })
    return { success: true }
  }

  static async list(businessId: string, isActive?: boolean) {
    const where: Record<string, unknown> = { businessId }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    return prisma.chatbotFlow.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
  }

  static async toggleActive(flowId: string, businessId: string) {
    const flow = await prisma.chatbotFlow.findFirst({
      where: { id: flowId, businessId },
    })

    if (!flow) {
      throw new Error('Chatbot flow not found')
    }

    return prisma.chatbotFlow.update({
      where: { id: flowId },
      data: { isActive: !flow.isActive },
    })
  }

  static async executeFlow(businessId: string, message: string, contactId?: string) {
    const flows = await prisma.chatbotFlow.findMany({
      where: {
        businessId,
        isActive: true,
      },
    })

    const matchedFlow = this.matchKeyword(flows, message)

    if (matchedFlow) {
      if (matchedFlow.aiEnabled) {
        const aiResponse = await this.generateAIResponse(matchedFlow, message, businessId)
        return {
          flow: matchedFlow,
          response: aiResponse,
          matched: true,
        }
      }

      return {
        flow: matchedFlow,
        response: matchedFlow.response,
        matched: true,
      }
    }

    const welcomeFlow = flows.find((f: { trigger: string; isActive: boolean }) => f.trigger === 'welcome' && f.isActive)

    if (welcomeFlow) {
      return {
        flow: welcomeFlow,
        response: welcomeFlow.response,
        matched: true,
      }
    }

    return {
      flow: null,
      response: null,
      matched: false,
    }
  }

  static async matchKeywords(businessId: string, message: string) {
    const flows = await prisma.chatbotFlow.findMany({
      where: {
        businessId,
        isActive: true,
        trigger: 'keyword',
      },
    })

    return this.matchKeyword(flows, message)
  }

  static async getWelcomeMessage(businessId: string) {
    const flow = await prisma.chatbotFlow.findFirst({
      where: {
        businessId,
        trigger: 'welcome',
        isActive: true,
      },
    })

    return flow?.response || null
  }

  static async generateAIResponse(flow: { id: string; response: string; aiEnabled: boolean }, message: string, businessId: string): Promise<string> {
    try {
      const AIService = await import('./ai.service')

      const systemPrompt = `You are a chatbot for a business. Use this context: ${flow.response}. Respond to the user's message: ${message}`

      const result = await AIService.AIService.generateContentWithoutTracking({
        prompt: message,
        type: 'reply',
        systemPrompt,
        maxTokens: 512,
        temperature: 0.7,
      })

      return result.content
    } catch (error) {
      logger.error('AI response generation failed', { flowId: flow.id, error })
      return flow.response
    }
  }

  private static matchKeyword(flows: Array<{ keywords: unknown; triggerValue: unknown; trigger: string; isActive: boolean; response: string; id: string; aiEnabled: boolean; name: string }>, message: string) {
    const lowerMessage = message.toLowerCase()

    for (const flow of flows) {
      if (!flow.isActive) continue

      if (flow.trigger === 'keyword') {
        const keywords = flow.keywords as string[] | undefined
        if (keywords && keywords.length > 0) {
          for (const keyword of keywords) {
            if (lowerMessage.includes(keyword.toLowerCase())) {
              return flow
            }
          }
        }
      }

      if (flow.trigger === 'button' && flow.triggerValue) {
        if (lowerMessage === (flow.triggerValue as string).toLowerCase()) {
          return flow
        }
      }
    }

    return null
  }
}
