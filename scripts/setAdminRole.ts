import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

// Initializes using your local ADC (gcloud, service account env, etc.)
// Explicitly set projectId to avoid ADC lookup issues
initializeApp({
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'beam-orchestra-platform',
})

async function setAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL || 'YOUR_EMAIL@example.com'
    if (!email || email === 'YOUR_EMAIL@example.com') {
      console.error('Please set ADMIN_EMAIL env or edit scripts/setAdminRole.ts with your email')
      process.exit(1)
    }

    const user = await getAuth().getUserByEmail(email)
    // Preserve existing claims and add beam_admin=true
    const existing = (user.customClaims || {}) as Record<string, unknown>
    await getAuth().setCustomUserClaims(user.uid, { ...existing, beam_admin: true, role: existing['role'] ?? 'beam_admin' })
    console.log(`✅ Set beam_admin for ${email} (uid: ${user.uid})`)
    console.log('Note: Sign out and back in to refresh ID token claims.')
  } catch (err) {
    console.error('Failed setting admin role:', err)
    process.exit(1)
  }
}

setAdmin()


