import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'
import { z } from 'zod'
import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

const emailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string(),
  text: z.string().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.union([z.string(), z.instanceof(Buffer)]),
    contentType: z.string().optional(),
  })).optional(),
})

const smtpConfigSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().positive(),
  secure: z.boolean().default(true),
  user: z.string().min(1),
  pass: z.string().min(1),
  from: z.string().email(),
})

let customTransporter: Transporter | null = null

function getTransporter(smtpConfig?: z.infer<typeof smtpConfigSchema>): Transporter {
  if (smtpConfig) {
    return nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
    })
  }

  if (customTransporter) {
    return customTransporter
  }

  if (env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS) {
    customTransporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
    return customTransporter
  }

  throw new Error('SMTP not configured. Configure SMTP in business settings or environment variables.')
}

export class EmailService {
  static async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
    smtpConfig?: z.infer<typeof smtpConfigSchema>,
    from?: string
  ) {
    const validated = emailSchema.parse({ to, subject, html, text })

    const transporter = getTransporter(smtpConfig)
    const fromEmail = from || env.SMTP_FROM || smtpConfig?.from || 'noreply@bizzauto.com'

    try {
      const result = await transporter.sendMail({
        from: `"BizzAuto" <${fromEmail}>`,
        to: validated.to,
        subject: validated.subject,
        html: validated.html,
        text: validated.text,
      })

      logger.info('Email sent', { to: validated.to, messageId: result.messageId })
      return { success: true, messageId: result.messageId }
    } catch (error) {
      logger.error('Failed to send email', { to: validated.to, error })
      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  static async testConnection(smtpConfig: z.infer<typeof smtpConfigSchema>) {
    const validated = smtpConfigSchema.parse(smtpConfig)

    const transporter = nodemailer.createTransport({
      host: validated.host,
      port: validated.port,
      secure: validated.secure,
      auth: {
        user: validated.user,
        pass: validated.pass,
      },
    })

    try {
      await transporter.verify()
      logger.info('SMTP connection verified', { host: validated.host })
      return { success: true, message: 'SMTP connection successful' }
    } catch (error) {
      logger.error('SMTP connection failed', { host: validated.host, error })
      throw new Error(`SMTP connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  static async configureBusinessSMTP(businessId: string, smtpConfig: z.infer<typeof smtpConfigSchema>) {
    const validated = smtpConfigSchema.parse(smtpConfig)

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    await this.testConnection(validated)

    const integration = await prisma.integration.upsert({
      where: {
        businessId_type: { businessId, type: 'smtp' },
      },
      update: {
        config: validated as any,
        isActive: true,
        lastError: null,
      },
      create: {
        businessId,
        type: 'smtp',
        name: 'SMTP Email',
        config: validated as any,
        isActive: true,
      },
    })

    customTransporter = nodemailer.createTransport({
      host: validated.host,
      port: validated.port,
      secure: validated.secure,
      auth: {
        user: validated.user,
        pass: validated.pass,
      },
    })

    logger.info('Business SMTP configured', { businessId })
    return integration
  }

  static async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${env.BASE_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested a password reset for your BizzAuto account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Reset Password
        </a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #888; font-size: 12px;">BizzAuto - Business Automation Platform</p>
      </div>
    `

    return this.sendEmail(email, 'Reset Your BizzAuto Password', html)
  }

  static async sendVerificationEmail(email: string, verifyToken: string) {
    const verifyUrl = `${env.BASE_URL || 'http://localhost:5173'}/verify-email?token=${verifyToken}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify Your Email</h2>
        <p>Welcome to BizzAuto! Please verify your email address by clicking the button below:</p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Verify Email
        </a>
        <p>This link will expire in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #888; font-size: 12px;">BizzAuto - Business Automation Platform</p>
      </div>
    `

    return this.sendEmail(email, 'Verify Your BizzAuto Email', html)
  }

  static async sendWelcomeEmail(email: string, name: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to BizzAuto, ${name}!</h2>
        <p>Your account has been created successfully.</p>
        <p>Get started by:</p>
        <ul>
          <li>Setting up your business profile</li>
          <li>Connecting your WhatsApp Business API</li>
          <li>Importing your contacts</li>
          <li>Creating your first campaign</li>
        </ul>
        <a href="${env.BASE_URL || 'http://localhost:5173'}/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Go to Dashboard
        </a>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #888; font-size: 12px;">BizzAuto - Business Automation Platform</p>
      </div>
    `

    return this.sendEmail(email, 'Welcome to BizzAuto!', html)
  }

  static async sendInviteEmail(email: string, businessName: string, inviteUrl: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">You've been invited to join ${businessName}</h2>
        <p>You have been invited to join ${businessName} on BizzAuto.</p>
        <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Accept Invitation
        </a>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #888; font-size: 12px;">BizzAuto - Business Automation Platform</p>
      </div>
    `

    return this.sendEmail(email, `Invitation to join ${businessName}`, html)
  }

  static async getBusinessSMTPConfig(businessId: string): Promise<z.infer<typeof smtpConfigSchema> | null> {
    const integration = await prisma.integration.findFirst({
      where: {
        businessId,
        type: 'smtp',
        isActive: true,
      },
    })

    if (!integration) {
      return null
    }

    return integration.config as unknown as z.infer<typeof smtpConfigSchema>
  }
}
