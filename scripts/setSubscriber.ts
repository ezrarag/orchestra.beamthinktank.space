import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load service account key from project root
// The service-account.json file should be in the project root directory
let serviceAccount
try {
  // Try project root first (when running from scripts/ directory)
  const serviceAccountPath = join(process.cwd(), 'service-account.json')
  const serviceAccountData = readFileSync(serviceAccountPath, 'utf8')
  serviceAccount = JSON.parse(serviceAccountData)
  console.log('✅ Loaded service account from:', serviceAccountPath)
} catch (error) {
  console.error('❌ Failed to load service-account.json')
  console.error('💡 Make sure service-account.json is in the project root directory')
  console.error('💡 Get it from: Firebase Console → Project Settings → Service Accounts → Generate new private key')
  process.exit(1)
}

// Initialize Firebase Admin with service account
initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id || 'beam-orchestra-platform',
})

async function setSubscriber() {
  try {
    const email = process.argv[2]
    
    if (!email) {
      console.error('❌ Please provide an email address as an argument')
      console.log('Usage: npx tsx scripts/setSubscriber.ts <email>')
      process.exit(1)
    }

    const auth = getAuth()
    const db = getFirestore()

    // Get user by email
    const user = await auth.getUserByEmail(email)
    console.log(`📧 Found user: ${email} (uid: ${user.uid})`)

    // Preserve existing claims and add beam_subscriber=true
    const existing = (user.customClaims || {}) as Record<string, unknown>
    await auth.setCustomUserClaims(user.uid, {
      ...existing,
      beam_subscriber: true,
      subscriber: true, // Also set subscriber for consistency
    })
    console.log(`✅ Set custom claims: beam_subscriber=true, subscriber=true`)

    // Also update Firestore user document
    const userRef = db.collection('users').doc(user.uid)
    await userRef.set({
      subscriber: true,
      email: email,
      updatedAt: new Date(),
    }, { merge: true })
    console.log(`✅ Updated Firestore user document: subscriber=true`)

    console.log(`\n🎉 Subscriber access granted to ${email}`)
    console.log('📝 Note: User must sign out and back in to refresh ID token claims.')
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      console.error(`❌ User with email ${process.argv[2]} not found`)
      console.log('💡 Make sure the user has signed in at least once to create their account')
    } else {
      console.error('❌ Failed setting subscriber role:', err.message || err)
    }
    process.exit(1)
  }
}

setSubscriber()


