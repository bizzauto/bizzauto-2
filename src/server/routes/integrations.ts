import { Router } from 'express'
import { z } from 'zod'
import { IntegrationsService } from '../services/integrations.service'
import { authenticate, AuthRequest, requireBusinessOwner } from '../middleware/auth'
import { validateBody, validateParams, validateQuery } from '../middleware/validation'
import { successResponse, errorResponse } from '../utils/response'
import { createAuditLog } from '../utils/audit'
import { prisma } from '../config/database'
import env from '../config/env'

const router = Router()

const integrationCreateSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  config: z.record(z.string(), z.unknown()),
  webhookUrl: z.string().url().optional(),
})

const integrationUpdateSchema = integrationCreateSchema.partial()

const syncSchema = z.object({
  spreadsheetId: z.string().min(1),
  range: z.string().min(1),
  data: z.array(z.record(z.string(), z.unknown())),
})

const idParamSchema = z.object({
  id: z.string().uuid(),
})

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await IntegrationsService.list(req.user.businessId)
    successResponse(res, result)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/', authenticate, requireBusinessOwner, validateBody(integrationCreateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const result = await IntegrationsService.create(req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'create',
      entity: 'integration',
      entityId: result.id,
      description: `Integration created: ${result.type}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Integration created', 201)
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.put('/:id', authenticate, requireBusinessOwner, validateParams(idParamSchema), validateBody(integrationUpdateSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await IntegrationsService.update(id, req.user.businessId, req.body)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'integration',
      entityId: id,
      description: `Integration updated: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Integration updated')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.delete('/:id', authenticate, requireBusinessOwner, validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const result = await IntegrationsService.delete(id, req.user.businessId)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'delete',
      entity: 'integration',
      entityId: id,
      description: `Integration deleted: ${id}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Integration deleted')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.post('/:id/sync', authenticate, requireBusinessOwner, validateParams(idParamSchema), validateBody(syncSchema), async (req: AuthRequest, res) => {
  try {
    if (!req.user.businessId) {
      return errorResponse(res, 'No business associated with account', 403)
    }

    const { id } = req.params
    const { spreadsheetId, range, data } = req.body

    const result = await IntegrationsService.syncGoogleSheets(req.user.businessId, id, spreadsheetId, range, data)

    await createAuditLog({
      businessId: req.user.businessId,
      action: 'update',
      entity: 'integration',
      entityId: id,
      description: `Google Sheets synced: ${spreadsheetId}`,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    successResponse(res, result, 'Sync completed')
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/google-sheets/auth', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return errorResponse(res, 'Google OAuth not configured', 500)
    }

    const { google } = await import('googleapis')
    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      `${env.BASE_URL}/api/integrations/google-sheets/callback`
    )

    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly',
    ]

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: req.user.businessId,
    })

    successResponse(res, { authUrl: url })
  } catch (error: any) {
    errorResponse(res, error.message)
  }
})

router.get('/google-sheets/callback', async (req, res) => {
  try {
    const { code, state } = req.query

    if (!code || !state) {
      return res.status(400).send('Missing code or state parameter')
    }

    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).send('Google OAuth not configured')
    }

    const { google } = await import('googleapis')
    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      `${env.BASE_URL}/api/integrations/google-sheets/callback`
    )

    const { tokens } = await oauth2Client.getToken(code as string)

    await prisma.integration.upsert({
      where: {
        businessId_type: { businessId: state as string, type: 'google_sheets' },
      },
      update: {
        config: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expiry_date,
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          redirectUri: `${env.BASE_URL}/api/integrations/google-sheets/callback`,
        } as any,
        isActive: true,
        lastError: null,
      },
      create: {
        businessId: state as string,
        type: 'google_sheets',
        name: 'Google Sheets',
        config: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expiry_date,
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          redirectUri: `${env.BASE_URL}/api/integrations/google-sheets/callback`,
        } as any,
        isActive: true,
      },
    })

    res.redirect(`${env.BASE_URL}/settings/integrations?success=true`)
  } catch (error: any) {
    res.redirect(`${env.BASE_URL}/settings/integrations?error=${encodeURIComponent(error.message)}`)
  }
})

export default router
