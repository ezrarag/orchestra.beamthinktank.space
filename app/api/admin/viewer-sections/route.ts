import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

async function authorize(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') {
    return { ok: true as const }
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false as const, status: 401, error: 'No authorization token provided' }
  }

  if (!adminAuth) {
    return { ok: false as const, status: 500, error: 'Authentication service not initialized' }
  }

  try {
    const token = authHeader.split('Bearer ')[1]
    const decoded = await adminAuth.verifyIdToken(token)
    const claims = decoded as Record<string, unknown>
    const isAdmin = claims.role === 'beam_admin' || claims.beam_admin === true
    if (!isAdmin) {
      return { ok: false as const, status: 403, error: 'Insufficient permissions' }
    }
    return { ok: true as const }
  } catch {
    return { ok: false as const, status: 401, error: 'Invalid authorization token' }
  }
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  if (!adminDb) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 500 })
  }

  try {
    const snapshot = await adminDb.collection('viewerSections').get()
    const sections = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))

    return NextResponse.json({ sections })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load viewerSections', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorize(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  if (!adminDb) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const sectionId = typeof body.sectionId === 'string' ? body.sectionId.trim() : ''
    if (!sectionId) {
      return NextResponse.json({ error: 'sectionId is required' }, { status: 400 })
    }
    const status = body.status === 'archived' ? 'archived' : 'open'
    const isPublished = body.isPublished !== false
    const active = typeof body.active === 'boolean' ? body.active : status === 'open' && isPublished

    await adminDb
      .collection('viewerSections')
      .doc(sectionId)
      .set(
        {
          areaId: body.areaId ?? 'professional',
          title: body.title ?? '',
          format: body.format ?? 'Narrative Arc',
          summary: body.summary ?? '',
          availability: body.availability ?? 'open',
          order: Number.isFinite(body.order) ? body.order : 1,
          status,
          isPublished,
          active,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )

    return NextResponse.json({ success: true, id: sectionId })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create viewer section', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authorize(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  if (!adminDb) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const sectionId = typeof body.sectionId === 'string' ? body.sectionId.trim() : ''
    if (!sectionId) {
      return NextResponse.json({ error: 'sectionId is required' }, { status: 400 })
    }
    const status = body.status === 'archived' ? 'archived' : 'open'
    const isPublished = body.isPublished !== false
    const active = typeof body.active === 'boolean' ? body.active : status === 'open' && isPublished

    await adminDb
      .collection('viewerSections')
      .doc(sectionId)
      .set(
        {
          areaId: body.areaId ?? 'professional',
          title: body.title ?? '',
          format: body.format ?? 'Narrative Arc',
          summary: body.summary ?? '',
          availability: body.availability ?? 'open',
          order: Number.isFinite(body.order) ? body.order : 1,
          status,
          isPublished,
          active,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )

    return NextResponse.json({ success: true, id: sectionId })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update viewer section', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await authorize(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  if (!adminDb) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 500 })
  }

  try {
    const sectionId = request.nextUrl.searchParams.get('sectionId')?.trim() || ''
    if (!sectionId) {
      return NextResponse.json({ error: 'sectionId is required' }, { status: 400 })
    }

    await adminDb.collection('viewerSections').doc(sectionId).delete()
    return NextResponse.json({ success: true, id: sectionId })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete viewer section', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
