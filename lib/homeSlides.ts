import type { HeroSlide } from '@/lib/types/portal'

export const HOME_SLIDES_COLLECTION = 'portalHomeSlides'

export type HomeSlidesDoc = {
  ngoId: string
  slides: HeroSlide[]
  updatedAt?: unknown
}

export function sanitizeHomeSlide(input: Partial<HeroSlide>, index: number): HeroSlide {
  const trimmedId = (input.id ?? '').trim()
  return {
    id: trimmedId || `slide-${index + 1}`,
    title: (input.title ?? '').trim(),
    subtitle: (input.subtitle ?? '').trim(),
    ctaLabel: (input.ctaLabel ?? '').trim(),
    ctaPath: ((input.ctaPath ?? '/home') as HeroSlide['ctaPath']),
    imageSrc: (input.imageSrc ?? '').trim(),
    imageAlt: (input.imageAlt ?? '').trim(),
    audience: input.audience ?? 'all',
    videoUrl: (input.videoUrl ?? '').trim() || undefined,
  }
}

export function sanitizeHomeSlides(input: unknown): HeroSlide[] {
  if (!Array.isArray(input)) return []
  return input.map((item, index) => sanitizeHomeSlide((item ?? {}) as Partial<HeroSlide>, index))
}
