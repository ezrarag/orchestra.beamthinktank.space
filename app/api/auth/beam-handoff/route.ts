import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, getBeamHomeAdminAuth } from '@/lib/firebase-admin'

type ExchangeBeamHandoffBody = {
  idToken?: string
}

function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || ''
  const isAllowedOrigin = 
    origin.endsWith('.beamthinktank.space') || 
    origin.startsWith('http://localhost:') || 
    origin === 'https://beamthinktank.space'

  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  })
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request)

  try {
    if (!adminAuth) {
      return NextResponse.json(
        { error: 'Orchestra Firebase Admin Auth is not initialized.' }, 
        { status: 500, headers: corsHeaders }
      )
    }

    const body = (await request.json().catch(() => ({}))) as ExchangeBeamHandoffBody
    const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : ''

    if (!idToken) {
      return NextResponse.json(
        { error: 'Missing BEAM ID token.' }, 
        { status: 400, headers: corsHeaders }
      )
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
    }, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Error exchanging BEAM handoff token:', error)
    return NextResponse.json({ 
      error: 'Failed to exchange BEAM handoff token.',
      details: error?.message || 'Invalid or expired token'
    }, { status: 401, headers: corsHeaders })
  }
}
