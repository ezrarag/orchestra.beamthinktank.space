import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type DocumentData,
  type QueryConstraint,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

type FirestoreErrorLike = {
  code?: string
}

export const CHAMBER_SERIES_FILTERS = {
  series: 'chamber',
  discipline: 'orchestra',
  location: 'milwaukee',
} as const

export interface ChamberAudioTrack {
  id: string
  label: string
  url: string
}

export interface ChamberVersion {
  id: string
  createdAt: Date | null
  label: string
  masterVideoUrl?: string
  hlsManifestUrl?: string
  audioTracks: ChamberAudioTrack[]
  notes?: string
}

export interface ChamberProject {
  id: string
  slug: string
  title: string
  composer?: string
  instrumentation?: string
  description?: string
  discipline?: string
  series?: string
  location?: string
  storagePath?: string
  status?: string
  published?: boolean
  createdAt: Date | null
  updatedAt: Date | null
  thumbnailUrl?: string
  tags?: string[]
  legacyVideos?: LegacyVideo[]
}

interface LegacyVideo {
  id?: string
  title?: string
  url?: string
  createdAt?: Timestamp | Date | string | null
  notes?: string
}

const asDate = (value: unknown): Date | null => {
  if (!value) return null

  if (value instanceof Date) return value

  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      return (value as Timestamp).toDate()
    } catch {
      return null
    }
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  return null
}

const safeSlug = (value: string): string => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return slug || 'project'
}

const toProjectFromProjectsCollection = (id: string, data: DocumentData): ChamberProject => {
  const title = typeof data.title === 'string' ? data.title : id

  return {
    id,
    slug: typeof data.slug === 'string' && data.slug.trim().length > 0 ? data.slug : safeSlug(title),
    title,
    composer: typeof data.composer === 'string' ? data.composer : undefined,
    instrumentation: typeof data.instrumentation === 'string' ? data.instrumentation : undefined,
    description: typeof data.description === 'string' ? data.description : undefined,
    discipline: typeof data.discipline === 'string' ? data.discipline : undefined,
    series: typeof data.series === 'string' ? data.series : undefined,
    location: typeof data.location === 'string' ? data.location : undefined,
    storagePath: typeof data.storagePath === 'string' ? data.storagePath : undefined,
    status: typeof data.status === 'string' ? data.status : undefined,
    published: data.published === true,
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
    thumbnailUrl: typeof data.thumbnailUrl === 'string' ? data.thumbnailUrl : undefined,
    tags: Array.isArray(data.tags)
      ? data.tags.filter((item): item is string => typeof item === 'string')
      : undefined,
    legacyVideos: Array.isArray(data.videos) ? (data.videos as LegacyVideo[]) : undefined,
  }
}

const toProjectFromLegacyCollection = (id: string, data: DocumentData): ChamberProject => {
  const title = typeof data.title === 'string' ? data.title : id

  return {
    id,
    slug: typeof data.slug === 'string' && data.slug.trim().length > 0 ? data.slug : safeSlug(title),
    title,
    composer: typeof data.composer === 'string' ? data.composer : undefined,
    instrumentation: typeof data.instrumentation === 'string' ? data.instrumentation : undefined,
    description: typeof data.description === 'string' ? data.description : undefined,
    discipline: CHAMBER_SERIES_FILTERS.discipline,
    series: CHAMBER_SERIES_FILTERS.series,
    location: CHAMBER_SERIES_FILTERS.location,
    status: 'published',
    published: true,
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
    thumbnailUrl: typeof data.thumbnailUrl === 'string' ? data.thumbnailUrl : undefined,
    tags: Array.isArray(data.tags)
      ? data.tags.filter((item): item is string => typeof item === 'string')
      : undefined,
    legacyVideos: Array.isArray(data.videos) ? (data.videos as LegacyVideo[]) : undefined,
  }
}

const isPublished = (project: ChamberProject): boolean => {
  return project.published === true || project.status === 'published'
}

const isChamberSeriesProject = (project: ChamberProject): boolean => {
  return (
    project.series?.toLowerCase() === CHAMBER_SERIES_FILTERS.series &&
    project.discipline?.toLowerCase() === CHAMBER_SERIES_FILTERS.discipline &&
    project.location?.toLowerCase() === CHAMBER_SERIES_FILTERS.location
  )
}

