'use client'

import { useState } from 'react'
import { Star, ExternalLink, Pencil, Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

// Inline utility to avoid importing server code in client
function parseTags(tags: string): string[] {
  if (!tags) return []
  return [...new Set(tags.split(',').map(t => t.trim()).filter(Boolean))]
}

interface NodeCardProps {
  node: {
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
  onEdit: (node: any) => void
  onDelete: (node: any) => void
  onToggleFavorite: (node: any) => void
  onOpen: (node: any) => void
}

export function NodeCard({ node, onEdit, onDelete, onToggleFavorite, onOpen }: NodeCardProps) {
  const tags = parseTags(node.tags)
  const urlObj = new URL(node.url)
  
  const formatDate = (date: Date | null) => {
    if (!date) return 'Never'
    const d = new Date(date)
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold">{node.name}</CardTitle>
          <button
            onClick={() => onToggleFavorite(node)}
            className="p-1 hover:bg-accent rounded transition-colors"
          >
            <Star
              className={`h-5 w-5 ${node.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
            />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{urlObj.host}</p>
      </CardHeader>
      <CardContent className="flex-1 pb-3">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {node.notes && (
          <p className="text-sm text-muted-foreground line-clamp-2">{node.notes}</p>
        )}
        {node.lastOpenedAt && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Last opened: {formatDate(node.lastOpenedAt)}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-3 border-t gap-2">
        <Button onClick={() => onOpen(node)} className="flex-1" size="sm">
          <ExternalLink className="h-4 w-4 mr-2" />
          Open Dashboard
        </Button>
        <Button variant="outline" size="icon" onClick={() => onEdit(node)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="destructive" size="icon" onClick={() => onDelete(node)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}
