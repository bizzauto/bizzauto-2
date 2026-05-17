import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'
import { z } from 'zod'
import Razorpay from 'razorpay'
import { createHmac } from 'crypto'

const createOrderSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  receipt: z.string().optional(),
  notes: z.record(z.string(), z.string()).optional(),
})

const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
})

const createSubscriptionSchema = z.object({
  planId: z.string(),
  total_count: z.number().positive(),
  quantity: z.number().positive().default(1),
  notes: z.record(z.string(), z.string()).optional(),
})

let razorpayInstance: Razorpay | null = null

function getRazorpay(): Razorpay {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured')
  }

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    })
  }

  return razorpayInstance
}

export class RazorpayService {
  static async createOrder(businessId: string, data: z.infer<typeof createOrderSchema>) {
    const validated = createOrderSchema.parse(data)

    const razorpay = getRazorpay()

    const order = await razorpay.orders.create({
      amount: Math.round(validated.amount * 100),
      currency: validated.currency,
      receipt: validated.receipt || `receipt_${Date.now()}`,
      notes: validated.notes,
    })

    await prisma.invoice.create({
      data: {
        businessId,
        invoiceNumber: `INV-${Date.now()}`,
        amount: validated.amount,
        currency: validated.currency,
        status: 'pending',
        gateway: 'razorpay',
        gatewayData: {
          orderId: order.id,
          receipt: order.receipt,
        } as any,
      },
    })

    logger.info('Razorpay order created', { businessId, orderId: order.id })
    return order
  }

