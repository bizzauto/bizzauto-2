import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'
import { z } from 'zod'

const productCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  compareAtPrice: z.number().positive().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  quantity: z.number().int().min(0).default(0),
  trackInventory: z.boolean().default(true),
  images: z.array(z.string()).default([]),
  mainImage: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  status: z.string().default('active'),
})

const productUpdateSchema = productCreateSchema.partial()

const orderCreateSchema = z.object({
  contactId: z.string(),
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
  })),
  shippingAddress: z.object({
    name: z.string(),
    phone: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    pincode: z.string(),
  }).optional(),
  taxAmount: z.number().default(0),
  shippingAmount: z.number().default(0),
  discountAmount: z.number().default(0),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
  paymentStatus: z.string().default('pending'),
  gateway: z.string().optional(),
})

export class ECommerceService {
  static async getProduct(productId: string, businessId: string) {
    const product = await prisma.product.findFirst({
      where: { id: productId, businessId },
      include: { variants: true },
    })

    if (!product) {
      throw new Error('Product not found')
    }

    return product
  }

  static async createProduct(businessId: string, data: z.infer<typeof productCreateSchema>) {
    const validated = productCreateSchema.parse(data)

    const product = await prisma.product.create({
      data: {
        businessId,
        name: validated.name,
        description: validated.description,
        price: validated.price,
        compareAtPrice: validated.compareAtPrice,
        sku: validated.sku,
        barcode: validated.barcode,
        quantity: validated.quantity,
        trackInventory: validated.trackInventory,
        images: validated.images,
        mainImage: validated.mainImage,
        category: validated.category,
        tags: validated.tags,
        isActive: validated.isActive,
        status: validated.status,
      },
      include: { variants: true },
    })

    logger.info('Product created', { productId: product.id, businessId })
    return product
  }

  static async updateProduct(productId: string, businessId: string, data: z.infer<typeof productUpdateSchema>) {
    const validated = productUpdateSchema.parse(data)

    const existing = await prisma.product.findFirst({
      where: { id: productId, businessId },
    })

    if (!existing) {
      throw new Error('Product not found')
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: validated,
      include: { variants: true },
    })

