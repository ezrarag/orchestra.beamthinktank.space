'use client'

import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { resolvePortalPath } from '@/lib/portal/routes'
import type { HeroSlide } from '@/lib/types/portal'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { User, X } from 'lucide-react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface SlideHeroProps {
  slides: HeroSlide[]
  ngo?: string
  scopedRoutes?: boolean
  preloadImages?: boolean
}

type BeamSiteEntry = {
  id: string
  label: string
  title: string
  subtitle: string
  url: string
  previewImageUrl?: string
  sortOrder?: number
  isActive?: boolean
}

const defaultBeamSites: BeamSiteEntry[] = [
  {
    id: 'beam-home',
    label: 'BEAM Home Site',
    title: 'BEAM Home Site',
    subtitle: 'Explore the primary BEAM platform and ecosystem updates.',
    url: 'https://beamthinktank.space',
    previewImageUrl: '',
    sortOrder: 0,
    isActive: true,
  },
]

export default function SlideHero({ slides, ngo, scopedRoutes = false, preloadImages = false }: SlideHeroProps) {
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null)
  const [showSlideMenu, setShowSlideMenu] = useState(false)
  const [showBeamModal, setShowBeamModal] = useState(false)
  const [collageVideoUrls, setCollageVideoUrls] = useState<string[]>([])
  const [beamSites, setBeamSites] = useState<BeamSiteEntry[]>(defaultBeamSites)
  const [beamSitesLoading, setBeamSitesLoading] = useState(false)
  const [beamSitesError, setBeamSitesError] = useState<string | null>(null)
  const [selectedBeamSiteId, setSelectedBeamSiteId] = useState<string>(defaultBeamSites[0].id)
  const slideMenuRef = useRef<HTMLDivElement>(null)
  const { user, role } = useUserRole()

  const isParticipantAdmin =
    role === 'musician' ||
    role === 'beam_admin' ||
    role === 'partner_admin' ||
    role === 'board'

  const activeSlides = useMemo(() => {
    const filtered = slides.filter((slide) => {
      if (slide.audience === 'participant_admin') {
        return isParticipantAdmin
      }
      if (slide.audience === 'viewer') {
        return !isParticipantAdmin
      }
      return true
    })

    return filtered.length > 0 ? filtered : slides
  }, [slides, isParticipantAdmin])

  const selectableSlides = useMemo(() => {
    if (activeSlides.length > 1) {
      return activeSlides
    }
    return slides
  }, [activeSlides, slides])

  useEffect(() => {
    if (!preloadImages) return
    activeSlides.forEach((slide) => {
      const img = new window.Image()
      img.src = slide.imageSrc
    })
  }, [preloadImages, activeSlides])

  useEffect(() => {
    if (selectableSlides.length === 0) {
      setSelectedSlideId(null)
      return
    }

    const hasSelected = selectedSlideId && selectableSlides.some((slide) => slide.id === selectedSlideId)
    if (!hasSelected) {
      setSelectedSlideId(selectableSlides[0].id)
    }
  }, [selectableSlides, selectedSlideId])

  const currentSlide = selectableSlides.find((slide) => slide.id === selectedSlideId) ?? selectableSlides[0]
  const showParticipantPicker = selectableSlides.length > 0

  useEffect(() => {
    if (!showSlideMenu) return

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (slideMenuRef.current && !slideMenuRef.current.contains(target)) {
        setShowSlideMenu(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [showSlideMenu])

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
          .map((item) => item.data()?.videoUrl)
          .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)

        setCollageVideoUrls(Array.from(new Set(urls)).slice(0, 8))
      } catch (error) {
        console.error('Error loading collage videos:', error)
        if (mounted) {
          setCollageVideoUrls([])
        }
      }
    }

    loadCollageVideos()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!db) return

    let mounted = true

    const loadBeamSites = async () => {
      setBeamSitesLoading(true)
      setBeamSitesError(null)

      try {
        const snapshot = await getDocs(collection(db, 'beamWebsiteDirectory'))
        if (!mounted) return

        const items = snapshot.docs
          .map((item) => {
            const data = item.data() as Partial<BeamSiteEntry>
            return {
              id: item.id,
              label: data.label ?? data.title ?? 'Untitled site',
              title: data.title ?? data.label ?? 'Untitled site',
              subtitle: data.subtitle ?? 'No description provided yet.',
              url: data.url ?? '',
              previewImageUrl: data.previewImageUrl,
              sortOrder: data.sortOrder ?? 999,
              isActive: data.isActive ?? true,
            } as BeamSiteEntry
          })
          .filter((item) => item.isActive !== false && item.url.trim().length > 0)
          .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))

        if (items.length > 0) {
          setBeamSites(items)
          setSelectedBeamSiteId(items[0].id)
        } else {
          setBeamSites(defaultBeamSites)
          setSelectedBeamSiteId(defaultBeamSites[0].id)
        }
      } catch (error) {
        console.error('Error loading BEAM website directory:', error)
        if (mounted) {
          setBeamSites(defaultBeamSites)
          setSelectedBeamSiteId(defaultBeamSites[0].id)
          setBeamSitesError('Using default directory while BEAM links load.')
        }
      } finally {
        if (mounted) {
          setBeamSitesLoading(false)
        }
      }
    }

    loadBeamSites()

    return () => {
      mounted = false
    }
  }, [])

  const getSlideCta = (slide: HeroSlide) => {
    return {
      href: resolvePortalPath(slide.ctaPath, ngo, scopedRoutes),
      label: slide.ctaLabel,
      disabled: false,
    }
  }

  const quickRoutes = [
    { label: 'BEAM', action: 'beam-modal' as const },
    { label: 'Admin Dashboard', href: resolvePortalPath('/admin', ngo, scopedRoutes) },
    { label: 'Participant Dashboard', href: resolvePortalPath('/dashboard', ngo, scopedRoutes) },
    { label: 'Publishing Sign Up', href: '/publishing/signup' },
    { label: 'Viewer', href: '/viewer' },
  ]

  const isWatchSlide = currentSlide?.id === 'watch-and-support'
  const primaryWatchVideoUrl = collageVideoUrls[0] ?? currentSlide?.videoUrl ?? null

  const handleCollageTimeUpdate = (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget
    if (video.currentTime >= 10) {
      video.currentTime = 0
      void video.play()
    }
  }

  return (
    <section className="relative h-[100dvh] min-h-[600px] w-full overflow-hidden bg-slate-950 text-white">
      {currentSlide && (
        <article key={currentSlide.id} className="relative h-full w-full">
          {isWatchSlide && primaryWatchVideoUrl ? (
            <div className="absolute inset-0 h-full w-full overflow-hidden bg-black">
              <video
                src={primaryWatchVideoUrl}
                autoPlay
                muted
                playsInline
                loop
                onTimeUpdate={handleCollageTimeUpdate}
                className="home-loop-video-fade h-full w-full object-cover"
              />
            </div>
          ) : (
            <Image
              src={currentSlide.imageSrc}
              alt={currentSlide.imageAlt}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
          )}
          {isWatchSlide && <div className="home-eye-vignette absolute inset-0" />}
          <div className="absolute inset-0 bg-gradient-to-r from-black/72 via-black/56 to-black/42" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col justify-end px-4 pb-20 pt-12 sm:px-6">
            {(() => {
              const cta = getSlideCta(currentSlide)
              return (
                <>
                  <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">{currentSlide.title}</h1>
                  <p className="mt-3 max-w-xl text-base text-white/85 sm:text-lg">{currentSlide.subtitle}</p>
                  <div className="mt-7 flex items-center gap-5">
                    {cta.disabled ? (
                      <span className="inline-flex rounded-lg bg-white/70 px-5 py-3 text-sm font-semibold text-slate-900/80">
                        {cta.label}
                      </span>
                    ) : (
                      <Link
                        href={cta.href}
                        className="inline-flex rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                      >
                        {cta.label}
                      </Link>
                    )}
                    {isWatchSlide && (
                      <Link href="/join/participant" className="text-sm font-semibold text-white/90 underline-offset-4 hover:text-white hover:underline">
                        Participate
                      </Link>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </article>
      )}

      {showParticipantPicker && (
        <div ref={slideMenuRef} className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
          <button
            type="button"
            onClick={() => setShowSlideMenu((prev) => !prev)}
            className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md transition-colors hover:bg-white/20"
            title="Open participant views"
            aria-label="Open participant views"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="h-10 w-10 rounded-full" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400/30">
                <User className="h-5 w-5 text-white" />
              </div>
            )}
          </button>

          {showSlideMenu && (
            <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border-2 border-[#D4AF37]/30 bg-white/95 shadow-2xl backdrop-blur-lg">
              <div className="border-b border-[#D4AF37]/20 px-4 py-3">
                <p className="text-sm font-semibold text-black">Quick Routes</p>
              </div>
              <div className="px-2 py-2">
                {quickRoutes.map((route) => (
                  'action' in route ? (
                    <button
                      key={route.label}
                      type="button"
                      onClick={() => {
                        setShowSlideMenu(false)
                        setShowBeamModal(true)
                      }}
                      className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-black transition hover:bg-gray-100"
                    >
                      {route.label}
                    </button>
                  ) : (
                    <Link
                      key={route.label}
                      href={route.href}
                      onClick={() => setShowSlideMenu(false)}
                      className="block rounded-md px-3 py-2 text-sm font-medium text-black transition hover:bg-gray-100"
                    >
                      {route.label}
                    </Link>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showBeamModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-white/20 bg-[#0B0D12] p-5 text-white shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Choose A BEAM Site</h3>
              <button
                type="button"
                onClick={() => setShowBeamModal(false)}
                className="rounded-full border border-white/25 p-2 hover:bg-white/10"
                aria-label="Close site chooser"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mb-4 block">
              <span className="mb-2 block text-sm text-white/70">Website</span>
              <select
                value={selectedBeamSiteId}
                onChange={(event) => setSelectedBeamSiteId(event.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]"
              >
                {beamSites.map((site) => (
                  <option key={site.id} value={site.id} className="text-black">
                    {site.label}
                  </option>
                ))}
              </select>
            </label>

            {(() => {
              const selectedSite = beamSites.find((site) => site.id === selectedBeamSiteId) ?? beamSites[0]
              if (!selectedSite) return null

              return (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-xl border border-white/15 bg-black/35">
                    {selectedSite.previewImageUrl ? (
                      <img
                        src={selectedSite.previewImageUrl}
                        alt={`${selectedSite.title} preview`}
                        className="h-56 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-56 items-center justify-center text-sm text-white/60">
                        Preview not available yet
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xl font-semibold">{selectedSite.title}</h4>
                    <p className="mt-1 text-sm text-white/75">{selectedSite.subtitle}</p>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-xs text-white/55">{selectedSite.url}</span>
                    <a
                      href={selectedSite.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#E3C35D]"
                    >
                      Visit
                    </a>
                  </div>
                </div>
              )
            })()}

            <div className="mt-4 text-xs text-white/60">
              {beamSitesLoading
                ? 'Loading directory entries...'
                : beamSitesError || 'Directory is powered by Firestore collection: beamWebsiteDirectory'}
            </div>
          </div>
        </div>
      )}

    </section>
  )
}
