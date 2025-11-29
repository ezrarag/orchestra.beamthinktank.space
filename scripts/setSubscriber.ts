import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// Initializes using your local ADC (gcloud, service account env, etc.)
// Explicitly set projectId to avoid ADC lookup issues
initializeApp({
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'beam-orchestra-platform',
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