    logger.info('Product updated', { productId })
    return updated
  }

  static async deleteProduct(productId: string, businessId: string) {
    const existing = await prisma.product.findFirst({
      where: { id: productId, businessId },
    })

    if (!existing) {
      throw new Error('Product not found')
    }

    await prisma.product.delete({
      where: { id: productId },
    })

    logger.info('Product deleted', { productId })
    return { success: true }
  }

  static async listProducts(businessId: string, page = 1, limit = 20, category?: string, isActive?: boolean) {
    const skip = (page - 1) * limit
    const where: Record<string, unknown> = { businessId }

    if (category) {
      where.category = category
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { variants: true },
      }),
      prisma.product.count({ where }),
    ])

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  static async updateInventory(productId: string, businessId: string, quantityChange: number) {
    const product = await prisma.product.findFirst({
      where: { id: productId, businessId },
    })

    if (!product) {
      throw new Error('Product not found')
    }

    const newQuantity = product.quantity + quantityChange

    if (newQuantity < 0) {
      throw new Error('Insufficient inventory')
    }

    return prisma.product.update({
      where: { id: productId },
      data: { quantity: newQuantity },
    })
  }

  static async createOrder(businessId: string, data: z.infer<typeof orderCreateSchema>) {
    const validated = orderCreateSchema.parse(data)

    const contact = await prisma.contact.findFirst({
      where: { id: validated.contactId, businessId },
    })

    if (!contact) {
      throw new Error('Contact not found')
    }

    let subtotal = 0
    const orderItems: Array<{
      productId: string
      name: string
      quantity: number
      price: number
      total: number
    }> = []

    for (const item of validated.items) {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, businessId },
      })

      if (!product) {
        throw new Error(`Product ${item.productId} not found`)
      }

      if (product.trackInventory && product.quantity < item.quantity) {
        throw new Error(`Insufficient inventory for ${product.name}`)
      }

      const total = item.price * item.quantity
      subtotal += total

      orderItems.push({
        productId: item.productId,
        name: product.name,
        quantity: item.quantity,
        price: item.price,
        total,
      })
    }

    let discountAmount = validated.discountAmount

    if (validated.couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          businessId,
          code: validated.couponCode,
          active: true,
        },
      })

      if (!coupon) {
        throw new Error('Invalid coupon code')
      }

      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        throw new Error('Coupon has expired')
      }

      if (coupon.minOrder > 0 && subtotal < coupon.minOrder) {
        throw new Error(`Minimum order amount is ${coupon.minOrder}`)
      }

      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        throw new Error('Coupon usage limit reached')
      }

      if (coupon.type === 'PERCENTAGE') {
        discountAmount = subtotal * (coupon.value / 100)
      } else {
        discountAmount = coupon.value
      }

      await prisma.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      })
    }

    const total = subtotal + validated.taxAmount + validated.shippingAmount - discountAmount

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          businessId,
          contactId: validated.contactId,
          orderNumber,
          status: 'pending',
          paymentStatus: validated.paymentStatus,
          subtotal,
          taxAmount: validated.taxAmount,
          shippingAmount: validated.shippingAmount,
          discountAmount,
          total,
          shippingAddress: validated.shippingAddress as any,
          notes: validated.notes,
          gateway: validated.gateway,
          items: {
            create: orderItems,
          },
        },
        include: { items: true, contact: true },
      })

      for (const item of validated.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        })

        if (product?.trackInventory) {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { decrement: item.quantity } },
          })
        }
      }

      return createdOrder
    }) as any

    logger.info('Order created', { orderId: order.id, orderNumber, businessId })
    return order
  }

  static async getOrder(orderId: string, businessId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, businessId },
      include: {
        items: { include: { product: true } },
        contact: true,
      },
    })

    if (!order) {
      throw new Error('Order not found')
    }

    return order
  }

  static async updateOrderStatus(orderId: string, businessId: string, status: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, businessId },
    })

    if (!order) {
      throw new Error('Order not found')
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: { items: true, contact: true },
    })

    logger.info('Order status updated', { orderId, status })
    return updated
  }

  static async updatePaymentStatus(orderId: string, businessId: string, paymentStatus: string, gateway?: string, gatewayData?: Record<string, unknown>) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, businessId },
    })

    if (!order) {
      throw new Error('Order not found')
    }

    return prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus,
        gateway: gateway || order.gateway,
        gatewayData: gatewayData as any,
      },
      include: { items: true, contact: true },
    })
  }

  static async cancelOrder(orderId: string, businessId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, businessId },
      include: { items: true },
    })

    if (!order) {
      throw new Error('Order not found')
    }

    if (order.status === 'cancelled') {
      throw new Error('Order is already cancelled')
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'cancelled' },
      })

      for (const item of order.items) {
        if (item.productId) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          })

          if (product?.trackInventory) {
            await tx.product.update({
              where: { id: item.productId },
              data: { quantity: { increment: item.quantity } },
            })
          }
        }
      }
    })

    logger.info('Order cancelled', { orderId })
    return { success: true }
  }

  static async listOrders(businessId: string, page = 1, limit = 20, status?: string, paymentStatus?: string) {
    const skip = (page - 1) * limit
    const where: Record<string, unknown> = { businessId }

    if (status) {
      where.status = status
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { contact: { select: { name: true, phone: true, email: true } }, items: { select: { name: true, quantity: true, price: true, total: true } } },
      }),
      prisma.order.count({ where }),
    ])

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  static async validateCoupon(businessId: string, code: string, subtotal: number) {
    const coupon = await prisma.coupon.findFirst({
      where: {
        businessId,
        code,
        active: true,
      },
    })

    if (!coupon) {
      throw new Error('Invalid coupon code')
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new Error('Coupon has expired')
    }

    if (coupon.minOrder > 0 && subtotal < coupon.minOrder) {
      throw new Error(`Minimum order amount is ${coupon.minOrder}`)
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      throw new Error('Coupon usage limit reached')
    }

    let discount = 0
    if (coupon.type === 'PERCENTAGE') {
      discount = subtotal * (coupon.value / 100)
    } else {
      discount = coupon.value
    }

    return {
      coupon,
      discount,
      total: subtotal - discount,
    }
  }

  static async calculateTotals(
    items: Array<{ price: number; quantity: number }>,
    taxRate = 0,
    shippingAmount = 0,
    discountAmount = 0
  ) {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount + shippingAmount - discountAmount

    return {
      subtotal,
      taxAmount,
      shippingAmount,
      discountAmount,
      total,
    }
  }

  static async createCoupon(businessId: string, data: {
    code: string
    type: 'PERCENTAGE' | 'FIXED'
    value: number
    minOrder?: number
    maxUses?: number
    expiresAt?: string
    description?: string
  }) {
    const existing = await prisma.coupon.findFirst({
      where: { businessId, code: data.code },
    })

    if (existing) {
      throw new Error('Coupon code already exists')
    }

    return prisma.coupon.create({
      data: {
        businessId,
        code: data.code,
        type: data.type,
        value: data.value,
        minOrder: data.minOrder || 0,
        maxUses: data.maxUses,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        description: data.description,
      },
    })
  }

  static async listCoupons(businessId: string) {
    return prisma.coupon.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    })
  }

  static async deleteCoupon(couponId: string, businessId: string) {
    const existing = await prisma.coupon.findFirst({
      where: { id: couponId, businessId },
    })

    if (!existing) {
      throw new Error('Coupon not found')
    }

    await prisma.coupon.delete({
      where: { id: couponId },
    })

    return { success: true }
  }
}
