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
import { getErrorMessage } from '@/lib/errors'
import { t, type Locale } from '@/lib/i18n'

interface EditNodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locale: Locale
  node: {
    id: string
    name: string
    url: string
    tags: string
    notes: string | null
  } | null
  onEdit: (id: string, node: { name: string; url: string; tags: string; notes: string }) => void
}

export function EditNodeDialog({ open, onOpenChange, node, onEdit, locale }: EditNodeDialogProps) {
  const m = t(locale)
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

    if (!name || name.length < 2 || name.length > 50) {
      setError(m.errors.nameLength)
      return
    }

    if (!url) {
      setError(m.errors.addressRequired)
      return
    }

    try {
      new URL(url)
    } catch {
      setError(m.errors.fullAddress)
      return
    }

    if (notes.length > 500) {
      setError(m.errors.notesLength)
      return
    }

    setLoading(true)
    try {
      await onEdit(node.id, { name, url, tags, notes })
      onOpenChange(false)
    } catch (error: unknown) {
      setError(getErrorMessage(error, m.errors.failedUpdate))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{m.editNode}</DialogTitle>
            <DialogDescription>{m.editNodeDesc}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && <div className="rounded bg-destructive/10 p-2 text-sm text-destructive">{error}</div>}
            <div className="grid gap-2">
              <Label htmlFor="edit-name">{m.name}</Label>
              <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={m.livingRoomMacMini} maxLength={50} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-url">{m.address}</Label>
              <Input id="edit-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://100.88.12.34:3000" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-tags">{m.tags}</Label>
              <Input id="edit-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder={m.tagsPlaceholder} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-notes">{m.notes}</Label>
              <Textarea id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={m.notesPlaceholder} maxLength={500} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {m.cancel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? m.saving : m.saveChanges}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
