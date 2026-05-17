import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'
import { z } from 'zod'

const reviewCreateSchema = z.object({
  platform: z.enum(['google', 'facebook', 'yelp', 'trustpilot', 'internal', 'other']),
  externalId: z.string().optional(),
  reviewerName: z.string().min(1),
  reviewerPhone: z.string().optional(),
  reviewerEmail: z.string().email().optional().or(z.literal('')),
  rating: z.number().int().min(1).max(5),
  text: z.string().optional(),
  images: z.array(z.string()).default([]),
  isPublished: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  reviewDate: z.string().datetime().optional(),
})

const reviewUpdateSchema = reviewCreateSchema.partial()

export class ReviewsService {
  static async getById(reviewId: string, businessId: string) {
    const review = await prisma.review.findFirst({
      where: { id: reviewId, businessId },
    })

    if (!review) {
      throw new Error('Review not found')
    }

    return review
  }

  static async create(businessId: string, data: z.infer<typeof reviewCreateSchema>) {
    const validated = reviewCreateSchema.parse(data)

    const review = await prisma.review.create({
      data: {
        businessId,
        platform: validated.platform,
        externalId: validated.externalId,
        reviewerName: validated.reviewerName,
        reviewerPhone: validated.reviewerPhone,
        reviewerEmail: validated.reviewerEmail || null,
        rating: validated.rating,
        text: validated.text,
        images: validated.images,
        isPublished: validated.isPublished,
        isFeatured: validated.isFeatured,
        reviewDate: validated.reviewDate ? new Date(validated.reviewDate) : new Date(),
      },
    })

    logger.info('Review created', { reviewId: review.id, businessId })
    return review
  }

  static async update(reviewId: string, businessId: string, data: z.infer<typeof reviewUpdateSchema>) {
    const validated = reviewUpdateSchema.parse(data)

    const existing = await prisma.review.findFirst({
      where: { id: reviewId, businessId },
    })

    if (!existing) {
      throw new Error('Review not found')
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: validated,
    })

    logger.info('Review updated', { reviewId })
    return updated
  }

  static async delete(reviewId: string, businessId: string) {
    const existing = await prisma.review.findFirst({
      where: { id: reviewId, businessId },
    })

    if (!existing) {
      throw new Error('Review not found')
    }

    await prisma.review.delete({
      where: { id: reviewId },
    })

    logger.info('Review deleted', { reviewId })
    return { success: true }
  }

  static async list(businessId: string, page = 1, limit = 20, platform?: string, rating?: number, isRead?: boolean) {
    const skip = (page - 1) * limit
    const where: Record<string, unknown> = { businessId }

    if (platform) {
      where.platform = platform
    }

    if (rating) {
      where.rating = rating
    }

    if (isRead !== undefined) {
      where.isRead = isRead
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ])

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  static async replyToReview(reviewId: string, businessId: string, userId: string, replyText: string) {
    const review = await prisma.review.findFirst({
      where: { id: reviewId, businessId },
    })

    if (!review) {
      throw new Error('Review not found')
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        replyText,
        replyStatus: 'replied',
        repliedAt: new Date(),
        repliedById: userId,
      },
    })

    logger.info('Review replied', { reviewId })
    return updated
  }

  static async getStats(businessId: string) {
    const reviews = await prisma.review.findMany({
      where: { businessId, isPublished: true },
      select: { rating: true, platform: true },
    })

    if (reviews.length === 0) {
      return {
        total: 0,
        averageRating: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        byPlatform: {},
        replyRate: 0,
      }
    }

    const total = reviews.length
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / total

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    const byPlatform: Record<string, number> = {}

    reviews.forEach((r) => {
      distribution[r.rating as keyof typeof distribution]++
      byPlatform[r.platform] = (byPlatform[r.platform] || 0) + 1
    })

    const repliedCount = await prisma.review.count({
      where: { businessId, replyStatus: 'replied' },
    })

    return {
      total,
      averageRating: Math.round(averageRating * 10) / 10,
      distribution,
      byPlatform,
      replyRate: total > 0 ? Math.round((repliedCount / total) * 100) : 0,
    }
  }

  static async markAsRead(reviewId: string, businessId: string) {
    const review = await prisma.review.findFirst({
      where: { id: reviewId, businessId },
    })

    if (!review) {
      throw new Error('Review not found')
    }

    return prisma.review.update({
      where: { id: reviewId },
      data: { isRead: true },
    })
  }

  static async toggleFeatured(reviewId: string, businessId: string) {
    const review = await prisma.review.findFirst({
      where: { id: reviewId, businessId },
    })

    if (!review) {
      throw new Error('Review not found')
    }

    return prisma.review.update({
      where: { id: reviewId },
      data: { isFeatured: !review.isFeatured },
    })
  }

  static async syncFromExternal(
    businessId: string,
    platform: string,
    externalReviews: Array<{
      externalId: string
      reviewerName: string
      reviewerEmail?: string
      rating: number
      text?: string
      reviewDate?: string
    }>
  ) {
    const created: string[] = []
    const updated: string[] = []

    for (const extReview of externalReviews) {
      const existing = await prisma.review.findFirst({
        where: {
          businessId,
          platform,
          externalId: extReview.externalId,
        },
      })

      if (existing) {
        await prisma.review.update({
          where: { id: existing.id },
          data: {
            rating: extReview.rating,
            text: extReview.text,
            reviewerName: extReview.reviewerName,
            reviewerEmail: extReview.reviewerEmail || null,
            reviewDate: extReview.reviewDate ? new Date(extReview.reviewDate) : undefined,
          },
        })
        updated.push(existing.id)
      } else {
        const review = await prisma.review.create({
          data: {
            businessId,
            platform,
            externalId: extReview.externalId,
            reviewerName: extReview.reviewerName,
            reviewerEmail: extReview.reviewerEmail || null,
            rating: extReview.rating,
            text: extReview.text,
            reviewDate: extReview.reviewDate ? new Date(extReview.reviewDate) : new Date(),
          },
        })
        created.push(review.id)
      }
    }

    logger.info('Reviews synced from external', { businessId, platform, created: created.length, updated: updated.length })
    return { created: created.length, updated: updated.length }
  }
}
