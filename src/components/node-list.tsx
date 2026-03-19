'use client'

import { useEffect, useState } from 'react'
import { Search, Star, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { NodeCard } from '@/components/node-card'
import { AddNodeDialog } from '@/components/add-node-dialog'
import { EditNodeDialog } from '@/components/edit-node-dialog'
import { DeleteNodeDialog } from '@/components/delete-node-dialog'
import { parseTags } from '@/lib/tags'
import type { PortalNode } from '@/lib/types'

export function NodeList() {
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

  const fetchNodes = async () => {
    try {
      const response = await fetch('/api/nodes')
      const data = await response.json()
      setNodes(data.nodes)
      setAllTags(data.tags)
    } catch (error) {
      console.error('Error fetching nodes:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNodes()
  }, [])

  const filteredNodes = nodes.filter((node) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        node.name.toLowerCase().includes(query) ||
        node.url.toLowerCase().includes(query) ||
        node.tags.toLowerCase().includes(query) ||
        (node.notes?.toLowerCase().includes(query) ?? false)

      if (!matchesSearch) {
        return false
      }
    }

    if (selectedTag) {
      const tags = parseTags(node.tags)
      if (!tags.includes(selectedTag)) {
        return false
      }
    }

    if (showFavoritesOnly && !node.favorite) {
      return false
    }

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
      throw new Error(error.error || 'Failed to add node')
    }

    await fetchNodes()
  }

  const handleEdit = async (id: string, nodeData: { name: string; url: string; tags: string; notes: string }) => {
    const response = await fetch(`/api/nodes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nodeData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update node')
    }

    await fetchNodes()
  }

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/nodes/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Failed to delete node')
    }

    await fetchNodes()
  }

  const handleToggleFavorite = async (node: PortalNode) => {
    const response = await fetch(`/api/nodes/${node.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggleFavorite' }),
    })

    if (response.ok) {
      await fetchNodes()
    }
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
            placeholder="Search nodes..."
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
            Favorites
          </Button>
          <AddNodeDialog onAdd={handleAdd} />
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
          Clear filters
        </Button>
      )}

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : filteredNodes.length === 0 ? (
        <div className="py-12 text-center">
          {nodes.length === 0 ? (
            <div className="space-y-4">
              <p className="text-lg font-medium">No nodes yet</p>
              <p className="text-muted-foreground">Add your first OpenClaw dashboard to get started.</p>
              <AddNodeDialog onAdd={handleAdd} />
            </div>
          ) : (
            <p className="text-muted-foreground">No nodes match your filters.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredNodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
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

      <EditNodeDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        node={editNode}
        onEdit={handleEdit}
      />

      <DeleteNodeDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        node={deleteNode}
        onDelete={handleDelete}
      />
    </div>
  )
}
