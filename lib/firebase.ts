import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Check if Firebase config is complete
const isFirebaseConfigured = Object.values(firebaseConfig).every(value => value && value !== 'undefined')

let app: any = null
let db: any = null
let auth: any = null
let storage: any = null

if (isFirebaseConfigured) {
  try {
    // Initialize Firebase
    app = initializeApp(firebaseConfig)
    
    // Initialize Firebase services
    db = getFirestore(app)
    auth = getAuth(app)
    storage = getStorage(app)
  } catch (error) {
    console.warn('Firebase initialization failed:', error)
  }
} else {
  console.warn('Firebase configuration incomplete. Please check your environment variables.')
}

export { db, auth, storage }
export default app
