import {
  humanizeChamberSlug,
  resolveChamberComposerDisplayName,
  resolveChamberComposerSlug,
  resolveChamberWorkTitle,
  toChamberSlug,
  trimChamberValue,
} from '@/lib/chamberWorks'

export type ChamberSeriesSourceEntry = {
  id: string
  title: string
  description: string
  areaId: string
  sectionId: string
  sortOrder: number
  thumbnailUrl?: string
  videoUrl: string
  hlsUrl?: string
  recordedAt?: string
  institutionName?: string
  participantNames?: string[]
  submissionDisplayName?: string
  composer?: string
  composerName?: string
  composerSlug?: string
  composerImage?: string
  workTitle?: string
  workSlug?: string
  versionLabel?: string
  submittedBy?: string
  geo?: {
    cities?: string[]
    states?: string[]
    regions?: string[]
  }
}

export type ChamberSeriesVersion = {
  id: string
  label: string
  submittedBy: string
  recordedAt?: string
  recordedLabel: string
  sortOrder: number
  thumbnailUrl?: string
  institutionName?: string
  participantNames: string[]
  cityLabel: string
  entry: ChamberSeriesSourceEntry
}

export type ChamberSeriesWork = {
  slug: string
  title: string
  description: string
  imageUrl?: string
  sortOrder: number
  versionCount: number
  versions: ChamberSeriesVersion[]
}

export type ChamberSeriesComposer = {
  slug: string
  name: string
  description: string
  imageUrl?: string
  sortOrder: number
  workCount: number
  versionCount: number
  latestRecordedAt?: string
  latestRecordedLabel: string
  marketLabel: string
  works: ChamberSeriesWork[]
}

