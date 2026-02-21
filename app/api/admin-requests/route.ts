import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

interface CreateAdminRequestPayload {
  roleId: string
  roleLabel: string
  areaId?: string
  areaTitle?: string
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 })
    }

    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: 'Admin request service is not initialized' }, { status: 500 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const body = (await request.json()) as Partial<CreateAdminRequestPayload>
    const roleId = typeof body.roleId === 'string' ? body.roleId.trim() : ''
    const roleLabel = typeof body.roleLabel === 'string' ? body.roleLabel.trim() : ''
    const areaId = typeof body.areaId === 'string' ? body.areaId.trim() : ''
    const areaTitle = typeof body.areaTitle === 'string' ? body.areaTitle.trim() : ''

    if (!roleId || !roleLabel) {
      return NextResponse.json({ error: 'roleId and roleLabel are required.' }, { status: 400 })
    }

    const adminRequestRef = adminDb.collection('adminRequests').doc()
    await adminRequestRef.set({
      userId: uid,
      roleId,
      roleLabel,
      areaId: areaId || null,
      areaTitle: areaTitle || null,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true, adminRequestId: adminRequestRef.id })
  } catch (error) {
    console.error('Error creating admin request:', error)
    return NextResponse.json({ error: 'Failed to create admin request.' }, { status: 500 })
  }
}
