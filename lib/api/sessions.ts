import { collection, getDocs, query, orderBy, where, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { CommitmentSummary, OpenCallSummary, SessionSummary } from '@/lib/types/portal'
import { fetchRecordingProjects } from '@/lib/api/recordingProjects'

export async function fetchUpcomingSessions(_ngo: string): Promise<SessionSummary[]> {
  if (!db) return []

  try {
    const q = query(collection(db, 'sessions'), orderBy('date', 'asc'), limit(10))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data()
      const rawType = typeof data.type === 'string' ? data.type : 'Recording'
      const type: 'Recording' | 'Performance' | 'Workshop' =
        rawType === 'Performance' || rawType === 'Workshop' ? rawType : 'Recording'

      return {
        id: docSnap.id,
        title: typeof data.title === 'string' ? data.title : docSnap.id,
        date: typeof data.date === 'string' ? data.date : 'TBD',
        location: typeof data.location === 'string' ? data.location : 'Location TBD',
        type,
      }
    })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return []
  }
}

export async function fetchCommitments(_ngo: string, _userId?: string): Promise<CommitmentSummary[]> {
  if (!db) return []

  try {
    const q = _userId
      ? query(collection(db, 'commitments'), where('userId', '==', _userId))
      : query(collection(db, 'commitments'), limit(10))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        title: typeof data.title === 'string' ? data.title : docSnap.id,
        time: typeof data.time === 'string' ? data.time : 'TBD',
        location: typeof data.location === 'string' ? data.location : 'Location TBD',
      }
    })
  } catch (error) {
    console.error('Error fetching commitments:', error)
    return []
  }
}

export async function fetchOpenCalls(_ngo: string): Promise<OpenCallSummary[]> {
  try {
    const projects = await fetchRecordingProjects('open_for_roster')
    return projects.map((p) => ({
      id: p.id,
      title: `${p.title} (${p.city})`,
      details: p.description || `Roles needed: ${p.rolesNeeded.map((r) => r.role).join(', ')}`,
      paid: p.fundingPath !== 'unfunded',
    }))
  } catch (error) {
    console.error('Error fetching open calls:', error)
    return []
  }
}
