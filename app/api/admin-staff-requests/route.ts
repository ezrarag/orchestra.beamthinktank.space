import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import type { ViewerAreaId } from '@/lib/config/viewerRoleTemplates'

const VALID_AREA_IDS = new Set<ViewerAreaId>(['professional', 'community', 'chamber', 'publishing', 'business'])

type AdminStaffSelectionPayload = {
  areaId: ViewerAreaId
  areaTitle: string
  roleIds: string[]
  roleTitles: string[]
  intent?: string
}

type CreateAdminStaffRequestPayload = {
  selections?: AdminStaffSelectionPayload[]
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

    const body = (await request.json()) as CreateAdminStaffRequestPayload
    const selections = Array.isArray(body.selections) ? body.selections : []

    if (selections.length === 0) {
      return NextResponse.json({ error: 'Select at least one area before submitting.' }, { status: 400 })
    }

    const cleanedSelections = selections
      .map((selection) => {
        const areaId = typeof selection.areaId === 'string' ? (selection.areaId as ViewerAreaId) : null
        const areaTitle = typeof selection.areaTitle === 'string' ? selection.areaTitle.trim() : ''
        const roleIds = Array.isArray(selection.roleIds)
          ? selection.roleIds.filter((roleId) => typeof roleId === 'string' && roleId.trim().length > 0)
          : []
        const roleTitles = Array.isArray(selection.roleTitles)
          ? selection.roleTitles.filter((roleTitle) => typeof roleTitle === 'string' && roleTitle.trim().length > 0)
          : []
        const intent = typeof selection.intent === 'string' ? selection.intent.trim() : ''

        if (!areaId || !VALID_AREA_IDS.has(areaId)) return null
        if (!areaTitle) return null
        if (roleIds.length === 0 || roleTitles.length === 0) return null

        return {
          areaId,
          areaTitle,
          roleIds,
          roleTitles,
          intent,
        }
      })
      .filter((selection): selection is NonNullable<typeof selection> => selection !== null)

    if (cleanedSelections.length === 0) {
      return NextResponse.json({ error: 'Each selected area needs at least one role.' }, { status: 400 })
    }

    const requestRef = adminDb.collection('adminStaffJoinRequests').doc()
    await requestRef.set({
      userId: uid,
      selections: cleanedSelections,
      status: 'pending',
      source: 'join-admin-staff',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true, requestId: requestRef.id })
  } catch (error) {
    console.error('Error creating admin/staff join request:', error)
    return NextResponse.json({ error: 'Failed to create admin/staff join request.' }, { status: 500 })
  }
}
