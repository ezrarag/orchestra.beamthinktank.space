'use client'

import { useEffect, useMemo, useState, useRef, type SyntheticEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import type { HeroSlide } from '@/lib/types/portal'
import FullScreenModal from './FullScreenModal'
import { 
  ArrowLeft, 
  ArrowRight, 
  ChevronDown, 
  Sparkles, 
  ArrowUpRight,
  Play,
  Pause,
  User as UserIcon
} from 'lucide-react'
import Link from 'next/link'

const DEFAULT_VIDEO = 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2Fstudio%2FSchumann%20-%20Adagio%20-%20Take%20II%20-%20Dec%205.mov?alt=media&token=34d0e14a-1721-4826-8e43-e3099d4a81c4'
const HOME_LOOP_SECONDS = 6
const AUTO_ADVANCE_MS = 6500

export type PortalCategory = 'watch' | 'participate' | 'cohorts'

interface CategoryItem {
  id: PortalCategory
  doorNumber: string
  label: string
  subtitle: string
  description: string
  colorAccent: string
  ctaText: string
  ctaHref: string
}

const CATEGORIES: CategoryItem[] = [
  {
    id: 'watch',
    doorNumber: '01',
    label: 'Studio & Media Vault',
    subtitle: 'Watch & Explore Performances',
    description: 'Immerse in high-definition rehearsal recordings, chamber masterworks, and masterclass interviews celebrating Black classical heritage.',
    colorAccent: '#D4AF37', // Orchestra Gold
    ctaText: 'Explore Studio Vault',
    ctaHref: '/studio'
  },
  {
    id: 'participate',
    doorNumber: '02',
    label: 'Participant Network',
    subtitle: 'Perform, Earn & Redeem',
    description: 'Audition for professional contract orchestra projects, earn USD stipends up to $495 per project, and collect BEAM Coin credits.',
    colorAccent: '#A855F7', // BEAM Purple
    ctaText: 'Join Participant Network',
    ctaHref: '/profile'
  },
  {
    id: 'cohorts',
    doorNumber: '03',
    label: 'Institutional Cohorts',
    subtitle: 'Multi-City Ensemble Hubs',
    description: 'Partner orchestra hubs including BDSO and Concord Symphony, connecting musicians across Milwaukee, Concord, Orlando, Miami, and Tampa.',
    colorAccent: '#3B82F6', // BEAM Blue
    ctaText: 'View Ensembles & Cities',
    ctaHref: '/cities'
  }
]

export default function HeroStage() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedPortal, setSelectedPortal] = useState<PortalCategory | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  
  // Requirement 1 & 2: Autoplay disabled by default
  const [isAutoplayActive, setIsAutoplayActive] = useState(false)
  
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Seeding/Fetching variables
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [collageVideoUrls, setCollageVideoUrls] = useState<string[]>([])
  const [failedVideoUrls, setFailedVideoUrls] = useState<string[]>([])
  const { user, role } = useUserRole()

  const isParticipantAdmin =
    role === 'musician' ||
    role === 'beam_admin' ||
    role === 'partner_admin' ||
    role === 'board'

  const activeCategory = CATEGORIES[activeIndex]

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Autoplay effect (only runs if explicitly enabled by user, pauses on manual interaction)
  useEffect(() => {
    if (!isAutoplayActive || isDropdownOpen) return
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % CATEGORIES.length)
    }, AUTO_ADVANCE_MS)
    return () => clearInterval(timer)
  }, [isAutoplayActive, isDropdownOpen])

  // Pause autoplay permanently on first manual interaction
  const handleManualInteraction = () => {
    if (isAutoplayActive) {
      setIsAutoplayActive(false)
    }
  }

  // Load slides config
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
        // Fallback
      }
    }
    void loadSlides()
    return () => { mounted = false }
  }, [])

  // Load collage videos
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
          .map((item) => item.data() as { videoUrl?: string })
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

  const heroVideoUrl = slides[0]?.videoUrl?.trim() || null
  const backgroundVideoUrl =
    [heroVideoUrl, ...collageVideoUrls]
      .filter((url): url is string => Boolean(url))
      .find((url) => !failedVideoUrls.includes(url)) ?? DEFAULT_VIDEO

  const watchVideoUrl = backgroundVideoUrl
  const participateVideoUrl = collageVideoUrls[1] || backgroundVideoUrl
  const cohortsVideoUrl = collageVideoUrls[2] || backgroundVideoUrl

  const activeVideoUrl = 
    activeIndex === 0 ? watchVideoUrl :
    activeIndex === 1 ? participateVideoUrl : cohortsVideoUrl

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

  function showPrevious() {
    handleManualInteraction()
    setActiveIndex((prev) => (prev - 1 + CATEGORIES.length) % CATEGORIES.length)
  }

  function showNext() {
    handleManualInteraction()
    setActiveIndex((prev) => (prev + 1) % CATEGORIES.length)
  }

  const handleOpenModal = (portal: PortalCategory) => {
    setSelectedPortal(portal)
    setIsModalOpen(true)
  }

  return (
    <div className="relative w-full h-screen bg-[#07080b] text-[#f0ead6] overflow-hidden">
      
      {/* HERO STAGE SECTION (Full Viewport) */}
      <section className="relative h-screen w-full flex flex-col justify-between overflow-hidden isolate">
        
        {/* Ambient Video Background Layer */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-black">
          <video
            key={activeVideoUrl}
            src={activeVideoUrl}
            autoPlay
            muted
            playsInline
            loop
            onTimeUpdate={handleVideoTimeUpdate}
            onError={() => handleVideoError(activeVideoUrl)}
            className="absolute inset-0 h-full w-full object-cover opacity-40 transition-opacity duration-1000"
          />
        </div>

        {/* Gradient Vignette Overlays */}
        <div className="absolute inset-0 z-10 pointer-events-none bg-[linear-gradient(180deg,rgba(7,8,11,0.7)_0%,rgba(7,8,11,0.4)_50%,rgba(7,8,11,0.95)_100%)]" />
        <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(7,8,11,0.8)_100%)]" />

        {/* Dynamic Color Glow based on active category */}
        <div 
          className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-1000"
          style={{
            background: `radial-gradient(circle at 75% 35%, ${activeCategory.colorAccent}25, transparent 50%)`
          }}
        />

        {/* TOP BRANDING BAR WITH 'ORCHESTRA' DROPDOWN */}
        <div className="relative z-30 mx-auto max-w-7xl w-full px-6 pt-8 flex items-center justify-between text-xs tracking-[0.3em] uppercase text-white/60">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-white tracking-widest">BEAM</span>
            <span className="text-white/30">·</span>
            
            {/* Clickable 'Orchestra' Dropdown Toggle */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => {
                  handleManualInteraction()
                  setIsDropdownOpen(!isDropdownOpen)
                }}
                className="flex items-center space-x-1.5 font-semibold text-amber-400 hover:text-amber-300 transition-all focus:outline-none py-1 px-2.5 rounded-lg bg-amber-400/10 border border-amber-400/20 hover:border-amber-400/40"
                aria-expanded={isDropdownOpen}
                aria-label="Orchestra portal selector"
              >
                <span>Orchestra</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-[#090b14]/95 backdrop-blur-xl border border-white/15 p-2 shadow-2xl z-50 text-left normal-case tracking-normal"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/80 border-b border-white/10 mb-1">
                      Network Destinations & Profiles
                    </div>

                    {/* 1. Musician Participants Profile */}
                    <Link
                      href="/profile"
                      onClick={() => {
                        handleManualInteraction()
                        setIsDropdownOpen(false)
                      }}
                      className="w-full flex items-start space-x-3 p-2.5 rounded-xl transition-all hover:bg-white/10 text-white/80 hover:text-white"
                    >
                      <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 bg-emerald-400" />
                      <div>
                        <div className="text-xs font-bold flex items-center justify-between gap-2">
                          <span className="text-white">Participants</span>
                          <span className="text-[10px] font-mono text-emerald-400 font-semibold">(Musicians)</span>
                        </div>
                        <div className="text-[11px] text-white/50 leading-tight mt-0.5">
                          Musicians, Section Leaders & Resident Cellists
                        </div>
                      </div>
                    </Link>

                    {/* 2. Institutional Cohorts & Businesses */}
                    <Link
                      href="/institution/profile"
                      onClick={() => {
                        handleManualInteraction()
                        setIsDropdownOpen(false)
                      }}
                      className="w-full flex items-start space-x-3 p-2.5 rounded-xl transition-all hover:bg-white/10 text-white/80 hover:text-white"
                    >
                      <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 bg-purple-400" />
                      <div>
                        <div className="text-xs font-bold flex items-center justify-between gap-2">
                          <span className="text-purple-300">Institutions</span>
                          <span className="text-[10px] font-mono text-purple-400 font-semibold">(BADO / BDSO)</span>
                        </div>
                        <div className="text-[11px] text-white/50 leading-tight mt-0.5">
                          Ballet & Dance Orchestra, BDSO & Business Partners
                        </div>
                      </div>
                    </Link>

                    {/* 3. Studio & Media Vault (Audience Viewers) */}
                    <Link
                      href="/audience/profile"
                      onClick={() => {
                        handleManualInteraction()
                        setIsDropdownOpen(false)
                      }}
                      className="w-full flex items-start space-x-3 p-2.5 rounded-xl transition-all hover:bg-white/10 text-white/80 hover:text-white"
                    >
                      <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 bg-blue-400" />
                      <div>
                        <div className="text-xs font-bold flex items-center justify-between gap-2">
                          <span className="text-blue-300">Studio & Media Vault</span>
                          <span className="text-[10px] font-mono text-blue-400 font-semibold">(Viewers)</span>
                        </div>
                        <div className="text-[11px] text-white/50 leading-tight mt-0.5">
                          Watch Recital Recordings, Steinway Takes & Streams
                        </div>
                      </div>
                    </Link>

                    {/* 4. General Orchestra Admin */}
                    <Link
                      href="/admin/login"
                      onClick={() => {
                        handleManualInteraction()
                        setIsDropdownOpen(false)
                      }}
                      className="w-full flex items-start space-x-3 p-2.5 rounded-xl transition-all hover:bg-white/10 text-white/80 hover:text-white border-t border-white/10 pt-2"
                    >
                      <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 bg-amber-400" />
                      <div>
                        <div className="text-xs font-bold flex items-center justify-between gap-2">
                          <span className="text-amber-300">Orchestra Admin</span>
                          <span className="text-[10px] font-mono text-amber-400 font-semibold">(Admin)</span>
                        </div>
                        <div className="text-[11px] text-white/50 leading-tight mt-0.5">
                          Central Directory for ezra@readyaimgo.biz
                        </div>
                      </div>
                    </Link>

                    {/* Section Divider */}
                    <div className="px-3 pt-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/30 border-t border-white/10 mt-1 mb-0.5">
                      STAGE DOORS & CAROUSEL
                    </div>

                    {CATEGORIES.map((cat, idx) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          handleManualInteraction()
                          setActiveIndex(idx)
                          setIsDropdownOpen(false)
                        }}
                        className={`w-full flex items-start space-x-3 p-2 rounded-xl transition-all ${
                          activeIndex === idx
                            ? 'bg-white/15 border border-white/20 text-white'
                            : 'hover:bg-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        <div
                          className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: cat.colorAccent }}
                        />
                        <div>
                          <div className="text-[11px] font-bold flex items-center justify-between gap-2">
                            <span>{cat.label}</span>
                            <span className="text-[9px] font-mono text-white/40">({cat.doorNumber})</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Slide Index Counter */}
          <div className="flex items-center space-x-2 font-mono">
            <span className="text-white font-bold">{String(activeIndex + 1).padStart(2, '0')}</span>
            <span className="text-white/30">/</span>
            <span>{String(CATEGORIES.length).padStart(2, '0')}</span>
          </div>
        </div>

        {/* MAIN HERO CONTENT (Requirement 4: Tightened Transition Timing) */}
        <div className="relative z-20 mx-auto max-w-7xl w-full px-6 py-12 my-auto flex flex-col justify-center">
          <AnimatePresence mode="sync">
            <motion.div
              key={activeCategory.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="max-w-4xl space-y-6"
            >
              <div 
                className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs uppercase tracking-[0.25em] font-semibold border backdrop-blur-md"
                style={{ 
                  color: activeCategory.colorAccent,
                  borderColor: `${activeCategory.colorAccent}40`,
                  backgroundColor: `${activeCategory.colorAccent}10`
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Door {activeCategory.doorNumber} · {activeCategory.subtitle}</span>
              </div>

              <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-[0.95]">
                {activeCategory.label}
              </h1>

              <p className="max-w-2xl text-base sm:text-xl text-white/80 leading-relaxed font-sans">
                {activeCategory.description}
              </p>

              <div className="pt-4 flex flex-wrap items-center gap-4">
                <Link
                  href={activeCategory.ctaHref}
                  className="inline-flex items-center gap-3 rounded-full bg-[#f1f1e9] hover:bg-white text-[#07080b] px-8 py-4 text-sm font-bold shadow-2xl transition-all hover:-translate-y-0.5"
                >
                  {activeCategory.ctaText}
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  onClick={() => handleOpenModal(activeCategory.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 px-6 py-4 text-sm font-semibold text-white backdrop-blur-md transition-all"
                >
                  Quick Overview
                  <ArrowUpRight className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* BOTTOM CONTROLS */}
        <div className="relative z-20 mx-auto max-w-7xl w-full px-6 pb-8 flex items-end justify-between gap-6">
          {/* Category Progress Bars */}
          <div className="flex items-center gap-3">
            {CATEGORIES.map((cat, index) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  handleManualInteraction()
                  setActiveIndex(index)
                }}
                aria-label={`Show ${cat.label}`}
                className="flex h-8 items-center"
              >
                <span
                  className={`block h-1 rounded-full transition-all duration-300 ${
                    index === activeIndex ? 'w-10' : 'w-3 bg-white/30 hover:bg-white/60'
                  }`}
                  style={index === activeIndex ? { backgroundColor: cat.colorAccent } : undefined}
                />
              </button>
            ))}
          </div>

          {/* Carousel Controls (Arrows + Autoplay Pause/Play Toggle) */}
          <div className="flex gap-3">
            {/* Requirement 2: Play/Pause Autoplay Control */}
            <button
              type="button"
              onClick={() => setIsAutoplayActive(!isAutoplayActive)}
              aria-label={isAutoplayActive ? "Pause autoplay" : "Start autoplay"}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white hover:bg-white/20 transition-all backdrop-blur-md"
              title={isAutoplayActive ? "Pause Autoplay" : "Start Autoplay"}
            >
              {isAutoplayActive ? <Pause className="h-4 w-4 text-amber-400" /> : <Play className="h-4 w-4 text-white/70" />}
            </button>

            <button
              type="button"
              onClick={showPrevious}
              aria-label="Previous category"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white hover:bg-white/20 hover:border-white/40 transition-all backdrop-blur-md"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={showNext}
              aria-label="Next category"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white hover:bg-white/20 hover:border-white/40 transition-all backdrop-blur-md"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Dynamic Full-Screen Modal */}
      <FullScreenModal
        isOpen={isModalOpen}
        type={selectedPortal}
        onClose={() => setIsModalOpen(false)}
      />

    </div>
  )
}
