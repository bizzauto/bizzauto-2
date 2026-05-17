import { Router } from 'express'
import { z } from 'zod'
import { AuthService } from '../services/auth.service'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validateBody } from '../middleware/validation'
import { authLimiter } from '../middleware/rateLimit'
import { successResponse, errorResponse } from '../utils/response'
import { createAuditLog } from '../utils/audit'
import { prisma } from '../config/database'

const router = Router()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  businessName: z.string().min(2),
  businessType: z.string(),
  phone: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const twoFactorSchema = z.object({
  userId: z.string(),
  token: z.string(),
})

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
})

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
})

router.post(
  '/register',
  authLimiter,
  validateBody(registerSchema),
  async (req, res) => {
    try {
      const result = await AuthService.register(req.body)

      await createAuditLog({
        businessId: result.user.businessId!,
        action: 'create',
        entity: 'user',
        entityId: result.user.id,
        description: 'New user registered',
        userId: result.user.id,
        userEmail: result.user.email,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      successResponse(res, result, 'Registration successful', 201)
    } catch (error: any) {
      errorResponse(res, error.message)
    }
  }
)

router.post('/login', authLimiter, validateBody(loginSchema), async (req, res) => {
  try {
    const result = await AuthService.login(
      req.body.email,
      req.body.password,
      req.ip
    )

    await createAuditLog({
      businessId: (result as any).user?.businessId || '',
      action: 'login',
      entity: 'user',
      entityId: (result as any).user?.id || '',
      description: 'User logged in',
      userId: (result as any).user?.id,
      userEmail: (result as any).user?.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Login successful')
  } catch (error: any) {
    errorResponse(res, error.message, 401)
  }
})

router.post(
  '/2fa/setup',
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const result = await AuthService.setupTwoFactor(req.user.id)
      successResponse(res, result)
    } catch (error: any) {
      errorResponse(res, error.message)
    }
  }
)

router.post(
  '/2fa/enable',
  authenticate,
  validateBody(z.object({ token: z.string() })),
  async (req: AuthRequest, res) => {
    try {
      const result = await AuthService.enableTwoFactor(req.user.id, req.body.token)
      successResponse(res, result, '2FA enabled')
    } catch (error: any) {
      errorResponse(res, error.message)
    }
  }
)

router.post(
  '/2fa/disable',
  authenticate,
  validateBody(z.object({ token: z.string() })),
  async (req: AuthRequest, res) => {
    try {
      const result = await AuthService.disableTwoFactor(req.user.id, req.body.token)
      successResponse(res, result, '2FA disabled')
    } catch (error: any) {
      errorResponse(res, error.message)
    }
  }
)

router.post(
  '/2fa/verify',
  authLimiter,
  validateBody(twoFactorSchema),
  async (req, res) => {
    try {
      const result = await AuthService.verifyTwoFactor(
        req.body.userId,
        req.body.token
      )
      successResponse(res, result, '2FA verified')
    } catch (error: any) {
      errorResponse(res, error.message, 401)
    }
  }
)

router.post(
  '/forgot-password',
  authLimiter,
  validateBody(z.object({ email: z.string().email() })),
  async (req, res) => {
    try {
      const result = await AuthService.forgotPassword(req.body.email)

      if (result.resetToken) {
        console.log(`Password reset token for ${result.email}: ${result.resetToken}`)
      }

      successResponse(res, { success: true }, 'Reset link sent if email exists')
    } catch (error: any) {
      errorResponse(res, error.message)
    }
  }
)

router.post(
  '/reset-password',
  authLimiter,
  validateBody(resetPasswordSchema),
  async (req, res) => {
    try {
      const result = await AuthService.resetPassword(
        req.body.token,
        req.body.newPassword
      )
      successResponse(res, result, 'Password reset successful')
    } catch (error: any) {
      errorResponse(res, error.message)
    }
  }
)

router.post('/verify-email', async (req, res) => {
  try {
    const result = await AuthService.verifyEmail(req.body.token)
    successResponse(res, result, 'Email verified')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/refresh-token', async (req, res) => {
  try {
    const result = await AuthService.refreshToken(req.body.refreshToken)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message, 401)
  }
})

router.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  async (req: AuthRequest, res) => {
    try {
      const result = await AuthService.changePassword(
        req.user.id,
        req.body.currentPassword,
        req.body.newPassword
      )
      successResponse(res, result, 'Password changed')
    } catch (error: any) {
      errorResponse(res, error.message)
    }
  }
)

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        businessId: true,
        avatar: true,
        emailVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
        business: {
          select: {
            id: true,
            name: true,
            type: true,
            plan: true,
            logoUrl: true,
            isActive: true,
          },
        },
      },
    })

    successResponse(res, user)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

export default router
