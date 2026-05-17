import 'dotenv/config'
import { Worker, Queue, Job } from 'bullmq'
import { prisma } from './config/database'
import { redis } from './config/redis'
import { logger } from './config/logger'
import { WhatsAppService } from './services/whatsapp.service'
import { EmailService } from './services/email.service'
import { CampaignService } from './services/campaigns.service'
import { AutomationService } from './services/automation.service'
import { SocialService } from './services/social.service'
import env from './config/env'

const connection = {
  host: env.REDIS_URL.split('://')[1]?.split(':')[0] || 'localhost',
  port: parseInt(env.REDIS_URL.split(':').pop() || '6379'),
}

// WhatsApp Message Queue
const whatsappQueue = new Queue('whatsapp', { connection })
const whatsappWorker = new Worker(
  'whatsapp',
  async (job: Job) => {
    logger.info(`Processing WhatsApp job: ${job.id}`)
    switch (job.name) {
      case 'send-message':
        await WhatsAppService.sendMessage(
          job.data.to,
          job.data.content,
          job.data.type
        )
        break
      case 'send-template':
        await WhatsAppService.sendTemplate(
          job.data.to,
          job.data.templateName,
          job.data.language,
          job.data.variables
        )
        break
      case 'send-bulk':
        for (const msg of job.data.messages) {
          await WhatsAppService.sendMessage(msg.to, msg.content, msg.type)
        }
        break
      default:
        logger.warn(`Unknown WhatsApp job: ${job.name}`)
    }
  },
  { connection }
)

whatsappWorker.on('completed', (job) => {
  logger.info(`WhatsApp job ${job.id} completed`)
})

whatsappWorker.on('failed', (job, err) => {
  logger.error(`WhatsApp job ${job?.id} failed: ${err.message}`)
})

// Email Queue
const emailQueue = new Queue('email', { connection })
const emailWorker = new Worker(
  'email',
  async (job: Job) => {
    logger.info(`Processing Email job: ${job.id}`)
    switch (job.name) {
      case 'send':
        await EmailService.sendEmail(
          job.data.to,
          job.data.subject,
          job.data.html,
          job.data.from
        )
        break
      case 'send-bulk':
        for (const email of job.data.emails) {
          await EmailService.sendEmail(email.to, email.subject, email.html)
        }
        break
      default:
        logger.warn(`Unknown Email job: ${job.name}`)
    }
  },
  { connection }
)

emailWorker.on('completed', (job) => {
  logger.info(`Email job ${job.id} completed`)
})

emailWorker.on('failed', (job, err) => {
  logger.error(`Email job ${job?.id} failed: ${err.message}`)
})

// Campaign Queue
const campaignQueue = new Queue('campaign', { connection })
const campaignWorker = new Worker(
  'campaign',
  async (job: Job) => {
    logger.info(`Processing Campaign job: ${job.id}`)
    switch (job.name) {
      case 'start':
        await CampaignService.startCampaign(job.data.campaignId)
        break
      case 'process-drip':
        await CampaignService.processDripQueue(job.data.campaignId)
        break
      case 'pause':
        await CampaignService.pauseCampaign(job.data.campaignId)
        break
      case 'resume':
        await CampaignService.resumeCampaign(job.data.campaignId)
        break
      default:
        logger.warn(`Unknown Campaign job: ${job.name}`)
    }
  },
  { connection }
)

campaignWorker.on('completed', (job) => {
  logger.info(`Campaign job ${job.id} completed`)
})

campaignWorker.on('failed', (job, err) => {
  logger.error(`Campaign job ${job?.id} failed: ${err.message}`)
})

// Automation Queue
const automationQueue = new Queue('automation', { connection })
const automationWorker = new Worker(
  'automation',
  async (job: Job) => {
    logger.info(`Processing Automation job: ${job.id}`)
    await AutomationService.executeRule(job.data.ruleId, job.data.context)
  },
  { connection }
)

automationWorker.on('completed', (job) => {
  logger.info(`Automation job ${job.id} completed`)
})

automationWorker.on('failed', (job, err) => {
  logger.error(`Automation job ${job?.id} failed: ${err.message}`)
})

// Social Media Queue
const socialQueue = new Queue('social', { connection })
const socialWorker = new Worker(
  'social',
  async (job: Job) => {
    logger.info(`Processing Social job: ${job.id}`)
    switch (job.name) {
      case 'publish':
        await SocialService.publishPost(
          job.data.postId,
          job.data.platforms,
          job.data.content,
          job.data.mediaUrls
        )
        break
      case 'schedule':
        await SocialService.schedulePost(job.data.postId, job.data.scheduledAt)
        break
      default:
        logger.warn(`Unknown Social job: ${job.name}`)
    }
  },
  { connection }
)

socialWorker.on('completed', (job) => {
  logger.info(`Social job ${job.id} completed`)
})

socialWorker.on('failed', (job, err) => {
  logger.error(`Social job ${job?.id} failed: ${err.message}`)
})

// Scheduled Messages Queue
const scheduledQueue = new Queue('scheduled', { connection })
const scheduledWorker = new Worker(
  'scheduled',
  async (job: Job) => {
    logger.info(`Processing Scheduled job: ${job.id}`)
    const message = await prisma.scheduledMessage.findUnique({
      where: { id: job.data.messageId },
    })
    if (message && message.status === 'pending') {
      await WhatsAppService.sendMessage(message.phone, message.content, message.type)
      await prisma.scheduledMessage.update({
        where: { id: message.id },
        data: { status: 'sent', sentAt: new Date() },
      })
    }
  },
  { connection }
)

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down workers...')
  await Promise.all([
    whatsappWorker.close(),
    emailWorker.close(),
    campaignWorker.close(),
    automationWorker.close(),
    socialWorker.close(),
    scheduledWorker.close(),
  ])
  await prisma.$disconnect()
  await redis.quit()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

logger.info('Workers started')
