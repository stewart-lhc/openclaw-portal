'use client'

import { useMemo, useState } from 'react'
import { Check, Copy, ExternalLink, LoaderCircle, Plus } from 'lucide-react'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { getErrorMessage } from '@/lib/errors'

interface AddNodeDialogProps {
  onAdd: (node: { name: string; url: string; tags: string; notes: string }) => void
}

type AddNodeTab = 'human' | 'agent'

type UrlCheckResult = {
  reachable: boolean
  status?: number
  finalUrl?: string
  message: string
}

const SKILL_REPO_URL = 'https://github.com/stewart-lhc/openclaw-portal/blob/master/public/skill.md'
const SKILL_RAW_URL = 'https://raw.githubusercontent.com/stewart-lhc/openclaw-portal/master/public/skill.md'
const AGENT_COPY_TEXT = `Please add and manage openclaw nodes according to ${SKILL_RAW_URL}. Try to join the same Tailscale network automatically if possible, then return the fillable Tailscale IP, Dashboard URL, suggested node name, and failure reason if any.`

export function AddNodeDialog({ onAdd }: AddNodeDialogProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<AddNodeTab>('human')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [tags, setTags] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'done'>('idle')
  const [checkingUrl, setCheckingUrl] = useState(false)
  const [urlCheckResult, setUrlCheckResult] = useState<UrlCheckResult | null>(null)

  const urlExample = useMemo(() => 'http://100.88.12.34:3000', [])

  const resetForm = () => {
    setName('')
    setUrl('')
    setTags('')
    setNotes('')
    setError('')
    setUrlCheckResult(null)
    setCheckingUrl(false)
    setCopyState('idle')
    setActiveTab('human')
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      resetForm()
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(AGENT_COPY_TEXT)
      setCopyState('done')
      window.setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      setError('Copy failed. Please copy the text manually.')
    }
  }

  const handleUrlCheck = async () => {
    setError('')
    setUrlCheckResult(null)

    if (!url) {
      setError('Paste the node address first, then test it.')
      return
    }

    try {
      new URL(url)
    } catch {
      setError('Enter a full address like http://100.x.x.x:3000 before testing.')
      return
    }

    setCheckingUrl(true)
    try {
      const response = await fetch('/api/url-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const result = await response.json()
      setUrlCheckResult(result)
      if (!response.ok && result?.message) {
        setError(result.message)
      }
    } catch {
      setError('Unable to test this address right now.')
    } finally {
      setCheckingUrl(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name || name.length < 2 || name.length > 50) {
      setError('Name must be 2-50 characters')
      return
    }

    if (!url) {
      setError('Address is required')
      return
    }

    try {
      new URL(url)
    } catch {
      setError('Enter a full address like http://100.x.x.x:3000')
      return
    }

    if (notes.length > 500) {
      setError('Notes must be max 500 characters')
      return
    }

    setLoading(true)
    try {
      await onAdd({ name, url, tags, notes })
      handleOpenChange(false)
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Failed to add node'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Node
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Node</DialogTitle>
            <DialogDescription>
              First get a usable node address, then paste it below and save it to your portal.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid gap-4">
            <div className="grid gap-3 rounded-lg border p-3">
              <div className="inline-flex rounded-lg bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('human')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === 'human' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  Human
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('agent')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === 'agent' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  Agent
                </button>
              </div>

              {activeTab === 'human' ? (
                <div className="space-y-3 text-sm">
                  <p className="font-medium">Fastest path for a person</p>
                  <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
                    <li>Open Tailscale on the target device and make sure it is signed into the same network.</li>
                    <li>In the Tailscale device list, find that device’s <span className="font-medium text-foreground">100.x.x.x</span> address.</li>
                    <li>Start OpenClaw on that device and confirm which local dashboard port it uses, for example <span className="font-medium text-foreground">3000</span> or <span className="font-medium text-foreground">18789</span>.</li>
                    <li>Build the address like <span className="font-medium text-foreground">http://100.x.x.x:3000</span>, test it below, then save it.</li>
                  </ol>
                  <p className="rounded-md bg-muted px-3 py-2 text-muted-foreground">
                    Tip: the main thing is to get the <span className="font-medium text-foreground">Tailscale 100.x.x.x address first</span>. After that, the form is easy.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <p className="font-medium">Ask another OpenClaw agent to do the setup work</p>
                  <p className="text-muted-foreground">
                    Copy this text to another OpenClaw agent. It points to the GitHub skill file, not localhost.
                  </p>
                  <div className="rounded-lg border bg-muted/40 p-3 text-sm break-all">{AGENT_COPY_TEXT}</div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={handleCopy}>
                      {copyState === 'done' ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                      {copyState === 'done' ? 'Copied' : 'Copy for Agent'}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                      <a href={SKILL_REPO_URL} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View skill.md
                      </a>
                    </Button>
                  </div>
                  <p className="text-muted-foreground">
                    Expected reply: Tailscale IP, Dashboard URL, suggested node name, and the reason if the setup failed.
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Living room Mac mini"
                maxLength={50}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="url">Dashboard URL / Address *</Label>
              <p className="text-xs text-muted-foreground">
                First get the address from Tailscale or the agent reply, then paste it here.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={urlExample}
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={handleUrlCheck} disabled={checkingUrl}>
                  {checkingUrl ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Test Address
                </Button>
              </div>
              {urlCheckResult && (
                <div
                  className={`rounded-md px-3 py-2 text-sm ${
                    urlCheckResult.reachable
                      ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                      : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  {urlCheckResult.message}
                  {urlCheckResult.finalUrl ? ` Final URL: ${urlCheckResult.finalUrl}` : ''}
                  {typeof urlCheckResult.status === 'number' ? ` (HTTP ${urlCheckResult.status})` : ''}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="home, mac, gpu (comma-separated)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about this node..."
                maxLength={500}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Node'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
