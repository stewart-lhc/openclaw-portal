'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface EditNodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  node: {
    id: string
    name: string
    url: string
    tags: string
    notes: string | null
  } | null
  onEdit: (id: string, node: { name: string; url: string; tags: string; notes: string }) => void
}

export function EditNodeDialog({ open, onOpenChange, node, onEdit }: EditNodeDialogProps) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [tags, setTags] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (node) {
      setName(node.name)
      setUrl(node.url)
      setTags(node.tags || '')
      setNotes(node.notes || '')
      setError('')
    }
  }, [node])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!node) return
    
    setError('')

    // Validation
    if (!name || name.length < 2 || name.length > 50) {
      setError('Name must be 2-50 characters')
      return
    }

    if (!url) {
      setError('URL is required')
      return
    }

    try {
      new URL(url)
    } catch {
      setError('Invalid URL format')
      return
    }

    if (notes.length > 500) {
      setError('Notes must be max 500 characters')
      return
    }

    setLoading(true)
    try {
      await onEdit(node.id, { name, url, tags, notes })
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Failed to update node')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Node</DialogTitle>
            <DialogDescription>
              Update the node details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My OpenClaw"
                maxLength={50}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-url">Dashboard URL *</Label>
              <Input
                id="edit-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://127.0.0.1:18789"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-tags">Tags</Label>
              <Input
                id="edit-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="production, dev, home (comma-separated)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about this node..."
                maxLength={500}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
