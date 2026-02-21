import { auth } from '@/lib/firebase'
import type { ViewerAreaId } from '@/lib/config/viewerRoleTemplates'

export type AdminStaffAreaSelectionPayload = {
  areaId: ViewerAreaId
  areaTitle: string
  roleIds: string[]
  roleTitles: string[]
  intent: string
}

export type CreateAdminStaffJoinRequestPayload = {
  selections: AdminStaffAreaSelectionPayload[]
}

export async function createAdminStaffJoinRequest(payload: CreateAdminStaffJoinRequestPayload): Promise<string> {
  const currentUser = auth?.currentUser
  if (!currentUser) {
    throw new Error('Please sign in before submitting admin/staff interest.')
  }

  const token = await currentUser.getIdToken()
  const response = await fetch('/api/admin-staff-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to submit admin/staff request.')
  }

  return typeof data?.requestId === 'string' ? data.requestId : ''
}
