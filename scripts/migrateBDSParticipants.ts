import fs from 'fs'
import path from 'path'
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth, type UserRecord } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

type FirestoreDoc = {
  id: string
  [key: string]: unknown
}

type MembershipRole = 'perform' | 'admin_staff' | 'publisher'

const DEFAULT_PROJECT_ID = 'black-diaspora-symphony'

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
    const bucket = grouped.get(email) ?? []
    bucket.push(doc)
    grouped.set(email, bucket)
  })

  return grouped
}

function inferMembershipRole(...values: unknown[]): MembershipRole {
  const normalizedValues = values
    .map((value) => (typeof value === 'string' ? value.trim().toLowerCase() : ''))
    .filter(Boolean)

  if (
    normalizedValues.some((value) =>
      ['beam_admin', 'partner_admin', 'board', 'admin_staff', 'admin', 'staff'].includes(value),
    )
  ) {
    return 'admin_staff'
  }

  if (normalizedValues.some((value) => value.includes('publisher') || value.includes('publishing'))) {
    return 'publisher'
  }

  return 'perform'
}

async function main() {
  initAdmin()

  const apply = process.argv.includes('--apply')
  const emailArg = process.argv.find((arg) => arg.startsWith('--email='))?.split('=')[1] || ''
  const projectId = process.argv.find((arg) => arg.startsWith('--projectId='))?.split('=')[1] || DEFAULT_PROJECT_ID
  const filterEmail = normalizeEmail(emailArg)

  const db = getFirestore()
  const [authUsers, rosterDocs, musicianDocs, userDocs] = await Promise.all([
    listAllAuthUsers(),
    fetchCollectionDocs('projectMusicians'),
    fetchCollectionDocs('musicians'),
    fetchCollectionDocs('users'),
  ])

  const rosterRows = rosterDocs.filter((doc) => firstString(doc.projectId) === projectId)
  const authByUid = new Map(authUsers.map((authUser) => [authUser.uid, authUser]))
  const authByEmail = new Map(
    authUsers
      .filter((authUser) => normalizeEmail(authUser.email))
      .map((authUser) => [normalizeEmail(authUser.email), authUser]),
  )
  const musiciansByUid = new Map(musicianDocs.map((doc) => [doc.id, doc]))
  const usersByUid = new Map(userDocs.map((doc) => [doc.id, doc]))
  const musiciansByEmail = groupByEmail(musicianDocs)
  const usersByEmail = groupByEmail(userDocs)

  let createdCount = 0
  let pendingCreateCount = 0
  let skippedExistingCount = 0
  let skippedMissingUidCount = 0
  let skippedFilteredCount = 0

  for (const rosterRow of rosterRows) {
    const rosterEmail = normalizeEmail(rosterRow.email)
    if (filterEmail && filterEmail !== rosterEmail) {
      skippedFilteredCount += 1
      continue
    }

    const hintedUid = firstString(rosterRow.musicianId, rosterRow.userId, rosterRow.uid)
    const authUser = (hintedUid ? authByUid.get(hintedUid) : null) ?? (rosterEmail ? authByEmail.get(rosterEmail) : null) ?? null
    const resolvedUid = authUser?.uid ?? hintedUid ?? ''

    if (!resolvedUid) {
      skippedMissingUidCount += 1
      console.log(`SKIP missing uid for projectMusicians/${rosterRow.id}${rosterEmail ? ` email=${rosterEmail}` : ''}`)
      continue
    }

    const relatedMusicianDoc =
      musiciansByUid.get(resolvedUid) ??
      (rosterEmail ? musiciansByEmail.get(rosterEmail)?.[0] : undefined) ??
      null
    const relatedUserDoc =
      usersByUid.get(resolvedUid) ??
      (rosterEmail ? usersByEmail.get(rosterEmail)?.[0] : undefined) ??
      null

    const membershipRef = db.collection('ngoMemberships').doc(resolvedUid)
    const membershipSnap = await membershipRef.get()
    const membershipData = membershipSnap.exists ? membershipSnap.data() : null

    if (membershipData?.ngo === 'orchestra') {
      skippedExistingCount += 1
      console.log(`SKIP existing ngoMemberships/${resolvedUid} (orchestra) from projectMusicians/${rosterRow.id}`)
      continue
    }

    const role = inferMembershipRole(rosterRow.role, relatedMusicianDoc?.role, relatedUserDoc?.role)
    const discipline = firstString(
      rosterRow.discipline,
      relatedMusicianDoc?.discipline,
      relatedUserDoc?.discipline,
      rosterRow.instrument,
      relatedMusicianDoc?.instrument,
      relatedUserDoc?.instrument,
    )

    const payload: Record<string, unknown> = {
      ngo: 'orchestra',
      role,
      migratedFrom: 'bds-repertoire',
      migratedAt: FieldValue.serverTimestamp(),
      source: 'migration-bds-2026-03',
    }

    if (discipline) {
      payload.discipline = discipline
    }

    console.log(`\n${apply ? 'APPLY' : 'DRY RUN'} ngoMemberships/${resolvedUid}`)
    console.log(`  source: projectMusicians/${rosterRow.id}`)
    if (rosterEmail) console.log(`  email: ${rosterEmail}`)
    console.log(`  role: ${role}`)
    if (discipline) console.log(`  discipline: ${discipline}`)

    if (apply) {
      await membershipRef.set(payload, { merge: true })
      createdCount += 1
    } else {
      pendingCreateCount += 1
    }
  }

  console.log('\nSummary')
  console.log(`  project roster rows: ${rosterRows.length}`)
  console.log(`  memberships pending create: ${pendingCreateCount}`)
  console.log(`  memberships created: ${createdCount}`)
  console.log(`  skipped existing: ${skippedExistingCount}`)
  console.log(`  skipped missing uid: ${skippedMissingUidCount}`)
  console.log(`  skipped by email filter: ${skippedFilteredCount}`)
  console.log(`  mode: ${apply ? 'apply' : 'dry-run'}`)
  console.log(`  source collection: projectMusicians`)
  console.log(`  projectId: ${projectId}`)
}

main().catch((error) => {
  console.error('BDS participant migration failed:', error)
  process.exit(1)
})
