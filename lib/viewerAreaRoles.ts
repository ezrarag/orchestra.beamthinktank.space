import { collection, getDocs, type Firestore } from 'firebase/firestore'
import { DEFAULT_VIEWER_AREA_ROLE_TEMPLATES, type ViewerAreaId, type ViewerRoleTemplate } from '@/lib/config/viewerRoleTemplates'

export type ViewerAreaRolesDoc = {
  areaId: ViewerAreaId
  roles: ViewerRoleTemplate[]
  explainerVideoUrl?: string
}

export function normalizeViewerAreaRolesDoc(
  areaId: ViewerAreaId,
  data?: Partial<ViewerAreaRolesDoc> | null
): ViewerAreaRolesDoc {
  const fallbackRoles = DEFAULT_VIEWER_AREA_ROLE_TEMPLATES[areaId]
  const rawRoles = Array.isArray(data?.roles) ? data!.roles! : fallbackRoles
  const roles = rawRoles
    .filter((role) => role && typeof role.title === 'string' && role.title.trim().length > 0)
    .map((role, index) => ({
      id: role.id || `role-${index + 1}`,
      title: role.title.trim(),
      description: role.description?.trim() ?? '',
      order: Number.isFinite(role.order) ? role.order : index + 1,
    }))
    .sort((a, b) => a.order - b.order)

  return {
    areaId,
    roles,
    explainerVideoUrl: (data?.explainerVideoUrl ?? '').trim(),
  }
}

export async function loadViewerAreaRolesMap(db: Firestore): Promise<Record<ViewerAreaId, ViewerAreaRolesDoc>> {
  const snapshot = await getDocs(collection(db, 'viewerAreaRoles'))
  const next = {} as Record<ViewerAreaId, ViewerAreaRolesDoc>

  ;(Object.keys(DEFAULT_VIEWER_AREA_ROLE_TEMPLATES) as ViewerAreaId[]).forEach((areaId) => {
    next[areaId] = normalizeViewerAreaRolesDoc(areaId)
  })

  snapshot.docs.forEach((docSnap) => {
    const docAreaId = docSnap.id as ViewerAreaId
    if (!(docAreaId in DEFAULT_VIEWER_AREA_ROLE_TEMPLATES)) return
    const data = docSnap.data() as Partial<ViewerAreaRolesDoc>
    next[docAreaId] = normalizeViewerAreaRolesDoc(docAreaId, data)
  })

  return next
}
