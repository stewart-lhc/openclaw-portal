import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const url = body?.url?.trim()

    if (!url) {
      return NextResponse.json({ reachable: false, message: 'URL is required' }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json(
        { reachable: false, message: 'Enter a full URL like http://100.x.x.x:3000' },
        { status: 400 }
      )
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { reachable: false, message: 'Only http and https addresses are supported' },
        { status: 400 }
      )
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(parsedUrl.toString(), {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'user-agent': 'OpenClaw-Portal/0.1 URL Check',
          accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
        },
      })

      const reachable = response.ok || response.status < 500

      return NextResponse.json({
        reachable,
        status: response.status,
        finalUrl: response.url,
        message: reachable
          ? 'Address responded successfully.'
          : 'Address responded, but returned an error status.',
      })
    } catch (error: unknown) {
      const message = error instanceof Error && error.name === 'AbortError'
        ? 'Address test timed out after 5 seconds.'
        : 'Could not reach that address from the portal server.'

      return NextResponse.json({ reachable: false, message }, { status: 200 })
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    console.error('Error testing URL:', error)
    return NextResponse.json(
      { reachable: false, message: 'Failed to test the address' },
      { status: 500 }
    )
  }
}
