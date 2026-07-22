import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const ROLE_PRIORITY = ['admin_staff', 'recruit_mentor', 'perform', 'publisher'] as const
export function normalizeEmail(email: string): string { return email.trim().toLowerCase() }
export function normalizeEmailList(emails: Array<string | null | undefined>): string[] { return Array.from(new Set(emails.filter((email): email is string => typeof email === 'string').map(normalizeEmail).filter(Boolean))) }
export function parseEmailList(value: string): string[] { return normalizeEmailList(value.split(/[\n,;]+/)) }
export function sortParticipantRoles(roles: string[]): string[] { return Array.from(new Set(roles.map(role => role.trim()).filter(Boolean))).sort((a,b) => { const ai=ROLE_PRIORITY.indexOf(a as typeof ROLE_PRIORITY[number]); const bi=ROLE_PRIORITY.indexOf(b as typeof ROLE_PRIORITY[number]); return (ai<0?999:ai)-(bi<0?999:bi) }) }
export function readParticipantRoles(input: { role?: unknown; roles?: unknown } | null | undefined): string[] { if (!input) return []; const roles=Array.isArray(input.roles)?input.roles.filter((role):role is string=>typeof role==='string'):[]; return sortParticipantRoles(roles.length?roles:typeof input.role==='string'?[input.role]:[]) }
export function mergeParticipantRoles(existing: { role?: unknown; roles?: unknown } | string[] | null | undefined, nextRoles: Array<string | null | undefined>): string[] { const prior=Array.isArray(existing)?existing:readParticipantRoles(existing); return sortParticipantRoles([...prior,...nextRoles.filter((role):role is string=>typeof role==='string')]) }
export function resolvePrimaryParticipantRole(roles: string[]): string | null { return sortParticipantRoles(roles)[0] ?? null }

const slug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export type ParticipantIdentityInput = {
  id?: string
  authUid?: string | null
  name: string
  email: string
  phone?: string | null
  roles?: string[]
  instruments?: string[]
  sourceSite?: 'law' | 'forge' | 'orchestra'
  sourceUrl?: string | null
  projectId: string
  projectName?: string
  organizationId?: string | null
  organizationName?: string | null
  status?: string
}

export async function upsertCanonicalParticipant(input: ParticipantIdentityInput): Promise<string> {
  if (!db) throw new Error('Firestore is not initialized.')
  const email = normalizeEmail(input.email)
  const participantId = input.id || input.authUid || `participant-${slug(email || input.name)}`
  const cohortId = `orchestra-project-${input.projectId}`
  const sourceSite = input.sourceSite || 'orchestra'
  const sourceSystem = sourceSite === 'orchestra' ? 'beam_orchestra' : `beam_${sourceSite}`
  const membershipStatus = input.status === 'confirmed' || input.status === 'active' ? 'active' : 'pending'
  const batch = writeBatch(db)

  batch.set(doc(db, 'participantProfiles', participantId), {
    canonicalOrganizationId: input.organizationId || null,
    sourceSystem,
    sourceSite,
    sourceUrl: input.sourceUrl || null,
    authUid: input.authUid || null,
    primaryEmail: email || null,
    emailAliases: [],
    primaryPhone: input.phone || null,
    phoneAliases: [],
    fullName: input.name.trim(),
    displayName: input.name.trim(),
    homeInstitutionId: input.organizationId || null,
    instruments: input.instruments || [],
    skills: input.roles || [],
    roles: input.roles || [],
    profileStatus: membershipStatus,
    idempotencyKey: `${sourceSystem}:participantProfiles:${participantId}`,
    updatedAt: serverTimestamp(),
  }, { merge: true })

  batch.set(doc(db, 'cohorts', cohortId), {
    name: input.projectName || input.projectId,
    projectId: input.projectId,
    organizationId: input.organizationId || null,
    sourceSystem: 'beam_orchestra',
    status: 'active',
    updatedAt: serverTimestamp(),
  }, { merge: true })

  batch.set(doc(db, 'cohortMemberships', `${cohortId}_${participantId}`), {
    cohortId,
    participantProfileId: participantId,
    membershipStatus,
    projectId: input.projectId,
    cohortRole: input.roles?.[0] || 'participant',
    instrument: input.instruments?.[0] || null,
    sourceStatus: input.status || 'pending',
    idempotencyKey: `beam_orchestra:cohortMembership:${cohortId}:${participantId}`,
    updatedAt: serverTimestamp(),
  }, { merge: true })

  if (input.organizationId) {
    batch.set(doc(db, 'organizations', input.organizationId), {
      name: input.organizationName || input.organizationId,
      sourceSystem: 'beam_orchestra',
      status: 'active',
      updatedAt: serverTimestamp(),
    }, { merge: true })
    batch.set(doc(db, 'organizationMemberships', `${input.organizationId}_${participantId}`), {
      organizationId: input.organizationId,
      participantProfileId: participantId,
      membershipStatus,
      roles: input.roles?.length ? input.roles : ['participant'],
      sourceProjectId: input.projectId,
      idempotencyKey: `beam_orchestra:organizationMembership:${input.organizationId}:${participantId}`,
      updatedAt: serverTimestamp(),
    }, { merge: true })
  }

  await batch.commit()
  return participantId
}
