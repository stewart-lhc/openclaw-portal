'use client'

import { useState, useEffect } from 'react'
import { Search, Star, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { NodeCard } from '@/components/node-card'
import { AddNodeDialog } from '@/components/add-node-dialog'
import { EditNodeDialog } from '@/components/edit-node-dialog'
import { DeleteNodeDialog } from '@/components/delete-node-dialog'

// Inline utility to avoid importing server code in client
function parseTags(tags: string): string[] {
  if (!tags) return []
  return [...new Set(tags.split(',').map(t => t.trim()).filter(Boolean))]
}

interface Node {
  id: string
  name: string
  url: string
  tags: string
  notes: string | null
  favorite: boolean
  lastOpenedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export function NodeList() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Dialog states
  const [editNode, setEditNode] = useState<Node | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteNode, setDeleteNode] = useState<{ id: string; name: string } | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const fetchNodes = async () => {
    try {
      const res = await fetch('/api/nodes')
      const data = await res.json()
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

  // Filter nodes
  const filteredNodes = nodes.filter(node => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = 
        node.name.toLowerCase().includes(query) ||
        node.url.toLowerCase().includes(query) ||
        node.tags.toLowerCase().includes(query) ||
        (node.notes?.toLowerCase().includes(query) ?? false)
      if (!matchesSearch) return false
    }

    // Tag filter
    if (selectedTag) {
      const tags = parseTags(node.tags)
      if (!tags.includes(selectedTag)) return false
    }

    // Favorites filter
    if (showFavoritesOnly && !node.favorite) return false

    return true
  })

  const handleAdd = async (nodeData: { name: string; url: string; tags: string; notes: string }) => {
    const res = await fetch('/api/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nodeData)
    })
    
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to add node')
    }
    
    await fetchNodes()
  }

  const handleEdit = async (id: string, nodeData: { name: string; url: string; tags: string; notes: string }) => {
    const res = await fetch(`/api/nodes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nodeData)
    })
    
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to update node')
    }
    
    await fetchNodes()
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/nodes/${id}`, {
      method: 'DELETE'
    })
    
    if (!res.ok) {
      throw new Error('Failed to delete node')
    }
    
    await fetchNodes()
  }

  const handleToggleFavorite = async (node: Node) => {
    const res = await fetch(`/api/nodes/${node.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggleFavorite' })
    })
    
    if (res.ok) {
      await fetchNodes()
    }
  }

  const handleOpen = async (node: Node) => {
    // Open in new tab
    window.open(node.url, '_blank')
    
    // Update lastOpenedAt
    await fetch(`/api/nodes/${node.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'open' })
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
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={showFavoritesOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <Star className={`h-4 w-4 mr-2 ${showFavoritesOnly ? 'fill-current' : ''}`} />
            Favorites
          </Button>
          <AddNodeDialog onAdd={handleAdd} />
        </div>
      </div>

      {/* Tag Filters */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allTags.map(tag => (
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

      {/* Clear filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
          <X className="h-4 w-4 mr-1" />
          Clear filters
        </Button>
      )}

      {/* Node List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filteredNodes.length === 0 ? (
        <div className="text-center py-12">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNodes.map(node => (
            <NodeCard
              key={node.id}
              node={node}
              onEdit={(n) => { setEditNode(n); setEditDialogOpen(true) }}
              onDelete={(n) => { setDeleteNode({ id: n.id, name: n.name }); setDeleteDialogOpen(true) }}
              onToggleFavorite={handleToggleFavorite}
              onOpen={handleOpen}
            />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <EditNodeDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        node={editNode}
        onEdit={handleEdit}
      />

      {/* Delete Dialog */}
      <DeleteNodeDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        node={deleteNode}
        onDelete={handleDelete}
      />
    </div>
  )
}
