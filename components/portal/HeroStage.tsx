'use client'

import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'
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
  Play, 
  Users, 
  Music, 
  Coins, 
  MapPin, 
  Sparkles, 
  ArrowUpRight, 
  CheckCircle2,
  DollarSign,
  Award,
  Video
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
    ctaHref: '/participate/benefits'
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

  // Seeding/Fetching variables
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [collageVideoUrls, setCollageVideoUrls] = useState<string[]>([])
  const [failedVideoUrls, setFailedVideoUrls] = useState<string[]>([])
  const { role } = useUserRole()

  const isParticipantAdmin =
    role === 'musician' ||
    role === 'beam_admin' ||
    role === 'partner_admin' ||
    role === 'board'

  const activeCategory = CATEGORIES[activeIndex]

  // Auto advance hero categories
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % CATEGORIES.length)
    }, AUTO_ADVANCE_MS)
    return () => clearInterval(timer)
  }, [])

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
    setActiveIndex((prev) => (prev - 1 + CATEGORIES.length) % CATEGORIES.length)
  }

  function showNext() {
    setActiveIndex((prev) => (prev + 1) % CATEGORIES.length)
  }

  const handleOpenModal = (portal: PortalCategory) => {
    setSelectedPortal(portal)
    setIsModalOpen(true)
  }

  return (
    <div className="relative w-full min-h-screen bg-[#07080b] text-[#f0ead6]">
      
      {/* HERO STAGE SECTION (100vh) */}
      <section className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden isolate">
        
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

        {/* TOP BRANDING BAR (Forge Style) */}
        <div className="relative z-20 mx-auto max-w-7xl w-full px-6 pt-8 flex items-center justify-between text-xs tracking-[0.3em] uppercase text-white/60">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-white tracking-widest">BEAM</span>
            <span className="text-white/30">·</span>
            <span className="text-amber-400 font-semibold">Orchestra</span>
          </div>
          <div className="flex items-center space-x-2 font-mono">
            <span className="text-white font-bold">{String(activeIndex + 1).padStart(2, '0')}</span>
            <span className="text-white/30">/</span>
            <span>{String(CATEGORIES.length).padStart(2, '0')}</span>
          </div>
        </div>

        {/* MAIN HERO CONTENT (Forge Style Typography) */}
        <div className="relative z-20 mx-auto max-w-7xl w-full px-6 py-12 my-auto flex flex-col justify-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeCategory.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
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

        {/* BOTTOM CONTROLS & SCROLL INDICATOR */}
        <div className="relative z-20 mx-auto max-w-7xl w-full px-6 pb-8 flex items-end justify-between gap-6">
          {/* Category Progress Bars */}
          <div className="flex items-center gap-3">
            {CATEGORIES.map((cat, index) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show ${cat.label}`}
                className="flex h-8 items-center"
              >
                <span
                  className={`block h-1 rounded-full transition-all duration-500 ${
                    index === activeIndex ? 'w-10' : 'w-3 bg-white/30 hover:bg-white/60'
                  }`}
                  style={index === activeIndex ? { backgroundColor: cat.colorAccent } : undefined}
                />
              </button>
            ))}
          </div>

          {/* Scroll Down Prompt */}
          <div className="hidden md:flex flex-col items-center text-white/50 text-[10px] uppercase tracking-[0.3em] space-y-2 animate-pulse">
            <span>Scroll to Explore</span>
            <ChevronDown className="w-4 h-4" />
          </div>

          {/* Carousel Arrows */}
          <div className="flex gap-3">
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

      {/* SCROLLABLE PAGE CONTENT SECTIONS */}
      <div className="relative z-20 space-y-24 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

        {/* SECTION 1: Active Contract Ensembles */}
        <section className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <span className="text-xs uppercase font-bold tracking-[0.2em] text-purple-400 block mb-1">Contract Projects</span>
              <h2 className="text-3xl sm:text-5xl font-serif font-bold text-white">Active Symphony Ensembles</h2>
            </div>
            <Link 
              href="/training" 
              className="inline-flex items-center text-sm font-semibold text-purple-300 hover:text-white transition-colors"
            >
              View All Ensembles <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* BDSO Card */}
            <div className="bg-gradient-to-br from-purple-950/40 to-slate-900/80 backdrop-blur-md rounded-3xl p-8 border border-purple-500/20 hover:border-purple-500/50 transition-all shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs font-bold rounded-full border border-green-500/30">
                    Active Project
                  </span>
                  <span className="text-xs text-purple-300 font-semibold">Milwaukee, WI</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Black Diaspora Symphony Orchestra</h3>
                <p className="text-gray-300 text-sm leading-relaxed mb-6">
                  Celebrating Black classical heritage through Margaret Bonds&apos; <em>Montgomery Variations</em> and William Grant Still&apos;s <em>Spiritual Suite</em>.
                </p>
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-400">Roster Recruitment</span>
                    <span className="text-purple-300">45 / 60 Confirmed (75%)</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-purple-500 h-full rounded-full w-[75%]" />
                  </div>
                </div>
              </div>
              <Link
                href="/training/contract-projects/black-diaspora-symphony"
                className="inline-flex items-center justify-center w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg text-sm"
              >
                View BDSO Project Hub
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>

            {/* Concord Symphony Card */}
            <div className="bg-gradient-to-br from-blue-950/40 to-slate-900/80 backdrop-blur-md rounded-3xl p-8 border border-blue-500/20 hover:border-blue-500/50 transition-all shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold rounded-full border border-blue-500/30">
                    Active Project
                  </span>
                  <span className="text-xs text-blue-300 font-semibold">Concord / Regional</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Concord Symphony / Chamber Orchestra</h3>
                <p className="text-gray-300 text-sm leading-relaxed mb-6">
                  Core player ensemble project directed by Jamin Hoffman performing Shostakovich Chamber Symphony and Prokofiev Classical Symphony.
                </p>
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-400">Roster Recruitment</span>
                    <span className="text-blue-300">28 / 40 Confirmed (70%)</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-blue-500 h-full rounded-full w-[70%]" />
                  </div>
                </div>
              </div>
              <Link
                href="/training/contract-projects/concord-symphony"
                className="inline-flex items-center justify-center w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg text-sm"
              >
                View Concord Project Hub
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </section>

        {/* SECTION 2: Compensation & BEAM Coin Incentives */}
        <section className="bg-gradient-to-r from-purple-900/20 via-slate-900/60 to-amber-900/20 backdrop-blur-md rounded-3xl p-8 sm:p-12 border border-white/10 space-y-8">
          <div className="max-w-3xl">
            <span className="text-xs uppercase font-bold tracking-[0.2em] text-amber-400 block mb-1">Ecosystem Model</span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-3">Direct Compensation + BEAM Coins</h2>
            <p className="text-gray-300 text-base leading-relaxed">
              Every participant earns competitive cash stipends for contract sessions paired with BEAM Coin credits redeemable for career infrastructure.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <DollarSign className="w-8 h-8 text-green-400 mb-3" />
              <div className="text-2xl font-bold text-green-400">Up to $495 USD</div>
              <p className="text-xs text-gray-400 mt-1">Paid directly per contract project across rehearsals & concert</p>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <Coins className="w-8 h-8 text-amber-400 mb-3" />
              <div className="text-2xl font-bold text-amber-400">Up to 21 Coins</div>
              <p className="text-xs text-gray-400 mt-1">Earned for lessons, equipment rentals, masterclasses & tickets</p>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <Award className="w-8 h-8 text-purple-400 mb-3" />
              <div className="text-2xl font-bold text-purple-300">Phase 1 & 2 Benefits</div>
              <p className="text-xs text-gray-400 mt-1">Expanding toward housing credits, food access, and fleet transport</p>
            </div>
          </div>

          <div className="pt-2 flex justify-start">
            <Link
              href="/participate/benefits"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all shadow-lg text-sm"
            >
              Explore Full Benefits Catalog
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* SECTION 3: Geographic Content Nodes */}
        <section className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <span className="text-xs uppercase font-bold tracking-[0.2em] text-blue-400 block mb-1">Geographic Network</span>
              <h2 className="text-3xl sm:text-5xl font-serif font-bold text-white">Multi-City Nodes</h2>
            </div>
            <Link 
              href="/cities" 
              className="inline-flex items-center text-sm font-semibold text-blue-300 hover:text-white transition-colors"
            >
              Explore Cities Map <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { name: 'Milwaukee', tag: 'BDSO Hub', status: 'Active' },
              { name: 'Concord', tag: 'Chamber Core', status: 'Active' },
              { name: 'Orlando', tag: 'Steinway Gallery', status: 'Active Node' },
              { name: 'Miami', tag: 'Dance Collab', status: 'Active Node' },
              { name: 'Tampa', tag: 'Gulf Series', status: 'Active Node' }
            ].map((node) => (
              <div key={node.name} className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 text-center hover:border-blue-500/40 transition-all">
                <MapPin className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <h4 className="font-bold text-white text-lg">{node.name}</h4>
                <p className="text-xs text-gray-400 mt-1">{node.tag}</p>
                <span className="inline-block mt-3 px-2.5 py-0.5 bg-green-500/20 text-green-300 text-[10px] font-bold rounded-full">
                  {node.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER NAV */}
        <footer className="pt-12 border-t border-white/10 text-center space-y-6">
          <div className="flex items-center justify-center space-x-6 text-sm font-medium text-gray-400">
            <Link href="/studio" className="hover:text-white transition-colors">Studio Vault</Link>
            <Link href="/training" className="hover:text-white transition-colors">Contract Projects</Link>
            <Link href="/participate/benefits" className="hover:text-white transition-colors">Participant Benefits</Link>
            <Link href="/tickets" className="hover:text-white transition-colors">Tickets</Link>
            <Link href="/cities" className="hover:text-white transition-colors">Cities</Link>
          </div>
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} BEAM Orchestra Ecosystem • Building Excellence in Arts & Music
          </p>
        </footer>

      </div>

      {/* Dynamic Full-Screen Modal */}
      <FullScreenModal
        isOpen={isModalOpen}
        type={selectedPortal}
        onClose={() => setIsModalOpen(false)}
      />

    </div>
  )
}
