import type { CreateAdminStaffJoinRequestPayload } from '@/lib/api/adminStaff'
import type { ViewerAreaId } from '@/lib/config/viewerRoleTemplates'

const BEAM_HOME_BASE_URL =
  process.env.NEXT_PUBLIC_BEAM_HOME_URL?.trim() || 'https://beamthinktank.space'

const ORCHESTRA_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL?.trim() || 'https://orchestra.beamthinktank.space'

const PENDING_ADMIN_STAFF_STORAGE_KEY = 'beam-orchestra-admin-staff-pending'
const BEAM_RETURN_TOKEN_HASH_KEY = 'beamIdToken'

export type PendingAdminStaffJoin = CreateAdminStaffJoinRequestPayload & {
  areaIds: ViewerAreaId[]
  createdAt: string
}

export function buildOrchestraAdminStaffDashboardUrl(areaIds: ViewerAreaId[]): string {
  const url = new URL('/dashboard', ORCHESTRA_BASE_URL)

  if (areaIds.length > 0) {
    url.searchParams.set('areas', areaIds.join(','))
  }

  url.searchParams.set('intent', 'admin-staff')
  url.searchParams.set('beamReturn', '1')

  return url.toString()
}

export function buildOrchestraAdminStaffHandoffUrl(areaIds: ViewerAreaId[]): string {
  const referrerUrl = new URL('/join/admin-staff', ORCHESTRA_BASE_URL)
  if (areaIds.length > 0) {
    referrerUrl.searchParams.set('areas', areaIds.join(','))
  }

  const params = new URLSearchParams({
    scenarioLabel: 'BEAM Orchestra Admin/Staff',
    role: 'community',
    sourceType: 'ngo_site',
    sourceSystem: 'beam',
    entryChannel: 'orchestra.beamthinktank.space',
    organizationId: 'org_beam_orchestra',
    organizationName: 'BEAM Orchestra',
    cohortId: 'cohort_black_diaspora_symphony',
    cohortName: 'Black Diaspora Symphony',
    siteUrl: ORCHESTRA_BASE_URL,
    landingPageUrl: buildOrchestraAdminStaffDashboardUrl(areaIds),
    referrerUrl: referrerUrl.toString(),
    redirectTarget: 'dashboard',
  })

  return `${BEAM_HOME_BASE_URL}/onboard/handoff?${params.toString()}`
}

export function persistPendingAdminStaffJoin(payload: PendingAdminStaffJoin) {
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.setItem(PENDING_ADMIN_STAFF_STORAGE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.error('Unable to persist pending admin/staff join payload:', error)
  }
}

export function readPendingAdminStaffJoin(): PendingAdminStaffJoin | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(PENDING_ADMIN_STAFF_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<PendingAdminStaffJoin>
    if (!parsed || !Array.isArray(parsed.selections) || !Array.isArray(parsed.areaIds)) {
      return null
    }

    return {
      selections: parsed.selections,
      areaIds: parsed.areaIds as ViewerAreaId[],
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
    }
  } catch (error) {
    console.error('Unable to restore pending admin/staff join payload:', error)
    return null
  }
}

export function clearPendingAdminStaffJoin() {
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.removeItem(PENDING_ADMIN_STAFF_STORAGE_KEY)
  } catch (error) {
    console.error('Unable to clear pending admin/staff join payload:', error)
  }
}

export function readBeamReturnIdTokenFromHash(): string | null {
  if (typeof window === 'undefined') return null

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash

  if (!hash) return null

  const params = new URLSearchParams(hash)
  return params.get(BEAM_RETURN_TOKEN_HASH_KEY)?.trim() || null
}

export function clearBeamReturnHash() {
  if (typeof window === 'undefined' || !window.location.hash) return

  const nextUrl = `${window.location.pathname}${window.location.search}`
  window.history.replaceState(null, '', nextUrl)
}
