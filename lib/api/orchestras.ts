import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export type RosterMembershipStatus = 'training' | 'promotion_review' | 'professional_tenured'

export interface OrchestraRosterMember {
  participantRef: string
  participantName?: string
  instrument?: string
  part?: string
  membershipStatus: RosterMembershipStatus
  joinedAt: string
  promotedAt?: string
}

export interface OrchestraEnsemble {
  id: string
  city: string
  name: string
  type: 'training' | 'professional'
  venueRef?: string
  rehearsalSchedule: {
    dayOfWeek: string
    time: string
    cadence: string
    yearRound: boolean
  }
  roster: OrchestraRosterMember[]
  transportation?: {
    required: boolean
    coordinatorRef?: string
  }
  createdAt?: unknown
  updatedAt?: unknown
}

export const TRAINING_ORCHESTRAS_COLLECTION = 'trainingOrchestras'
export const PROFESSIONAL_ORCHESTRAS_COLLECTION = 'professionalOrchestras'

export function normalizeOrchestraEnsemble(
  id: string,
  type: 'training' | 'professional',
  data: Record<string, unknown>
): OrchestraEnsemble {
  const scheduleData = (data.rehearsalSchedule as Record<string, unknown>) || {}
  const transData = (data.transportation as Record<string, unknown>) || {}

  return {
    id,
    city: typeof data.city === 'string' ? data.city : 'Milwaukee',
    name: typeof data.name === 'string' ? data.name : id,
    type,
    venueRef: typeof data.venueRef === 'string' ? data.venueRef : undefined,
    rehearsalSchedule: {
      dayOfWeek: typeof scheduleData.dayOfWeek === 'string' ? scheduleData.dayOfWeek : 'Tuesday',
      time: typeof scheduleData.time === 'string' ? scheduleData.time : '18:30',
      cadence: typeof scheduleData.cadence === 'string' ? scheduleData.cadence : 'weekly',
      yearRound: Boolean(scheduleData.yearRound ?? true),
    },
    roster: Array.isArray(data.roster) ? (data.roster as OrchestraRosterMember[]) : [],
    transportation: {
      required: Boolean(transData.required ?? false),
      coordinatorRef: typeof transData.coordinatorRef === 'string' ? transData.coordinatorRef : undefined,
    },
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

export async function fetchOrchestras(
  type: 'training' | 'professional',
  cityFilter?: string
): Promise<OrchestraEnsemble[]> {
  if (!db) return []

  try {
    const colName = type === 'training' ? TRAINING_ORCHESTRAS_COLLECTION : PROFESSIONAL_ORCHESTRAS_COLLECTION
    const colRef = collection(db, colName)
    const q = cityFilter ? query(colRef, where('city', '==', cityFilter)) : colRef

    const snapshot = await getDocs(q)
    return snapshot.docs.map((docSnap) =>
      normalizeOrchestraEnsemble(docSnap.id, type, docSnap.data() as Record<string, unknown>)
    )
  } catch (error) {
    console.error(`Error fetching ${type} orchestras:`, error)
    return []
  }
}

export async function updateRosterMemberStatus(
  orchestraId: string,
  type: 'training' | 'professional',
  participantRef: string,
  newStatus: RosterMembershipStatus
): Promise<boolean> {
  if (!db) return false

  try {
    const colName = type === 'training' ? TRAINING_ORCHESTRAS_COLLECTION : PROFESSIONAL_ORCHESTRAS_COLLECTION
    const docRef = doc(db, colName, orchestraId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return false

    const ensemble = normalizeOrchestraEnsemble(snap.id, type, snap.data() as Record<string, unknown>)
    const updatedRoster = ensemble.roster.map((member) => {
      if (member.participantRef === participantRef) {
        return {
          ...member,
          membershipStatus: newStatus,
          ...(newStatus === 'professional_tenured' ? { promotedAt: new Date().toISOString() } : {}),
        }
      }
      return member
    })

    await updateDoc(docRef, {
      roster: updatedRoster,
      updatedAt: serverTimestamp(),
    })

    return true
  } catch (error) {
    console.error('Error updating roster member status:', error)
    return false
  }
}
