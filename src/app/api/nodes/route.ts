import { NextRequest, NextResponse } from 'next/server'
import { getNodes, createNode, getAllTags } from '@/lib/node-service'

export async function GET() {
  try {
    const nodes = await getNodes()
    const tags = await getAllTags()
    return NextResponse.json({ nodes, tags })
  } catch (error) {
    console.error('Error fetching nodes:', error)
    return NextResponse.json({ error: 'Failed to fetch nodes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, url, tags, notes } = body

    // Validation
    if (!name || name.length < 2 || name.length > 50) {
      return NextResponse.json({ error: 'Name must be 2-50 characters' }, { status: 400 })
    }

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // Check URL uniqueness
    const { isUrlUnique } = await import('@/lib/node-service')
    const unique = await isUrlUnique(url)
    if (!unique) {
      return NextResponse.json({ error: 'URL already exists' }, { status: 400 })
    }

    const node = await createNode({ name, url, tags, notes })
    return NextResponse.json(node, { status: 201 })
  } catch (error) {
    console.error('Error creating node:', error)
    return NextResponse.json({ error: 'Failed to create node' }, { status: 500 })
  }
}
