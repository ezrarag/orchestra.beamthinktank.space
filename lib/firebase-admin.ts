import { initializeApp, getApps, applicationDefault, cert, App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { getStorage } from 'firebase-admin/storage'
import fs from 'fs'
import path from 'path'

let app: App | null = null
let adminDb: ReturnType<typeof getFirestore> | null = null
let adminAuth: ReturnType<typeof getAuth> | null = null
let adminStorage: ReturnType<typeof getStorage> | null = null

// Initialize Firebase Admin SDK with fallback options
function initializeAdminSDK() {
  if (app) return app

  try {
    // Try to use existing app
    const existingApps = getApps()
    if (existingApps.length > 0) {
      app = existingApps[0]
    } else {
      // In local development prefer service-account.json so routes hit the same project as local tooling.
      // In production prefer env-based credentials.
      const shouldPreferLocalFile = process.env.NODE_ENV !== 'production'

      const initFromLocalServiceAccount = () => {
        try {
          const serviceAccountPath = path.join(process.cwd(), 'service-account.json')
          if (fs.existsSync(serviceAccountPath)) {
            const raw = fs.readFileSync(serviceAccountPath, 'utf8')
            const parsed = JSON.parse(raw) as {
              project_id?: string
              private_key?: string
              client_email?: string
            }

            if (parsed.private_key && parsed.client_email) {
              const localProjectId =
                parsed.project_id ||
                process.env.GOOGLE_CLOUD_PROJECT ||
                process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
                'beam-orchestra-platform'

              app = initializeApp({
                credential: cert({
                  projectId: localProjectId,
                  privateKey: parsed.private_key,
                  clientEmail: parsed.client_email,
                }),
                projectId: localProjectId,
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
              })
              console.info(`Firebase Admin SDK initialized from local service-account.json (${localProjectId})`)
            }
          }
        } catch (localFileError) {
          console.warn('Failed to initialize with local service-account.json:', localFileError)
        }
      }

      const initFromEnvServiceAccount = () => {
        if (!process.env.FIREBASE_ADMIN_PRIVATE_KEY || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
          return
        }
        try {
          const envProjectId =
            process.env.GOOGLE_CLOUD_PROJECT ||
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
            'beam-orchestra-platform'
          app = initializeApp({
            credential: cert({
              projectId: envProjectId,
              privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
              clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            }),
            projectId: envProjectId,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          })
          console.info(`Firebase Admin SDK initialized from env service account (${envProjectId})`)
        } catch (certError) {
          console.warn('Failed to initialize with env service account cert:', certError)
        }
      }

      if (shouldPreferLocalFile) {
        initFromLocalServiceAccount()
        if (!app) initFromEnvServiceAccount()
      } else {
        initFromEnvServiceAccount()
        if (!app) initFromLocalServiceAccount()
      }

      // Final fallback: application default credentials.
      if (!app) {
        app = initializeApp({
          credential: applicationDefault(),
          projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'beam-orchestra-platform',
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        })
        console.info('Firebase Admin SDK initialized from application default credentials')
      }
    }

    // Initialize services
    adminDb = getFirestore(app)
    adminAuth = getAuth(app)
    adminStorage = getStorage(app)
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error)
    // Return null - API routes should handle this gracefully
  }

  return app
}

// Initialize on import
initializeAdminSDK()

// Export admin services with null checks
export { adminDb, adminAuth, adminStorage }

// Helper to check if Admin SDK is available
export function isAdminSDKAvailable(): boolean {
  return app !== null && adminAuth !== null && adminDb !== null
}

// Helper function to verify admin role
export async function verifyAdminRole(uid: string): Promise<boolean> {
  if (!adminAuth) {
    console.error('Admin SDK not initialized - cannot verify admin role')
    return false
  }
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
  if (!adminAuth) {
    console.error('Admin SDK not initialized - cannot get user role')
    return null
  }
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
  if (!adminAuth) {
    throw new Error('Admin SDK not initialized - cannot set user role')
  }
  try {
    await adminAuth.setCustomUserClaims(uid, { role })
  } catch (error) {
    console.error('Error setting user role:', error)
    throw error
  }
}

export default app
