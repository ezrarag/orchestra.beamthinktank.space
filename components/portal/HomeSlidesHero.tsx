'use client'

import { useEffect, useMemo, useState } from 'react'
import SlideHero from '@/components/portal/SlideHero'
import type { HeroSlide } from '@/lib/types/portal'

type Props = {
  fallbackSlides: HeroSlide[]
  ngo: string
  scopedRoutes?: boolean
}

export default function HomeSlidesHero({ fallbackSlides, ngo, scopedRoutes = false }: Props) {
  const [slides, setSlides] = useState<HeroSlide[]>(fallbackSlides)

  useEffect(() => {
    let mounted = true

    const loadSlides = async () => {
      try {
        const response = await fetch(`/api/home-slides?ngo=${encodeURIComponent(ngo)}`, { cache: 'no-store' })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) return

        const loaded = Array.isArray(data?.slides) ? (data.slides as HeroSlide[]) : []
        if (mounted && loaded.length > 0) {
          setSlides(loaded.slice(0, 5))
        }
      } catch {
        // Keep static fallback when Firestore/API is unavailable.
      }
    }

    void loadSlides()
    return () => {
      mounted = false
    }
  }, [ngo])

  const safeSlides = useMemo(() => {
    const source = slides.length > 0 ? slides : fallbackSlides
    return source.slice(0, 5)
  }, [fallbackSlides, slides])

  return <SlideHero slides={safeSlides} ngo={ngo} scopedRoutes={scopedRoutes} />
}
