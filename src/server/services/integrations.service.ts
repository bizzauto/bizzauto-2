import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'
import { z } from 'zod'
import { google } from 'googleapis'

const integrationCreateSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  config: z.record(z.string(), z.unknown()),
  webhookUrl: z.string().url().optional(),
})

const integrationUpdateSchema = integrationCreateSchema.partial()

export class IntegrationsService {
  static async getById(integrationId: string, businessId: string) {
    const integration = await prisma.integration.findFirst({
      where: { id: integrationId, businessId },
    })

    if (!integration) {
      throw new Error('Integration not found')
    }

    return integration
  }

  static async create(businessId: string, data: z.infer<typeof integrationCreateSchema>) {
    const validated = integrationCreateSchema.parse(data)

    const existing = await prisma.integration.findFirst({
      where: {
        businessId,
        type: validated.type,
      },
    })

    if (existing) {
      throw new Error(`Integration of type ${validated.type} already exists`)
    }

    const integration = await prisma.integration.create({
      data: {
        businessId,
        type: validated.type,
        name: validated.name,
        config: validated.config as any,
        webhookUrl: validated.webhookUrl,
      },
    })

    logger.info('Integration created', { integrationId: integration.id, businessId, type: validated.type })
    return integration
  }

  static async update(integrationId: string, businessId: string, data: z.infer<typeof integrationUpdateSchema>) {
    const validated = integrationUpdateSchema.parse(data)

    const existing = await prisma.integration.findFirst({
      where: { id: integrationId, businessId },
    })

    if (!existing) {
      throw new Error('Integration not found')
    }

    const updated = await prisma.integration.update({
      where: { id: integrationId },
      data: validated as any,
    })

    logger.info('Integration updated', { integrationId })
    return updated
  }

  static async delete(integrationId: string, businessId: string) {
    const existing = await prisma.integration.findFirst({
      where: { id: integrationId, businessId },
    })

    if (!existing) {
      throw new Error('Integration not found')
    }

    await prisma.integration.delete({
      where: { id: integrationId },
    })

    logger.info('Integration deleted', { integrationId })
    return { success: true }
  }

  static async list(businessId: string) {
    return prisma.integration.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    })
  }

  static async toggleActive(integrationId: string, businessId: string) {
    const integration = await prisma.integration.findFirst({
      where: { id: integrationId, businessId },
    })

    if (!integration) {
      throw new Error('Integration not found')
    }

    return prisma.integration.update({
      where: { id: integrationId },
      data: { isActive: !integration.isActive },
    })
  }

  static async syncGoogleSheets(businessId: string, integrationId: string, spreadsheetId: string, range: string, data: Array<Record<string, unknown>>) {
    const integration = await prisma.integration.findFirst({
      where: { id: integrationId, businessId, type: 'google_sheets' },
    })

    if (!integration) {
      throw new Error('Google Sheets integration not found')
    }

    const config = integration.config as Record<string, string>

    if (!config.accessToken || !config.refreshToken || !config.clientId || !config.clientSecret) {
      throw new Error('Google Sheets integration not properly configured')
    }

    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri || `${env.BASE_URL}/api/integrations/google/callback`
    )

    oauth2Client.setCredentials({
      access_token: config.accessToken,
      refresh_token: config.refreshToken,
    })

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client })

    const headers = Object.keys(data[0] || {})
    const values = [headers, ...data.map((row) => headers.map((h) => String(row[h] || '')))]

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    })

    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        lastSyncAt: new Date(),
        lastError: null,
      },
    })

    logger.info('Google Sheets sync completed', { businessId, spreadsheetId })
    return { success: true, rowsSynced: data.length }
  }

  static async readGoogleSheets(businessId: string, integrationId: string, spreadsheetId: string, range: string) {
    const integration = await prisma.integration.findFirst({
      where: { id: integrationId, businessId, type: 'google_sheets' },
    })

    if (!integration) {
      throw new Error('Google Sheets integration not found')
    }

    const config = integration.config as Record<string, string>

    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri || `${env.BASE_URL}/api/integrations/google/callback`
    )

    oauth2Client.setCredentials({
      access_token: config.accessToken,
      refresh_token: config.refreshToken,
    })

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client })

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    })

    const rows = response.data.values || []
    if (rows.length === 0) {
      return { headers: [], data: [] }
    }

    const headers = rows[0]
    const data = rows.slice(1).map((row) => {
      const obj: Record<string, string> = {}
      headers.forEach((header, i) => {
        obj[header] = row[i] || ''
      })
      return obj
    })

    return { headers, data }
  }

  static async configureIntegration(businessId: string, type: string, config: Record<string, unknown>) {
    const integration = await prisma.integration.upsert({
      where: {
        businessId_type: { businessId, type },
      },
      update: {
        config: config as any,
        isActive: true,
        lastError: null,
      },
      create: {
        businessId,
        type,
        name: type,
        config: config as any,
        isActive: true,
      },
    })

    logger.info('Integration configured', { businessId, type })
    return integration
  }

  static async getIntegrationByType(businessId: string, type: string) {
    return prisma.integration.findFirst({
      where: { businessId, type, isActive: true },
    })
  }

  static async recordError(integrationId: string, error: string) {
    return prisma.integration.update({
      where: { id: integrationId },
      data: {
        lastError: error,
        lastSyncAt: new Date(),
      },
    })
  }
}
