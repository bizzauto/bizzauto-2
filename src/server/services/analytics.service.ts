import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'

export class AnalyticsService {
  static async getDashboardStats(businessId: string, period = '30d') {
    const now = new Date()
    let startDate: Date

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    const [
      totalContacts,
      newContacts,
      totalMessages,
      messagesSent,
      messagesReceived,
      totalCampaigns,
      activeCampaigns,
      totalOrders,
      revenue,
      totalAppointments,
      upcomingAppointments,
      totalReviews,
      averageRating,
    ] = await Promise.all([
      prisma.contact.count({ where: { businessId } }),
      prisma.contact.count({ where: { businessId, createdAt: { gte: startDate } } }),
      prisma.message.count({ where: { businessId } }),
      prisma.message.count({ where: { businessId, direction: 'outbound', createdAt: { gte: startDate } } }),
      prisma.message.count({ where: { businessId, direction: 'inbound', createdAt: { gte: startDate } } }),
      prisma.campaign.count({ where: { businessId } }),
      prisma.campaign.count({ where: { businessId, status: 'running' } }),
      prisma.order.count({ where: { businessId } }),
      prisma.order.aggregate({
        where: { businessId, paymentStatus: 'paid', createdAt: { gte: startDate } },
        _sum: { total: true },
      }),
      prisma.appointment.count({ where: { businessId } }),
      prisma.appointment.count({
        where: { businessId, status: { in: ['pending', 'confirmed'] }, startTime: { gte: now } },
      }),
      prisma.review.count({ where: { businessId, isPublished: true } }),
      prisma.review.aggregate({
        where: { businessId, isPublished: true },
        _avg: { rating: true },
      }),
    ])

    return {
      contacts: {
        total: totalContacts,
        newInPeriod: newContacts,
      },
      messages: {
        total: totalMessages,
        sentInPeriod: messagesSent,
        receivedInPeriod: messagesReceived,
      },
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
      },
      orders: {
        total: totalOrders,
        revenue: revenue._sum.total || 0,
      },
      appointments: {
        total: totalAppointments,
        upcoming: upcomingAppointments,
      },
      reviews: {
        total: totalReviews,
        averageRating: Math.round((averageRating._avg.rating || 0) * 10) / 10,
      },
    }
  }

  static async getContactGrowth(businessId: string, days = 30) {
    const now = new Date()
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    const contacts = await prisma.contact.findMany({
      where: {
        businessId,
        createdAt: { gte: startDate },
      },
      select: { createdAt: true, source: true },
      orderBy: { createdAt: 'asc' },
    })

    const dailyGrowth: Array<{ date: string; count: number; bySource: Record<string, number> }> = []
    const bySource: Record<string, number> = {}

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]

      const dayContacts = contacts.filter(
        (c: { createdAt: Date; source: string }) => c.createdAt.toISOString().split('T')[0] === dateStr
      )

      const dayBySource: Record<string, number> = {}
      dayContacts.forEach((c: { source: string }) => {
        dayBySource[c.source] = (dayBySource[c.source] || 0) + 1
        bySource[c.source] = (bySource[c.source] || 0) + 1
      })

      dailyGrowth.push({
        date: dateStr,
        count: dayContacts.length,
        bySource: dayBySource,
      })
    }

    return {
      dailyGrowth,
      totalNew: contacts.length,
      bySource,
    }
  }

  static async getMessageAnalytics(businessId: string, days = 30) {
    const now = new Date()
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    const messages = await prisma.message.findMany({
      where: {
        businessId,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        direction: true,
        type: true,
        status: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    const dailyMessages: Array<{
      date: string
      sent: number
      received: number
      delivered: number
      failed: number
      byType: Record<string, number>
    }> = []

    const byType: Record<string, number> = {}

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]

      const dayMessages = messages.filter(
        (m: { createdAt: Date; direction: string; type: string; status: string }) => m.createdAt.toISOString().split('T')[0] === dateStr
      )

      const dayByType: Record<string, number> = {}
      dayMessages.forEach((m: { type: string }) => {
        dayByType[m.type] = (dayByType[m.type] || 0) + 1
        byType[m.type] = (byType[m.type] || 0) + 1
      })

      dailyMessages.push({
        date: dateStr,
        sent: dayMessages.filter((m: { direction: string }) => m.direction === 'outbound').length,
        received: dayMessages.filter((m: { direction: string }) => m.direction === 'inbound').length,
        delivered: dayMessages.filter((m: { status: string }) => m.status === 'delivered').length,
        failed: dayMessages.filter((m: { status: string }) => m.status === 'failed').length,
        byType: dayByType,
      })
    }

    return {
      dailyMessages,
      total: messages.length,
      sent: messages.filter((m: { direction: string }) => m.direction === 'outbound').length,
      received: messages.filter((m: { direction: string }) => m.direction === 'inbound').length,
      delivered: messages.filter((m: { status: string }) => m.status === 'delivered').length,
      failed: messages.filter((m: { status: string }) => m.status === 'failed').length,
      byType,
    }
  }

  static async getCampaignPerformance(businessId: string) {
    const campaigns = await prisma.campaign.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const totalSent = campaigns.reduce((sum: number, c: { totalSent: number }) => sum + c.totalSent, 0)
    const totalDelivered = campaigns.reduce((sum: number, c: { totalDelivered: number }) => sum + c.totalDelivered, 0)
    const totalRead = campaigns.reduce((sum: number, c: { totalRead: number }) => sum + c.totalRead, 0)
    const totalReplied = campaigns.reduce((sum: number, c: { totalReplied: number }) => sum + c.totalReplied, 0)
    const totalFailed = campaigns.reduce((sum: number, c: { totalFailed: number }) => sum + c.totalFailed, 0)

    const byStatus: Record<string, number> = {}
    const byType: Record<string, number> = {}

    campaigns.forEach((c: { status: string; type: string }) => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1
      byType[c.type] = (byType[c.type] || 0) + 1
    })

    return {
      totalCampaigns: campaigns.length,
      totalSent,
      totalDelivered,
      totalRead,
      totalReplied,
      totalFailed,
      overallDeliveryRate: totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(2) : '0',
      overallReadRate: totalDelivered > 0 ? ((totalRead / totalDelivered) * 100).toFixed(2) : '0',
      overallReplyRate: totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(2) : '0',
      byStatus,
      byType,
      campaigns: campaigns.map((c: { id: string; name: string; type: string; status: string; totalContacts: number; totalSent: number; totalDelivered: number; totalRead: number; totalReplied: number; totalFailed: number; createdAt: Date }) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        status: c.status,
        totalContacts: c.totalContacts,
        totalSent: c.totalSent,
        totalDelivered: c.totalDelivered,
        totalRead: c.totalRead,
        totalReplied: c.totalReplied,
        totalFailed: c.totalFailed,
        createdAt: c.createdAt,
      })),
    }
  }

  static async getRevenueStats(businessId: string, days = 30) {
    const now = new Date()
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    const orders = await prisma.order.findMany({
      where: {
        businessId,
        createdAt: { gte: startDate },
      },
      select: {
        total: true,
        paymentStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    const dailyRevenue: Array<{ date: string; revenue: number; orders: number }> = []

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]

      const dayOrders = orders.filter(
        (o: { createdAt: Date }) => o.createdAt.toISOString().split('T')[0] === dateStr
      )

      dailyRevenue.push({
        date: dateStr,
        revenue: dayOrders.reduce((sum: number, o: { total: number }) => sum + o.total, 0),
        orders: dayOrders.length,
      })
    }

    const totalRevenue = orders.filter((o: { paymentStatus: string }) => o.paymentStatus === 'paid').reduce((sum: number, o: { total: number }) => sum + o.total, 0)
    const pendingRevenue = orders.filter((o: { paymentStatus: string }) => o.paymentStatus === 'pending').reduce((sum: number, o: { total: number }) => sum + o.total, 0)

    const byStatus: Record<string, { count: number; revenue: number }> = {}
    orders.forEach((o: { paymentStatus: string; total: number }) => {
      if (!byStatus[o.paymentStatus]) {
        byStatus[o.paymentStatus] = { count: 0, revenue: 0 }
      }
      byStatus[o.paymentStatus].count++
      byStatus[o.paymentStatus].revenue += o.total
    })

    return {
      dailyRevenue,
      totalRevenue,
      pendingRevenue,
      totalOrders: orders.length,
      paidOrders: orders.filter((o: { paymentStatus: string }) => o.paymentStatus === 'paid').length,
      byStatus,
      averageOrderValue: orders.length > 0 ? totalRevenue / orders.filter((o: { paymentStatus: string }) => o.paymentStatus === 'paid').length || 0 : 0,
    }
  }

  static async getContactSources(businessId: string) {
    const sources = await prisma.contact.groupBy({
      by: ['source'],
      where: { businessId },
      _count: true,
    })

    return sources.map((s: { source: string; _count: number }) => ({
      source: s.source,
      count: s._count,
    }))
  }

  static async getContactStatusDistribution(businessId: string) {
    const statuses = await prisma.contact.groupBy({
      by: ['status'],
      where: { businessId },
      _count: true,
    })

    return statuses.map((s: { status: string; _count: number }) => ({
      status: s.status,
      count: s._count,
    }))
  }

  static async getTopContacts(businessId: string, limit = 10) {
    return prisma.contact.findMany({
      where: { businessId },
      orderBy: { dealValue: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        company: true,
        dealValue: true,
        status: true,
        tags: true,
      },
    })
  }
}
