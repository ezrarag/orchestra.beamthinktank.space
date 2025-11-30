/**
 * Script to verify a user's subscriber status
 * Run with: npx tsx scripts/verify-subscriber.ts <email>
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load service account key
let serviceAccount
try {
  const serviceAccountPath = join(process.cwd(), 'service-account.json')
  const serviceAccountData = readFileSync(serviceAccountPath, 'utf8')
  serviceAccount = JSON.parse(serviceAccountData)
} catch (error) {
  console.error('❌ Failed to load service-account.json')
  process.exit(1)
}

initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id || 'beam-orchestra-platform',
})

async function verifySubscriber() {
  try {
    const email = process.argv[2]
    
    if (!email) {
      console.error('❌ Please provide an email address')
      console.log('Usage: npx tsx scripts/verify-subscriber.ts <email>')
      process.exit(1)
    }

    const auth = getAuth()
    const db = getFirestore()

    // Get user
    const user = await auth.getUserByEmail(email)
    console.log(`\n👤 User: ${email}`)
    console.log(`   UID: ${user.uid}`)
    
    // Check custom claims
    console.log(`\n🔐 Custom Claims:`)
    const claims = user.customClaims || {}
    console.log(`   beam_subscriber: ${claims.beam_subscriber}`)
    console.log(`   subscriber: ${claims.subscriber}`)
    console.log(`   beam_admin: ${claims.beam_admin}`)
    console.log(`   role: ${claims.role}`)
    console.log(`   All claims:`, JSON.stringify(claims, null, 2))
    
    // Check Firestore document
    console.log(`\n📄 Firestore User Document:`)
    const userDoc = await db.collection('users').doc(user.uid).get()
    if (userDoc.exists()) {
      const userData = userDoc.data()
      console.log(`   subscriber: ${userData?.subscriber}`)
      console.log(`   email: ${userData?.email}`)
      console.log(`   role: ${userData?.role}`)
      console.log(`   Full data:`, JSON.stringify(userData, null, 2))
    } else {
      console.log(`   ⚠️  No user document found in Firestore`)
    }
    
    // Check media count
    console.log(`\n🎥 Media in projectRehearsalMedia:`)
    const mediaSnapshot = await db.collection('projectRehearsalMedia')
      .where('private', '==', false)
      .get()
    console.log(`   Total public videos: ${mediaSnapshot.size}`)
    
    if (mediaSnapshot.size > 0) {
      console.log(`   Sample titles:`)
      mediaSnapshot.docs.slice(0, 3).forEach(doc => {
        const data = doc.data()
        console.log(`     - ${data.title}`)
      })
    }
    
    console.log(`\n✅ Verification complete`)
    console.log(`\n💡 If beam_subscriber is true, user should have access`)
    console.log(`💡 User must sign out and back in for claims to take effect`)
    
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      console.error(`❌ User with email ${process.argv[2]} not found`)
    } else {
      console.error('❌ Error:', err.message || err)
    }
    process.exit(1)
  }
}

verifySubscriber()

