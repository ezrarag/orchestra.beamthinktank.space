import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// Initializes using your local ADC (gcloud, service account env, etc.)
initializeApp({
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'beam-orchestra-platform',
})

async function setPartnerAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL || process.env.USER_EMAIL
    const projectId = process.env.PROJECT_ID || 'black-diaspora-symphony'
    
    if (!email) {
      console.error('❌ Please set ADMIN_EMAIL or USER_EMAIL environment variable')
      console.log('Usage: ADMIN_EMAIL=blackdiaspora@gmail.com PROJECT_ID=black-diaspora-symphony npx tsx scripts/setPartnerAdmin.ts')
      process.exit(1)
    }

    const auth = getAuth()
    const db = getFirestore()

    // Get user by email
    let user
    try {
      user = await auth.getUserByEmail(email)
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.error(`❌ User with email ${email} not found`)
        console.log('💡 User must sign in at least once with Google to create their account')
        process.exit(1)
      }
      throw error
    }

    console.log(`📧 Found user: ${email} (uid: ${user.uid})`)

    // Preserve existing claims and add partner_admin role
    const existing = (user.customClaims || {}) as Record<string, unknown>
    await auth.setCustomUserClaims(user.uid, {
      ...existing,
      role: 'partner_admin',
      partner_admin: true,
      assignedProjectId: projectId,
    })
    console.log(`✅ Set custom claims: role=partner_admin, assignedProjectId=${projectId}`)

    // Also update Firestore user document
    await db.collection('users').doc(user.uid).set({
      email: email,
      role: 'partner_admin',
      assignedProjectId: projectId,
      updatedAt: new Date(),
    }, { merge: true })
    console.log(`✅ Updated Firestore user document: role=partner_admin, assignedProjectId=${projectId}`)

    console.log(`\n🎉 Partner admin access granted to ${email} for project: ${projectId}`)
    console.log('📝 Note: User must sign out and back in to refresh ID token claims.')
    console.log(`📝 After signing in, user will be redirected to: /admin/projects/${projectId}`)
  } catch (err: any) {
    console.error('❌ Failed setting partner admin role:', err.message || err)
    process.exit(1)
  }
}

setPartnerAdmin()





