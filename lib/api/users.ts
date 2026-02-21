import type { AdminTableRow, UserProfileSummary } from '@/lib/types/portal'
import { db } from '@/lib/firebase'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'

export async function fetchUserProfile(_ngo: string, _userId?: string): Promise<UserProfileSummary> {
  return {
    name: 'Guest Musician',
    volunteerHours: 28,
    paidOpportunities: 3,
    institutionRole: 'Performer',
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