  static async verifyPayment(businessId: string, data: z.infer<typeof verifyPaymentSchema>) {
    const validated = verifyPaymentSchema.parse(data)

    const generatedSignature = createHmac('sha256', env.RAZORPAY_KEY_SECRET!)
      .update(`${validated.razorpayOrderId}|${validated.razorpayPaymentId}`)
      .digest('hex')

    if (generatedSignature !== validated.razorpaySignature) {
      throw new Error('Invalid payment signature')
    }

    const razorpay = getRazorpay()

    const payment = await razorpay.payments.fetch(validated.razorpayPaymentId)

    if (payment.status !== 'captured') {
      throw new Error(`Payment status: ${payment.status}`)
    }

    const invoices = await prisma.invoice.findMany({
      where: { businessId },
    })

    const invoice = invoices.find((inv) => {
      const data = inv.gatewayData as Record<string, unknown> | null
      return data?.orderId === validated.razorpayOrderId
    })

    if (invoice) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'paid',
          paidAt: new Date(),
          gatewayData: {
            ...(invoice.gatewayData as object),
            paymentId: validated.razorpayPaymentId,
            signature: validated.razorpaySignature,
          } as any,
        },
      })
    }

    logger.info('Payment verified', { businessId, paymentId: validated.razorpayPaymentId })
    return {
      verified: true,
      payment,
      invoice,
    }
  }

  static async createSubscription(businessId: string, planId: string, data: z.infer<typeof createSubscriptionSchema>) {
    const validated = createSubscriptionSchema.parse(data)

    const razorpay = getRazorpay()

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: validated.total_count,
      quantity: validated.quantity,
      notes: validated.notes,
    })

    await prisma.business.update({
      where: { id: businessId },
      data: {
        razorpaySubId: subscription.id,
      },
    })

    logger.info('Razorpay subscription created', { businessId, subscriptionId: subscription.id })
    return subscription
  }

  static async cancelSubscription(subscriptionId: string) {
    const razorpay = getRazorpay()

    const cancelled = await razorpay.subscriptions.cancel(subscriptionId)

    await prisma.business.updateMany({
      where: { razorpaySubId: subscriptionId },
      data: {
        razorpaySubId: null,
      },
    })

    await prisma.subscription.updateMany({
      where: { razorpaySubscriptionId: subscriptionId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    })

    logger.info('Razorpay subscription cancelled', { subscriptionId })
    return cancelled
  }

  static verifyWebhookSignature(payload: string, signature: string): boolean {
    const expectedSignature = createHmac('sha256', env.RAZORPAY_KEY_SECRET!)
      .update(payload)
      .digest('hex')

    return expectedSignature === signature
  }

  static async handleWebhook(businessId: string, event: string, payload: Record<string, unknown>) {
    logger.info('Razorpay webhook received', { businessId, event })

    switch (event) {
      case 'payment.captured': {
        const payment = payload.payment as Record<string, unknown> | undefined
        if (payment) {
          await this.handlePaymentCaptured(businessId, payment)
        }
        break
      }
      case 'payment.failed': {
        const payment = payload.payment as Record<string, unknown> | undefined
        if (payment) {
          await this.handlePaymentFailed(businessId, payment)
        }
        break
      }
      case 'subscription.charged': {
        const subscription = payload.subscription as Record<string, unknown> | undefined
        if (subscription) {
          await this.handleSubscriptionCharged(businessId, subscription)
        }
        break
      }
      case 'subscription.cancelled': {
        const subscription = payload.subscription as Record<string, unknown> | undefined
        if (subscription) {
          await this.handleSubscriptionCancelled(businessId, subscription)
        }
        break
      }
      default:
        logger.info('Unhandled Razorpay webhook event', { event })
    }

    return { success: true }
  }

  private static async handlePaymentCaptured(businessId: string, payment: Record<string, unknown>) {
    const paymentId = payment.id as string
    const orderId = payment.order_id as string
    const amount = payment.amount as number

    const invoices = await prisma.invoice.findMany({ where: { businessId } })
    const matchingInvoice = invoices.find((inv) => {
      const data = inv.gatewayData as Record<string, unknown> | null
      return data?.orderId === orderId
    })

    if (matchingInvoice) {
      await prisma.invoice.update({
        where: { id: matchingInvoice.id },
        data: {
          status: 'paid',
          paidAt: new Date(),
          gatewayData: {
            paymentId,
            amount,
          } as any,
        },
      })
    }

    logger.info('Payment captured via webhook', { businessId, paymentId })
  }

  private static async handlePaymentFailed(businessId: string, payment: Record<string, unknown>) {
    const paymentId = payment.id as string
    const orderId = payment.order_id as string
    const error = payment.error_description as string

    const invoices = await prisma.invoice.findMany({ where: { businessId } })
    const matchingInvoice = invoices.find((inv) => {
      const data = inv.gatewayData as Record<string, unknown> | null
      return data?.orderId === orderId
    })

    if (matchingInvoice) {
      await prisma.invoice.update({
        where: { id: matchingInvoice.id },
        data: {
          status: 'failed',
          gatewayData: {
            paymentId,
            error,
          } as any,
        },
      })
    }

    logger.info('Payment failed via webhook', { businessId, paymentId, error })
  }

  private static async handleSubscriptionCharged(businessId: string, subscription: Record<string, unknown>) {
    const subscriptionId = subscription.id as string

    await prisma.subscription.updateMany({
      where: {
        businessId,
        razorpaySubscriptionId: subscriptionId,
      },
      data: {
        currentPeriodStart: new Date(),
      },
    })

    logger.info('Subscription charged via webhook', { businessId, subscriptionId })
  }

  private static async handleSubscriptionCancelled(businessId: string, subscription: Record<string, unknown>) {
    const subscriptionId = subscription.id as string

    await prisma.subscription.updateMany({
      where: {
        businessId,
        razorpaySubscriptionId: subscriptionId,
      },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    })

    logger.info('Subscription cancelled via webhook', { businessId, subscriptionId })
  }

  static async getPayment(paymentId: string) {
    const razorpay = getRazorpay()
    return razorpay.payments.fetch(paymentId)
  }

  static async getOrder(orderId: string) {
    const razorpay = getRazorpay()
    return razorpay.orders.fetch(orderId)
  }

  static async getSubscription(subscriptionId: string) {
    const razorpay = getRazorpay()
    return razorpay.subscriptions.fetch(subscriptionId)
  }

  static async refundPayment(paymentId: string, amount?: number) {
    const razorpay = getRazorpay()

    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount ? Math.round(amount * 100) : undefined,
    })

    logger.info('Payment refunded', { paymentId, refundId: refund.id })
    return refund
  }
}
