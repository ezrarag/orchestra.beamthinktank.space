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

export type EnsembleType = 'chamber' | 'string_orchestra' | 'full_orchestra' | 'choir_orchestra'
export type OwnerType = 'participant' | 'institution' | 'beam_ensemble'
export type RecordingProjectStatus =
  | 'pending_review'
  | 'open_for_roster'
  | 'in_rehearsal'
  | 'recording'
  | 'mixing'
  | 'released'
export type FundingPath = 'hood_patron' | 'institutional_commitment' | 'unfunded'

export interface RoleNeeded {
  role: string // e.g., 'violin_1', 'cello', 'conductor', 'recording_engineer', 'business_ip_manager'
  filled: boolean
  participantRef?: string
  participantName?: string
}

export interface RecordingProject {
  id: string
  title: string
  composer: string
  arranger?: string
  ensembleType: EnsembleType
  ownerType: OwnerType
  ownerRef?: string
  city: string
  venueRef?: string
  status: RecordingProjectStatus
  rolesNeeded: RoleNeeded[]
  workIds?: string[]
  scoreFiles?: string[]
  targetDates?: string[]
  fundingPath: FundingPath
  visibility: 'public' | 'internal'
  description?: string
  imageUrl?: string
  createdAt?: unknown
  updatedAt?: unknown
}

export const RECORDING_PROJECTS_COLLECTION = 'recordingProjects'

export function normalizeRecordingProject(id: string, data: Record<string, unknown>): RecordingProject {
  return {
    id,
    title: typeof data.title === 'string' ? data.title : id,
    composer: typeof data.composer === 'string' ? data.composer : 'Unknown Composer',
    arranger: typeof data.arranger === 'string' ? data.arranger : undefined,
    ensembleType: (data.ensembleType as EnsembleType) || 'full_orchestra',
    ownerType: (data.ownerType as OwnerType) || 'participant',
    ownerRef: typeof data.ownerRef === 'string' ? data.ownerRef : undefined,
    city: typeof data.city === 'string' ? data.city : 'Milwaukee',
    venueRef: typeof data.venueRef === 'string' ? data.venueRef : undefined,
    status: (data.status as RecordingProjectStatus) || 'open_for_roster',
    rolesNeeded: Array.isArray(data.rolesNeeded) ? (data.rolesNeeded as RoleNeeded[]) : [],
    workIds: Array.isArray(data.workIds) ? (data.workIds as string[]) : [],
    scoreFiles: Array.isArray(data.scoreFiles) ? (data.scoreFiles as string[]) : [],
    targetDates: Array.isArray(data.targetDates) ? (data.targetDates as string[]) : [],
    fundingPath: (data.fundingPath as FundingPath) || 'unfunded',
    visibility: data.visibility === 'internal' ? 'internal' : 'public',
    description: typeof data.description === 'string' ? data.description : undefined,
    imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

export async function fetchRecordingProjects(
  filterStatus?: RecordingProjectStatus
): Promise<RecordingProject[]> {
  if (!db) return []

  try {
    const colRef = collection(db, RECORDING_PROJECTS_COLLECTION)
    const q = filterStatus
      ? query(colRef, where('status', '==', filterStatus))
      : query(colRef, orderBy('createdAt', 'desc'))

    const snapshot = await getDocs(q)
    return snapshot.docs.map((docSnap) =>
      normalizeRecordingProject(docSnap.id, docSnap.data() as Record<string, unknown>)
    )
  } catch (error) {
    console.error('Error fetching recording projects:', error)
    return []
  }
}

export async function fetchRecordingProjectById(id: string): Promise<RecordingProject | null> {
  if (!db) return null

  try {
    const docRef = doc(db, RECORDING_PROJECTS_COLLECTION, id)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return normalizeRecordingProject(docSnap.id, docSnap.data() as Record<string, unknown>)
  } catch (error) {
    console.error('Error fetching recording project:', error)
    return null
  }
}

export async function createRecordingProject(
  projectData: Omit<RecordingProject, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string | null> {
  if (!db) return null

  try {
    const colRef = collection(db, RECORDING_PROJECTS_COLLECTION)
    const docRef = await addDoc(colRef, {
      ...projectData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error('Error creating recording project:', error)
    return null
  }
}

export async function updateRecordingProjectStatus(
  id: string,
  status: RecordingProjectStatus
): Promise<boolean> {
  if (!db) return false

  try {
    const docRef = doc(db, RECORDING_PROJECTS_COLLECTION, id)
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp(),
    })
    return true
  } catch (error) {
    console.error('Error updating recording project status:', error)
    return false
  }
}
