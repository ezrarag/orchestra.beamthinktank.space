import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

// Initializes using your local ADC (gcloud, service account env, etc.)
// Explicitly set projectId to avoid ADC lookup issues
initializeApp({
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'beam-orchestra-platform',
})

/**
 * Set admin role for multiple users by email
 * 
 * Usage:
 *   ADMIN_EMAILS="ezra@readyaimgo.biz,blackdiaspora@gmail.com" npx tsx scripts/setMultipleAdmins.ts
 * 
 * Or edit this file and set the emails array directly
 */
async function setMultipleAdmins() {
  try {
    // Get emails from environment variable or use defaults
    const emailsEnv = process.env.ADMIN_EMAILS
    const emails: string[] = emailsEnv 
      ? emailsEnv.split(',').map(e => e.trim()).filter(e => e)
      : [
          'ezra@readyaimgo.biz',
          // Add the black diaspora Gmail here, or pass via ADMIN_EMAILS env var
          // 'blackdiaspora@gmail.com', // Replace with actual email
        ]

    if (emails.length === 0) {
      console.error('❌ No emails provided. Set ADMIN_EMAILS env var or edit this script.')
      process.exit(1)
    }

    console.log(`\n🔐 Setting admin roles for ${emails.length} user(s)...\n`)

    const auth = getAuth()
    const results: Array<{ email: string; success: boolean; uid?: string; error?: string }> = []

    for (const email of emails) {
      try {
        // Check if user exists
        let user
        try {
          user = await auth.getUserByEmail(email)
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            console.log(`⚠️  User not found: ${email}`)
            console.log(`   → User must sign in at least once with Google to create their account`)
            results.push({ email, success: false, error: 'User not found - must sign in first' })
            continue
          }
          throw error
        }

        // Preserve existing claims and add beam_admin=true
        const existing = (user.customClaims || {}) as Record<string, unknown>
        await auth.setCustomUserClaims(user.uid, {
          ...existing,
          beam_admin: true,
          role: 'beam_admin',
        })

        console.log(`✅ Set beam_admin for ${email} (uid: ${user.uid})`)
        results.push({ email, success: true, uid: user.uid })
      } catch (error: any) {
        console.error(`❌ Failed to set admin for ${email}:`, error.message)
        results.push({ email, success: false, error: error.message })
      }
    }

    // Summary
    console.log(`\n📊 Summary:`)
    console.log(`   ✅ Success: ${results.filter(r => r.success).length}`)
    console.log(`   ❌ Failed: ${results.filter(r => !r.success).length}`)
    
    if (results.some(r => !r.success)) {
      console.log(`\n⚠️  Note: Users must sign out and sign back in to refresh their ID token claims.`)
    } else {
      console.log(`\n✅ All users set as admins!`)
      console.log(`⚠️  Note: Users must sign out and sign back in to refresh their ID token claims.`)
    }

    process.exit(0)
  } catch (err: any) {
    console.error('❌ Failed setting admin roles:', err.message)
    process.exit(1)
  }
}

setMultipleAdmins()

