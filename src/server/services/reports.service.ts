import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'

export class ReportsService {
  static async exportContactsCSV(businessId: string, filters?: Record<string, unknown>) {
    const where: Record<string, unknown> = { businessId }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.source) {
      where.source = filters.source
    }

    if (filters?.tags) {
      where.tags = { hasSome: filters.tags as string[] }
    }

    const contacts = await prisma.contact.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        company: true,
        title: true,
        city: true,
        state: true,
        tags: true,
        status: true,
        source: true,
        dealValue: true,
        stage: true,
        assignedTo: true,
        whatsappOptIn: true,
        emailOptIn: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const headers = [
      'ID', 'Name', 'Phone', 'Email', 'Company', 'Title',
      'City', 'State', 'Tags', 'Status', 'Source', 'Deal Value',
      'Stage', 'Assigned To', 'WhatsApp Opt-In', 'Email Opt-In',
      'Created At', 'Updated At',
    ]

    const rows = contacts.map((c: { id: string; name: string; phone: string | null; email: string | null; company: string | null; title: string | null; city: string | null; state: string | null; tags: string[]; status: string; source: string; dealValue: number | null; stage: string | null; assignedTo: string | null; whatsappOptIn: boolean; emailOptIn: boolean; createdAt: Date; updatedAt: Date }) => [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      c.phone || '',
      c.email || '',
      c.company || '',
      c.title || '',
      c.city || '',
      c.state || '',
      `"${(c.tags || []).join(', ')}"`,
      c.status,
      c.source,
      c.dealValue?.toString() || '0',
      c.stage || '',
      c.assignedTo || '',
      c.whatsappOptIn ? 'Yes' : 'No',
      c.emailOptIn ? 'Yes' : 'No',
      c.createdAt.toISOString(),
      c.updatedAt.toISOString(),
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    return csv
  }

  static async exportCampaignsCSV(businessId: string) {
    const campaigns = await prisma.campaign.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    })

    const headers = [
      'ID', 'Name', 'Type', 'Status', 'Total Contacts',
      'Total Sent', 'Total Delivered', 'Total Read',
      'Total Replied', 'Total Failed', 'Created At',
      'Started At', 'Completed At',
    ]

