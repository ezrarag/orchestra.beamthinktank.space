import type { HeroSlide } from '@/lib/types/portal'

export const HOME_SLIDES_COLLECTION = 'portalHomeSlides'

export type HomeSlidesDoc = {
  ngoId: string
  slides: HeroSlide[]
  updatedAt?: unknown
}

function readTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function readPortalPath(value: unknown, fallback: HeroSlide['ctaPath']): HeroSlide['ctaPath'] {
  const path = readTrimmedString(value)
  return (path || fallback) as HeroSlide['ctaPath']
}

function readAudience(value: unknown): HeroSlide['audience'] {
  if (value === 'viewer' || value === 'participant_admin' || value === 'all') {
    return value
  }
  return 'all'
}

export function sanitizeHomeSlide(input: Partial<HeroSlide>, index: number): HeroSlide {
  const trimmedId = readTrimmedString(input.id)
  const secondaryCtaLabel = readTrimmedString(input.secondaryCtaLabel)
  const secondaryCtaPath = readTrimmedString(input.secondaryCtaPath)
  const slide: HeroSlide = {
    id: trimmedId || `slide-${index + 1}`,
    title: readTrimmedString(input.title),
    subtitle: readTrimmedString(input.subtitle),
    ctaLabel: readTrimmedString(input.ctaLabel),
    ctaPath: readPortalPath(input.ctaPath, '/home'),
    imageSrc: readTrimmedString(input.imageSrc),
    imageAlt: readTrimmedString(input.imageAlt),
    audience: readAudience(input.audience),
  }

  if (secondaryCtaLabel) {
    slide.secondaryCtaLabel = secondaryCtaLabel
  }

  if (secondaryCtaPath) {
    slide.secondaryCtaPath = readPortalPath(secondaryCtaPath, '/join') as HeroSlide['secondaryCtaPath']
  }

  const videoUrl = readTrimmedString(input.videoUrl)
  if (videoUrl) {
    if (videoUrl.startsWith('http://localhost')) {
      console.warn('Home slide videoUrl is a localhost URL — will not work in production.')
    }
    slide.videoUrl = videoUrl
  }

  return slide
}

export function sanitizeHomeSlides(input: unknown): HeroSlide[] {
  if (!Array.isArray(input)) return []
  return input.map((item, index) => sanitizeHomeSlide((item ?? {}) as Partial<HeroSlide>, index))
}
