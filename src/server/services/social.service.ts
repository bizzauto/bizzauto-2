import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'
import { z } from 'zod'
import axios from 'axios'

const postCreateSchema = z.object({
  content: z.string().min(1),
  mediaUrls: z.array(z.string()).default([]),
  link: z.string().url().optional().or(z.literal('')),
  platforms: z.array(z.enum(['facebook', 'instagram', 'linkedin', 'twitter', 'google'])),
  scheduledAt: z.string().datetime().optional(),
})

const postUpdateSchema = postCreateSchema.partial()

export class SocialService {
  static async getById(postId: string, businessId: string) {
    const post = await prisma.post.findFirst({
      where: { id: postId, businessId },
    })

    if (!post) {
      throw new Error('Post not found')
    }

    return post
  }

  static async create(businessId: string, userId: string, data: z.infer<typeof postCreateSchema>) {
    const validated = postCreateSchema.parse(data)

    const post = await prisma.post.create({
      data: {
        businessId,
        content: validated.content,
        mediaUrls: validated.mediaUrls,
        link: validated.link || null,
        platforms: validated.platforms,
        status: validated.scheduledAt ? 'scheduled' : 'draft',
        scheduledAt: validated.scheduledAt ? new Date(validated.scheduledAt) : null,
        createdById: userId,
      },
    })

    logger.info('Social post created', { postId: post.id, businessId })
    return post
  }

  static async update(postId: string, businessId: string, data: z.infer<typeof postUpdateSchema>) {
    const validated = postUpdateSchema.parse(data)

    const existing = await prisma.post.findFirst({
      where: { id: postId, businessId },
    })

    if (!existing) {
      throw new Error('Post not found')
    }

    if (existing.status === 'published') {
      throw new Error('Cannot update a published post')
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: validated,
    })

