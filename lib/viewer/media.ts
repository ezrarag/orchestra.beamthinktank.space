export function trimViewerMediaUrl(value?: string | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function getNormalizedViewerMediaPath(url: string): string {
  try {
    return decodeURIComponent(new URL(url, 'http://localhost').pathname).toLowerCase()
  } catch {
    return url.split('?')[0]?.toLowerCase() ?? ''
  }
}

export function isAdaptiveViewerMediaUrl(url?: string | null): boolean {
  const trimmed = trimViewerMediaUrl(url)
  if (!trimmed) return false
  const normalizedUrl = trimmed.toLowerCase()
  const path = getNormalizedViewerMediaPath(trimmed)
  return path.endsWith('.m3u8') || normalizedUrl.includes('format=m3u8')
}

export function isDirectViewerMp4Url(url?: string | null): boolean {
  const trimmed = trimViewerMediaUrl(url)
  if (!trimmed) return false
  const path = getNormalizedViewerMediaPath(trimmed)
  return path.endsWith('.mp4') || path.endsWith('.m4v')
}

export function isLegacyViewerMovUrl(url?: string | null): boolean {
  const trimmed = trimViewerMediaUrl(url)
  if (!trimmed) return false
  return getNormalizedViewerMediaPath(trimmed).endsWith('.mov')
}

export function isViewerPdfUrl(url?: string | null): boolean {
  const trimmed = trimViewerMediaUrl(url)
  if (!trimmed) return false
  return getNormalizedViewerMediaPath(trimmed).endsWith('.pdf')
}

export function getViewerMediaValidationError(url?: string | null): string | null {
  const trimmed = trimViewerMediaUrl(url)
  if (!trimmed) {
    return 'A direct videoUrl is required.'
  }
  if (isAdaptiveViewerMediaUrl(trimmed)) {
    return 'Use a direct MP4 videoUrl. Adaptive .m3u8 sources have been retired from the viewer.'
  }
  if (isLegacyViewerMovUrl(trimmed)) {
    return 'Use a normalized MP4 videoUrl instead of a .mov source.'
  }
  if (!isDirectViewerMp4Url(trimmed)) {
    return 'Use a direct H.264/AAC MP4 videoUrl for smooth viewer playback.'
  }
  return null
}

export function getViewerPdfValidationError(url?: string | null, label = 'PDF'): string | null {
  const trimmed = trimViewerMediaUrl(url)
  if (!trimmed) return null
  if (!isViewerPdfUrl(trimmed)) {
    return `Use a direct ${label} URL ending in .pdf.`
  }
  return null
}
