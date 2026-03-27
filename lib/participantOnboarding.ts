import { auth } from '@/lib/firebase'
import { normalizeEmailList } from '@/lib/participantIdentity'

export {
  getParticipantIntentLabel,
  isParticipantIntent,
  resolveParticipantIntentDestination,
  type ParticipantIntent,
} from '@/lib/portal/onboarding'

const PARTICIPANT_ROLE_STORAGE_KEY_PREFIX = 'participant_role_'
const PARTICIPANT_ROLES_STORAGE_KEY_PREFIX = 'participant_roles_'
const CONTRIBUTION_CLAIM_STORAGE_KEY_PREFIX = 'claimed_'

function isBrowser() {
  return typeof window !== 'undefined'
}

export function getContributionClaimStorageKey(uid: string): string {
  return `${CONTRIBUTION_CLAIM_STORAGE_KEY_PREFIX}${uid}`
}

export function markContributionClaimed(uid: string): void {
  if (!isBrowser()) return
  window.localStorage.setItem(getContributionClaimStorageKey(uid), 'true')
}

export function getParticipantRoleStorageKey(uid: string): string {
  return `${PARTICIPANT_ROLE_STORAGE_KEY_PREFIX}${uid}`
}

export function getParticipantRolesStorageKey(uid: string): string {
  return `${PARTICIPANT_ROLES_STORAGE_KEY_PREFIX}${uid}`
}

export function readCachedParticipantRole(uid: string): string | null {
  if (!isBrowser()) return null
  return window.localStorage.getItem(getParticipantRoleStorageKey(uid))
}

export function readCachedParticipantRoles(uid: string): string[] {
  if (!isBrowser()) return []

  const stored = window.localStorage.getItem(getParticipantRolesStorageKey(uid))
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as unknown
      if (Array.isArray(parsed)) {
        return parsed.filter((role): role is string => typeof role === 'string' && role.trim().length > 0)
      }
    } catch (error) {
      console.warn('Unable to parse cached participant roles:', error)
    }
  }

  const fallbackRole = readCachedParticipantRole(uid)
  return fallbackRole ? [fallbackRole] : []
}

export function writeCachedParticipantRole(uid: string, role: string): void {
  if (!isBrowser()) return
  const nextRole = role.trim()
  if (!nextRole) return
  window.localStorage.setItem(getParticipantRoleStorageKey(uid), nextRole)
}

export function writeCachedParticipantRoles(uid: string, roles: string[]): void {
  if (!isBrowser()) return

  const normalizedRoles = roles
    .map((role) => role.trim())
    .filter(Boolean)

  if (normalizedRoles.length === 0) return

  window.localStorage.setItem(getParticipantRolesStorageKey(uid), JSON.stringify(normalizedRoles))
  writeCachedParticipantRole(uid, normalizedRoles[0])
}

export async function claimExistingContributions(uid: string, emails: string | string[]): Promise<number> {
  const normalizedEmails = normalizeEmailList(Array.isArray(emails) ? emails : [emails])

  if (!auth?.currentUser || auth.currentUser.uid !== uid || normalizedEmails.length === 0) {
    console.info(`claimed 0 documents for ${normalizedEmails.join(', ')}`)
    return 0
  }

  const token = await auth.currentUser.getIdToken()
  const response = await fetch('/api/participant/claim-contributions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      emails: normalizedEmails,
    }),
  })

  const data = (await response.json().catch(() => ({}))) as { claimedCount?: number; error?: string }
  if (!response.ok) {
    throw new Error(data.error || 'Unable to claim participant contributions.')
  }

  const claimedCount = typeof data.claimedCount === 'number' ? data.claimedCount : 0
  console.info(`claimed ${claimedCount} documents for ${normalizedEmails.join(', ')}`)
  return claimedCount
}
