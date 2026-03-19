'use client'

import { useMemo, useState } from 'react'
import { Check, Copy, ExternalLink, LoaderCircle, Plus, Search, WandSparkles } from 'lucide-react'
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
import { t, type Locale } from '@/lib/i18n'

interface AddNodeDialogProps {
  onAdd: (node: { name: string; url: string; tags: string; notes: string }) => void
  onBatchAdd: (nodes: Array<{ name: string; url: string; tags: string; notes: string }>) => Promise<{ created: number; skipped: number }>
  locale: Locale
}

type AddNodeTab = 'human' | 'agent'

type UrlCheckResult = {
  reachable: boolean
  status?: number
  finalUrl?: string
  message: string
}

type DiscoveryCandidate = {
  url: string
  finalUrl?: string
  host: string
  port: number
  source: string
  status?: number
  title?: string
  nameHint: string
  matched: boolean
  alreadyAdded: boolean
}

const SKILL_REPO_URL = 'https://github.com/stewart-lhc/openclaw-portal/blob/master/public/skill.md'
const SKILL_RAW_URL = 'https://raw.githubusercontent.com/stewart-lhc/openclaw-portal/master/public/skill.md'
const AGENT_COPY_TEXT = `Please add and manage openclaw nodes according to ${SKILL_RAW_URL}. Try to join the same Tailscale network automatically if possible, then return the fillable Tailscale IP, Dashboard URL, suggested node name, and failure reason if any.`

