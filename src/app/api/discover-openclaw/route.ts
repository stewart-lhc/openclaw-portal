import { NextResponse } from 'next/server'
import os from 'os'
import { getNodes, createNode, isUrlUnique } from '@/lib/node-service'

type DiscoveryCandidate = {
  url: string
  host: string
  port: number
  source: string
  status?: number
  finalUrl?: string
  title?: string
  nameHint: string
  matched: boolean
  alreadyAdded: boolean
}

const DEFAULT_PORTS = [3000, 3001, 18789, 19001]
const MAX_HOSTS_PER_INTERFACE = 24
const REQUEST_TIMEOUT_MS = 2200
const CONCURRENCY = 20

function slugToName(value: string) {
  return value
    .replace(/^https?:\/\//, '')
    .replace(/[:/].*$/, '')
    .split(/[.-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function inferName(host: string, title?: string) {
  const cleanedTitle = title?.replace(/\s+/g, ' ').trim()
  if (cleanedTitle && cleanedTitle.length <= 60) return cleanedTitle
  return slugToName(host) || host
}

function normalizeUrlIdentity(value: string) {
  try {
    const parsed = new URL(value)
    const host = parsed.hostname === 'localhost' ? '127.0.0.1' : parsed.hostname
    const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80')
    return `${parsed.protocol}//${host}:${port}`
  } catch {
    return value.trim()
  }
}

function isPrivateOrTailnet(address: string) {
  return (
    address.startsWith('10.') ||
    address.startsWith('192.168.') ||
    address.startsWith('172.16.') ||
    address.startsWith('172.17.') ||
    address.startsWith('172.18.') ||
    address.startsWith('172.19.') ||
    address.startsWith('172.2') ||
    address.startsWith('172.30.') ||
    address.startsWith('172.31.') ||
    address.startsWith('100.')
  )
}

function expandLocalCandidates() {
  const candidates = new Map<string, string>()
  candidates.set('127.0.0.1', 'loopback')
  candidates.set('localhost', 'loopback')

  const interfaces = os.networkInterfaces()
  for (const [name, entries] of Object.entries(interfaces)) {
    for (const entry of entries || []) {
      if (!entry.address || entry.internal || entry.family !== 'IPv4') continue
      candidates.set(entry.address, `${name}:self`)

      if (!isPrivateOrTailnet(entry.address)) continue

      const parts = entry.address.split('.').map(Number)
      if (parts.length !== 4) continue

      const start = Math.max(1, parts[3] - 12)
      const end = Math.min(254, parts[3] + 12)
      let added = 0

      for (let last = start; last <= end; last += 1) {
        if (last === parts[3]) continue
        if (added >= MAX_HOSTS_PER_INTERFACE) break
        const host = `${parts[0]}.${parts[1]}.${parts[2]}.${last}`
        candidates.set(host, `${name}:nearby`)
        added += 1
      }
    }
  }

  return Array.from(candidates.entries()).map(([host, source]) => ({ host, source }))
}

async function probeCandidate(host: string, port: number, source: string, existingUrls: Set<string>): Promise<DiscoveryCandidate | null> {
  const url = `http://${host}:${port}/`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'OpenClaw-Portal/0.1 Discovery',
        accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
    })

    const contentType = response.headers.get('content-type') || ''
    const body = contentType.includes('text') || contentType.includes('json') ? await response.text() : ''
    const titleMatch = body.match(/<title>(.*?)<\/title>/i)
    const title = titleMatch?.[1]?.trim()
    const marker = `${title || ''} ${body.slice(0, 800)}`.toLowerCase()
    const matched = marker.includes('openclaw')
    const finalUrl = response.url || url
    const alreadyAdded = existingUrls.has(normalizeUrlIdentity(finalUrl)) || existingUrls.has(normalizeUrlIdentity(url))

    if (!matched) {
      return null
    }

    return {
      url,
      host,
      port,
      source,
      status: response.status,
      finalUrl,
      title,
      nameHint: inferName(host, title),
      matched,
      alreadyAdded,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>) {
  const results: R[] = []
  let index = 0

  async function next() {
    while (index < items.length) {
      const current = items[index]
      index += 1
      results.push(await worker(current))
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()))
  return results
}

export async function GET() {
  try {
    const existingNodes = await getNodes()
    const existingUrls = new Set(existingNodes.map((node) => normalizeUrlIdentity(node.url)))
    const hosts = expandLocalCandidates()
    const targets = hosts.flatMap(({ host, source }) => DEFAULT_PORTS.map((port) => ({ host, source, port })))
    const probed = await runWithConcurrency(targets, CONCURRENCY, ({ host, port, source }) =>
      probeCandidate(host, port, source, existingUrls)
    )

    const deduped = new Map<string, DiscoveryCandidate>()
    for (const item of probed) {
      if (!item) continue
      const key = normalizeUrlIdentity(item.finalUrl || item.url)
      const previous = deduped.get(key)
      if (!previous || (!previous.matched && item.matched)) deduped.set(key, item)
    }

    const candidates = Array.from(deduped.values())
      .sort((a, b) => Number(b.matched) - Number(a.matched) || Number(a.alreadyAdded) - Number(b.alreadyAdded) || a.host.localeCompare(b.host))

    return NextResponse.json({
      candidates,
      scannedHosts: hosts.length,
      scannedTargets: targets.length,
      defaultPorts: DEFAULT_PORTS,
    })
  } catch (error) {
    console.error('Error discovering OpenClaw nodes:', error)
    return NextResponse.json({ error: 'Failed to discover OpenClaw nodes' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const nodes = Array.isArray(body?.nodes) ? body.nodes : []

    if (!nodes.length) {
      return NextResponse.json({ error: 'No nodes selected for import' }, { status: 400 })
    }

    const existingNodes = await getNodes()
    const seenUrls = new Set(existingNodes.map((node) => normalizeUrlIdentity(node.url)))
    const created: Array<{ id: string; name: string; url: string }> = []
    const skipped: Array<{ name: string; url: string; reason: string }> = []

    for (const node of nodes) {
      const name = typeof node?.name === 'string' ? node.name.trim() : ''
      const url = typeof node?.url === 'string' ? node.url.trim() : ''
      const tags = typeof node?.tags === 'string' ? node.tags : 'auto-discovered'
      const notes = typeof node?.notes === 'string' ? node.notes : 'Imported from local network discovery'

      if (!name || name.length < 2 || name.length > 50 || !url) {
        skipped.push({ name: name || 'Unknown node', url, reason: 'Invalid name or URL' })
        continue
      }

      try {
        new URL(url)
      } catch {
        skipped.push({ name, url, reason: 'Invalid URL' })
        continue
      }

      const identity = normalizeUrlIdentity(url)
      const unique = await isUrlUnique(url)
      if (!unique || seenUrls.has(identity)) {
        skipped.push({ name, url, reason: 'URL already exists' })
        continue
      }

      const createdNode = await createNode({ name, url, tags, notes })
      seenUrls.add(identity)
      created.push({ id: createdNode.id, name: createdNode.name, url: createdNode.url })
    }

    return NextResponse.json({ created, skipped })
  } catch (error) {
    console.error('Error importing discovered nodes:', error)
    return NextResponse.json({ error: 'Failed to import discovered nodes' }, { status: 500 })
  }
}
