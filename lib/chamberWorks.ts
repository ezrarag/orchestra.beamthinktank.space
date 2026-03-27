import {
  collection,
  documentId,
  getDocs,
  query,
  where,
  type DocumentData,
  type Firestore,
  type Timestamp,
} from 'firebase/firestore'
import type { ChamberResearchRef, ChamberResearchSource, ChamberWorkDocument, ChamberWorkIdentitySource } from '@/lib/types/chamber'

const CHAMBER_WORKS_COLLECTION = 'chamberWorks'
const FIRESTORE_IN_QUERY_LIMIT = 10

export function trimChamberValue(value?: string | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function toChamberSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function humanizeChamberSlug(value?: string): string {
  const slug = trimChamberValue(value)
  if (!slug) return ''
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function resolveChamberComposerDisplayName(source: ChamberWorkIdentitySource): string {
  return (
    trimChamberValue(source.composerName) ||
    trimChamberValue(source.composer) ||
    humanizeChamberSlug(source.composerSlug) ||
    'Composer Metadata Needed'
  )
}

export function resolveChamberComposerSlug(
  source: ChamberWorkIdentitySource,
  composerName: string = resolveChamberComposerDisplayName(source),
): string {
  const explicitSlug = trimChamberValue(source.composerSlug)
  if (explicitSlug) return explicitSlug

  const explicitName = trimChamberValue(source.composerName) || trimChamberValue(source.composer)
  if (explicitName) return toChamberSlug(explicitName) || `composer-entry-${source.id ?? 'unknown'}`

  if (composerName !== 'Composer Metadata Needed') {
    return toChamberSlug(composerName) || `composer-entry-${source.id ?? 'unknown'}`
  }

  return `composer-entry-${source.id ?? 'unknown'}`
}

export function resolveChamberWorkTitle(
  source: ChamberWorkIdentitySource,
  composerName: string = resolveChamberComposerDisplayName(source),
): string {
  const explicit = trimChamberValue(source.workTitle)
  if (explicit) return explicit

  const title = trimChamberValue(source.title)
  if (!title) return 'Untitled Work'

  const escapedComposer = composerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const prefixed = new RegExp(`^${escapedComposer}\\s[-:|]\\s`, 'i')
  if (prefixed.test(title)) {
    return title.replace(prefixed, '').trim() || title
  }

  const suffixed = new RegExp(`^(.+?)\\s+by\\s+${escapedComposer}$`, 'i')
  const suffixedMatch = title.match(suffixed)
  if (suffixedMatch?.[1]) {
    return suffixedMatch[1].trim() || title
  }

  return title
}

export function resolveChamberWorkSlug(
  source: ChamberWorkIdentitySource,
  composerName: string = resolveChamberComposerDisplayName(source),
  workTitle: string = resolveChamberWorkTitle(source, composerName),
): string {
  return trimChamberValue(source.workSlug) || toChamberSlug(workTitle) || 'untitled-work'
}

export function buildChamberWorkId(source: ChamberWorkIdentitySource): string {
  const composerName = resolveChamberComposerDisplayName(source)
  const composerSlug = resolveChamberComposerSlug(source, composerName)
  const workSlug = resolveChamberWorkSlug(source, composerName)
  return `${composerSlug}__${workSlug}`
}

export function buildChamberWorkResearchAdminHref(source: ChamberWorkIdentitySource): string {
  const composerName = resolveChamberComposerDisplayName(source)
  const composerSlug = resolveChamberComposerSlug(source, composerName)
  const workTitle = resolveChamberWorkTitle(source, composerName)
  const workSlug = resolveChamberWorkSlug(source, composerName, workTitle)
  const workId = buildChamberWorkId(source)
  const params = new URLSearchParams()

  if (composerName) params.set('composerName', composerName)
  if (composerSlug) params.set('composerSlug', composerSlug)
  if (workTitle) params.set('workTitle', workTitle)
  if (workSlug) params.set('workSlug', workSlug)

  const queryString = params.toString()
  return `/admin/orchestra/works/${encodeURIComponent(workId)}/research${queryString ? `?${queryString}` : ''}`
}

export function getFirestoreTimestampMillis(value: unknown): number {
  if (!value) return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  if (typeof value === 'object' && value !== null) {
    const maybeTimestamp = value as { toMillis?: () => number; seconds?: number }
    if (typeof maybeTimestamp.toMillis === 'function') {
      return maybeTimestamp.toMillis()
    }
    if (typeof maybeTimestamp.seconds === 'number') {
      return maybeTimestamp.seconds * 1000
    }
  }
  return 0
}

export function truncateChamberResearchExcerpt(value?: string | null, maxLength = 280): string {
  const excerpt = trimChamberValue(value)
  if (!excerpt) return ''
  if (excerpt.length <= maxLength) return excerpt
  return `${excerpt.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

export function createClientResearchRefId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `research_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}

function normalizeTimestamp(value: unknown): Timestamp | null {
  if (!value || typeof value !== 'object') return null
  if ('toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return value as Timestamp
  }
  return null
}

function normalizeResearchSource(value: unknown): ChamberResearchSource {
  if (value === 'doaj' || value === 'europeana' || value === 'jstor' || value === 'hathitrust' || value === 'manual') {
    return value
  }
  return 'manual'
}

function normalizeResearchRef(value: unknown): ChamberResearchRef | null {
  if (!value || typeof value !== 'object') return null
  const entry = value as Partial<ChamberResearchRef>
  const title = trimChamberValue(entry.title)
  const url = trimChamberValue(entry.url)
  const id = trimChamberValue(entry.id)
  const addedBy = trimChamberValue(entry.addedBy)
  if (!id || !title || !url || !addedBy) return null

  return {
    id,
    source: normalizeResearchSource(entry.source),
    title,
    author: trimChamberValue(entry.author) || undefined,
    year: trimChamberValue(entry.year) || undefined,
    url,
    excerpt: truncateChamberResearchExcerpt(entry.excerpt) || undefined,
    imageUrl: trimChamberValue(entry.imageUrl) || undefined,
    relevantTo: trimChamberValue(entry.relevantTo) || undefined,
    addedBy,
    addedAt: normalizeTimestamp(entry.addedAt),
  }
}

export function normalizeChamberWorkDocument(id: string, data: DocumentData): ChamberWorkDocument {
  const composerName = resolveChamberComposerDisplayName(data as ChamberWorkIdentitySource)
  const composerSlug = resolveChamberComposerSlug(data as ChamberWorkIdentitySource, composerName)
  const workTitle = resolveChamberWorkTitle(data as ChamberWorkIdentitySource, composerName)
  const workSlug = resolveChamberWorkSlug(data as ChamberWorkIdentitySource, composerName, workTitle)
  const researchRefs = Array.isArray(data.researchRefs)
    ? data.researchRefs
        .map((entry) => normalizeResearchRef(entry))
        .filter((entry): entry is ChamberResearchRef => Boolean(entry))
        .sort((a, b) => getFirestoreTimestampMillis(b.addedAt) - getFirestoreTimestampMillis(a.addedAt))
    : []

  return {
    id,
    composerName: composerName === 'Composer Metadata Needed' ? undefined : composerName,
    composerSlug,
    workTitle,
    workSlug,
    description: trimChamberValue(data.description) || undefined,
    imageUrl: trimChamberValue(data.imageUrl) || undefined,
    researchRefs,
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
  }
}

function chunkValues(values: string[], chunkSize: number): string[][] {
  const chunks: string[][] = []
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize))
  }
  return chunks
}

export async function loadChamberWorksByIds(
  firestore: Firestore,
  workIds: string[],
): Promise<Record<string, ChamberWorkDocument>> {
  const ids = Array.from(new Set(workIds.map((value) => trimChamberValue(value)).filter(Boolean)))
  if (ids.length === 0) return {}

  const chunks = chunkValues(ids, FIRESTORE_IN_QUERY_LIMIT)
  const snapshots = await Promise.all(
    chunks.map((chunk) =>
      getDocs(query(collection(firestore, CHAMBER_WORKS_COLLECTION), where(documentId(), 'in', chunk))),
    ),
  )

  return snapshots.reduce<Record<string, ChamberWorkDocument>>((acc, snapshot) => {
    snapshot.docs.forEach((docSnap) => {
      acc[docSnap.id] = normalizeChamberWorkDocument(docSnap.id, docSnap.data())
    })
    return acc
  }, {})
}
