import { prisma } from './db'
import { z } from 'zod'

export const NodeSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(50),
  url: z.string().url(),
  tags: z.string().optional(),
  notes: z.string().max(500).optional(),
  favorite: z.boolean().optional(),
  lastOpenedAt: z.date().nullable().optional(),
})

export type NodeInput = z.infer<typeof NodeSchema>

export type Node = NodeInput & {
  id: string
  createdAt: Date
  updatedAt: Date
}

// Parse tags from comma-separated string
export function parseTags(tags: string): string[] {
  if (!tags) return []
  return [...new Set(tags.split(',').map(t => t.trim()).filter(Boolean))]
}

// Format tags to comma-separated string
export function formatTags(tags: string[]): string {
  return tags.join(', ')
}

// Get all nodes
export async function getNodes(): Promise<Node[]> {
  return prisma.node.findMany({
    orderBy: { createdAt: 'desc' }
  }) as Promise<Node[]>
}

// Get node by ID
export async function getNodeById(id: string): Promise<Node | null> {
  return prisma.node.findUnique({
    where: { id }
  }) as Promise<Node | null>
}

// Create node
export async function createNode(data: NodeInput): Promise<Node> {
  const tags = data.tags ? parseTags(data.tags).join(', ') : ''
  return prisma.node.create({
    data: {
      name: data.name.trim(),
      url: data.url.trim(),
      tags,
      notes: data.notes?.trim() || null,
      favorite: data.favorite || false,
    }
  }) as Promise<Node>
}

// Update node
export async function updateNode(id: string, data: Partial<NodeInput>): Promise<Node> {
  const updateData: any = {}
  
  if (data.name !== undefined) updateData.name = data.name.trim()
  if (data.url !== undefined) updateData.url = data.url.trim()
  if (data.tags !== undefined) updateData.tags = data.tags ? parseTags(data.tags).join(', ') : ''
  if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null
  if (data.favorite !== undefined) updateData.favorite = data.favorite
  if (data.lastOpenedAt !== undefined) updateData.lastOpenedAt = data.lastOpenedAt

  return prisma.node.update({
    where: { id },
    data: updateData
  }) as Promise<Node>
}

// Delete node
export async function deleteNode(id: string): Promise<void> {
  await prisma.node.delete({
    where: { id }
  })
}

// Toggle favorite
export async function toggleFavorite(id: string): Promise<Node> {
  const node = await prisma.node.findUnique({ where: { id } })
  if (!node) throw new Error('Node not found')
  
  return prisma.node.update({
    where: { id },
    data: { favorite: !node.favorite }
  }) as Promise<Node>
}

// Update lastOpenedAt
export async function updateLastOpened(id: string): Promise<Node> {
  return prisma.node.update({
    where: { id },
    data: { lastOpenedAt: new Date() }
  }) as Promise<Node>
}

// Check if URL is unique
export async function isUrlUnique(url: string, excludeId?: string): Promise<boolean> {
  const existing = await prisma.node.findFirst({
    where: {
      url: url.trim(),
      ...(excludeId ? { id: { not: excludeId } } : {})
    }
  })
  return !existing
}

// Search nodes
export async function searchNodes(query: string): Promise<Node[]> {
  const lowerQuery = query.toLowerCase()
  return prisma.node.findMany({
    where: {
      OR: [
        { name: { contains: lowerQuery } },
        { url: { contains: lowerQuery } },
        { tags: { contains: lowerQuery } },
        { notes: { contains: lowerQuery } },
      ]
    },
    orderBy: { createdAt: 'desc' }
  }) as Promise<Node[]>
}

// Get all unique tags
export async function getAllTags(): Promise<string[]> {
  const nodes = await prisma.node.findMany({
    select: { tags: true }
  })
  
  const tagSet = new Set<string>()
  nodes.forEach(node => {
    if (node.tags) {
      parseTags(node.tags).forEach(tag => tagSet.add(tag))
    }
  })
  
  return Array.from(tagSet).sort()
}
