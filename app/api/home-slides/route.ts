import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { HOME_SLIDES_COLLECTION, sanitizeHomeSlides } from '@/lib/homeSlides'

export async function GET(request: NextRequest) {
  if (!adminDb) {
    return NextResponse.json({ slides: [] })
  }

  try {
    const ngo = (request.nextUrl.searchParams.get('ngo') || 'orchestra').trim() || 'orchestra'
    const docSnap = await adminDb.collection(HOME_SLIDES_COLLECTION).doc(ngo).get()
    if (!docSnap.exists) {
      return NextResponse.json({ slides: [] })
    }

    const data = docSnap.data() as { slides?: unknown }
    return NextResponse.json({ slides: sanitizeHomeSlides(data?.slides) })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load home slides', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
