import { prisma } from '../config/database'
import { logger } from '../config/logger'
import env from '../config/env'
import { z } from 'zod'

const documentCreateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['invoice', 'quote', 'proposal', 'contract', 'receipt', 'other']),
  templateId: z.string().optional(),
  documentNumber: z.string().optional(),
  content: z.record(z.string(), z.unknown()),
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
  clientEmail: z.string().optional(),
  contactId: z.string().optional(),
  amount: z.number().optional(),
})

const documentUpdateSchema = documentCreateSchema.partial()

const templateCreateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['invoice', 'quote', 'proposal', 'contract', 'receipt', 'other']),
  description: z.string().optional(),
  header: z.string().optional(),
  footer: z.string().optional(),
  content: z.string().min(1),
  css: z.string().optional(),
  variables: z.array(z.string()).default([]),
  isDefault: z.boolean().default(false),
})

const templateUpdateSchema = templateCreateSchema.partial()

export class DocumentsService {
  static async getDocument(documentId: string, businessId: string) {
    const document = await prisma.document.findFirst({
      where: { id: documentId, businessId },
      include: { contact: true },
    })

    if (!document) {
      throw new Error('Document not found')
    }

    return document
  }

  static async createDocument(businessId: string, userId: string, data: z.infer<typeof documentCreateSchema>) {
    const validated = documentCreateSchema.parse(data)

    let documentNumber = validated.documentNumber

    if (!documentNumber) {
      const prefix = validated.type.toUpperCase().substring(0, 3)
      const count = await prisma.document.count({
        where: { businessId, type: validated.type },
      })
      documentNumber = `${prefix}-${String(count + 1).padStart(5, '0')}`
    }

    const document = await prisma.document.create({
      data: {
        businessId,
        name: validated.name,
        type: validated.type,
        templateId: validated.templateId,
        documentNumber,
        content: validated.content as any,
        clientName: validated.clientName,
        clientPhone: validated.clientPhone,
        clientEmail: validated.clientEmail,
        contactId: validated.contactId,
        amount: validated.amount,
        createdById: userId,
      },
      include: { contact: true },
    })

    logger.info('Document created', { documentId: document.id, businessId })
    return document
  }