    const rows = campaigns.map((c) => [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      c.type,
      c.status,
      c.totalContacts.toString(),
      c.totalSent.toString(),
      c.totalDelivered.toString(),
      c.totalRead.toString(),
      c.totalReplied.toString(),
      c.totalFailed.toString(),
      c.createdAt.toISOString(),
      c.startedAt?.toISOString() || '',
      c.completedAt?.toISOString() || '',
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    return csv
  }

  static async exportOrdersCSV(businessId: string) {
    const orders = await prisma.order.findMany({
      where: { businessId },
      include: {
        contact: { select: { name: true, phone: true, email: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const headers = [
      'Order Number', 'Contact Name', 'Contact Phone', 'Contact Email',
      'Status', 'Payment Status', 'Subtotal', 'Tax', 'Shipping',
      'Discount', 'Total', 'Items Count', 'Created At', 'Updated At',
    ]

    const rows = orders.map((o) => [
      o.orderNumber,
      `"${o.contact?.name?.replace(/"/g, '""') || ''}"`,
      o.contact?.phone || '',
      o.contact?.email || '',
      o.status,
      o.paymentStatus,
      o.subtotal.toString(),
      o.taxAmount.toString(),
      o.shippingAmount.toString(),
      o.discountAmount.toString(),
      o.total.toString(),
      o.items.length.toString(),
      o.createdAt.toISOString(),
      o.updatedAt.toISOString(),
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    return csv
  }

  static async exportReviewsCSV(businessId: string) {
    const reviews = await prisma.review.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    })

    const headers = [
      'ID', 'Platform', 'Reviewer Name', 'Reviewer Email',
      'Rating', 'Text', 'Reply Text', 'Reply Status',
      'Is Published', 'Is Featured', 'Review Date', 'Created At',
    ]

    const rows = reviews.map((r) => [
      r.id,
      r.platform,
      `"${r.reviewerName.replace(/"/g, '""')}"`,
      r.reviewerEmail || '',
      r.rating.toString(),
      `"${(r.text || '').replace(/"/g, '""')}"`,
      `"${(r.replyText || '').replace(/"/g, '""')}"`,
      r.replyStatus || '',
      r.isPublished ? 'Yes' : 'No',
      r.isFeatured ? 'Yes' : 'No',
      r.reviewDate?.toISOString() || '',
      r.createdAt.toISOString(),
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    return csv
  }

  static async exportAppointmentsCSV(businessId: string) {
    const appointments = await prisma.appointment.findMany({
      where: { businessId },
      include: { contact: { select: { name: true, phone: true } } },
      orderBy: { startTime: 'desc' },
    })

    const headers = [
      'ID', 'Title', 'Contact Name', 'Contact Phone',
      'Service', 'Start Time', 'End Time', 'Status',
      'Location', 'Is Online', 'Reminder Sent', 'Created At',
    ]

    const rows = appointments.map((a) => [
      a.id,
      `"${a.title.replace(/"/g, '""')}"`,
      a.contact?.name || '',
      a.contact?.phone || '',
      a.service || '',
      a.startTime.toISOString(),
      a.endTime.toISOString(),
      a.status,
      a.location || '',
      a.isOnline ? 'Yes' : 'No',
      a.reminderSent ? 'Yes' : 'No',
      a.createdAt.toISOString(),
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    return csv
  }

  static async generateSummaryReport(businessId: string, period: '7d' | '30d' | '90d' | '1y') {
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
    }

    const [
      business,
      contactStats,
      messageStats,
      campaignStats,
      orderStats,
      reviewStats,
      appointmentStats,
    ] = await Promise.all([
      prisma.business.findUnique({ where: { id: businessId } }),
      this.getContactStats(businessId, startDate),
      this.getMessageStats(businessId, startDate),
      this.getCampaignStats(businessId, startDate),
      this.getOrderStats(businessId, startDate),
      this.getReviewStats(businessId),
      this.getAppointmentStats(businessId, startDate),
    ])

    return {
      business: {
        name: business?.name,
        plan: business?.plan,
        period,
        generatedAt: now.toISOString(),
      },
      contacts: contactStats,
      messages: messageStats,
      campaigns: campaignStats,
      orders: orderStats,
      reviews: reviewStats,
      appointments: appointmentStats,
    }
  }

  private static async getContactStats(businessId: string, startDate: Date) {
    const [total, newContacts, bySource, byStatus] = await Promise.all([
      prisma.contact.count({ where: { businessId } }),
      prisma.contact.count({ where: { businessId, createdAt: { gte: startDate } } }),
      prisma.contact.groupBy({
        by: ['source'],
        where: { businessId },
        _count: true,
      }),
      prisma.contact.groupBy({
        by: ['status'],
        where: { businessId },
        _count: true,
      }),
    ])

    return {
      total,
      newInPeriod: newContacts,
      bySource,
      byStatus,
    }
  }

  private static async getMessageStats(businessId: string, startDate: Date) {
    const [total, sent, received, byType] = await Promise.all([
      prisma.message.count({ where: { businessId, createdAt: { gte: startDate } } }),
      prisma.message.count({ where: { businessId, direction: 'outbound', createdAt: { gte: startDate } } }),
      prisma.message.count({ where: { businessId, direction: 'inbound', createdAt: { gte: startDate } } }),
      prisma.message.groupBy({
        by: ['type'],
        where: { businessId, createdAt: { gte: startDate } },
        _count: true,
      }),
    ])

    return { total, sent, received, byType }
  }

  private static async getCampaignStats(businessId: string, startDate: Date) {
    const campaigns = await prisma.campaign.findMany({
      where: { businessId, createdAt: { gte: startDate } },
    })

    return {
      total: campaigns.length,
      totalSent: campaigns.reduce((sum, c) => sum + c.totalSent, 0),
      totalDelivered: campaigns.reduce((sum, c) => sum + c.totalDelivered, 0),
      totalReplied: campaigns.reduce((sum, c) => sum + c.totalReplied, 0),
    }
  }

  private static async getOrderStats(businessId: string, startDate: Date) {
    const [total, revenue, byStatus] = await Promise.all([
      prisma.order.count({ where: { businessId, createdAt: { gte: startDate } } }),
      prisma.order.aggregate({
        where: { businessId, paymentStatus: 'paid', createdAt: { gte: startDate } },
        _sum: { total: true },
      }),
      prisma.order.groupBy({
        by: ['status'],
        where: { businessId, createdAt: { gte: startDate } },
        _count: true,
      }),
    ])

    return {
      total,
      revenue: revenue._sum.total || 0,
      byStatus,
    }
  }

  private static async getReviewStats(businessId: string) {
    const [total, avgRating] = await Promise.all([
      prisma.review.count({ where: { businessId, isPublished: true } }),
      prisma.review.aggregate({
        where: { businessId, isPublished: true },
        _avg: { rating: true },
      }),
    ])

    return {
      total,
      averageRating: Math.round((avgRating._avg.rating || 0) * 10) / 10,
    }
  }

  private static async getAppointmentStats(businessId: string, startDate: Date) {
    const [total, completed, upcoming] = await Promise.all([
      prisma.appointment.count({ where: { businessId, createdAt: { gte: startDate } } }),
      prisma.appointment.count({ where: { businessId, status: 'completed' } }),
      prisma.appointment.count({
        where: { businessId, status: { in: ['pending', 'confirmed'] }, startTime: { gte: new Date() } },
      }),
    ])

    return { total, completed, upcoming }
  }
}
