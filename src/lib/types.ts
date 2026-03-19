export interface PortalNode {
  id: string
  name: string
  url: string
  tags: string
  notes: string | null
  favorite: boolean
  lastOpenedAt: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
}
