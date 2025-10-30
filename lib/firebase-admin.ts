import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { getStorage } from 'firebase-admin/storage'

// Keyless initialization using Application Default Credentials
const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: applicationDefault(),
      projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    })

// Export admin services
export const adminDb = getFirestore(app)
export const adminAuth = getAuth(app)
export const adminStorage = getStorage(app)

// Helper function to verify admin role
export async function verifyAdminRole(uid: string): Promise<boolean> {
  try {
    const user = await adminAuth.getUser(uid)
    const customClaims = user.customClaims || {}
    // Support either a string role or a boolean claim
    return customClaims.role === 'beam_admin' || (customClaims as any).beam_admin === true
  } catch (error) {
    console.error('Error verifying admin role:', error)
    return false
  }
}

// Helper function to get user role
export async function getUserRole(uid: string): Promise<string | null> {
  try {
    const user = await adminAuth.getUser(uid)
    const customClaims = user.customClaims || {}
    return customClaims.role || null
  } catch (error) {
    console.error('Error getting user role:', error)
    return null
  }
}

// Helper function to set user role (admin only)
export async function setUserRole(uid: string, role: string): Promise<void> {
  try {
    await adminAuth.setCustomUserClaims(uid, { role })
  } catch (error) {
    console.error('Error setting user role:', error)
    throw error
  }
}

export default app