const sortProjectsByFreshness = (projects: ChamberProject[]): ChamberProject[] => {
  return [...projects].sort((a, b) => {
    const aDate = a.updatedAt ?? a.createdAt ?? new Date(0)
    const bDate = b.updatedAt ?? b.createdAt ?? new Date(0)
    return bDate.getTime() - aDate.getTime()
  })
}

const normalizeAudioTracks = (value: unknown): ChamberAudioTrack[] => {
  if (!Array.isArray(value)) return []

  return value
    .map((track, index) => {
      const item = track as Record<string, unknown>
      const url = typeof item.url === 'string' ? item.url : ''
      if (!url) return null

      const trackId = typeof item.id === 'string' && item.id.trim().length > 0
        ? item.id
        : `track-${index + 1}`

      return {
        id: trackId,
        label: typeof item.label === 'string' && item.label.trim().length > 0
          ? item.label
          : `Track ${index + 1}`,
        url,
      }
    })
    .filter((track): track is ChamberAudioTrack => track !== null)
}

const toVersionFromDoc = (id: string, data: DocumentData, fallbackIndex: number): ChamberVersion => {
  const createdAt = asDate(data.createdAt)
  const audioTracks = normalizeAudioTracks(data.audioTracks)

  if (audioTracks.length === 0 && typeof data.audioUrl === 'string' && data.audioUrl.length > 0) {
    audioTracks.push({
      id: 'default-audio',
      label: 'Default Audio',
      url: data.audioUrl,
    })
  }

  return {
    id,
    createdAt,
    label: typeof data.label === 'string' && data.label.trim().length > 0
      ? data.label
      : createdAt
        ? new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }).format(createdAt)
        : `Version ${fallbackIndex + 1}`,
    masterVideoUrl: typeof data.masterVideoUrl === 'string' ? data.masterVideoUrl : undefined,
    hlsManifestUrl: typeof data.hlsManifestUrl === 'string' ? data.hlsManifestUrl : undefined,
    audioTracks,
    notes: typeof data.notes === 'string' ? data.notes : undefined,
  }
}

