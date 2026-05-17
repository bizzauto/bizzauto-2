import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import speakeasy from 'speakeasy'
import qrcode from 'qrcode'
import { prisma } from '../config/database'
import env from '../config/env'
import { generateToken, hashToken } from '../utils/encryption'
import { Role } from '@prisma/client'

const OTP_STORE = new Map<string, { code: string; expires: Date }>()

export class AuthService {
  static async register(data: {
    email: string
    password: string
    name: string
    businessName: string
    businessType: string
    phone?: string
  }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existing) {
      throw new Error('User already exists')
    }

    const hashedPassword = await bcrypt.hash(data.password, 12)

    const business = await prisma.business.create({
      data: {
        name: data.businessName,
        type: data.businessType,
        phone: data.phone,
        email: data.email,
      },
    })

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        phone: data.phone,
        role: Role.OWNER,
        businessId: business.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        businessId: true,
        createdAt: true,
      },
    })

    const verifyToken = generateToken()
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: hashToken(verifyToken),
        emailVerifyExpiry: verifyExpiry,
      },
    })

    const token = this.generateToken(user)
    const refreshToken = this.generateRefreshToken(user)

    return {
      user,
      token,
      refreshToken,
      verifyToken,
    }
  }

  static async login(email: string, password: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            plan: true,
            isActive: true,
          },
        },
      },
    })

    if (!user) {
      throw new Error('Invalid credentials')
    }

    if (!user.isActive) {
      throw new Error('Account is disabled')
    }

    if (!user.password) {
      throw new Error('Use social login or reset password')
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      throw new Error('Invalid credentials')
    }

    if (user.business && !user.business.isActive) {
      throw new Error('Business is not active')
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    })

    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      businessId: user.businessId,
      twoFactorEnabled: user.twoFactorEnabled,
    }

    if (user.twoFactorEnabled) {
      return { requiresTwoFactor: true, user: userData }
    }

    const token = this.generateToken(userData)
    const refreshToken = this.generateRefreshToken(userData)

    return {
      user: userData,
      token,
      refreshToken,
    }
  }

  static async verifyTwoFactor(userId: string, token: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user?.twoFactorSecret) {
      throw new Error('2FA not enabled')
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    })

    if (!verified) {
      const backupCodes = user.twoFactorBackupCodes?.split(',') || []
      const index = backupCodes.indexOf(token)
      if (index === -1) {
        throw new Error('Invalid 2FA code')
      }
      backupCodes.splice(index, 1)
      await prisma.user.update({
        where: { id: userId },
        data: { twoFactorBackupCodes: backupCodes.join(',') },
      })
    }

    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      businessId: user.businessId,
    }

    const jwtToken = this.generateToken(userData)
    const refreshToken = this.generateRefreshToken(userData)

    return {
      user: userData,
      token: jwtToken,
      refreshToken,
    }
  }

  static async setupTwoFactor(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const secret = speakeasy.generateSecret({
      name: `BizzAuto (${user.email})`,
      issuer: 'BizzAuto',
    })

    const backupCodes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).substring(2, 8).toUpperCase()
    )

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret.base32,
        twoFactorBackupCodes: backupCodes.join(','),
      },
    })

    const qrCode = await qrcode.toDataURL(secret.otpauth_url!)

    return {
      secret: secret.base32,
      qrCode,
      backupCodes,
    }
  }

  static async enableTwoFactor(userId: string, token: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user?.twoFactorSecret) {
      throw new Error('Setup 2FA first')
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    })

    if (!verified) {
      throw new Error('Invalid verification code')
    }

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    })

    return { success: true }
  }

  static async disableTwoFactor(userId: string, token: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user?.twoFactorSecret) {
      throw new Error('2FA not enabled')
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    })

    if (!verified) {
      throw new Error('Invalid 2FA code')
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      },
    })

    return { success: true }
  }

  static async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return { success: true }

    const resetToken = generateToken()
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashToken(resetToken),
        resetTokenExpiry: resetExpiry,
      },
    })

    return { resetToken, email: user.email }
  }

  static async resetPassword(token: string, newPassword: string) {
    const hashedToken = hashToken(token)

    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: { gt: new Date() },
      },
    })

    if (!user) {
      throw new Error('Invalid or expired reset token')
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    })

    return { success: true }
  }

  static async verifyEmail(token: string) {
    const hashedToken = hashToken(token)

    const user = await prisma.user.findFirst({
      where: {
        emailVerifyToken: hashedToken,
        emailVerifyExpiry: { gt: new Date() },
      },
    })

    if (!user) {
      throw new Error('Invalid or expired verification token')
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        emailVerifyToken: null,
        emailVerifyExpiry: null,
      },
    })

    return { success: true }
  }

  static async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
        id: string
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          businessId: true,
          isActive: true,
        },
      })

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive')
      }

      const token = this.generateToken(user)
      const newRefreshToken = this.generateRefreshToken(user)

      return { token, refreshToken: newRefreshToken }
    } catch {
      throw new Error('Invalid refresh token')
    }
  }

  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user?.password) {
      throw new Error('Cannot change password')
    }

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      throw new Error('Current password is incorrect')
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })

    return { success: true }
  }

  private static generateToken(user: {
    id: string
    email: string
    role: Role
    businessId: string | null
  }) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    )
  }

  private static generateRefreshToken(user: { id: string }) {
    return jwt.sign({ id: user.id }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    })
  }
}
