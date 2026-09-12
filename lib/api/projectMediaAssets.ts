import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'

export type MediaType = 'video_overlay' | 'ar_projection' | 'vr_projection' | 'lighting_cue' | 'other'
export type MediaStatus = 'concept' | 'in_production' | 'ready'

export interface ProjectMediaAsset {
  id: string
  recordingProjectId: string
  workId: string
  type: MediaType
  file: {
    url: string
    filename: string
    uploadedAt: string
  }
  syncNotes?: string
  status: MediaStatus
  createdAt?: unknown
  updatedAt?: unknown
}

export const PROJECT_MEDIA_ASSETS_COLLECTION = 'projectMediaAssets'

export function normalizeProjectMediaAsset(id: string, data: Record<string, unknown>): ProjectMediaAsset {
  const fileObj = (data.file as Record<string, unknown>) || {}

  return {
    id,
    recordingProjectId: typeof data.recordingProjectId === 'string' ? data.recordingProjectId : '',
    workId: typeof data.workId === 'string' ? data.workId : '',
    type: (data.type as MediaType) || 'video_overlay',
    file: {
      url: typeof fileObj.url === 'string' ? fileObj.url : '',
      filename: typeof fileObj.filename === 'string' ? fileObj.filename : 'media_asset',
      uploadedAt: typeof fileObj.uploadedAt === 'string' ? fileObj.uploadedAt : new Date().toISOString(),
    },
    syncNotes: typeof data.syncNotes === 'string' ? data.syncNotes : undefined,
    status: (data.status as MediaStatus) || 'concept',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

export async function fetchMediaAssetsForProject(recordingProjectId: string): Promise<ProjectMediaAsset[]> {
  if (!db) return []

  try {
    const colRef = collection(db, PROJECT_MEDIA_ASSETS_COLLECTION)
    const q = query(colRef, where('recordingProjectId', '==', recordingProjectId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((docSnap) =>
      normalizeProjectMediaAsset(docSnap.id, docSnap.data() as Record<string, unknown>)
    )
  } catch (error) {
    console.error('Error fetching project media assets:', error)
    return []
  }
}

export async function createProjectMediaAsset(
  assetData: Omit<ProjectMediaAsset, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string | null> {
  if (!db) return null

  try {
    const colRef = collection(db, PROJECT_MEDIA_ASSETS_COLLECTION)
    const docRef = await addDoc(colRef, {
      ...assetData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error('Error creating project media asset:', error)
    return null
  }
}

/**
 * Uploads a multimedia asset file (video, AR model, lighting cue) to Firebase Storage under projectMediaAssets/{projectId}/{assetId}/{filename}
 */
export async function uploadMediaAssetFileToStorage(
  recordingProjectId: string,
  workId: string,
  type: MediaType,
  file: File,
  syncNotes?: string
): Promise<ProjectMediaAsset | null> {
  if (!storage || !db) return null

  try {
    const cleanFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `projectMediaAssets/${recordingProjectId}/${Date.now()}_${cleanFilename}`
    const storageRef = ref(storage, storagePath)

    await uploadBytesResumable(storageRef, file)
    const downloadUrl = await getDownloadURL(storageRef)

    const assetId = await createProjectMediaAsset({
      recordingProjectId,
      workId,
      type,
      file: {
        url: downloadUrl,
        filename: file.name,
        uploadedAt: new Date().toISOString(),
      },
      syncNotes,
      status: 'concept',
    })

    if (!assetId) return null

    const docSnap = await getDoc(doc(db, PROJECT_MEDIA_ASSETS_COLLECTION, assetId))
    if (!docSnap.exists()) return null

    return normalizeProjectMediaAsset(docSnap.id, docSnap.data() as Record<string, unknown>)
  } catch (error) {
    console.error('Error uploading media asset file:', error)
    return null
  }
}

export async function updateMediaAssetStatus(
  assetId: string,
  status: MediaStatus
): Promise<boolean> {
  if (!db) return false

  try {
    const docRef = doc(db, PROJECT_MEDIA_ASSETS_COLLECTION, assetId)
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp(),
    })
    return true
  } catch (error) {
    console.error('Error updating media asset status:', error)
    return false
  }
}
