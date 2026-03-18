'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle } from 'lucide-react'

interface DeleteNodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  node: {
    id: string
    name: string
  } | null
  onDelete: (id: string) => void
}

export function DeleteNodeDialog({ open, onOpenChange, node, onDelete }: DeleteNodeDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!node) return
    setLoading(true)
    try {
      await onDelete(node.id)
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Node
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{node?.name}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
