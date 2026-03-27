import type { AdminTableRow, UserProfileSummary } from '@/lib/types/portal'
import { db } from '@/lib/firebase'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { readParticipantRoles, resolvePrimaryParticipantRole } from '@/lib/participantIdentity'

const MEMBERSHIP_ROLE_LABELS: Record<string, string> = {
  perform: 'Performer',
  recruit_mentor: 'Recruiter and Mentor',
  admin_staff: 'Admin / Staff',
  publisher: 'Publisher',
}

export async function fetchUserProfile(_ngo: string, userId?: string): Promise<UserProfileSummary> {
  if (!db || !userId) {
    return {
      name: '',
      volunteerHours: 0,
      paidOpportunities: 0,
      institutionRole: undefined,
      membershipRole: undefined,
      membershipRoles: undefined,
    }
  }

  try {
    const [userSnap, musicianSnap, membershipSnap] = await Promise.all([
      getDoc(doc(db, 'users', userId)),
      getDoc(doc(db, 'musicians', userId)),
      getDoc(doc(db, 'ngoMemberships', userId)),
    ])

    const userData = userSnap.exists() ? userSnap.data() : null
    const musicianData = musicianSnap.exists() ? musicianSnap.data() : null
    const membershipData = membershipSnap.exists() ? membershipSnap.data() : null

    const resolvedName =
      (typeof userData?.displayName === 'string' && userData.displayName.trim()) ||
      (typeof userData?.name === 'string' && userData.name.trim()) ||
      (typeof musicianData?.name === 'string' && musicianData.name.trim()) ||
      ''

    const membershipRoles = readParticipantRoles(membershipData)
    const membershipRole = resolvePrimaryParticipantRole(membershipRoles) || ''

    const fallbackRole =
      (typeof userData?.role === 'string' && userData.role.trim()) ||
      ''

    const membershipRoleLabel = membershipRoles
      .map((role) => MEMBERSHIP_ROLE_LABELS[role] || role)
      .join(' / ')

    const institutionRole =
      (typeof userData?.institutionRole === 'string' && userData.institutionRole.trim()) ||
      (membershipRoleLabel
        ? membershipRoleLabel
        : fallbackRole
          ? MEMBERSHIP_ROLE_LABELS[fallbackRole] || fallbackRole
          : undefined)

    return {
      name: resolvedName,
      volunteerHours:
        typeof userData?.volunteerHours === 'number'
          ? userData.volunteerHours
          : typeof musicianData?.volunteerHours === 'number'
            ? musicianData.volunteerHours
            : 0,
      paidOpportunities:
        typeof userData?.paidOpportunities === 'number'
          ? userData.paidOpportunities
          : typeof musicianData?.paidOpportunities === 'number'
            ? musicianData.paidOpportunities
            : 0,
      institutionRole,
      membershipRole: membershipRole || undefined,
      membershipRoles: membershipRoles.length > 0 ? membershipRoles : undefined,
    }
  } catch (error) {
    console.error('Unable to fetch user profile:', error)
    return {
      name: '',
      volunteerHours: 0,
      paidOpportunities: 0,
      institutionRole: undefined,
      membershipRole: undefined,
      membershipRoles: undefined,
    }
  }
}

export async function fetchAdminRows(_ngo: string): Promise<Record<string, AdminTableRow[]>> {
  return {
    requests: [
      {
        id: 'req-001',
        title: 'Partner request: spring string quartet',
        owner: 'Lakeview Arts Council',
        status: 'Pending',
        updatedAt: '2026-02-10',
      },
    ],
    sessions: [
      {
        id: 'sess-101',
        title: 'Studio A evening session',
        owner: 'Production Team',
        status: 'Scheduled',
        updatedAt: '2026-02-12',
      },
    ],
    participants: [
      {
        id: 'part-007',
        title: 'Roster completeness check',
        owner: 'Operations',
        status: 'In Progress',
        updatedAt: '2026-02-11',
      },
    ],
    reports: [
      {
        id: 'rep-204',
        title: 'Volunteer and paid hours snapshot',
        owner: 'BEAM Staff',
        status: 'Draft',
        updatedAt: '2026-02-09',
      },
    ],
  }
}

interface ParticipantProfilePayload {
  institutionId: string
  instrument: string
  preferredRoles: string[]
}

export async function setUserInstitutionAndInstrument(
  userId: string,
  payload: ParticipantProfilePayload,
): Promise<void> {
  if (!db) {
    throw new Error('User profile service is not initialized.')
  }

  await setDoc(
    doc(db, 'users', userId),
    {
      institutionId: payload.institutionId,
      instrument: payload.instrument,
      preferredRoles: payload.preferredRoles,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}