    logger.info('Social post updated', { postId })
    return updated
  }

  static async delete(postId: string, businessId: string) {
    const existing = await prisma.post.findFirst({
      where: { id: postId, businessId },
    })

    if (!existing) {
      throw new Error('Post not found')
    }

    if (existing.status === 'published') {
      throw new Error('Cannot delete a published post')
    }

    await prisma.post.delete({
      where: { id: postId },
    })

    logger.info('Social post deleted', { postId })
    return { success: true }
  }

  static async list(businessId: string, page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit
    const where: Record<string, unknown> = { businessId }

    if (status) {
      where.status = status
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.post.count({ where }),
    ])

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  static async publish(postId: string, businessId: string) {
    const post = await prisma.post.findFirst({
      where: { id: postId, businessId },
    })

    if (!post) {
      throw new Error('Post not found')
    }

    if (post.status !== 'draft' && post.status !== 'scheduled') {
      throw new Error('Post must be in draft or scheduled status to publish')
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        fbPageId: true,
        fbAccessToken: true,
        igUserId: true,
        igAccessToken: true,
        linkedinPageId: true,
        linkedinAccessToken: true,
        twitterUserId: true,
        twitterAccessToken: true,
        gbpAccessToken: true,
        gbpLocationId: true,
      },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    const publishedIds: Record<string, string> = {}
    const errors: string[] = []

    for (const platform of post.platforms) {
      try {
        const result = await this.publishToPlatform(platform, post, business)
        if (result) {
          publishedIds[platform] = result
        }
      } catch (error) {
        errors.push(`${platform}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        logger.error(`Failed to publish to ${platform}`, { postId, error })
      }
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        status: errors.length === post.platforms.length ? 'failed' : 'published',
        publishedAt: new Date(),
        publishedIds: publishedIds as any,
      },
    })

    logger.info('Post published', { postId, publishedIds, errors })
    return { post: updated, publishedIds, errors }
  }

  static async getStats(postId: string, businessId: string) {
    const post = await prisma.post.findFirst({
      where: { id: postId, businessId },
    })

    if (!post) {
      throw new Error('Post not found')
    }

    const stats = (post.stats as Record<string, unknown> | undefined) || {}

    return {
      id: post.id,
      platforms: post.platforms,
      status: post.status,
      publishedAt: post.publishedAt,
      stats,
    }
  }

  static async updateStats(postId: string, stats: Record<string, unknown>) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { stats: true },
    })

    if (!post) {
      throw new Error('Post not found')
    }

    const currentStats = (post.stats as Record<string, unknown> | undefined) || {}
    const merged = { ...currentStats, ...stats }

    return prisma.post.update({
      where: { id: postId },
      data: { stats: merged as any },
    })
  }

  private static async publishToPlatform(
    platform: string,
    post: { content: string; mediaUrls: string[]; link: string | null },
    business: Record<string, string | null>
  ): Promise<string | null> {
    switch (platform) {
      case 'facebook':
        return this.publishToFacebook(post, business)
      case 'instagram':
        return this.publishToInstagram(post, business)
      case 'linkedin':
        return this.publishToLinkedIn(post, business)
      case 'twitter':
        return this.publishToTwitter(post, business)
      case 'google':
        return this.publishToGBP(post, business)
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
  }

  private static async publishToFacebook(
    post: { content: string; mediaUrls: string[]; link: string | null },
    business: Record<string, string | null>
  ): Promise<string | null> {
    if (!business.fbPageId || !business.fbAccessToken) {
      throw new Error('Facebook not configured')
    }

    const mediaUrl = post.mediaUrls[0]

    if (mediaUrl) {
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${business.fbPageId}/photos`,
        {
          url: mediaUrl,
          message: post.content,
          access_token: business.fbAccessToken,
        }
      )
      return response.data.id
    }

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${business.fbPageId}/feed`,
      {
        message: post.content,
        link: post.link || undefined,
        access_token: business.fbAccessToken,
      }
    )

    return response.data.id
  }

  private static async publishToInstagram(
    post: { content: string; mediaUrls: string[]; link: string | null },
    business: Record<string, string | null>
  ): Promise<string | null> {
    if (!business.igUserId || !business.igAccessToken) {
      throw new Error('Instagram not configured')
    }

    const mediaUrl = post.mediaUrls[0]
    if (!mediaUrl) {
      throw new Error('Instagram requires a media URL')
    }

    const isVideo = mediaUrl.match(/\.(mp4|mov|avi)$/i)

    let containerId: string

    if (isVideo) {
      const containerRes = await axios.post(
        `https://graph.facebook.com/v18.0/${business.igUserId}/video_container`,
        {
          video_url: mediaUrl,
          caption: post.content,
          access_token: business.igAccessToken,
        }
      )
      containerId = containerRes.data.id
    } else {
      const containerRes = await axios.post(
        `https://graph.facebook.com/v18.0/${business.igUserId}/media`,
        {
          image_url: mediaUrl,
          caption: post.content,
          access_token: business.igAccessToken,
        }
      )
      containerId = containerRes.data.id
    }

    await new Promise((resolve) => setTimeout(resolve, 5000))

    const publishRes = await axios.post(
      `https://graph.facebook.com/v18.0/${business.igUserId}/media_publish`,
      {
        creation_id: containerId,
        access_token: business.igAccessToken,
      }
    )

    return publishRes.data.id
  }

  private static async publishToLinkedIn(
    post: { content: string; mediaUrls: string[]; link: string | null },
    business: Record<string, string | null>
  ): Promise<string | null> {
    if (!business.linkedinPageId || !business.linkedinAccessToken) {
      throw new Error('LinkedIn not configured')
    }

    const response = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      {
        author: `urn:li:organization:${business.linkedinPageId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: post.content },
            shareMediaCategory: post.mediaUrls.length > 0 ? 'IMAGE' : 'NONE',
            media: post.mediaUrls.length > 0
              ? [{
                  status: 'READY',
                  description: { text: post.content },
                  media: post.mediaUrls[0],
                  title: { text: '' },
                }]
              : undefined,
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${business.linkedinAccessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    )

    return response.headers['x-restli-id'] || response.data.id
  }

  private static async publishToTwitter(
    post: { content: string; mediaUrls: string[]; link: string | null },
    business: Record<string, string | null>
  ): Promise<string | null> {
    if (!business.twitterAccessToken) {
      throw new Error('Twitter not configured')
    }

    const response = await axios.post(
      'https://api.twitter.com/2/tweets',
      { text: post.content },
      {
        headers: {
          Authorization: `Bearer ${business.twitterAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    return response.data.data.id
  }

  private static async publishToGBP(
    post: { content: string; mediaUrls: string[]; link: string | null },
    business: Record<string, string | null>
  ): Promise<string | null> {
    if (!business.gbpAccessToken || !business.gbpLocationId) {
      throw new Error('Google Business Profile not configured')
    }

    const locationName = `accounts/-/locations/${business.gbpLocationId}`

    const response = await axios.post(
      `https://mybusiness.googleapis.com/v4/${locationName}/localPosts`,
      {
        languageCode: 'en-US',
        summary: post.content,
        state: 'LIVE',
        media: post.mediaUrls.length > 0
          ? [{
              mediaFormat: 'PHOTO',
              sourceUrl: post.mediaUrls[0],
            }]
          : undefined,
      },
      {
        headers: {
          Authorization: `Bearer ${business.gbpAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    return response.data.name
  }
}
