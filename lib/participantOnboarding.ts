import { collection, getDocs, query, where, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export {
  getParticipantIntentLabel,
  isParticipantIntent,
  resolveParticipantIntentDestination,
  type ParticipantIntent,
} from '@/lib/portal/onboarding'

const PARTICIPANT_ROLE_STORAGE_KEY_PREFIX = 'participant_role_'
const CONTRIBUTION_CLAIM_STORAGE_KEY_PREFIX = 'claimed_'
const CLAIM_BATCH_SIZE = 400

function isBrowser() {
  return typeof window !== 'undefined'
}

function normalizeEmail(email: string): string {
  return email.trim()
}

function getSubmittedByClaimState(data: Record<string, unknown>) {
  const hasSubmittedBy = Object.prototype.hasOwnProperty.call(data, 'submittedBy')
  return {
    hasSubmittedBy,
    submittedBy: data.submittedBy,
  }
}

async function claimCollectionByEmail(
  collectionName: string,
  uid: string,
  email: string,
  options: { optional?: boolean } = {},
): Promise<number> {
  if (!db || !email) return 0

  try {
    const snapshot = await getDocs(query(collection(db, collectionName), where('email', '==', email)))
    const docsToClaim = snapshot.docs.filter((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>
      const { hasSubmittedBy, submittedBy } = getSubmittedByClaimState(data)
      return !hasSubmittedBy || submittedBy === null
    })

    if (docsToClaim.length === 0) {
      return 0
    }

    for (let index = 0; index < docsToClaim.length; index += CLAIM_BATCH_SIZE) {
      const batch = writeBatch(db)
      docsToClaim.slice(index, index + CLAIM_BATCH_SIZE).forEach((docSnap) => {
        batch.update(docSnap.ref, {
          submittedBy: uid,
        })
      })
      await batch.commit()
    }

    return docsToClaim.length
  } catch (error) {
    if (options.optional) {
      console.warn(`Skipping optional contribution claim for ${collectionName}:`, error)
      return 0
    }

    throw error
  }
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

export function readCachedParticipantRole(uid: string): string | null {
  if (!isBrowser()) return null
  return window.localStorage.getItem(getParticipantRoleStorageKey(uid))
}

export function writeCachedParticipantRole(uid: string, role: string): void {
  if (!isBrowser()) return
  const nextRole = role.trim()
  if (!nextRole) return
  window.localStorage.setItem(getParticipantRoleStorageKey(uid), nextRole)
}

export async function claimExistingContributions(uid: string, email: string): Promise<number> {
  const normalizedEmail = normalizeEmail(email)

  if (!db || !uid || !normalizedEmail) {
    console.info(`claimed 0 documents for ${normalizedEmail}`)
    return 0
  }

  const [cohortApplicationsClaimed, chamberVersionsClaimed] = await Promise.all([
    claimCollectionByEmail('cohortApplications', uid, normalizedEmail),
    claimCollectionByEmail('chamberVersions', uid, normalizedEmail, { optional: true }),
  ])

  const claimedCount = cohortApplicationsClaimed + chamberVersionsClaimed
  console.info(`claimed ${claimedCount} documents for ${normalizedEmail}`)
  return claimedCount
}
