import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'
import { z } from 'zod'

const automationRuleCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  trigger: z.object({
    type: z.enum(['contact_created', 'contact_updated', 'message_received', 'order_created', 'appointment_created', 'review_received', 'tag_added', 'tag_removed', 'stage_changed', 'custom']),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(['equals', 'contains', 'starts_with', 'ends_with', 'gt', 'lt', 'gte', 'lte', 'in', 'not_in', 'exists']),
      value: z.unknown(),
    })).optional(),
  }),
  actions: z.array(z.object({
    type: z.enum(['send_message', 'send_email', 'add_tag', 'remove_tag', 'update_field', 'create_task', 'assign_to', 'move_stage', 'send_webhook', 'delay', 'ai_reply']),
    config: z.record(z.string(), z.unknown()),
  })),
})

const automationRuleUpdateSchema = automationRuleCreateSchema.partial()

export class AutomationService {
  static async getById(ruleId: string, businessId: string) {
    const rule = await prisma.automationRule.findFirst({
      where: { id: ruleId, businessId },
    })

    if (!rule) {
      throw new Error('Automation rule not found')
    }

    return rule
  }

  static async create(businessId: string, data: z.infer<typeof automationRuleCreateSchema>) {
    const validated = automationRuleCreateSchema.parse(data)

    const rule = await prisma.automationRule.create({
      data: {
        businessId,
        name: validated.name,
        description: validated.description,
        isActive: validated.isActive,
        trigger: validated.trigger as any,
        actions: validated.actions as any,
      },
    })

    logger.info('Automation rule created', { ruleId: rule.id, businessId })
    return rule
  }

  static async update(ruleId: string, businessId: string, data: z.infer<typeof automationRuleUpdateSchema>) {
    const validated = automationRuleUpdateSchema.parse(data)

    const existing = await prisma.automationRule.findFirst({
      where: { id: ruleId, businessId },
    })

    if (!existing) {
      throw new Error('Automation rule not found')
    }

    const updated = await prisma.automationRule.update({
      where: { id: ruleId },
      data: validated as any,
    })

    logger.info('Automation rule updated', { ruleId })
    return updated
  }

  static async delete(ruleId: string, businessId: string) {
    const existing = await prisma.automationRule.findFirst({
      where: { id: ruleId, businessId },
    })

    if (!existing) {
      throw new Error('Automation rule not found')
    }

    await prisma.automationRule.delete({
      where: { id: ruleId },
    })

    logger.info('Automation rule deleted', { ruleId })
    return { success: true }
  }

  static async list(businessId: string, isActive?: boolean) {
    const where: Record<string, unknown> = { businessId }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    return prisma.automationRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
  }

  static async toggleActive(ruleId: string, businessId: string) {
    const rule = await prisma.automationRule.findFirst({
      where: { id: ruleId, businessId },
    })

    if (!rule) {
      throw new Error('Automation rule not found')
    }

    return prisma.automationRule.update({
      where: { id: ruleId },
      data: { isActive: !rule.isActive },
    })
  }

