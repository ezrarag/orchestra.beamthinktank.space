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
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'

export type WorkCategory = 'new_composition' | 'arrangement' | 'standard_repertoire'

export interface WorkFile {
  url: string
  filename: string
  uploadedAt: string
  uploadedBy?: string
}

export interface WorkDocument {
  id: string
  title: string
  composer: string
  arranger?: string
  category: WorkCategory
  canonicalWorkKey?: string
  relatedWorkIds: string[]
  instrumentation: string[]
  ensembleType?: string
  era?: string
  keySignature?: string
  durationMinutes?: number
  tags: string[]
  files: {
    score: WorkFile[]
    audioReference: WorkFile[]
    midi: WorkFile[]
  }
  createdBy?: string
  createdAt?: unknown
  updatedAt?: unknown
}

export const WORKS_COLLECTION = 'works'

/**
 * Normalizes composer and title into a canonical string key for smart metadata matching.
 * e.g., "Robert Schumann", "Violin Sonata No. 2 in D minor, Op. 121" -> "robert schumann:violin sonata no 2 in d minor op 121"
 */
export function generateCanonicalWorkKey(composer: string, title: string): string {
  const normComposer = composer.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const normTitle = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  return `${normComposer}:${normTitle}`
}

export function normalizeWorkDocument(id: string, data: Record<string, unknown>): WorkDocument {
  const filesObj = (data.files as Record<string, unknown>) || {}
  const scoreFiles = Array.isArray(filesObj.score) ? (filesObj.score as WorkFile[]) : []
  const audioFiles = Array.isArray(filesObj.audioReference) ? (filesObj.audioReference as WorkFile[]) : []
  const midiFiles = Array.isArray(filesObj.midi) ? (filesObj.midi as WorkFile[]) : []

  return {
    id,
    title: typeof data.title === 'string' ? data.title : id,
    composer: typeof data.composer === 'string' ? data.composer : 'Unknown Composer',
    arranger: typeof data.arranger === 'string' ? data.arranger : undefined,
    category: (data.category as WorkCategory) || 'standard_repertoire',
    canonicalWorkKey: typeof data.canonicalWorkKey === 'string' ? data.canonicalWorkKey : undefined,
    relatedWorkIds: Array.isArray(data.relatedWorkIds) ? (data.relatedWorkIds as string[]) : [],
    instrumentation: Array.isArray(data.instrumentation) ? (data.instrumentation as string[]) : [],
    ensembleType: typeof data.ensembleType === 'string' ? data.ensembleType : undefined,
    era: typeof data.era === 'string' ? data.era : undefined,
    keySignature: typeof data.keySignature === 'string' ? data.keySignature : undefined,
    durationMinutes: typeof data.durationMinutes === 'number' ? data.durationMinutes : undefined,
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    files: {
      score: scoreFiles,
      audioReference: audioFiles,
      midi: midiFiles,
    },
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

export async function fetchWorks(): Promise<WorkDocument[]> {
  if (!db) return []

  try {
    const colRef = collection(db, WORKS_COLLECTION)
    const q = query(colRef, orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((docSnap) =>
      normalizeWorkDocument(docSnap.id, docSnap.data() as Record<string, unknown>)
    )
  } catch (error) {
    console.error('Error fetching works:', error)
    return []
  }
}

export async function fetchWorkById(id: string): Promise<WorkDocument | null> {
  if (!db) return null

  try {
    const docRef = doc(db, WORKS_COLLECTION, id)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return normalizeWorkDocument(docSnap.id, docSnap.data() as Record<string, unknown>)
  } catch (error) {
    console.error('Error fetching work by id:', error)
    return null
  }
}

/**
 * Smart metadata search: Find works matching canonical key or fuzzy composer/title queries.
 */
export async function searchWorksBySmartMatch(composer: string, title: string): Promise<WorkDocument[]> {
  if (!db) return []

  try {
    const canonicalKey = generateCanonicalWorkKey(composer, title)
    const colRef = collection(db, WORKS_COLLECTION)

    // Direct key query
    const keyQuery = query(colRef, where('canonicalWorkKey', '==', canonicalKey))
    const keySnap = await getDocs(keyQuery)

    const matches: WorkDocument[] = keySnap.docs.map((d) =>
      normalizeWorkDocument(d.id, d.data() as Record<string, unknown>)
    )

    if (matches.length > 0) return matches

    // Fallback: search all works for fuzzy match
    const allWorks = await fetchWorks()
    const composerLower = composer.toLowerCase().trim()
    const titleLower = title.toLowerCase().trim()

    return allWorks.filter(
      (w) =>
        (composerLower && w.composer.toLowerCase().includes(composerLower)) ||
        (titleLower && w.title.toLowerCase().includes(titleLower))
    )
  } catch (error) {
    console.error('Error in smart match works search:', error)
    return []
  }
}

export async function createWork(
  workData: Omit<WorkDocument, 'id' | 'createdAt' | 'updatedAt' | 'canonicalWorkKey'>
): Promise<string | null> {
  if (!db) return null

  try {
    const canonicalWorkKey = generateCanonicalWorkKey(workData.composer, workData.title)
    const colRef = collection(db, WORKS_COLLECTION)
    const docRef = await addDoc(colRef, {
      ...workData,
      canonicalWorkKey,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error('Error creating work:', error)
    return null
  }
}

export async function linkRelatedWorks(workIdA: string, workIdB: string): Promise<boolean> {
  if (!db) return false

  try {
    const refA = doc(db, WORKS_COLLECTION, workIdA)
    const refB = doc(db, WORKS_COLLECTION, workIdB)

    const snapA = await getDoc(refA)
    const snapB = await getDoc(refB)

    if (!snapA.exists() || !snapB.exists()) return false

    const workA = normalizeWorkDocument(snapA.id, snapA.data() as Record<string, unknown>)
    const workB = normalizeWorkDocument(snapB.id, snapB.data() as Record<string, unknown>)

    const updatedA = Array.from(new Set([...workA.relatedWorkIds, workIdB]))
    const updatedB = Array.from(new Set([...workB.relatedWorkIds, workIdA]))

    await updateDoc(refA, { relatedWorkIds: updatedA, updatedAt: serverTimestamp() })
    await updateDoc(refB, { relatedWorkIds: updatedB, updatedAt: serverTimestamp() })

    return true
  } catch (error) {
    console.error('Error linking related works:', error)
    return false
  }
}

/**
 * Uploads a score, audio reference, or MIDI file to Firebase Storage under works/{workId}/{fileType}/{filename}
 */
export async function uploadWorkFileToStorage(
  workId: string,
  fileType: 'score' | 'audioReference' | 'midi',
  file: File,
  uploadedBy?: string
): Promise<WorkFile | null> {
  if (!storage || !db) return null

  try {
    const cleanFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `works/${workId}/${fileType}/${Date.now()}_${cleanFilename}`
    const storageRef = ref(storage, storagePath)

    await uploadBytesResumable(storageRef, file)
    const downloadUrl = await getDownloadURL(storageRef)

    const workFile: WorkFile = {
      url: downloadUrl,
      filename: file.name,
      uploadedAt: new Date().toISOString(),
      uploadedBy,
    }

    // Append to work document in Firestore
    const workSnap = await getDoc(doc(db, WORKS_COLLECTION, workId))
    if (workSnap.exists()) {
      const workDoc = normalizeWorkDocument(workSnap.id, workSnap.data() as Record<string, unknown>)
      const updatedCategoryFiles = [...workDoc.files[fileType], workFile]

      await updateDoc(doc(db, WORKS_COLLECTION, workId), {
        [`files.${fileType}`]: updatedCategoryFiles,
        updatedAt: serverTimestamp(),
      })
    }

    return workFile
  } catch (error) {
    console.error(`Error uploading work ${fileType} file:`, error)
    return null
  }
}
