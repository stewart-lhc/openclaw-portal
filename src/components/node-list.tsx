'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, Star, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { NodeCard } from '@/components/node-card'
import { AddNodeDialog } from '@/components/add-node-dialog'
import { EditNodeDialog } from '@/components/edit-node-dialog'
import { DeleteNodeDialog } from '@/components/delete-node-dialog'
import { parseTags } from '@/lib/tags'
import type { PortalNode } from '@/lib/types'
import { t, type Locale } from '@/lib/i18n'

export function NodeList({ locale }: { locale: Locale }) {
  const m = t(locale)
  const [nodes, setNodes] = useState<PortalNode[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [loading, setLoading] = useState(true)

  const [editNode, setEditNode] = useState<PortalNode | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteNode, setDeleteNode] = useState<{ id: string; name: string } | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const fetchNodes = useCallback(async () => {
    try {
      const response = await fetch('/api/nodes')
      const data = await response.json()
      setNodes(data.nodes)
      setAllTags(data.tags)
    } catch (error) {
      console.error(m.errors.fetchNodes, error)
    } finally {
      setLoading(false)
    }
  }, [m.errors.fetchNodes])

  useEffect(() => {
    fetchNodes()
  }, [fetchNodes])

  const filteredNodes = nodes.filter((node) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        node.name.toLowerCase().includes(query) ||
        node.url.toLowerCase().includes(query) ||
        node.tags.toLowerCase().includes(query) ||
        (node.notes?.toLowerCase().includes(query) ?? false)

      if (!matchesSearch) return false
    }

    if (selectedTag) {
      const tags = parseTags(node.tags)
      if (!tags.includes(selectedTag)) return false
    }

    if (showFavoritesOnly && !node.favorite) return false

    return true
  })

  const handleAdd = async (nodeData: { name: string; url: string; tags: string; notes: string }) => {
    const response = await fetch('/api/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nodeData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || m.errors.failedAdd)
    }

    await fetchNodes()
  }

  const handleBatchAdd = async (nodeData: Array<{ name: string; url: string; tags: string; notes: string }>) => {
    const response = await fetch('/api/discover-openclaw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes: nodeData }),
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(result.error || m.errors.failedAdd)
    }

    await fetchNodes()
    return {
      created: Array.isArray(result.created) ? result.created.length : 0,
      skipped: Array.isArray(result.skipped) ? result.skipped.length : 0,
    }
  }

  const handleEdit = async (id: string, nodeData: { name: string; url: string; tags: string; notes: string }) => {
    const response = await fetch(`/api/nodes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nodeData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || m.errors.failedUpdate)
    }

    await fetchNodes()
  }

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/nodes/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(m.errors.failedDelete)
    }

    await fetchNodes()
  }

  const handleToggleFavorite = async (node: PortalNode) => {
    const response = await fetch(`/api/nodes/${node.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggleFavorite' }),
    })

    if (response.ok) await fetchNodes()
  }

  const handleOpen = async (node: PortalNode) => {
    window.open(node.url, '_blank')

    await fetch(`/api/nodes/${node.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'open' }),
    })

    await fetchNodes()
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedTag(null)
    setShowFavoritesOnly(false)
  }

  const hasFilters = searchQuery || selectedTag || showFavoritesOnly

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={m.searchPlaceholder}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={showFavoritesOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <Star className={`mr-2 h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
            {m.favorites}
          </Button>
          <AddNodeDialog onAdd={handleAdd} onBatchAdd={handleBatchAdd} locale={locale} />
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <Button
              key={tag}
              variant={selectedTag === tag ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            >
              {tag}
            </Button>
          ))}
          {selectedTag && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedTag(null)}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
          <X className="mr-1 h-4 w-4" />
          {m.clearFilters}
        </Button>
      )}

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">{m.loading}</div>
      ) : filteredNodes.length === 0 ? (
        <div className="py-12 text-center">
          {nodes.length === 0 ? (
            <div className="space-y-4">
              <p className="text-lg font-medium">{m.noNodes}</p>
              <p className="text-muted-foreground">{m.noNodesDesc}</p>
              <AddNodeDialog onAdd={handleAdd} onBatchAdd={handleBatchAdd} locale={locale} />
            </div>
          ) : (
            <p className="text-muted-foreground">{m.noMatch}</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredNodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              locale={locale}
              onEdit={(selectedNode) => {
                setEditNode(selectedNode)
                setEditDialogOpen(true)
              }}
              onDelete={(selectedNode) => {
                setDeleteNode({ id: selectedNode.id, name: selectedNode.name })
                setDeleteDialogOpen(true)
              }}
              onToggleFavorite={handleToggleFavorite}
              onOpen={handleOpen}
            />
          ))}
        </div>
      )}

      <EditNodeDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} node={editNode} onEdit={handleEdit} locale={locale} />

      <DeleteNodeDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        node={deleteNode}
        onDelete={handleDelete}
        locale={locale}
      />
    </div>
  )
}
