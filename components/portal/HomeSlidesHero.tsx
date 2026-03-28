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

type HomeSlidesDebug = {
  ngo?: string
  reason?: string
  collection?: string
  docPath?: string
  adminSdkAvailable?: boolean
  adminDbReady?: boolean
  adminProjectId?: string
  vercelEnv?: string | null
  missingAdminEnvVars?: string[]
  slideCount?: number
  error?: string
}

function isDuplicateJoinRoute(slide: HeroSlide) {
  return slide.id === 'participant-pathway' || slide.ctaPath === '/join' || slide.ctaPath === '/join/participant'
}

function HeroMedia({
  heroSlide,
  backgroundVideoUrl,
  onTimeUpdate,
  onVideoError,
}: {
  heroSlide?: HeroSlide
  backgroundVideoUrl?: string | null
  onTimeUpdate: (event: SyntheticEvent<HTMLVideoElement>) => void
  onVideoError: (url: string) => void
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
          onError={() => onVideoError(backgroundVideoUrl)}
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
  const [failedVideoUrls, setFailedVideoUrls] = useState<string[]>([])
  const [homeDebugEnabled, setHomeDebugEnabled] = useState(false)
  const [homeSlidesDebug, setHomeSlidesDebug] = useState<HomeSlidesDebug | null>(null)
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
        const debugEnabled =
          typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('homeDebug') === '1'

        if (mounted) {
          setHomeDebugEnabled(debugEnabled)
        }

        const endpoint = `/api/home-slides?ngo=${encodeURIComponent(ngo)}${debugEnabled ? '&debug=1' : ''}`
        const response = await fetch(endpoint, { cache: 'no-store' })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) return

        if (mounted && data?.debug) {
          const debugPayload = data.debug as HomeSlidesDebug
          setHomeSlidesDebug(debugPayload)
          if (typeof window !== 'undefined') {
            ;(window as Window & { __BEAM_PAGE_DEBUG__?: Record<string, unknown> }).__BEAM_PAGE_DEBUG__ = {
              ...(window as Window & { __BEAM_PAGE_DEBUG__?: Record<string, unknown> }).__BEAM_PAGE_DEBUG__,
              homeSlides: debugPayload,
            }
          }
          console.warn('Home slides debug:', data.debug)
        }

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
  const heroVideoUrl = heroSlide?.videoUrl?.trim() || null
  const backgroundVideoUrl =
    [heroVideoUrl, ...collageVideoUrls]
      .filter((url): url is string => Boolean(url))
      .find((url) => !failedVideoUrls.includes(url)) ?? null

  useEffect(() => {
    setShowParticipationPaths(false)
  }, [heroSlide?.id])

  useEffect(() => {
    setFailedVideoUrls([])
  }, [heroSlide?.id, collageVideoUrls])

  const handleCollageTimeUpdate = (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget
    if (video.currentTime >= HOME_LOOP_SECONDS) {
      video.currentTime = 0
      void video.play()
    }
  }

  const handleVideoError = (url: string) => {
    setFailedVideoUrls((current) => {
      if (current.includes(url)) return current
      return [...current, url]
    })
  }

  return (
    <main className="min-h-screen bg-[#0b0d10] text-white">
      <section className="relative isolate min-h-[78vh] overflow-hidden">
        <HeroMedia
          heroSlide={heroSlide}
          backgroundVideoUrl={backgroundVideoUrl}
          onTimeUpdate={handleCollageTimeUpdate}
          onVideoError={handleVideoError}
        />
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

        {homeDebugEnabled ? (
          <div className="pointer-events-none absolute bottom-3 right-3 z-30 max-w-sm rounded-2xl border border-amber-300/30 bg-black/70 p-3 text-[11px] text-amber-50 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <p className="font-semibold uppercase tracking-[0.16em] text-amber-200/90">Home Debug</p>
            <div className="mt-2 space-y-1 text-white/80">
              <p><span className="text-white">Reason:</span> {homeSlidesDebug?.reason ?? 'not returned'}</p>
              <p><span className="text-white">Doc:</span> {homeSlidesDebug?.docPath ?? 'n/a'}</p>
              <p><span className="text-white">Admin DB:</span> {homeSlidesDebug?.adminDbReady ? 'ready' : 'missing'}</p>
              <p><span className="text-white">Project:</span> {homeSlidesDebug?.adminProjectId ?? 'n/a'}</p>
              <p><span className="text-white">Hero URL:</span> {heroVideoUrl ? 'set' : 'empty'}</p>
              <p><span className="text-white">Using URL:</span> {backgroundVideoUrl ? 'video' : 'image/fallback'}</p>
              {homeSlidesDebug?.missingAdminEnvVars && homeSlidesDebug.missingAdminEnvVars.length > 0 ? (
                <p><span className="text-white">Missing env:</span> {homeSlidesDebug.missingAdminEnvVars.join(', ')}</p>
              ) : null}
              {homeSlidesDebug?.error ? (
                <p><span className="text-white">Error:</span> {homeSlidesDebug.error}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}