  static async updateDocument(documentId: string, businessId: string, data: z.infer<typeof documentUpdateSchema>) {
    const validated = documentUpdateSchema.parse(data)

    const existing = await prisma.document.findFirst({
      where: { id: documentId, businessId },
    })

    if (!existing) {
      throw new Error('Document not found')
    }

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: validated as any,
      include: { contact: true },
    })

    logger.info('Document updated', { documentId })
    return updated
  }

  static async deleteDocument(documentId: string, businessId: string) {
    const existing = await prisma.document.findFirst({
      where: { id: documentId, businessId },
    })

    if (!existing) {
      throw new Error('Document not found')
    }

    await prisma.document.delete({
      where: { id: documentId },
    })

    logger.info('Document deleted', { documentId })
    return { success: true }
  }

  static async listDocuments(businessId: string, page = 1, limit = 20, type?: string, status?: string) {
    const skip = (page - 1) * limit
    const where: Record<string, unknown> = { businessId }

    if (type) {
      where.type = type
    }

    if (status) {
      where.status = status
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { contact: { select: { name: true, phone: true, email: true } } },
      }),
      prisma.document.count({ where }),
    ])

    return {
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  static async updateDocumentStatus(documentId: string, businessId: string, status: string) {
    const existing = await prisma.document.findFirst({
      where: { id: documentId, businessId },
    })

    if (!existing) {
      throw new Error('Document not found')
    }

    return prisma.document.update({
      where: { id: documentId },
      data: { status },
    })
  }

  static async generatePublicLink(documentId: string, businessId: string, expiryHours = 24) {
    const existing = await prisma.document.findFirst({
      where: { id: documentId, businessId },
    })

    if (!existing) {
      throw new Error('Document not found')
    }

    const publicLink = `${env.BASE_URL || 'http://localhost:5173'}/documents/public/${documentId}`
    const expiry = new Date(Date.now() + expiryHours * 60 * 60 * 1000)

    return prisma.document.update({
      where: { id: documentId },
      data: {
        publicLink,
        publicLinkExpiry: expiry,
      },
    })
  }

  static async getTemplate(templateId: string, businessId: string) {
    const template = await prisma.documentTemplate.findFirst({
      where: { id: templateId, businessId },
    })

    if (!template) {
      throw new Error('Template not found')
    }

    return template
  }

  static async createTemplate(businessId: string, data: z.infer<typeof templateCreateSchema>) {
    const validated = templateCreateSchema.parse(data)

    if (validated.isDefault) {
      await prisma.documentTemplate.updateMany({
        where: { businessId, type: validated.type, isDefault: true },
        data: { isDefault: false },
      })
    }

    const template = await prisma.documentTemplate.create({
      data: {
        businessId,
        name: validated.name,
        type: validated.type,
        description: validated.description,
        header: validated.header,
        footer: validated.footer,
        content: validated.content,
        css: validated.css,
        variables: validated.variables as any,
        isDefault: validated.isDefault,
      },
    })

    logger.info('Document template created', { templateId: template.id, businessId })
    return template
  }

  static async updateTemplate(templateId: string, businessId: string, data: z.infer<typeof templateUpdateSchema>) {
    const validated = templateUpdateSchema.parse(data)

    const existing = await prisma.documentTemplate.findFirst({
      where: { id: templateId, businessId },
    })

    if (!existing) {
      throw new Error('Template not found')
    }

    if (validated.isDefault) {
      await prisma.documentTemplate.updateMany({
        where: { businessId, type: existing.type, isDefault: true, id: { not: templateId } },
        data: { isDefault: false },
      })
    }

    const updated = await prisma.documentTemplate.update({
      where: { id: templateId },
      data: validated,
    })

    logger.info('Document template updated', { templateId })
    return updated
  }

  static async deleteTemplate(templateId: string, businessId: string) {
    const existing = await prisma.documentTemplate.findFirst({
      where: { id: templateId, businessId },
    })

    if (!existing) {
      throw new Error('Template not found')
    }

    await prisma.documentTemplate.delete({
      where: { id: templateId },
    })

    logger.info('Document template deleted', { templateId })
    return { success: true }
  }

  static async listTemplates(businessId: string, type?: string) {
    const where: Record<string, unknown> = { businessId }

    if (type) {
      where.type = type
    }

    return prisma.documentTemplate.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })
  }

  static async generateHTMLFromTemplate(templateId: string, variables: Record<string, string>) {
    const template = await prisma.documentTemplate.findUnique({
      where: { id: templateId },
    })

    if (!template) {
      throw new Error('Template not found')
    }

    let html = template.content

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      html = html.replace(regex, value)
    }

    const fullHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${template.css ? `<style>${template.css}</style>` : ''}
      </head>
      <body>
        ${template.header ? `<header>${template.header}</header>` : ''}
        <main>${html}</main>
        ${template.footer ? `<footer>${template.footer}</footer>` : ''}
      </body>
      </html>
    `

    return fullHTML
  }

  static async generatePDF(htmlContent: string): Promise<Buffer> {
    try {
      // @ts-expect-error html-pdf-node has no types
      const htmlPdfNode = await import('html-pdf-node')

      const file = { content: htmlContent }
      const options = { format: 'A4', preferCSSPageSize: true }

      const pdfBuffer = await htmlPdfNode.generatePdf(file, options)
      return pdfBuffer
    } catch (error) {
      logger.error('PDF generation failed', { error })
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  static async generateDocumentFromTemplate(
    businessId: string,
    userId: string,
    templateId: string,
    variables: Record<string, string>,
    documentName: string,
    contactId?: string
  ) {
    const template = await prisma.documentTemplate.findFirst({
      where: { id: templateId, businessId },
    })

    if (!template) {
      throw new Error('Template not found')
    }

    const html = await this.generateHTMLFromTemplate(templateId, variables)

    const documentNumber = `${template.type.toUpperCase().substring(0, 3)}-${String(
      await prisma.document.count({ where: { businessId, type: template.type } }) + 1
    ).padStart(5, '0')}`

    const document = await prisma.document.create({
      data: {
        businessId,
        name: documentName,
        type: template.type,
        templateId,
        documentNumber,
        content: variables as any,
        html,
        contactId,
        createdById: userId,
      },
    })

    logger.info('Document generated from template', { documentId: document.id, templateId })
    return document
  }
}
