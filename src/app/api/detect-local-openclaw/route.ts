import { NextResponse } from 'next/server'
import os from 'os'

const CANDIDATE_PORTS = [18789, 3000, 3001, 19001]

function getHostCandidates() {
  const hosts = new Set<string>(['127.0.0.1', 'localhost'])
  const interfaces = os.networkInterfaces()

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (!entry.address || entry.internal || entry.family !== 'IPv4') continue
      hosts.add(entry.address)
    }
  }

  return Array.from(hosts)
}

async function probe(url: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2500)

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'OpenClaw-Portal/0.1 Local Detect',
        accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
      },
    })

    const reachable = response.ok || response.status < 500
    return {
      reachable,
      status: response.status,
      finalUrl: response.url,
    }
  } catch {
    return {
      reachable: false,
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET() {
  try {
    const hosts = getHostCandidates()
    const results: Array<{ url: string; reachable: boolean; status?: number; finalUrl?: string }> = []

    for (const port of CANDIDATE_PORTS) {
      for (const host of hosts) {
        const url = `http://${host}:${port}/`
        const result = await probe(url)
        results.push({ url, ...result })
      }
    }

    const match = results.find((item) => item.reachable)

    if (!match) {
      return NextResponse.json({
        found: false,
        message: 'No local OpenClaw dashboard was detected on the common ports.',
        checked: results,
      })
    }

    return NextResponse.json({
      found: true,
      message: 'Detected a reachable local OpenClaw dashboard.',
      detectedUrl: match.finalUrl || match.url,
      checked: results,
    })
  } catch (error) {
    console.error('Error detecting local OpenClaw:', error)
    return NextResponse.json(
      { found: false, message: 'Failed to detect a local OpenClaw dashboard.' },
      { status: 500 }
    )
  }
}
