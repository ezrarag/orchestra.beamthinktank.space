import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'

type ExchangeBeamHandoffBody = {
  idToken?: string
}

export async function POST(request: NextRequest) {
  try {
    if (!adminAuth) {
      return NextResponse.json({ error: 'Firebase Admin auth is not initialized.' }, { status: 500 })
    }

    const body = (await request.json().catch(() => ({}))) as ExchangeBeamHandoffBody
    const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : ''

    if (!idToken) {
      return NextResponse.json({ error: 'Missing BEAM ID token.' }, { status: 400 })
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const customToken = await adminAuth.createCustomToken(decodedToken.uid)

    return NextResponse.json({
      customToken,
      uid: decodedToken.uid,
    })
  } catch (error) {
    console.error('Error exchanging BEAM handoff token:', error)
    return NextResponse.json({ error: 'Failed to exchange BEAM handoff token.' }, { status: 401 })
  }
}
