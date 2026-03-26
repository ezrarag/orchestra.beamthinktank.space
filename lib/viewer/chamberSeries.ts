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

function trimValue(value?: string | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function humanizeSlug(value?: string): string {
  const slug = trimValue(value)
  if (!slug) return ''
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatRecordedLabel(recordedAt?: string): string {
  const value = trimValue(recordedAt)
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
  const value = trimValue(recordedAt)
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

function resolveComposerDisplayName(entry: ChamberSeriesSourceEntry): string {
  return (
    trimValue(entry.composerName) ||
    trimValue(entry.composer) ||
    humanizeSlug(entry.composerSlug) ||
    'Composer Metadata Needed'
  )
}

function resolveComposerSlug(entry: ChamberSeriesSourceEntry, composerName: string): string {
  const explicitSlug = trimValue(entry.composerSlug)
  if (explicitSlug) return explicitSlug

  const explicitName = trimValue(entry.composerName) || trimValue(entry.composer)
  if (explicitName) return toSlug(explicitName) || `composer-entry-${entry.id}`

  if (composerName !== 'Composer Metadata Needed') {
    return toSlug(composerName) || `composer-entry-${entry.id}`
  }

  return `composer-entry-${entry.id}`
}

function inferWorkTitle(entry: ChamberSeriesSourceEntry, composerName: string): string {
  const explicit = trimValue(entry.workTitle)
  if (explicit) return explicit

  const title = trimValue(entry.title)
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

function inferVersionLabel(entry: ChamberSeriesSourceEntry): string {
  const explicit = trimValue(entry.versionLabel)
  if (explicit) return explicit

  const cityLabel = trimValue(entry.geo?.cities?.[0]) || trimValue(entry.institutionName)
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
    trimValue(entry.submittedBy) ||
    trimValue(entry.submissionDisplayName) ||
    trimValue(entry.institutionName) ||
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
    const composerName = resolveComposerDisplayName(entry)
    const composerSlug = resolveComposerSlug(entry, composerName)
    const workTitle = inferWorkTitle(entry, composerName)
    const workSlug = trimValue(entry.workSlug) || toSlug(workTitle) || `${composerSlug}-work`
    const sortOrder = Number.isFinite(entry.sortOrder) ? Number(entry.sortOrder) : 999
    const recordedAt = trimValue(entry.recordedAt) || undefined
    const marketLabel = getCityLabel(entry)

    const composerGroup =
      composerMap.get(composerSlug) ??
      {
        slug: composerSlug,
        name: composerName,
        description: trimValue(entry.description),
        imageUrl: trimValue(entry.composerImage) || trimValue(entry.thumbnailUrl) || undefined,
        sortOrder,
        markets: new Set<string>(),
        latestRecordedAt: recordedAt,
        works: new Map(),
      }

    composerGroup.description ||= trimValue(entry.description)
    composerGroup.imageUrl ||= trimValue(entry.composerImage) || trimValue(entry.thumbnailUrl) || undefined
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
        description: trimValue(entry.description),
        imageUrl: trimValue(entry.thumbnailUrl) || trimValue(entry.composerImage) || undefined,
        sortOrder,
        versions: [],
      }

    workGroup.description ||= trimValue(entry.description)
    workGroup.imageUrl ||= trimValue(entry.thumbnailUrl) || trimValue(entry.composerImage) || undefined
    workGroup.sortOrder = Math.min(workGroup.sortOrder, sortOrder)
    workGroup.versions.push({
      id: entry.id,
      label: inferVersionLabel(entry),
      submittedBy: inferSubmittedBy(entry),
      recordedAt,
      recordedLabel: formatRecordedLabel(recordedAt),
      sortOrder,
      thumbnailUrl: trimValue(entry.thumbnailUrl) || undefined,
      institutionName: trimValue(entry.institutionName) || undefined,
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
