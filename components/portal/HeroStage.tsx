'use client'

import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import { motion } from 'framer-motion'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import type { HeroSlide } from '@/lib/types/portal'
import PortalCards, { type PortalType } from './PortalCards'
import FullScreenModal from './FullScreenModal'

const DEFAULT_VIDEO = 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2Fstudio%2FSchumann%20-%20Adagio%20-%20Take%20II%20-%20Dec%205.mov?alt=media&token=34d0e14a-1721-4826-8e43-e3099d4a81c4'
const HOME_LOOP_SECONDS = 5

export default function HeroStage() {
  const [selectedPortal, setSelectedPortal] = useState<PortalType | null>(null)
  const [hoveredPortal, setHoveredPortal] = useState<PortalType | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Seeding/Fetching variables matching previous slides implementation
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [collageVideoUrls, setCollageVideoUrls] = useState<string[]>([])
  const [failedVideoUrls, setFailedVideoUrls] = useState<string[]>([])
  const { role } = useUserRole()

  const isParticipantAdmin =
    role === 'musician' ||
    role === 'beam_admin' ||
    role === 'partner_admin' ||
    role === 'board'

  // Load slides config (fallback slideshow)
  useEffect(() => {
    let mounted = true
    const loadSlides = async () => {
      try {
        const response = await fetch('/api/home-slides?ngo=orchestra', { cache: 'no-store' })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) return
        const loaded = Array.isArray(data?.slides) ? (data.slides as HeroSlide[]) : []
        if (mounted && loaded.length > 0) {
          setSlides(loaded.slice(0, 5))
        }
      } catch {
        // Fallback to static slides config
      }
    }
    void loadSlides()
    return () => { mounted = false }
  }, [])

  // Load collage videos from viewerContent
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
          .map((item) => item.data() as { videoUrl?: string; sortOrder?: number })
          .filter((item) => typeof item.videoUrl === 'string' && item.videoUrl.trim().length > 0)
          .map((item) => item.videoUrl!.trim())

        setCollageVideoUrls(Array.from(new Set(urls)).slice(0, 8))
      } catch (error) {
        console.error('Error loading collage videos:', error)
      }
    }
    void loadCollageVideos()
    return () => { mounted = false }
  }, [])

  const activeSlides = useMemo(() => {
    const filtered = slides.filter((slide) => {
      if (slide.audience === 'participant_admin') return isParticipantAdmin
      if (slide.audience === 'viewer') return !isParticipantAdmin
      return true
    })
    return filtered.length > 0 ? filtered : slides
  }, [isParticipantAdmin, slides])

  const heroSlide = activeSlides[0]
  const heroVideoUrl = heroSlide?.videoUrl?.trim() || null
  const backgroundVideoUrl =
    [heroVideoUrl, ...collageVideoUrls]
      .filter((url): url is string => Boolean(url))
      .find((url) => !failedVideoUrls.includes(url)) ?? DEFAULT_VIDEO

  // Map portal videos
  const watchVideoUrl = backgroundVideoUrl
  const participateVideoUrl = collageVideoUrls[1] || backgroundVideoUrl
  const cohortsVideoUrl = collageVideoUrls[2] || backgroundVideoUrl

  const handleVideoTimeUpdate = (event: SyntheticEvent<HTMLVideoElement>) => {
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

  const handleSelectPortal = (type: PortalType) => {
    setSelectedPortal(type)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#07080b] text-[#f0ead6] flex flex-col justify-center items-center">
      
      {/* Ambient Video Background Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-black">
        {/* Default / Watch Background Video */}
        <video
          src={watchVideoUrl}
          autoPlay
          muted
          playsInline
          loop
          onTimeUpdate={handleVideoTimeUpdate}
          onError={() => handleVideoError(watchVideoUrl)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
            hoveredPortal === null || hoveredPortal === 'watch' ? 'opacity-40' : 'opacity-0'
          }`}
        />

        {/* Participate Background Video */}
        <video
          src={participateVideoUrl}
          autoPlay
          muted
          playsInline
          loop
          onTimeUpdate={handleVideoTimeUpdate}
          onError={() => handleVideoError(participateVideoUrl)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
            hoveredPortal === 'participate' ? 'opacity-40' : 'opacity-0'
          }`}
        />

        {/* Cohorts Background Video */}
        <video
          src={cohortsVideoUrl}
          autoPlay
          muted
          playsInline
          loop
          onTimeUpdate={handleVideoTimeUpdate}
          onError={() => handleVideoError(cohortsVideoUrl)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
            hoveredPortal === 'cohorts' ? 'opacity-40' : 'opacity-0'
          }`}
        />
      </div>

      {/* Dark Vignette / Gradient legibility overlay */}
      <div className="absolute inset-0 z-10 transition-colors duration-1000 bg-radial from-transparent via-black/50 to-[#07080b]" />
      
      {/* Portal Specific Color Overlays */}
      <div
        className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-1000 bg-amber-500/5 ${
          hoveredPortal === 'watch' ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-1000 bg-purple-500/5 ${
          hoveredPortal === 'participate' ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-1000 bg-blue-500/5 ${
          hoveredPortal === 'cohorts' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.02),transparent_60%)] pointer-events-none" />

      {/* Orbiting particles background (Z-10, behind UI elements) */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/10"
            style={{
              width: Math.random() * 3 + 2,
              height: Math.random() * 3 + 2,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, Math.random() * -60 - 30, 0],
              opacity: [0.05, 0.4, 0.05],
            }}
            transition={{
              duration: Math.random() * 12 + 10,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Core Interface Stage */}
      <div className="relative z-20 flex flex-col items-center justify-center w-full max-w-6xl px-6 text-center space-y-16">
        
        {/* Centered Headline */}
        <motion.div
          initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="space-y-4"
        >
          <span className="text-[10px] tracking-[0.4em] uppercase text-amber-400 font-bold">
            BUILDING EXCELLENCE IN ARTS & MUSIC
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-[0.25em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-white to-amber-200">
            ORCHESTRA.BEAM
          </h1>
          <p className="max-w-md mx-auto text-xs leading-6 tracking-wide text-white/45">
            A single-viewport collaborative workspace and media distribution node for our classical network.
          </p>
        </motion.div>

        {/* Central 3-Portal Card Component */}
        <motion.div
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
          className="w-full flex justify-center"
        >
          <PortalCards onSelect={handleSelectPortal} onHover={setHoveredPortal} />
        </motion.div>

      </div>

      {/* Dynamic Overlay Full-Screen Modals */}
      <FullScreenModal
        isOpen={isModalOpen}
        type={selectedPortal}
        onClose={handleCloseModal}
      />
    </div>
  )
}
