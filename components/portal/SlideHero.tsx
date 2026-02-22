'use client'

import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { resolvePortalPath } from '@/lib/portal/routes'
import type { HeroSlide } from '@/lib/types/portal'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { User } from 'lucide-react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface SlideHeroProps {
  slides: HeroSlide[]
  ngo?: string
  scopedRoutes?: boolean
  preloadImages?: boolean
}

export default function SlideHero({ slides, ngo, scopedRoutes = false, preloadImages = false }: SlideHeroProps) {
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null)
  const [showSlideMenu, setShowSlideMenu] = useState(false)
  const [collageVideoUrls, setCollageVideoUrls] = useState<string[]>([])
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

  const getSlideCta = (slide: HeroSlide) => {
    return {
      href: resolvePortalPath(slide.ctaPath, ngo, scopedRoutes),
      label: slide.ctaLabel,
      disabled: false,
    }
  }

  const quickRoutes = [
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
                className="h-full w-full object-cover"
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
                  <Link
                    key={route.label}
                    href={route.href}
                    onClick={() => setShowSlideMenu(false)}
                    className="block rounded-md px-3 py-2 text-sm font-medium text-black transition hover:bg-gray-100"
                  >
                    {route.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </section>
  )
}
