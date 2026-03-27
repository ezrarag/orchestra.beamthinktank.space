import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { HOME_SLIDES_COLLECTION, sanitizeHomeSlides } from '@/lib/homeSlides'

export async function GET(request: NextRequest) {
  const ngo = (request.nextUrl.searchParams.get('ngo') || 'orchestra').trim() || 'orchestra'

  if (!adminDb) {
    return NextResponse.json({ slides: [] })
  }

  try {
    const docSnap = await adminDb.collection(HOME_SLIDES_COLLECTION).doc(ngo).get()
    if (!docSnap.exists) {
      return NextResponse.json({ slides: [] })
    }

    const data = docSnap.data() as { slides?: unknown }
    return NextResponse.json({ slides: sanitizeHomeSlides(data?.slides) })
  } catch (error) {
    console.error(`Failed to load home slides for "${ngo}"`, error)
    return NextResponse.json({ slides: [] })
  }
}
