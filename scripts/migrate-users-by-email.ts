import fs from 'fs'
import path from 'path'
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth, type UserRecord } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

type FirestoreDoc = {
  id: string
  [key: string]: unknown
}

type IntentRole = 'perform' | 'recruit_mentor' | 'admin_staff'

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return undefined
}

function initAdmin() {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  const serviceAccountPath = path.join(process.cwd(), 'service-account.json')
  if (fs.existsSync(serviceAccountPath)) {
    const raw = fs.readFileSync(serviceAccountPath, 'utf8')
    const parsed = JSON.parse(raw) as {
      project_id?: string
      private_key?: string
      client_email?: string
    }

    if (parsed.project_id && parsed.private_key && parsed.client_email) {
      return initializeApp({
        credential: cert({
          projectId: parsed.project_id,
          privateKey: parsed.private_key,
          clientEmail: parsed.client_email,
        }),
        projectId: parsed.project_id,
      })
    }
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'beam-orchestra-platform',
  })
}

async function listAllAuthUsers() {
  const auth = getAuth()
  const users: UserRecord[] = []
  let nextPageToken: string | undefined

  do {
    const page = await auth.listUsers(1000, nextPageToken)
    users.push(...page.users)
    nextPageToken = page.pageToken
  } while (nextPageToken)

  return users
}

async function fetchCollectionDocs(collectionName: string): Promise<FirestoreDoc[]> {
  const db = getFirestore()
  const snapshot = await db.collection(collectionName).get()
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }))
}

function groupByEmail(docs: FirestoreDoc[]) {
  const grouped = new Map<string, FirestoreDoc[]>()
  docs.forEach((doc) => {
    const email = normalizeEmail(doc.email)
    if (!email) return
    const bucket = grouped.get(email) || []
    bucket.push(doc)
    grouped.set(email, bucket)
  })
  return grouped
}

function inferIntentRole(role: unknown, hasMusicianRecord: boolean): IntentRole {
  const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : ''

  if (
    normalizedRole === 'beam_admin' ||
    normalizedRole === 'partner_admin' ||
    normalizedRole === 'board' ||
    normalizedRole === 'admin_staff'
  ) {
    return 'admin_staff'
  }

  if (normalizedRole.includes('mentor') || normalizedRole.includes('recruit')) {
    return 'recruit_mentor'
  }

  if (hasMusicianRecord || normalizedRole === 'musician' || normalizedRole === 'perform') {
    return 'perform'
  }

  return 'perform'
}

async function main() {
  initAdmin()

  const apply = process.argv.includes('--apply')
  const writeMembership = process.argv.includes('--write-membership')
  const emailArg = process.argv.find((arg) => arg.startsWith('--email='))?.split('=')[1] || ''
  const filterEmail = normalizeEmail(emailArg)

  const db = getFirestore()
  const authUsers = await listAllAuthUsers()
  const userDocs = await fetchCollectionDocs('users')
  const musicianDocs = await fetchCollectionDocs('musicians')

  const usersByUid = new Map(userDocs.map((doc) => [doc.id, doc]))
  const usersByEmail = groupByEmail(userDocs)
  const musiciansByEmail = groupByEmail(musicianDocs)

  let matchedCount = 0
  let writeCount = 0
  let membershipWriteCount = 0

  for (const authUser of authUsers) {
    const email = normalizeEmail(authUser.email)
    if (!email) continue
    if (filterEmail && filterEmail !== email) continue

    const targetUserDoc = usersByUid.get(authUser.uid) || null
    const legacyUsers = (usersByEmail.get(email) || []).filter((doc) => doc.id !== authUser.uid)
    const legacyMusicians = musiciansByEmail.get(email) || []

    if (!targetUserDoc && legacyUsers.length === 0 && legacyMusicians.length === 0) {
      continue
    }

    matchedCount += 1

    const canonicalData: Record<string, unknown> = {
      email,
      emailLower: email,
      updatedAt: FieldValue.serverTimestamp(),
      migratedByEmailAt: FieldValue.serverTimestamp(),
    }

    const displayName = firstString(
      targetUserDoc?.displayName,
      targetUserDoc?.name,
      legacyUsers[0]?.displayName,
      legacyUsers[0]?.name,
      legacyMusicians[0]?.name,
      authUser.displayName,
    )
    if (displayName) {
      canonicalData.displayName = displayName
      canonicalData.name = displayName
    }

    const role = firstString(targetUserDoc?.role, legacyUsers[0]?.role, legacyMusicians[0]?.role)
    if (role) {
      canonicalData.role = role
    }

    const instrument = firstString(targetUserDoc?.instrument, legacyUsers[0]?.instrument, legacyMusicians[0]?.instrument)
    if (instrument) {
      canonicalData.instrument = instrument
    }

    const assignedProjectId = firstString(targetUserDoc?.assignedProjectId, legacyUsers[0]?.assignedProjectId)
    if (assignedProjectId) {
      canonicalData.assignedProjectId = assignedProjectId
    }

    const subscriber = Boolean(targetUserDoc?.subscriber || legacyUsers.some((doc) => doc.subscriber === true))
    if (subscriber) {
      canonicalData.subscriber = true
    }

    const legacyUserIds = legacyUsers.map((doc) => doc.id)
    if (legacyUserIds.length > 0) {
      canonicalData.migratedFromLegacyUserIds = legacyUserIds
    }

    const legacyMusicianIds = legacyMusicians.map((doc) => doc.id)
    if (legacyMusicianIds.length > 0) {
      canonicalData.migratedFromLegacyMusicianIds = legacyMusicianIds
    }

    console.log(`\n${apply ? 'APPLY' : 'DRY RUN'} user ${email}`)
    console.log(`  auth uid: ${authUser.uid}`)
    console.log(`  target users/${authUser.uid}: ${targetUserDoc ? 'exists' : 'create/merge'}`)
    if (legacyUserIds.length > 0) console.log(`  legacy users docs: ${legacyUserIds.join(', ')}`)
    if (legacyMusicianIds.length > 0) console.log(`  legacy musicians docs: ${legacyMusicianIds.join(', ')}`)

    if (apply) {
      await db.collection('users').doc(authUser.uid).set(canonicalData, { merge: true })
      writeCount += 1
    }

    if (writeMembership) {
      const membershipRef = db.collection('ngoMemberships').doc(authUser.uid)
      const membershipSnap = await membershipRef.get()
      if (!membershipSnap.exists) {
        const membershipRole = inferIntentRole(role, legacyMusicianIds.length > 0)
        console.log(`  ${apply ? 'apply' : 'dry'} ngoMemberships/${authUser.uid} role=${membershipRole}`)

        if (apply) {
          await membershipRef.set({
            ngo: 'orchestra',
            role: membershipRole,
            joinedAt: FieldValue.serverTimestamp(),
            migratedByEmailAt: FieldValue.serverTimestamp(),
            migratedFromEmail: email,
          }, { merge: true })
          membershipWriteCount += 1
        }
      }
    }
  }

  console.log('\nSummary')
  console.log(`  matched auth users: ${matchedCount}`)
  console.log(`  users writes: ${writeCount}`)
  console.log(`  membership writes: ${membershipWriteCount}`)
  console.log(`  mode: ${apply ? 'apply' : 'dry-run'}`)
  console.log(`  membership mode: ${writeMembership ? 'enabled' : 'disabled'}`)
}

main().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
