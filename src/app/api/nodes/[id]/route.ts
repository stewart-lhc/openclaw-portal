import { NextRequest, NextResponse } from 'next/server'
import { getNodeById, updateNode, deleteNode, toggleFavorite, updateLastOpened, isUrlUnique } from '@/lib/node-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const node = await getNodeById(id)
    
    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 })
    }
    
    return NextResponse.json(node)
  } catch (error) {
    console.error('Error fetching node:', error)
    return NextResponse.json({ error: 'Failed to fetch node' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, url, tags, notes, favorite, lastOpenedAt } = body

    // Validation for name
    if (name && (name.length < 2 || name.length > 50)) {
      return NextResponse.json({ error: 'Name must be 2-50 characters' }, { status: 400 })
    }

    // Validation for URL
    if (url) {
      try {
        new URL(url)
      } catch {
        return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
      }

      // Check URL uniqueness (excluding current node)
      const unique = await isUrlUnique(url, id)
      if (!unique) {
        return NextResponse.json({ error: 'URL already exists' }, { status: 400 })
      }
    }

    // Validation for notes
    if (notes && notes.length > 500) {
      return NextResponse.json({ error: 'Notes must be max 500 characters' }, { status: 400 })
    }

    const node = await updateNode(id, { name, url, tags, notes, favorite, lastOpenedAt })
    return NextResponse.json(node)
  } catch (error) {
    console.error('Error updating node:', error)
    return NextResponse.json({ error: 'Failed to update node' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteNode(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting node:', error)
    return NextResponse.json({ error: 'Failed to delete node' }, { status: 500 })
  }
}

// PATCH for partial updates like toggle favorite or update lastOpened
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action } = body

    if (action === 'toggleFavorite') {
      const node = await toggleFavorite(id)
      return NextResponse.json(node)
    }

    if (action === 'open') {
      const node = await updateLastOpened(id)
      return NextResponse.json(node)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error processing node action:', error)
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 })
  }
}
