import { NextResponse } from 'next/server'
import { fetchCrossSiteRecordPayload } from '@/lib/api/profile'

export async function GET(
  request: Request,
  context: { params: Promise<{ email: string }> }
) {
  try {
    const { email } = await context.params
    const rawEmail = email ? decodeURIComponent(email) : ''
    if (!rawEmail) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 })
    }

    const payload = await fetchCrossSiteRecordPayload(rawEmail)

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  } catch (error: any) {
    console.error('Error fetching cross-site profile:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
