import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'beam-orchestra-platform.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'beam-orchestra-platform',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'beam-orchestra-platform.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
}

// Check if Firebase config has valid API key
const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey !== 'undefined')
const missingFirebaseKeys = Object.entries(firebaseConfig)
  .filter(([_, value]) => !value || value === 'undefined')
  .map(([key]) => key)

let app: any = null
let db: any = null
let auth: any = null
let storage: any = null

try {
  // Initialize Firebase (avoid duplicate initialization)
  if (isFirebaseConfigured || getApps().length > 0) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
    
    // Initialize Firebase services
    db = getFirestore(app)
    auth = getAuth(app)
    storage = getStorage(app)

    if (auth && typeof window !== 'undefined' && !(window as any).__BEAM_AUTH_LISTENER_ATTACHED__) {
      ;(window as any).__BEAM_AUTH_LISTENER_ATTACHED__ = true
      onAuthStateChanged(auth, (user) => {
        ;(window as any).__BEAM_AUTH_USER__ = user
          ? { uid: user.uid, email: user.email, displayName: user.displayName }
          : null
      })
    }
  } else {
    console.warn('Firebase API key missing in .env.local. Sign-in popup requires NEXT_PUBLIC_FIREBASE_API_KEY.')
  }
} catch (error) {
  console.error('Firebase initialization error:', error)
}

export { db, auth, storage }
