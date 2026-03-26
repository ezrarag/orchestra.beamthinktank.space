import type { HeroSlide } from '@/lib/types/portal'

export const HOME_SLIDES_COLLECTION = 'portalHomeSlides'

export type HomeSlidesDoc = {
  ngoId: string
  slides: HeroSlide[]
  updatedAt?: unknown
}

export function sanitizeHomeSlide(input: Partial<HeroSlide>, index: number): HeroSlide {
  const trimmedId = (input.id ?? '').trim()
  const secondaryCtaLabel = (input.secondaryCtaLabel ?? '').trim()
  const secondaryCtaPath = ((input.secondaryCtaPath ?? '') as string).trim()
  const slide: HeroSlide = {
    id: trimmedId || `slide-${index + 1}`,
    title: (input.title ?? '').trim(),
    subtitle: (input.subtitle ?? '').trim(),
    ctaLabel: (input.ctaLabel ?? '').trim(),
    ctaPath: ((input.ctaPath ?? '/home') as HeroSlide['ctaPath']),
    imageSrc: (input.imageSrc ?? '').trim(),
    imageAlt: (input.imageAlt ?? '').trim(),
    audience: input.audience ?? 'all',
  }

  if (secondaryCtaLabel) {
    slide.secondaryCtaLabel = secondaryCtaLabel
  }

  if (secondaryCtaPath) {
    slide.secondaryCtaPath = secondaryCtaPath as HeroSlide['secondaryCtaPath']
  }

  const videoUrl = (input.videoUrl ?? '').trim()
  if (videoUrl) {
    slide.videoUrl = videoUrl
  }

  return slide
}

export function sanitizeHomeSlides(input: unknown): HeroSlide[] {
  if (!Array.isArray(input)) return []
  return input.map((item, index) => sanitizeHomeSlide((item ?? {}) as Partial<HeroSlide>, index))
}
