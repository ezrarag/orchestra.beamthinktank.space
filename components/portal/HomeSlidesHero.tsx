'use client'

import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import type { HeroSlide } from '@/lib/types/portal'

type Props = {
  fallbackSlides: HeroSlide[]
  ngo: string
  scopedRoutes?: boolean
}

const HOME_LOOP_SECONDS = 5

function isDuplicateJoinRoute(slide: HeroSlide) {
  return slide.id === 'participant-pathway' || slide.ctaPath === '/join' || slide.ctaPath === '/join/participant'
}

function HeroMedia({
  heroSlide,
  backgroundVideoUrl,
  onTimeUpdate,
}: {
  heroSlide?: HeroSlide
  backgroundVideoUrl?: string | null
  onTimeUpdate: (event: SyntheticEvent<HTMLVideoElement>) => void
}) {
  if (backgroundVideoUrl) {
    return (
      <div className="absolute inset-0 h-full w-full overflow-hidden bg-black">
        <video
          src={backgroundVideoUrl}
          autoPlay
          muted
          playsInline
          loop
          onTimeUpdate={onTimeUpdate}
          className="home-loop-video-fade h-full w-full object-cover"
        />
      </div>
    )
  }

  if (heroSlide?.imageSrc) {
    return (
      <Image
        src={heroSlide.imageSrc}
        alt={heroSlide.imageAlt}
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
    )
  }

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(212,175,55,0.22),transparent_28%),radial-gradient(circle_at_80%_12%,rgba(82,97,160,0.22),transparent_30%),linear-gradient(180deg,rgba(18,20,30,0.75),rgba(8,9,14,0.96))]" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_28px)] opacity-50" />
    </div>
  )
}

export default function HomeSlidesHero({ fallbackSlides, ngo, scopedRoutes = false }: Props) {
  const [slides, setSlides] = useState<HeroSlide[]>(fallbackSlides)
  const [collageVideoUrls, setCollageVideoUrls] = useState<string[]>([])
  const [showParticipationPaths, setShowParticipationPaths] = useState(false)
  const { role } = useUserRole()

  const isParticipantAdmin =
    role === 'musician' ||
    role === 'beam_admin' ||
    role === 'partner_admin' ||
    role === 'board'

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

  useEffect(() => {
    if (!db) return

    let mounted = true

    const loadCollageVideos = async () => {
      try {
        const q = query(
          collection(db, 'viewerContent'),
          where('isPublished', '==', true),
          where('showOnHome', '==', true),
        )
        const snapshot = await getDocs(q)
        if (!mounted) return

        const urls = snapshot.docs
          .map((item) => item.data() as { videoUrl?: string; sortOrder?: number; updatedAt?: { toMillis?: () => number } })
          .filter((item) => typeof item.videoUrl === 'string' && item.videoUrl.trim().length > 0)
          .sort((a, b) => {
            const orderDelta = (a.sortOrder ?? 999) - (b.sortOrder ?? 999)
            if (orderDelta !== 0) return orderDelta
            const bUpdated = typeof b.updatedAt?.toMillis === 'function' ? b.updatedAt.toMillis() : 0
            const aUpdated = typeof a.updatedAt?.toMillis === 'function' ? a.updatedAt.toMillis() : 0
            return bUpdated - aUpdated
          })
          .map((item) => item.videoUrl!.trim())

        setCollageVideoUrls(Array.from(new Set(urls)).slice(0, 8))
      } catch (error) {
        console.error('Error loading collage videos:', error)
        if (mounted) {
          setCollageVideoUrls([])
        }
      }
    }

    void loadCollageVideos()

    return () => {
      mounted = false
    }
  }, [])

  const activeSlides = useMemo(() => {
    const nonDuplicateSlides = slides.filter((slide) => !isDuplicateJoinRoute(slide))

    const filtered = nonDuplicateSlides.filter((slide) => {
      if (slide.audience === 'participant_admin') {
        return isParticipantAdmin
      }
      if (slide.audience === 'viewer') {
        return !isParticipantAdmin
      }
      return true
    })

    if (filtered.length > 0) {
      return filtered
    }

    return nonDuplicateSlides.length > 0 ? nonDuplicateSlides : fallbackSlides.filter((slide) => !isDuplicateJoinRoute(slide))
  }, [fallbackSlides, isParticipantAdmin, slides])

  const heroSlide = activeSlides[0]
  const backgroundVideoUrl = heroSlide?.videoUrl?.trim() || collageVideoUrls[0] || null

  useEffect(() => {
    setShowParticipationPaths(false)
  }, [heroSlide?.id])

  const handleCollageTimeUpdate = (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget
    if (video.currentTime >= HOME_LOOP_SECONDS) {
      video.currentTime = 0
      void video.play()
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0d10] text-white">
      <section className="relative isolate min-h-[78vh] overflow-hidden">
        <HeroMedia heroSlide={heroSlide} backgroundVideoUrl={backgroundVideoUrl} onTimeUpdate={handleCollageTimeUpdate} />
        <div className="home-eye-vignette absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/56 to-black/28" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d10] via-black/18 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(255,255,255,0.12),transparent_24%),radial-gradient(circle_at_74%_12%,rgba(212,175,55,0.16),transparent_22%)]" />

        <div className="mx-auto flex min-h-[78vh] max-w-6xl items-end px-4 py-8 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait" initial={false}>
            {!showParticipationPaths ? (
              <motion.div
                key={`home-hero-${heroSlide?.id ?? 'fallback'}`}
                initial={{ opacity: 0, y: 18, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: 12, filter: 'blur(10px)' }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="w-full max-w-3xl rounded-[30px] border border-white/12 bg-black/28 p-6 backdrop-blur-xl sm:p-8"
              >
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">orchestra.BEAM</p>
                <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.03em] text-white sm:text-5xl">
                  {heroSlide?.title ?? 'orchestra.BEAM'}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
                  {heroSlide?.subtitle ?? 'Stream content, explore topics, and more.'}
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-5">
                  <Link
                    href="/viewer"
                    className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    Watch
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowParticipationPaths(true)}
                    className="text-sm font-medium text-white/82 transition hover:text-white"
                  >
                    Participate
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`home-participation-${heroSlide?.id ?? 'fallback'}`}
                initial={{ opacity: 0, y: 18, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: 12, filter: 'blur(10px)' }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="w-full max-w-3xl rounded-[30px] border border-white/12 bg-black/28 p-6 backdrop-blur-xl sm:p-8"
              >
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">orchestra.BEAM</p>
                <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.03em] text-white sm:text-5xl">
                  Choose Participation Path
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
                  Continue as an independent participant or as an institutional partner.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowParticipationPaths(false)}
                    className="inline-flex rounded-full border border-white/20 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/35 hover:bg-white/[0.05]"
                  >
                    Back
                  </button>
                  <Link
                    href="/join/institution"
                    className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    Institution
                  </Link>
                  <Link
                    href="/join/participant"
                    className="inline-flex rounded-full border border-white/20 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/35 hover:bg-white/[0.05]"
                  >
                    Independent Participant
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </main>
  )
}
