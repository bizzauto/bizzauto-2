import { Router } from 'express'
import { z } from 'zod'
import { ECommerceService } from '../services/ecommerce.service'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validateBody, validateParams, validateQuery } from '../middleware/validation'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response'
import { createAuditLog } from '../utils/audit'
import { prisma } from '../config/database'

const router = Router()

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

const orderStatusSchema = z.object({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
})

const couponCreateSchema = z.object({
  code: z.string().min(1).toUpperCase(),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.number().positive(),
  minOrder: z.number().min(0).default(0),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  description: z.string().optional(),
})

const checkoutSchema = z.object({
  contactId: z.string(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
  })),
  couponCode: z.string().optional(),
  shippingAddress: z.object({
    name: z.string(),
    phone: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    pincode: z.string(),
  }),
  paymentMethod: z.enum(['razorpay', 'cod', 'upi', 'bank_transfer']),
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z.string().optional(),
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
})

const idParamSchema = z.object({
  id: z.string().uuid(),
})

router.get('/products', authenticate, validateQuery(listQuerySchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { page, limit, category } = req.query
    const result = await ECommerceService.listProducts(req.user.businessId, page, limit, category)

    paginatedResponse(res, result.products, result.pagination.total, result.pagination.page, result.pagination.limit)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/products', authenticate, validateBody(productCreateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await ECommerceService.createProduct(req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'create',
      entity: 'product',
      entityId: result.id,
      description: `Product created: ${result.name}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Product created', 201)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.put('/products/:id', authenticate, validateParams(idParamSchema), validateBody(productUpdateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await ECommerceService.updateProduct(id, req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'product',
      entityId: id,
      description: `Product updated: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Product updated')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.delete('/products/:id', authenticate, validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await ECommerceService.deleteProduct(id, req.user.businessId)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'delete',
      entity: 'product',
      entityId: id,
      description: `Product deleted: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Product deleted')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/orders', authenticate, validateQuery(listQuerySchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { page, limit, status, paymentStatus } = req.query
    const result = await ECommerceService.listOrders(req.user.businessId, page, limit, status, paymentStatus)

    paginatedResponse(res, result.orders, result.pagination.total, result.pagination.page, result.pagination.limit)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/orders', authenticate, validateBody(orderCreateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await ECommerceService.createOrder(req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'create',
      entity: 'order',
      entityId: result.id,
      description: `Order created: ${result.orderNumber}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Order created', 201)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.put('/orders/:id/status', authenticate, validateParams(idParamSchema), validateBody(orderStatusSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const { status } = req.body
    const result = await ECommerceService.updateOrderStatus(id, req.user.businessId, status)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'order',
      entityId: id,
      description: `Order status updated to ${status}: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Order status updated')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/coupons', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await ECommerceService.listCoupons(req.user.businessId)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/coupons', authenticate, validateBody(couponCreateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await ECommerceService.createCoupon(req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'create',
      entity: 'coupon',
      entityId: result.id,
      description: `Coupon created: ${result.code}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Coupon created', 201)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/checkout', authenticate, validateBody(checkoutSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { contactId, items, couponCode, shippingAddress, paymentMethod } = req.body

    const orderItems = []
    let subtotal = 0

    for (const item of items) {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, businessId: req.user.businessId },
      })

      if (!product) {
        return errorResponse(res, `Product ${item.productId} not found`, 404)
      }

      if (product.trackInventory && product.quantity < item.quantity) {
        return errorResponse(res, `Insufficient inventory for ${product.name}`, 400)
      }

      const total = product.price * item.quantity
      subtotal += total

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
      })
    }

    let discountAmount = 0

    if (couponCode) {
      try {
        const couponResult = await ECommerceService.validateCoupon(req.user.businessId, couponCode, subtotal)
        discountAmount = couponResult.discount
      } catch (error: any) {
        return errorResponse(res, error.message, 400)
      }
    }

    const { taxAmount, shippingAmount } = await ECommerceService.calculateTotals(
      orderItems.map((i) => ({ price: i.price, quantity: i.quantity })),
      0,
      0,
      discountAmount
    )

    const order = await ECommerceService.createOrder(req.user.businessId, {
      contactId,
      items: orderItems,
      shippingAddress,
      taxAmount: 0,
      shippingAmount: 0,
      discountAmount,
      couponCode,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
      gateway: paymentMethod === 'razorpay' ? 'razorpay' : undefined,
      notes: `Payment method: ${paymentMethod}`,
    })

    successResponse(res, order, 'Checkout completed', 201)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

export default router
