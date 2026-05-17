import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'
import { z } from 'zod'

const appointmentCreateSchema = z.object({
  contactId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  service: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  status: z.string().default('pending'),
  location: z.string().optional(),
  isOnline: z.boolean().default(false),
  meetingLink: z.string().optional(),
})

const appointmentUpdateSchema = appointmentCreateSchema.partial()

export class AppointmentsService {
  static async getById(appointmentId: string, businessId: string) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, businessId },
      include: { contact: true },
    })

    if (!appointment) {
      throw new Error('Appointment not found')
    }

    return appointment
  }

  static async create(businessId: string, userId: string, data: z.infer<typeof appointmentCreateSchema>) {
    const validated = appointmentCreateSchema.parse(data)

    const startTime = new Date(validated.startTime)
    const endTime = new Date(validated.endTime)

    if (endTime <= startTime) {
      throw new Error('End time must be after start time')
    }

    const conflict = await this.detectConflict(businessId, startTime, endTime, validated.contactId)

    if (conflict) {
      throw new Error('Time slot conflicts with an existing appointment')
    }

    const appointment = await prisma.appointment.create({
      data: {
        businessId,
        contactId: validated.contactId,
        title: validated.title,
        description: validated.description,
        service: validated.service,
        startTime,
        endTime,
        status: validated.status,
        location: validated.location,
        isOnline: validated.isOnline,
        meetingLink: validated.meetingLink,
        createdById: userId,
      },
      include: { contact: true },
    })

    logger.info('Appointment created', { appointmentId: appointment.id, businessId })
    return appointment
  }

  static async update(appointmentId: string, businessId: string, data: z.infer<typeof appointmentUpdateSchema>) {
    const validated = appointmentUpdateSchema.parse(data)

    const existing = await prisma.appointment.findFirst({
      where: { id: appointmentId, businessId },
    })

    if (!existing) {
      throw new Error('Appointment not found')
    }

    const startTime = validated.startTime ? new Date(validated.startTime) : existing.startTime
    const endTime = validated.endTime ? new Date(validated.endTime) : existing.endTime

    if (endTime <= startTime) {
      throw new Error('End time must be after start time')
    }

    const conflict = await this.detectConflict(businessId, startTime, endTime, validated.contactId || existing.contactId, appointmentId)

    if (conflict) {
      throw new Error('Time slot conflicts with an existing appointment')
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: validated,
      include: { contact: true },
    })

    logger.info('Appointment updated', { appointmentId })
    return updated
  }

  static async delete(appointmentId: string, businessId: string) {
    const existing = await prisma.appointment.findFirst({
      where: { id: appointmentId, businessId },
    })

    if (!existing) {
      throw new Error('Appointment not found')
    }

    await prisma.appointment.delete({
      where: { id: appointmentId },
    })

    logger.info('Appointment deleted', { appointmentId })
    return { success: true }
  }

  static async list(businessId: string, page = 1, limit = 20, status?: string, dateFrom?: string, dateTo?: string) {
    const skip = (page - 1) * limit
    const where: Record<string, unknown> = { businessId }

    if (status) {
      where.status = status
    }

    if (dateFrom || dateTo) {
      where.startTime = {}
      if (dateFrom) {
        (where.startTime as Record<string, unknown>).gte = new Date(dateFrom)
      }
      if (dateTo) {
        (where.startTime as Record<string, unknown>).lte = new Date(dateTo)
      }
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        orderBy: { startTime: 'asc' },
        skip,
        take: limit,
        include: { contact: { select: { name: true, phone: true, email: true } } },
      }),
      prisma.appointment.count({ where }),
    ])

    return {
      appointments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  static async updateStatus(appointmentId: string, businessId: string, status: string) {
    const existing = await prisma.appointment.findFirst({
      where: { id: appointmentId, businessId },
    })

    if (!existing) {
      throw new Error('Appointment not found')
    }

    return prisma.appointment.update({
      where: { id: appointmentId },
      data: { status },
      include: { contact: true },
    })
  }

  static async getAvailableSlots(
    businessId: string,
    date: string,
    durationMinutes = 30,
    startHour = 9,
    endHour = 17
  ) {
    const dayStart = new Date(date)
    dayStart.setHours(startHour, 0, 0, 0)

    const dayEnd = new Date(date)
    dayEnd.setHours(endHour, 0, 0, 0)

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        businessId,
        status: { not: 'cancelled' },
        startTime: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      select: { startTime: true, endTime: true },
    })

    const slots: Array<{ start: string; end: string; available: boolean }> = []
    let current = new Date(dayStart)

    while (current < dayEnd) {
      const slotEnd = new Date(current.getTime() + durationMinutes * 60 * 1000)

      if (slotEnd > dayEnd) break

      const hasConflict = existingAppointments.some((apt: { startTime: Date; endTime: Date }) => {
        return current < apt.endTime && slotEnd > apt.startTime
      })

      slots.push({
        start: current.toISOString(),
        end: slotEnd.toISOString(),
        available: !hasConflict,
      })

      current = slotEnd
    }

    return slots
  }

  static async sendReminders(businessId: string) {
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        businessId,
        status: { in: ['pending', 'confirmed'] },
        startTime: {
          gte: new Date(),
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        reminderSent: false,
      },
      include: { contact: true },
    })

    const remindersSent: string[] = []

    for (const appointment of upcomingAppointments) {
      if (appointment.contact?.phone) {
        logger.info('Appointment reminder would be sent', {
          appointmentId: appointment.id,
          contactPhone: appointment.contact.phone,
        })
      }

      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { reminderSent: true },
      })

      remindersSent.push(appointment.id)
    }

    return { remindersSent: remindersSent.length, appointmentIds: remindersSent }
  }

  private static async detectConflict(
    businessId: string,
    startTime: Date,
    endTime: Date,
    contactId?: string | null,
    excludeId?: string
  ) {
    const where: Record<string, unknown> = {
      businessId,
      status: { not: 'cancelled' },
      startTime: {
        lt: endTime,
      },
      endTime: {
        gt: startTime,
      },
    }

    if (excludeId) {
      where.id = { not: excludeId }
    }

    return prisma.appointment.findFirst({ where })
  }
}
