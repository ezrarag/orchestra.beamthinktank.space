import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, getBeamHomeAdminAuth } from '@/lib/firebase-admin'

type ExchangeBeamHandoffBody = {
  idToken?: string
}

export async function POST(request: NextRequest) {
  try {
    if (!adminAuth) {
      return NextResponse.json({ error: 'Orchestra Firebase Admin Auth is not initialized.' }, { status: 500 })
    }

    const body = (await request.json().catch(() => ({}))) as ExchangeBeamHandoffBody
    const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : ''

    if (!idToken) {
      return NextResponse.json({ error: 'Missing BEAM ID token.' }, { status: 400 })
    }

    // 1. Verify incoming ID Token using dedicated beam-home Admin SDK if configured,
    // otherwise fallback to Orchestra's adminAuth (useful in local dev / unified project setups)
    const verifierAuth = getBeamHomeAdminAuth() || adminAuth
    const decodedToken = await verifierAuth.verifyIdToken(idToken)

    // 2. Mint Orchestra custom token for the verified user UID
    const customToken = await adminAuth.createCustomToken(decodedToken.uid, {
      source: 'beam-home-sso',
      email: decodedToken.email || undefined
    })

    return NextResponse.json({
      customToken,
      uid: decodedToken.uid,
      email: decodedToken.email || null,
    })
  } catch (error: any) {
    console.error('Error exchanging BEAM handoff token:', error)
    return NextResponse.json({ 
      error: 'Failed to exchange BEAM handoff token.',
      details: error?.message || 'Invalid or expired token'
    }, { status: 401 })
  }
}
