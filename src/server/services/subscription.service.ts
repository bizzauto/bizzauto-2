import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'
import { z } from 'zod'
import { Plan } from '@prisma/client'

const PLAN_LIMITS: Record<Plan, { contacts: number; messages: number; users: number; aiCredits: number; price: number }> = {
  FREE: { contacts: 500, messages: 1000, users: 1, aiCredits: 100, price: 0 },
  STARTER: { contacts: 2500, messages: 5000, users: 3, aiCredits: 500, price: 999 },
  GROWTH: { contacts: 10000, messages: 25000, users: 10, aiCredits: 2000, price: 2999 },
  PRO: { contacts: 50000, messages: 100000, users: 25, aiCredits: 10000, price: 7999 },
  AGENCY: { contacts: 200000, messages: 500000, users: 100, aiCredits: 50000, price: 19999 },
}

const createSubscriptionSchema = z.object({
  plan: z.nativeEnum(Plan),
  interval: z.enum(['monthly', 'yearly']),
  amount: z.number().positive(),
  razorpaySubscriptionId: z.string().optional(),
  razorpayOrderId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
})

export class SubscriptionService {
  static async create(businessId: string, data: z.infer<typeof createSubscriptionSchema>) {
    const validated = createSubscriptionSchema.parse(data)

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    const limits = PLAN_LIMITS[validated.plan]

    const subscription = await prisma.subscription.create({
      data: {
        businessId,
        plan: validated.plan,
        status: 'active',
        startDate: new Date(),
        endDate: validated.interval === 'yearly'
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        razorpaySubscriptionId: validated.razorpaySubscriptionId,
        razorpayOrderId: validated.razorpayOrderId,
        razorpayPaymentId: validated.razorpayPaymentId,
        amount: validated.amount,
        currency: 'INR',
        interval: validated.interval,
        currentPeriodStart: new Date(),
        currentPeriodEnd: validated.interval === 'yearly'
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    await prisma.business.update({
      where: { id: businessId },
      data: {
        plan: validated.plan,
        planStartedAt: new Date(),
        planExpiresAt: validated.interval === 'yearly'
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        contactsLimit: limits.contacts,
        messagesLimit: limits.messages,
        usersLimit: limits.users,
        aiCreditsLimit: limits.aiCredits,
        razorpaySubId: validated.razorpaySubscriptionId,
        razorpayOrderId: validated.razorpayOrderId,
      },
    })

    logger.info('Subscription created', { businessId, plan: validated.plan })
    return subscription
  }

  static async upgradePlan(businessId: string, newPlan: Plan) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    const currentPlanIndex = Object.values(Plan).indexOf(business.plan)
    const newPlanIndex = Object.values(Plan).indexOf(newPlan)

    if (newPlanIndex <= currentPlanIndex) {
      throw new Error('New plan must be higher than current plan')
    }

    const limits = PLAN_LIMITS[newPlan]

    const now = new Date()
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const subscription = await prisma.subscription.create({
      data: {
        businessId,
        plan: newPlan,
        status: 'active',
        startDate: now,
        endDate,
        amount: limits.price,
        currency: 'INR',
        interval: 'monthly',
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
      },
    })

    await prisma.business.update({
      where: { id: businessId },
      data: {
        plan: newPlan,
        planStartedAt: now,
        planExpiresAt: endDate,
        contactsLimit: limits.contacts,
        messagesLimit: limits.messages,
        usersLimit: limits.users,
        aiCreditsLimit: limits.aiCredits,
      },
    })

    logger.info('Plan upgraded', { businessId, from: business.plan, to: newPlan })
    return subscription
  }

  static async cancel(businessId: string, reason?: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        businessId,
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!activeSubscription) {
      throw new Error('No active subscription found')
    }

    const updated = await prisma.subscription.update({
      where: { id: activeSubscription.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: reason || 'user',
        endDate: activeSubscription.currentPeriodEnd || new Date(),
      },
    })

    logger.info('Subscription cancelled', { businessId, reason })
    return updated
  }

  static async checkPlanLimits(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    const [contactCount, messageCount, userCount] = await Promise.all([
      prisma.contact.count({ where: { businessId, status: 'active' } }),
      prisma.message.count({
        where: {
          businessId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      prisma.user.count({ where: { businessId, isActive: true } }),
    ])

    const limits = PLAN_LIMITS[business.plan]

    return {
      plan: business.plan,
      limits,
      usage: {
        contacts: { used: contactCount, limit: business.contactsLimit, remaining: business.contactsLimit - contactCount },
        messages: { used: messageCount, limit: business.messagesLimit, remaining: business.messagesLimit - messageCount },
        users: { used: userCount, limit: business.usersLimit, remaining: business.usersLimit - userCount },
        aiCredits: { used: business.aiCreditsUsed, limit: business.aiCreditsLimit, remaining: business.aiCreditsLimit - business.aiCreditsUsed },
      },
      canAddContact: contactCount < business.contactsLimit,
      canSendMessage: messageCount < business.messagesLimit,
      canAddUser: userCount < business.usersLimit,
      canUseAI: business.aiCreditsUsed < business.aiCreditsLimit,
    }
  }

  static async getPlanDetails(plan: Plan) {
    const limits = PLAN_LIMITS[plan]
    return {
      plan,
      ...limits,
      features: this.getPlanFeatures(plan),
    }
  }

  static async getAllPlans() {
    return Object.values(Plan).map((plan) => ({
      plan,
      ...PLAN_LIMITS[plan],
      features: this.getPlanFeatures(plan),
    }))
  }

  static async getCurrentSubscription(businessId: string) {
    return prisma.subscription.findFirst({
      where: {
        businessId,
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  static async getSubscriptionHistory(businessId: string) {
    return prisma.subscription.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    })
  }

  static async isPlanActive(businessId: string): Promise<boolean> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { planExpiresAt: true, plan: true },
    })

    if (!business) return false
    if (!business.planExpiresAt) return business.plan === Plan.FREE

    return business.planExpiresAt > new Date()
  }

  private static getPlanFeatures(plan: Plan): string[] {
    const baseFeatures = ['WhatsApp messaging', 'Contact management', 'Basic analytics']

    const featureMap: Record<Plan, string[]> = {
      FREE: [...baseFeatures],
      STARTER: [...baseFeatures, 'Email campaigns', 'Basic automation', '3 team members'],
      GROWTH: [...baseFeatures, 'Email campaigns', 'Advanced automation', 'AI content generation', '10 team members', 'Social media posting'],
      PRO: [...baseFeatures, 'All automation features', 'Unlimited AI', '25 team members', 'E-commerce', 'Custom integrations', 'Priority support'],
      AGENCY: [...baseFeatures, 'All features', 'White labeling', '100 team members', 'Unlimited everything', 'Dedicated account manager', 'API access'],
    }

    return featureMap[plan]
  }
}
