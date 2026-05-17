import IORedis from 'ioredis'
import env from '../config/env'

const globalForRedis = globalThis as unknown as {
  redis: IORedis | undefined
}

export const redis =
  globalForRedis.redis ??
  new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
      if (times > 10) return null
      return Math.min(times * 100, 3000)
    },
  })

redis.on('error', (err) => {
  console.error('Redis error:', err.message)
})

redis.on('connect', () => {
  console.log('Redis connected')
})

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

export default redis
