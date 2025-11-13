import { ref, getDownloadURL } from 'firebase/storage'
import { storage } from './firebase'

/**
 * Get a signed/download URL for a media file from Firebase Storage
 * @param storagePath - Path to the file in Firebase Storage (e.g., "Black Diaspora Symphony/Music/rehearsal footage/video.mov")
 * @returns Promise<string> - Download URL
 */
export async function getSignedMediaURL(storagePath: string): Promise<string> {
  if (!storage) {
    throw new Error('Firebase Storage is not initialized')
  }

  const storageRef = ref(storage, storagePath)
  return await getDownloadURL(storageRef)
}

/**
 * Get a signed URL via API endpoint (for server-side or when expiration is needed)
 * @param storagePath - Path to the file in Firebase Storage
 * @returns Promise<string> - Signed URL
 */
export async function getSignedMediaURLViaAPI(storagePath: string): Promise<string> {
  const response = await fetch(`/api/media/signed-url?path=${encodeURIComponent(storagePath)}`)
  if (!response.ok) {
    throw new Error('Failed to get signed URL')
  }
  const data = await response.json()
  return data.url
}

