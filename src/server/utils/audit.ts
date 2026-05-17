import { prisma } from '../config/database'

export async function createAuditLog(data: {
  businessId: string
  action: string
  entity: string
  entityId?: string
  oldValues?: any
  newValues?: any
  description?: string
  userId?: string
  userEmail?: string
  ipAddress?: string
  userAgent?: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        businessId: data.businessId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        oldValues: data.oldValues ? JSON.parse(JSON.stringify(data.oldValues)) : null,
        newValues: data.newValues ? JSON.parse(JSON.stringify(data.newValues)) : null,
        description: data.description,
        userId: data.userId,
        userEmail: data.userEmail,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}
