import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { HOME_SLIDES_COLLECTION, sanitizeHomeSlides } from '@/lib/homeSlides'

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
    if (!isAdmin) return { ok: false as const, status: 403, error: 'Insufficient permissions' }
    return { ok: true as const }
  } catch {
    return { ok: false as const, status: 401, error: 'Invalid authorization token' }
  }
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!adminDb) return NextResponse.json({ error: 'Database not initialized' }, { status: 500 })

  try {
    const ngo = (request.nextUrl.searchParams.get('ngo') || 'orchestra').trim() || 'orchestra'
    const docSnap = await adminDb.collection(HOME_SLIDES_COLLECTION).doc(ngo).get()
    if (!docSnap.exists) return NextResponse.json({ slides: [] })
    const data = docSnap.data() as { slides?: unknown }
    return NextResponse.json({ slides: sanitizeHomeSlides(data?.slides) })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load home slides', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  const auth = await authorize(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!adminDb) return NextResponse.json({ error: 'Database not initialized' }, { status: 500 })

  try {
    const body = await request.json()
    const ngo = (typeof body.ngo === 'string' ? body.ngo : 'orchestra').trim() || 'orchestra'
    const slides = sanitizeHomeSlides(body.slides).slice(0, 5)

    await adminDb
      .collection(HOME_SLIDES_COLLECTION)
      .doc(ngo)
      .set(
        {
          ngoId: ngo,
          slides,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )

    return NextResponse.json({ success: true, slides })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save home slides', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
