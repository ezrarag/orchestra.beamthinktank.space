/**
 * Migrate legacy chamberProjects docs into projects/{projectId}/versions docs.
 *
 * Run with:
 *   npx tsx scripts/migrate-chamber-projects.ts
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp, type DocumentData } from 'firebase-admin/firestore'

const PROJECT_ID = 'beam-orchestra-platform'

type LegacyVideo = {
  id?: string
  title?: string
  url?: string
  createdAt?: Timestamp | Date | string
  notes?: string
}

type LegacyProject = {
  title?: string
  slug?: string
  description?: string
  composer?: string
  instrumentation?: string
  videos?: LegacyVideo[]
  createdAt?: Timestamp | Date | string
  updatedAt?: Timestamp | Date | string
}

const loadServiceAccount = () => {
  try {
    const serviceAccountPath = join(process.cwd(), 'service-account.json')
    const raw = readFileSync(serviceAccountPath, 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    console.error('Failed to load service-account.json from project root.')
    throw error
  }
}

const asTimestamp = (value: unknown): Timestamp => {
  if (!value) return Timestamp.now()

  if (value instanceof Timestamp) return value

  if (value instanceof Date) return Timestamp.fromDate(value)

  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return Timestamp.fromDate(parsed)
    }
  }

  return Timestamp.now()
}

const slugFromTitle = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function migrate() {
  const serviceAccount = loadServiceAccount()

  const app = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id || PROJECT_ID,
  })

  const db = getFirestore(app)
  const legacySnapshot = await db.collection('chamberProjects').get()

  if (legacySnapshot.empty) {
    console.log('No chamberProjects documents found.')
    return
  }

  let projectsUpserted = 0
  let versionsUpserted = 0

  for (const legacyDoc of legacySnapshot.docs) {
    const data = legacyDoc.data() as LegacyProject
    const title = data.title || legacyDoc.id
    const slug = data.slug || slugFromTitle(title)

    const projectDocRef = db.collection('projects').doc(legacyDoc.id)

    const projectPayload: DocumentData = {
      title,
      slug,
      description: data.description || '',
      composer: data.composer || '',
      instrumentation: data.instrumentation || '',
      discipline: 'orchestra',
      series: 'chamber',
      location: 'milwaukee',
      status: 'published',
      published: true,
      storagePath: `chamber/${slug}`,
      createdAt: asTimestamp(data.createdAt),
      updatedAt: asTimestamp(data.updatedAt),
    }

    await projectDocRef.set(projectPayload, { merge: true })
    projectsUpserted++

    const videos = Array.isArray(data.videos) ? data.videos : []

    for (let index = 0; index < videos.length; index++) {
      const video = videos[index]
      if (!video.url) continue

      const versionId = video.id || `legacy-version-${index + 1}`

      const versionPayload: DocumentData = {
        label: video.title || `Take ${index + 1}`,
        createdAt: asTimestamp(video.createdAt),
        masterVideoUrl: video.url,
        audioTracks: [
          {
            id: 'legacy-mix',
            label: 'Original Mix',
            url: video.url,
          },
        ],
        notes: video.notes || '',
      }

      await projectDocRef.collection('versions').doc(versionId).set(versionPayload, { merge: true })
      versionsUpserted++
    }
  }

  console.log('Migration complete.')
  console.log(`Projects upserted: ${projectsUpserted}`)
  console.log(`Versions upserted: ${versionsUpserted}`)
}

migrate().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