const versionsFromLegacyVideos = (videos: LegacyVideo[] | undefined): ChamberVersion[] => {
  if (!videos || videos.length === 0) return []

  return videos
    .map((video, index) => {
      if (!video.url) return null

      const createdAt = asDate(video.createdAt)
      const versionId = video.id || `legacy-version-${index + 1}`

      return {
        id: versionId,
        createdAt,
        label: video.title || (createdAt
          ? new Intl.DateTimeFormat('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }).format(createdAt)
          : `Take ${index + 1}`),
        masterVideoUrl: video.url,
        audioTracks: [
          {
            id: 'legacy-mix',
            label: 'Original Mix',
            url: video.url,
          },
        ],
        notes: video.notes,
      } as ChamberVersion
    })
    .filter((version): version is ChamberVersion => version !== null)
    .sort((a, b) => {
      const aDate = a.createdAt ?? new Date(0)
      const bDate = b.createdAt ?? new Date(0)
      return bDate.getTime() - aDate.getTime()
    })
}

const sortVersionsNewestFirst = (versions: ChamberVersion[]): ChamberVersion[] => {
  return [...versions].sort((a, b) => {
    const aDate = a.createdAt ?? new Date(0)
    const bDate = b.createdAt ?? new Date(0)
    return bDate.getTime() - aDate.getTime()
  })
}

const isPermissionDeniedError = (error: unknown): boolean => {
  const code = (error as FirestoreErrorLike | null)?.code
  return typeof code === 'string' && code.includes('permission-denied')
}

export const listChamberSeriesProjects = async (): Promise<ChamberProject[]> => {
  if (!db) return []

  const results: ChamberProject[] = []

  const newCollectionConstraints: QueryConstraint[] = [
    where('series', '==', CHAMBER_SERIES_FILTERS.series),
    where('discipline', '==', CHAMBER_SERIES_FILTERS.discipline),
    where('location', '==', CHAMBER_SERIES_FILTERS.location),
  ]

  try {
    const publishedSnapshot = await getDocs(query(
      collection(db, 'projects'),
      ...newCollectionConstraints,
      where('status', '==', 'published'),
      orderBy('updatedAt', 'desc')
    ))

    publishedSnapshot.docs.forEach((projectDoc) => {
      results.push(toProjectFromProjectsCollection(projectDoc.id, projectDoc.data()))
    })
  } catch (error) {
    try {
      const fallbackSnapshot = await getDocs(query(
        collection(db, 'projects'),
        ...newCollectionConstraints,
        orderBy('updatedAt', 'desc')
      ))

      fallbackSnapshot.docs.forEach((projectDoc) => {
        results.push(toProjectFromProjectsCollection(projectDoc.id, projectDoc.data()))
      })
    } catch (fallbackError) {
      if (!isPermissionDeniedError(fallbackError)) {
        console.warn('Failed chamber projects queries:', fallbackError)
      }
    }
  }

  try {
    const legacySnapshot = await getDocs(query(collection(db, 'chamberProjects'), orderBy('createdAt', 'desc')))

    legacySnapshot.docs.forEach((legacyDoc) => {
      results.push(toProjectFromLegacyCollection(legacyDoc.id, legacyDoc.data()))
    })
  } catch (error) {
    if (!isPermissionDeniedError(error)) {
      console.warn('Failed to load legacy chamberProjects collection:', error)
    }
  }

  const deduped = new Map<string, ChamberProject>()
  for (const project of results) {
    const key = project.slug || project.id
    if (!deduped.has(key)) {
      deduped.set(key, project)
    }
  }

  const filtered = Array.from(deduped.values()).filter((project) => {
    return isPublished(project) && isChamberSeriesProject(project)
  })

  return sortProjectsByFreshness(filtered)
}

const getProjectFromNewCollection = async (idOrSlug: string): Promise<ChamberProject | null> => {
  if (!db) return null

  const directDoc = await getDoc(doc(db, 'projects', idOrSlug))
  if (directDoc.exists()) {
    return toProjectFromProjectsCollection(directDoc.id, directDoc.data())
  }

  const bySlug = await getDocs(query(
    collection(db, 'projects'),
    where('slug', '==', idOrSlug),
    limit(1)
  ))

  if (!bySlug.empty) {
    const projectDoc = bySlug.docs[0]
    return toProjectFromProjectsCollection(projectDoc.id, projectDoc.data())
  }

  return null
}

const getProjectFromLegacyCollection = async (idOrSlug: string): Promise<ChamberProject | null> => {
  if (!db) return null

  try {
    const directDoc = await getDoc(doc(db, 'chamberProjects', idOrSlug))
    if (directDoc.exists()) {
      return toProjectFromLegacyCollection(directDoc.id, directDoc.data())
    }

    const bySlug = await getDocs(query(
      collection(db, 'chamberProjects'),
      where('slug', '==', idOrSlug),
      limit(1)
    ))

    if (!bySlug.empty) {
      const projectDoc = bySlug.docs[0]
      return toProjectFromLegacyCollection(projectDoc.id, projectDoc.data())
    }
  } catch (error) {
    if (!isPermissionDeniedError(error)) {
      console.warn(`Failed to load legacy chamber project ${idOrSlug}:`, error)
    }
  }

  return null
}

const getVersionsForProject = async (project: ChamberProject): Promise<ChamberVersion[]> => {
  if (!db) return []

  const versions: ChamberVersion[] = []

  try {
    const versionSnapshot = await getDocs(query(
      collection(db, 'projects', project.id, 'versions'),
      orderBy('createdAt', 'desc')
    ))

    versionSnapshot.docs.forEach((versionDoc, index) => {
      versions.push(toVersionFromDoc(versionDoc.id, versionDoc.data(), index))
    })
  } catch (error) {
    if (!isPermissionDeniedError(error)) {
      console.warn(`Failed to read versions for project ${project.id}:`, error)
    }
  }

  if (versions.length === 0) {
    return versionsFromLegacyVideos(project.legacyVideos)
  }

  return sortVersionsNewestFirst(versions)
}

export const getChamberProjectDetail = async (idOrSlug: string): Promise<{
  project: ChamberProject
  versions: ChamberVersion[]
} | null> => {
  if (!db) return null

  const projectFromNew = await getProjectFromNewCollection(idOrSlug)
  const project = projectFromNew ?? await getProjectFromLegacyCollection(idOrSlug)

  if (!project) {
    return null
  }

  const versions = await getVersionsForProject(project)
  return {
    project,
    versions,
  }
}
