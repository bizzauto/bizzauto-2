import rateLimit from 'express-rate-limit'
import env from '../config/env'

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 200 : 1000,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
  },
  skipSuccessfulRequests: true,
})

export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'AI rate limit exceeded, please try again later',
  },
})

export const webhookLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    error: 'Too many webhook requests',
  },
})
