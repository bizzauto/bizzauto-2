import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { createServer } from 'http'
import { Server } from 'socket.io'
import env from './config/env'
import { prisma } from './config/database'
import { redis } from './config/redis'
import { logger } from './config/logger'
import { globalLimiter } from './middleware/rateLimit'
import { errorHandler, notFoundHandler } from './middleware/error'

// Routes
import authRoutes from './routes/auth'
import businessRoutes from './routes/business'
import teamRoutes from './routes/team'
import subscriptionRoutes from './routes/subscriptions'
import contactRoutes from './routes/contacts'
import whatsappRoutes from './routes/whatsapp'
import campaignRoutes from './routes/campaigns'
import aiRoutes from './routes/ai'
import emailRoutes from './routes/email'
import socialRoutes from './routes/social'
import ecommerceRoutes from './routes/ecommerce'
import documentRoutes from './routes/documents'
import reviewRoutes from './routes/reviews'
import appointmentRoutes from './routes/appointments'
import analyticsRoutes from './routes/analytics'
import reportRoutes from './routes/reports'
import settingRoutes from './routes/settings'
import webhookRoutes from './routes/webhooks'
import notificationRoutes from './routes/notifications'
import automationRoutes from './routes/automation'
import chatbotRoutes from './routes/chatbot'
import integrationRoutes from './routes/integrations'
import superAdminRoutes from './routes/super-admin'
import leadRoutes from './routes/leads'

const app = express()
const httpServer = createServer(app)

// Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
})

export { io }

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
)
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
)
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(globalLimiter)

// Health check
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    await redis.ping()
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      redis: 'connected',
      uptime: process.uptime(),
    })
  } catch {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
    })
  }
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/business', businessRoutes)
app.use('/api/team', teamRoutes)
app.use('/api/subscriptions', subscriptionRoutes)
app.use('/api/contacts', contactRoutes)
app.use('/api/whatsapp', whatsappRoutes)
app.use('/api/campaigns', campaignRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/email', emailRoutes)
app.use('/api/social', socialRoutes)
app.use('/api/ecommerce', ecommerceRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/settings', settingRoutes)
app.use('/api/webhooks', webhookRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/automation', automationRoutes)
app.use('/api/chatbot', chatbotRoutes)
app.use('/api/integrations', integrationRoutes)
app.use('/api/super-admin', superAdminRoutes)
app.use('/api/leads', leadRoutes)

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`)

  socket.on('join-business', (businessId: string) => {
    socket.join(`business:${businessId}`)
  })

  socket.on('join-contact', (contactId: string) => {
    socket.join(`contact:${contactId}`)
  })

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`)
  })
})

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

// Start server
const PORT = env.PORT

httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
  logger.info(`Environment: ${env.NODE_ENV}`)
  logger.info(`API: http://localhost:${PORT}/api`)
})

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received. Starting graceful shutdown...`)
  httpServer.close(async () => {
    await prisma.$disconnect()
    await redis.quit()
    logger.info('Server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