  static async executeRule(ruleId: string, triggerData: Record<string, unknown>) {
    const rule = await prisma.automationRule.findUnique({
      where: { id: ruleId },
    })

    if (!rule) {
      throw new Error('Automation rule not found')
    }

    if (!rule.isActive) {
      return { executed: false, reason: 'Rule is not active' }
    }

    const trigger = rule.trigger as { type: string; conditions?: Array<{ field: string; operator: string; value: unknown }> }

    if (trigger.type !== triggerData.type) {
      return { executed: false, reason: 'Trigger type mismatch' }
    }

    if (trigger.conditions && !this.matchConditions(triggerData, trigger.conditions)) {
      return { executed: false, reason: 'Conditions not met' }
    }

    const actions = rule.actions as Array<{ type: string; config: Record<string, unknown> }>
    const results: Array<{ action: string; success: boolean; error?: string }> = []

    for (const action of actions) {
      try {
        await this.runAction(action, triggerData)
        results.push({ action: action.type, success: true })
      } catch (error) {
        results.push({
          action: action.type,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        logger.error('Automation action failed', { ruleId, action: action.type, error })
      }
    }

    await prisma.automationRule.update({
      where: { id: ruleId },
      data: {
        runCount: { increment: 1 },
        lastRunAt: new Date(),
      },
    })

    await prisma.workflowRun.create({
      data: {
        businessId: rule.businessId,
        ruleId,
        status: results.every((r) => r.success) ? 'completed' : 'failed',
        triggerData: triggerData as any,
        actions: results as any,
        completedAt: new Date(),
      },
    })

    return { executed: true, results }
  }

  static async matchTriggers(businessId: string, triggerType: string, triggerData: Record<string, unknown>) {
    const rules = await prisma.automationRule.findMany({
      where: {
        businessId,
        isActive: true,
      },
    })

    const matchingRules = rules.filter((rule: { trigger: unknown }) => {
      const trigger = rule.trigger as { type: string; conditions?: Array<{ field: string; operator: string; value: unknown }> }
      if (trigger.type !== triggerType) return false
      if (trigger.conditions && !this.matchConditions(triggerData, trigger.conditions)) return false
      return true
    })

    return matchingRules
  }

  static async runActionsForTrigger(businessId: string, triggerType: string, triggerData: Record<string, unknown>) {
    const matchingRules = await this.matchTriggers(businessId, triggerType, triggerData)

    const results: Array<{ ruleId: string; ruleName: string; executed: boolean; results?: Array<{ action: string; success: boolean; error?: string }> }> = []

    for (const rule of matchingRules) {
      const result = await this.executeRule(rule.id, triggerData)
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        executed: result.executed,
        results: result.results,
      })
    }

    return results
  }

  private static matchConditions(
    data: Record<string, unknown>,
    conditions: Array<{ field: string; operator: string; value: unknown }>
  ): boolean {
    return conditions.every((condition) => {
      const fieldValue = data[condition.field]

      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value
        case 'contains':
          return typeof fieldValue === 'string' && fieldValue.includes(condition.value as string)
        case 'starts_with':
          return typeof fieldValue === 'string' && fieldValue.startsWith(condition.value as string)
        case 'ends_with':
          return typeof fieldValue === 'string' && fieldValue.endsWith(condition.value as string)
        case 'gt':
          return Number(fieldValue) > Number(condition.value)
        case 'lt':
          return Number(fieldValue) < Number(condition.value)
        case 'gte':
          return Number(fieldValue) >= Number(condition.value)
        case 'lte':
          return Number(fieldValue) <= Number(condition.value)
        case 'in':
          return Array.isArray(condition.value) && (condition.value as unknown[]).includes(fieldValue)
        case 'not_in':
          return Array.isArray(condition.value) && !(condition.value as unknown[]).includes(fieldValue)
        case 'exists':
          return condition.value ? fieldValue !== undefined : fieldValue === undefined
        default:
          return false
      }
    })
  }

  private static async runAction(
    action: { type: string; config: Record<string, unknown> },
    triggerData: Record<string, unknown>
  ) {
    switch (action.type) {
      case 'send_message':
        logger.info('Automation: send_message', { config: action.config })
        break
      case 'send_email':
        logger.info('Automation: send_email', { config: action.config })
        break
      case 'add_tag':
        logger.info('Automation: add_tag', { config: action.config })
        break
      case 'remove_tag':
        logger.info('Automation: remove_tag', { config: action.config })
        break
      case 'update_field':
        logger.info('Automation: update_field', { config: action.config })
        break
      case 'create_task':
        logger.info('Automation: create_task', { config: action.config })
        break
      case 'assign_to':
        logger.info('Automation: assign_to', { config: action.config })
        break
      case 'move_stage':
        logger.info('Automation: move_stage', { config: action.config })
        break
      case 'send_webhook':
        logger.info('Automation: send_webhook', { config: action.config })
        break
      case 'delay':
        const delayMs = Number(action.config.delay) * 1000
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 300000)))
        }
        break
      case 'ai_reply':
        logger.info('Automation: ai_reply', { config: action.config })
        break
      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }
  }
}
