/**
 * Create/update a single test institution account for manual QA of the
 * institution view (dashboard access via contactEmails match).
 *
 * Dry run:
 *   npx tsx scripts/seedTestInstitution.ts --email=someone@example.com
 *
 * Apply:
 *   npx tsx scripts/seedTestInstitution.ts --email=someone@example.com --apply
 *
 * Optional overrides:
 *   --id=custom-doc-id --name="Display Name"
 */
import fs from 'fs'
import path from 'path'
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const INSTITUTION_ACCOUNTS_COLLECTION = 'institutionAccounts'

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function loadEnvFiles() {
  const envFiles = ['.env.local', '.env']
  for (const file of envFiles) {
    const filePath = path.join(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=')
          const key = trimmed.slice(0, idx).trim()
          let val = trimmed.slice(idx + 1).trim()
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1)
          }
          if (key && !process.env[key]) {
            process.env[key] = val
          }
        }
      }
    }
  }
}

function initAdmin() {
  if (getApps().length > 0) return getApps()[0]
  loadEnvFiles()

  const serviceAccountPath = path.join(process.cwd(), 'service-account.json')
  if (fs.existsSync(serviceAccountPath)) {
    const raw = fs.readFileSync(serviceAccountPath, 'utf8')
    const parsed = JSON.parse(raw) as { project_id?: string; private_key?: string; client_email?: string }
    if (parsed.project_id && parsed.private_key && parsed.client_email) {
      return initializeApp({
        credential: cert({ projectId: parsed.project_id, privateKey: parsed.private_key, clientEmail: parsed.client_email }),
        projectId: parsed.project_id,
      })
    }
  }

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.NEXT_PUBLIC_FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.NEXT_PUBLIC_FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'beam-orchestra-platform'

  if (clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, privateKey, clientEmail }),
      projectId,
    })
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId,
  })
}

function getArgValue(name: string) {
  const prefix = `--${name}=`
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? ''
}

async function main() {
  initAdmin()
  const db = getFirestore()
  const apply = process.argv.includes('--apply')

  const email = normalizeEmail(getArgValue('email'))
  if (!email) {
    throw new Error('Pass --email=someone@example.com')
  }

  const id = getArgValue('id') || `test-${email.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`
  const name = getArgValue('name') || `QA Test Institution (${email})`

  const account = {
    id,
    name,
    shortName: 'QA Test',
    status: 'active' as const,
    type: 'other' as const,
    city: '',
    state: '',
    website: '',
    contactEmails: [email],
    emailDomains: [],
    userIds: [],
    projectIds: [] as string[],
    contacts: [{ name: email, email, role: 'Institution dashboard contact (QA)' }],
    dashboardSummary: 'Manual QA account for testing institution sign-in and dashboard access. No linked projects yet — add one from /admin/institutions to test the full pipeline.',
    notes: 'Created for manual testing of the institution view. Safe to delete once QA is done.',
  }

  console.log(`${apply ? 'APPLY' : 'DRY RUN'} test institution seed`)
  console.log(`  ${INSTITUTION_ACCOUNTS_COLLECTION}/${id}`)
  console.log(`  name: ${name}`)
  console.log(`  contactEmails: ${account.contactEmails.join(', ')}`)

  if (apply) {
    await db.collection(INSTITUTION_ACCOUNTS_COLLECTION).doc(id).set(
      { ...account, updatedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp() },
      { merge: true },
    )
    console.log('\nDone. Account created/updated.')
  } else {
    console.log('\nDry run only — pass --apply to write.')
  }
}

main().catch((error) => {
  console.error('Test institution seed failed:', error)
  const errStr = String(error)
  if (errStr.includes('invalid_grant') || errStr.includes('invalid_rapt')) {
    console.error('\n=============================================================')
    console.error('🔑 FIREBASE AUTH / GOOGLE ADC RE-AUTHENTICATION REQUIRED')
    console.error('=============================================================')
    console.error('Your local Google Cloud SDK Application Default Credentials (ADC) have expired.')
    console.error('Google Workspace security requires periodic re-authentication (invalid_rapt).\n')
    console.error('To fix this and run the script successfully, choose ONE of these options:')
    console.error('\n👉 OPTION 1 (Recommended - Quickest fix in terminal):')
    console.error('   Run: gcloud auth application-default login')
    console.error('   (Follow the browser prompt to re-authenticate with Google Cloud)\n')
    console.error('👉 OPTION 2 (Using Service Account file):')
    console.error('   Place your Firebase service account JSON key file as `service-account.json`')
    console.error('   in the root directory of orchestra.beamthinktank.space\n')
    console.error('👉 OPTION 3 (Using .env.local):')
    console.error('   Add FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY to `.env.local`')
    console.error('=============================================================\n')
  }
  process.exit(1)
})