function formatRecordedLabel(recordedAt?: string): string {
  const value = trimChamberValue(recordedAt)
  if (!value) return 'Date not provided'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getRecordedSortValue(recordedAt?: string): number {
  const value = trimChamberValue(recordedAt)
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function getCityLabel(entry: ChamberSeriesSourceEntry): string {
  const cities = entry.geo?.cities?.filter(Boolean) ?? []
  if (cities.length > 0) return cities.join(', ')
  const states = entry.geo?.states?.filter(Boolean) ?? []
  if (states.length > 0) return states.join(', ')
  const regions = entry.geo?.regions?.filter(Boolean) ?? []
  if (regions.length > 0) return regions.join(', ')
  return entry.institutionName?.trim() || 'Chamber Series'
}

function inferVersionLabel(entry: ChamberSeriesSourceEntry): string {
  const explicit = trimChamberValue(entry.versionLabel)
  if (explicit) return explicit

  const cityLabel = trimChamberValue(entry.geo?.cities?.[0]) || trimChamberValue(entry.institutionName)
  const recordedLabel = formatRecordedLabel(entry.recordedAt)
  if (recordedLabel !== 'Date not provided' && cityLabel) {
    return `${cityLabel} · ${recordedLabel}`
  }
  if (recordedLabel !== 'Date not provided') return recordedLabel
  if (cityLabel) return `${cityLabel} Session`
  return 'Recorded Version'
}

function inferSubmittedBy(entry: ChamberSeriesSourceEntry): string {
  return (
    trimChamberValue(entry.submittedBy) ||
    trimChamberValue(entry.submissionDisplayName) ||
    trimChamberValue(entry.institutionName) ||
    'Unknown submitter'
  )
}

function compareBySortAndDate(a: { sortOrder: number; recordedAt?: string }, b: { sortOrder: number; recordedAt?: string }): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
  return getRecordedSortValue(b.recordedAt) - getRecordedSortValue(a.recordedAt)
}

export function groupChamberSeriesEntries(entries: ChamberSeriesSourceEntry[]): ChamberSeriesComposer[] {
  const composerMap = new Map<
    string,
    {
      slug: string
      name: string
      description: string
      imageUrl?: string
      sortOrder: number
      markets: Set<string>
      latestRecordedAt?: string
      works: Map<
        string,
        {
          slug: string
          title: string
          description: string
          imageUrl?: string
          sortOrder: number
          versions: ChamberSeriesVersion[]
        }
      >
    }
  >()

  entries.forEach((entry) => {
    const composerName = resolveChamberComposerDisplayName(entry)
    const composerSlug = resolveChamberComposerSlug(entry, composerName)
    const workTitle = resolveChamberWorkTitle(entry, composerName)
    const workSlug = trimChamberValue(entry.workSlug) || toChamberSlug(workTitle) || `${composerSlug}-work`
    const sortOrder = Number.isFinite(entry.sortOrder) ? Number(entry.sortOrder) : 999
    const recordedAt = trimChamberValue(entry.recordedAt) || undefined
    const marketLabel = getCityLabel(entry)

    const composerGroup =
      composerMap.get(composerSlug) ??
      {
        slug: composerSlug,
        name: composerName,
        description: trimChamberValue(entry.description),
        imageUrl: trimChamberValue(entry.composerImage) || trimChamberValue(entry.thumbnailUrl) || undefined,
        sortOrder,
        markets: new Set<string>(),
        latestRecordedAt: recordedAt,
        works: new Map(),
      }

    composerGroup.description ||= trimChamberValue(entry.description)
    composerGroup.imageUrl ||= trimChamberValue(entry.composerImage) || trimChamberValue(entry.thumbnailUrl) || undefined
    composerGroup.sortOrder = Math.min(composerGroup.sortOrder, sortOrder)
    if (!composerGroup.latestRecordedAt || getRecordedSortValue(recordedAt) > getRecordedSortValue(composerGroup.latestRecordedAt)) {
      composerGroup.latestRecordedAt = recordedAt
    }
    if (marketLabel) composerGroup.markets.add(marketLabel)

    const workGroup =
      composerGroup.works.get(workSlug) ??
      {
        slug: workSlug,
        title: workTitle,
        description: trimChamberValue(entry.description),
        imageUrl: trimChamberValue(entry.thumbnailUrl) || trimChamberValue(entry.composerImage) || undefined,
        sortOrder,
        versions: [],
      }

    workGroup.description ||= trimChamberValue(entry.description)
    workGroup.imageUrl ||= trimChamberValue(entry.thumbnailUrl) || trimChamberValue(entry.composerImage) || undefined
    workGroup.sortOrder = Math.min(workGroup.sortOrder, sortOrder)
    workGroup.versions.push({
      id: entry.id,
      label: inferVersionLabel(entry),
      submittedBy: inferSubmittedBy(entry),
      recordedAt,
      recordedLabel: formatRecordedLabel(recordedAt),
      sortOrder,
      thumbnailUrl: trimChamberValue(entry.thumbnailUrl) || undefined,
      institutionName: trimChamberValue(entry.institutionName) || undefined,
      participantNames: entry.participantNames?.filter(Boolean) ?? [],
      cityLabel: marketLabel,
      entry,
    })

    composerGroup.works.set(workSlug, workGroup)
    composerMap.set(composerSlug, composerGroup)
  })

  return Array.from(composerMap.values())
    .map((composer) => {
      const works = Array.from(composer.works.values())
        .map((work) => ({
          slug: work.slug,
          title: work.title,
          description: work.description,
          imageUrl: work.imageUrl,
          sortOrder: work.sortOrder,
          versionCount: work.versions.length,
          versions: [...work.versions].sort(compareBySortAndDate),
        }))
        .sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
          return a.title.localeCompare(b.title)
        })

      const allVersions = works.flatMap((work) => work.versions)
      const marketLabel = Array.from(composer.markets).filter(Boolean).slice(0, 3).join(' • ') || 'Chamber Series'

      return {
        slug: composer.slug,
        name: composer.name,
        description: composer.description,
        imageUrl: composer.imageUrl,
        sortOrder: composer.sortOrder,
        workCount: works.length,
        versionCount: allVersions.length,
        latestRecordedAt: composer.latestRecordedAt,
        latestRecordedLabel: formatRecordedLabel(composer.latestRecordedAt),
        marketLabel,
        works,
      } satisfies ChamberSeriesComposer
    })
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
      return a.name.localeCompare(b.name)
    })
}
