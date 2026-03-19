'use client'

import { Star, ExternalLink, Pencil, Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { parseTags } from '@/lib/tags'
import type { PortalNode } from '@/lib/types'

interface NodeCardProps {
  node: PortalNode
  onEdit: (node: PortalNode) => void
  onDelete: (node: PortalNode) => void
  onToggleFavorite: (node: PortalNode) => void
  onOpen: (node: PortalNode) => void
}

export function NodeCard({ node, onEdit, onDelete, onToggleFavorite, onOpen }: NodeCardProps) {
  const tags = parseTags(node.tags)
  const urlObj = new URL(node.url)

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Never'
    const parsedDate = new Date(date)
    return parsedDate.toLocaleDateString() + ' ' + parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-lg font-semibold">{node.name}</CardTitle>
          <button
            onClick={() => onToggleFavorite(node)}
            className="rounded p-1 transition-colors hover:bg-accent"
            aria-label={node.favorite ? 'Remove favorite' : 'Add favorite'}
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
          <div className="mb-2 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {node.notes && <p className="line-clamp-2 text-sm text-muted-foreground">{node.notes}</p>}
        {node.lastOpenedAt && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Last opened: {formatDate(node.lastOpenedAt)}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="gap-2 border-t pt-3">
        <Button onClick={() => onOpen(node)} className="flex-1" size="sm">
          <ExternalLink className="mr-2 h-4 w-4" />
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
