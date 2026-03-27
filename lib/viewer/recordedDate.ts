const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseViewerRecordedDate(value?: string): Date | null {
  const normalized = value?.trim()
  if (!normalized) return null

  const dateOnlyMatch = normalized.match(DATE_ONLY_PATTERN)
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1])
    const monthIndex = Number(dateOnlyMatch[2]) - 1
    const day = Number(dateOnlyMatch[3])
    const parsed = new Date(year, monthIndex, day)

    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === monthIndex &&
      parsed.getDate() === day
    ) {
      return parsed
    }

    return null
  }

  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function formatViewerRecordedDate(value?: string): string {
  const normalized = value?.trim()
  if (!normalized) return 'Date not provided'

  const parsed = parseViewerRecordedDate(normalized)
  if (!parsed) return normalized

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function getViewerRecordedDateSortValue(value?: string): number {
  const parsed = parseViewerRecordedDate(value)
  return parsed?.getTime() ?? 0
}