export function AddNodeDialog({ onAdd, onBatchAdd, locale }: AddNodeDialogProps) {
  const m = t(locale)
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
  const [detectingLocal, setDetectingLocal] = useState(false)
  const [discoveringNetwork, setDiscoveringNetwork] = useState(false)
  const [importingDiscovery, setImportingDiscovery] = useState(false)
  const [urlCheckResult, setUrlCheckResult] = useState<UrlCheckResult | null>(null)
  const [discoveryCandidates, setDiscoveryCandidates] = useState<DiscoveryCandidate[]>([])
  const [selectedDiscoveryUrls, setSelectedDiscoveryUrls] = useState<string[]>([])
  const [discoverySummary, setDiscoverySummary] = useState('')

  const urlExample = useMemo(() => 'http://100.88.12.34:3000', [])

  const resetForm = () => {
    setName('')
    setUrl('')
    setTags('')
    setNotes('')
    setError('')
    setUrlCheckResult(null)
    setCheckingUrl(false)
    setDetectingLocal(false)
    setDiscoveringNetwork(false)
    setImportingDiscovery(false)
    setDiscoveryCandidates([])
    setSelectedDiscoveryUrls([])
    setDiscoverySummary('')
    setCopyState('idle')
    setActiveTab('human')
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(AGENT_COPY_TEXT)
      setCopyState('done')
      window.setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      setError(m.errors.copyFailed)
    }
  }

  const handleDetectLocal = async () => {
    setError('')
    setUrlCheckResult(null)
    setDetectingLocal(true)

    try {
      const response = await fetch('/api/detect-local-openclaw')
      const result = await response.json()

      if (result?.found && result?.detectedUrl) {
        setUrl(result.detectedUrl)
        setUrlCheckResult({
          reachable: true,
          finalUrl: result.detectedUrl,
          message: result.message || 'Detected a reachable local OpenClaw dashboard.',
        })
      } else {
        setError(result?.message || m.errors.detectFailed)
      }
    } catch {
      setError(m.errors.detectFailed)
    } finally {
      setDetectingLocal(false)
    }
  }

  const handleDiscoverNetwork = async () => {
    setError('')
    setDiscoverySummary('')
    setDiscoveringNetwork(true)

    try {
      const response = await fetch('/api/discover-openclaw')
      const result = await response.json()
      const candidates: DiscoveryCandidate[] = Array.isArray(result?.candidates) ? result.candidates : []
      setDiscoveryCandidates(candidates)
      setSelectedDiscoveryUrls(candidates.filter((item) => !item.alreadyAdded).map((item) => item.finalUrl || item.url))
      setDiscoverySummary(
        candidates.length
          ? `${m.discoveryFoundPrefix} ${candidates.length} ${m.discoveryFoundSuffix}`
          : m.discoveryEmpty
      )
      if (!response.ok && result?.error) setError(result.error)
    } catch {
      setError(m.errors.discoveryFailed)
    } finally {
      setDiscoveringNetwork(false)
    }
  }

  const handleToggleDiscovered = (candidateUrl: string) => {
    setSelectedDiscoveryUrls((current) =>
      current.includes(candidateUrl) ? current.filter((item) => item !== candidateUrl) : [...current, candidateUrl]
    )
  }

  const handleUseDiscovered = (candidate: DiscoveryCandidate) => {
    setName(candidate.nameHint)
    setUrl(candidate.finalUrl || candidate.url)
    setTags((current) => current || 'auto-discovered')
    setNotes((current) => current || `Imported from ${candidate.source} network discovery`)
    setUrlCheckResult({
      reachable: true,
      status: candidate.status,
      finalUrl: candidate.finalUrl || candidate.url,
      message: candidate.matched ? m.discoveryVerified : m.discoveryReachable,
    })
  }

  const handleImportDiscovered = async () => {
    const selected = discoveryCandidates.filter((item) => selectedDiscoveryUrls.includes(item.finalUrl || item.url) && !item.alreadyAdded)

    if (!selected.length) {
      setError(m.errors.selectDiscoveryFirst)
      return
    }

    setError('')
    setImportingDiscovery(true)
    try {
      const result = await onBatchAdd(
        selected.map((item) => ({
          name: item.nameHint,
          url: item.finalUrl || item.url,
          tags: 'auto-discovered',
          notes: `Imported from ${item.source} network discovery`,
        }))
      )
      setDiscoverySummary(`${m.discoveryImported} ${result.created}，${m.discoverySkipped} ${result.skipped}`)
      if (result.created > 0) handleOpenChange(false)
    } catch (batchError: unknown) {
      setError(getErrorMessage(batchError, m.errors.discoveryImportFailed))
    } finally {
      setImportingDiscovery(false)
    }
  }

  const handleUrlCheck = async () => {
    setError('')
    setUrlCheckResult(null)

    if (!url) {
      setError(m.errors.pasteFirst)
      return
    }

    try {
      new URL(url)
    } catch {
      setError(m.errors.fullAddressBeforeTest)
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
      if (!response.ok && result?.message) setError(result.message)
    } catch {
      setError(m.errors.unableToTest)
    } finally {
      setCheckingUrl(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
      await onAdd({ name, url, tags, notes })
      handleOpenChange(false)
    } catch (submitError: unknown) {
      setError(getErrorMessage(submitError, m.errors.failedAdd))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {m.addNode}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[760px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{m.addNodeTitle}</DialogTitle>
            <DialogDescription>{m.addNodeDesc}</DialogDescription>
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
                  {m.human}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('agent')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === 'agent' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  {m.agent}
                </button>
              </div>

              {activeTab === 'human' ? (
                <div className="space-y-3 text-sm">
                  <p className="font-medium">{m.humanTitle}</p>
                  <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
                    {m.humanSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <p className="rounded-md bg-muted px-3 py-2 text-muted-foreground">{m.humanTip}</p>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <p className="font-medium">{m.agentTitle}</p>
                  <p className="text-muted-foreground">{m.agentDesc}</p>
                  <div className="line-clamp-1 rounded-lg border bg-muted/40 p-3 text-sm break-all">{AGENT_COPY_TEXT}</div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={handleCopy}>
                      {copyState === 'done' ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                      {copyState === 'done' ? m.copied : m.copyForAgent}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                      <a href={SKILL_REPO_URL} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {m.viewSkill}
                      </a>
                    </Button>
                  </div>
                  <p className="text-muted-foreground">{m.expectedReply}</p>
                </div>
              )}
            </div>

            <div className="grid gap-3 rounded-lg border p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{m.discoveryTitle}</p>
                  <p className="text-sm text-muted-foreground">{m.discoveryDesc}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={handleDiscoverNetwork} disabled={discoveringNetwork}>
                    {discoveringNetwork ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    {m.discoveryScan}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleImportDiscovered} disabled={importingDiscovery || !selectedDiscoveryUrls.length}>
                    {importingDiscovery ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    {m.discoveryImportSelected}
                  </Button>
                </div>
              </div>

              {discoverySummary && <p className="text-sm text-muted-foreground">{discoverySummary}</p>}

              {discoveryCandidates.length > 0 && (
                <div className="grid gap-2">
                  {discoveryCandidates.map((candidate) => {
                    const candidateUrl = candidate.finalUrl || candidate.url
                    const checked = selectedDiscoveryUrls.includes(candidateUrl)
                    return (
                      <div key={candidateUrl} className="rounded-lg border p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <label className="flex flex-1 gap-3">
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4"
                              checked={checked}
                              disabled={candidate.alreadyAdded}
                              onChange={() => handleToggleDiscovered(candidateUrl)}
                            />
                            <div className="space-y-1 text-sm">
                              <div className="font-medium">{candidate.nameHint}</div>
                              <div className="break-all text-muted-foreground">{candidateUrl}</div>
                              <div className="text-xs text-muted-foreground">
                                {candidate.source} · {candidate.matched ? m.discoveryVerified : m.discoveryReachable}
                                {typeof candidate.status === 'number' ? ` · HTTP ${candidate.status}` : ''}
                                {candidate.alreadyAdded ? ` · ${m.discoveryAlreadyAdded}` : ''}
                              </div>
                            </div>
                          </label>
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleUseDiscovered(candidate)}>
                            {m.discoveryUseInForm}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {error && <div className="rounded bg-destructive/10 p-2 text-sm text-destructive">{error}</div>}

            <div className="grid gap-2">
              <Label htmlFor="name">{m.name}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={m.livingRoomMacMini} maxLength={50} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="url">{m.address}</Label>
              <p className="text-xs text-muted-foreground">{m.addressHelp}</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={urlExample} className="flex-1 sm:min-w-[260px]" />
                <Button type="button" variant="outline" onClick={handleDetectLocal} disabled={detectingLocal}>
                  {detectingLocal ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
                  {m.detectLocal}
                </Button>
                <Button type="button" variant="outline" onClick={handleUrlCheck} disabled={checkingUrl}>
                  {checkingUrl ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {m.testAddress}
                </Button>
              </div>
              {urlCheckResult && (
                <div className={`rounded-md px-3 py-2 text-sm ${urlCheckResult.reachable ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-destructive/10 text-destructive'}`}>
                  {urlCheckResult.message}
                  {urlCheckResult.finalUrl ? ` Final URL: ${urlCheckResult.finalUrl}` : ''}
                  {typeof urlCheckResult.status === 'number' ? ` (HTTP ${urlCheckResult.status})` : ''}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tags">{m.tags}</Label>
              <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder={m.tagsPlaceholder} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">{m.notes}</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={m.notesPlaceholder} maxLength={500} rows={3} />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {m.cancel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? m.adding : m.addNode}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
