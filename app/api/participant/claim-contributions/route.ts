import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { normalizeEmailList } from '@/lib/participantIdentity'

const CLAIM_BATCH_SIZE = 400
const CLAIMABLE_COLLECTIONS = ['cohortApplications', 'chamberVersions'] as const

type ClaimContributionsBody = {
  emails?: string[]
}

type ClaimableDoc = {
  path: string
  ref: FirebaseFirestore.DocumentReference
  data: FirebaseFirestore.DocumentData
}

function getDocEmails(data: FirebaseFirestore.DocumentData): string[] {
  const aliasList = Array.isArray(data.emailAliases)
    ? data.emailAliases.filter((email): email is string => typeof email === 'string')
    : []
  const lookupList = Array.isArray(data.emailLookup)
    ? data.emailLookup.filter((email): email is string => typeof email === 'string')
    : []

  return normalizeEmailList([
    typeof data.email === 'string' ? data.email : null,
    ...aliasList,
    ...lookupList,
  ])
}

function canClaimDoc(data: FirebaseFirestore.DocumentData, uid: string): boolean {
  if (!Object.prototype.hasOwnProperty.call(data, 'submittedBy')) {
    return true
  }

  return data.submittedBy == null || data.submittedBy === uid
}

async function findDocsForEmail(email: string): Promise<ClaimableDoc[]> {
  if (!adminDb || !email) return []

  const db = adminDb
  const docs = new Map<string, ClaimableDoc>()

  await Promise.all(
    CLAIMABLE_COLLECTIONS.map(async (collectionName) => {
      const collectionRef = db.collection(collectionName)
      const [emailMatches, lookupMatches] = await Promise.all([
        collectionRef.where('email', '==', email).get(),
        collectionRef.where('emailLookup', 'array-contains', email).get(),
      ])

      ;[...emailMatches.docs, ...lookupMatches.docs].forEach((docSnap) => {
        docs.set(docSnap.ref.path, {
          path: docSnap.ref.path,
          ref: docSnap.ref,
          data: docSnap.data(),
        })
      })
    }),
  )

  return Array.from(docs.values())
}

async function claimDocs(uid: string, docs: ClaimableDoc[], emailLookup: string[]): Promise<number> {
  if (!adminDb || docs.length === 0) return 0

  for (let index = 0; index < docs.length; index += CLAIM_BATCH_SIZE) {
    const batch = adminDb.batch()
    docs.slice(index, index + CLAIM_BATCH_SIZE).forEach((docSnap) => {
      const payload: Record<string, unknown> = {
        submittedBy: uid,
      }

      if (emailLookup.length > 0) {
        payload.emailLookup = FieldValue.arrayUnion(...emailLookup)
      }

      batch.update(docSnap.ref, payload)
    })
    await batch.commit()
  }

  return docs.length
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 })
    }

    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: 'Participant claim service is not initialized' }, { status: 500 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid
    const body = (await request.json().catch(() => ({}))) as ClaimContributionsBody

    const userRef = adminDb.collection('users').doc(uid)
    const userSnap = await userRef.get()
    const userData = userSnap.exists ? userSnap.data() ?? {} : {}
    const existingAliases = Array.isArray(userData.emailAliases)
      ? userData.emailAliases.filter((email): email is string => typeof email === 'string')
      : []

    const seedEmails = normalizeEmailList([
      decodedToken.email,
      typeof userData.email === 'string' ? userData.email : null,
      ...existingAliases,
      ...(Array.isArray(body.emails) ? body.emails : []),
    ])

    const discoveredEmails = new Set<string>(seedEmails)
    const processedEmails = new Set<string>()
    const matchedDocs = new Map<string, ClaimableDoc>()
    const queue = [...seedEmails]

    while (queue.length > 0 && processedEmails.size < 50) {
      const email = queue.shift()
      if (!email || processedEmails.has(email)) continue

      processedEmails.add(email)
      const docs = await findDocsForEmail(email)

      docs.forEach((docSnap) => {
        matchedDocs.set(docSnap.path, docSnap)
        getDocEmails(docSnap.data).forEach((docEmail) => {
          if (!discoveredEmails.has(docEmail)) {
            discoveredEmails.add(docEmail)
            queue.push(docEmail)
          }
        })
      })
    }

    const matchedEmailList = Array.from(discoveredEmails)
    const docsToClaim = Array.from(matchedDocs.values()).filter((docSnap) => canClaimDoc(docSnap.data, uid))
    const claimedCount = await claimDocs(uid, docsToClaim, matchedEmailList)

    await userRef.set(
      {
        uid,
        email: decodedToken.email || matchedEmailList[0] || '',
        emailAliases: matchedEmailList,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    return NextResponse.json({
      success: true,
      claimedCount,
      matchedEmails: matchedEmailList,
    })
  } catch (error) {
    console.error('Error claiming participant contributions:', error)
    return NextResponse.json({ error: 'Failed to claim participant contributions.' }, { status: 500 })
  }
}
