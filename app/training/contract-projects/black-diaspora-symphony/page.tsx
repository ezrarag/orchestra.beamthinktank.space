'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  Music, 
  Calendar, 
  DollarSign, 
  Coins, 
  Upload, 
  Play,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Award,
  Info,
  Download,
  Phone,
  Mail,
  Linkedin,
  MapPin as Location,
  Menu,
  X
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { 
  rosterData, 
  rehearsalSchedule, 
  faqData, 
  ravelExcerptDownloads,
  montgomeryExcerptDownloads
} from './data'

// Lazy load heavy components to reduce initial bundle size
const ProjectMediaGallery = dynamic(() => import('@/components/ProjectMediaGallery'), {
  loading: () => <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 animate-pulse h-96" />,
  ssr: false
})

type MusicianDetail = (typeof rosterData)[number]['musicianDetails'][number]
type MusicianProfile = MusicianDetail & { instrument: string }

const navigationSections = [
  { id: 'roster', label: 'Roster', icon: Users },
  { id: 'compensation', label: 'Compensation', icon: DollarSign },
  { id: 'schedule', label: 'Rehearsals', icon: Calendar },
  { id: 'faq', label: 'FAQ', icon: Info },
  { id: 'media', label: 'Media', icon: Play }
]

export default function BlackDiasporaSymphonyPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [showAuditionForm, setShowAuditionForm] = useState(false)
  const [submittedAudition, setSubmittedAudition] = useState(false)
  const [showRavelModal, setShowRavelModal] = useState(false)
  const [hoveredExcerpt, setHoveredExcerpt] = useState<string | null>(null)
  const [ravelSearch, setRavelSearch] = useState('')
  const [activeSection, setActiveSection] = useState('roster')
  const [scrollY, setScrollY] = useState(0)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [showBeamVideo, setShowBeamVideo] = useState(false)
  const [showBeamCompensation, setShowBeamCompensation] = useState(false)
  const [showMusicianModal, setShowMusicianModal] = useState(false)
  const [selectedMusician, setSelectedMusician] = useState<MusicianProfile | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const montgomeryAvailableCount = montgomeryExcerptDownloads.filter(part => part.available).length
  const ravelAvailableCount = ravelExcerptDownloads.filter(part => part.available).length
  const hasMontgomeryDownloads = montgomeryAvailableCount > 0
  const hasRavelDownloads = ravelAvailableCount > 0

  const filteredRavelDownloads = ravelExcerptDownloads.filter(part =>
    part.instrument.toLowerCase().includes(ravelSearch.trim().toLowerCase())
  )

  const excerptStatusMessage = (work: 'montgomery' | 'ravel') => {
    if (work === 'montgomery') {
      return hasMontgomeryDownloads ? `${montgomeryAvailableCount} downloads ready` : 'No files yet'
    }

    if (!hasRavelDownloads) {
      return 'No files yet'
    }

    return `${ravelAvailableCount} instrument${ravelAvailableCount === 1 ? '' : 's'} ready`
  }

  const totalNeeded = rosterData.reduce((sum, section) => sum + section.needed, 0)
  const totalConfirmed = rosterData.reduce((sum, section) => sum + section.confirmed, 0)
  const totalInterested = rosterData.reduce((sum, section) => 
    sum + section.musicianDetails.filter(m => m.status === 'Interested').length, 0
  )
  const totalPending = rosterData.reduce((sum, section) => 
    sum + section.musicianDetails.filter(m => m.status === 'Pending').length, 0
  )
  const overallPercentage = Math.round((totalConfirmed / totalNeeded) * 100)

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    setMobileNavOpen(false)
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleOpenMusicianProfile = (instrument: string, musician: MusicianDetail) => {
    setSelectedMusician({ ...musician, instrument })
    setShowMusicianModal(true)
  }

  const handleCloseMusicianProfile = () => {
    setShowMusicianModal(false)
    setSelectedMusician(null)
  }

  const getMusicianInitials = (name: string) => {
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map(part => part[0]?.toUpperCase() ?? '')
      .join('')
    return initials.slice(0, 2) || 'BDSO'
  }

  const getSupportLabel = (name: string) => {
    const part = name
      .split(' ')
      .map(segment => segment.trim())
      .find(segment => segment.length > 0)
    return part ?? 'This Artist'
  }

  const renderMusicianSource = (source: string): JSX.Element | string => {
    if (!source) {
      return 'n/a'
    }

    const detailStart = source.indexOf('(')
    if (detailStart !== -1) {
      const label = source.slice(0, detailStart).trimEnd()
      const detail = source.slice(detailStart).trimStart()

      return (
        <>
          {label}
          <span className="relative inline-flex items-center">
            <span className="ml-1 blur-sm sm:blur select-none pointer-events-none">{detail}</span>
            <span className="sr-only">Date hidden for privacy</span>
          </span>
        </>
      )
    }

    return source
  }

  // Update active section and scroll position based on scroll - throttled for performance
  useEffect(() => {
    let ticking = false
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(window.scrollY)
          
          const sections = navigationSections.map(section => section.id)
          const scrollPosition = window.scrollY + 180

          for (let i = sections.length - 1; i >= 0; i--) {
            const section = document.getElementById(sections[i])
            if (section && section.offsetTop <= scrollPosition) {
              setActiveSection(sections[i])
              break
            }
          }
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowRavelModal(false)
        setShowBeamVideo(false)
        setMobileNavOpen(false)
        setShowMusicianModal(false)
        setSelectedMusician(null)
      }
    }

    if (showRavelModal || showBeamVideo || mobileNavOpen || showMusicianModal) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }

    return () => {}
  }, [showRavelModal, showBeamVideo, mobileNavOpen, showMusicianModal])

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fixed Background Video */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onError={(e) => {
            console.error('Video failed to load:', e)
            // Fallback to gradient background if video fails
          }}
          onLoadStart={() => console.log('Video loading started')}
          onCanPlay={() => console.log('Video can play')}
        >
          <source src="https://link.storjshare.io/raw/ju2fwbvsloifiuwlrnp7jmwurlqa/orchestabeam/1011.mp4" type="video/mp4" />
        </video>
        
        {/* Fallback background if video fails */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-yellow-400 to-white" />
        
        {/* Dynamic Overlay - gets darker and blurrier on scroll */}
        <motion.div
          className="absolute inset-0 bg-black"
          style={{
            opacity: Math.min(scrollY / 1000, 0.7),
            backdropFilter: `blur(${Math.min(scrollY / 50, 10)}px)`,
          }}
        />
        
        {/* Static gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 via-slate-900/60 to-blue-900/60" />
      </div>

      {/* Hero Section - Portfolio Style */}
      <div className="relative z-10 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 items-center">
            {/* Left Content Area */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              {/* Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-white text-sm">Active Project</span>
              </div>

              {/* Title */}
              <div>
                <h2 className="text-yellow-400 text-lg font-semibold uppercase tracking-wider mb-2">
                  PROJECT DASHBOARD
                </h2>
                <h1 className="text-6xl md:text-8xl font-bold text-white leading-tight">
                  Black Diaspora<br />Symphony Orchestra
                </h1>
              </div>

              {/* Project Info */}
              <div className="space-y-4">
                <div className="flex items-center text-white">
                  <Calendar className="w-5 h-5 mr-3 text-purple-400" />
                  <span>2025 Annual Memorial Concert</span>
                </div>
                <div className="flex items-center text-white">
                  <Users className="w-5 h-5 mr-3 text-purple-400" />
                  <span>{totalConfirmed}/{totalNeeded} Musicians Confirmed ({overallPercentage}%)</span>
                </div>
                <div className="flex items-center text-white">
                  <Music className="w-5 h-5 mr-3 text-purple-400" />
                  <span>Margaret Bonds' Montgomery Variations</span>
                </div>
                <div className="flex items-center text-white">
                  <Location className="w-5 h-5 mr-3 text-purple-400" />
                  <span>Central United Methodist Church, Wisconsin</span>
                </div>
              </div>

              {/* Action Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => scrollToSection('roster')}
                className="bg-yellow-400 text-black font-semibold px-8 py-3 rounded-lg hover:bg-yellow-300 transition-colors"
              >
                View Project Details
              </motion.button>
            </motion.div>

          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-24">
        {/* Roster Visualization */}
        <motion.section
          id="roster"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative left-1/2 -ml-[50vw] w-screen px-4 sm:px-6 lg:px-12"
        >
          <div className="max-w-7xl mx-auto bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
              <Music className="w-8 h-8 mr-3 text-purple-400" />
              Orchestra Roster
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-8 lg:h-[75vh]">
              {/* Roster Table */}
              <div className="space-y-4 lg:space-y-6 lg:overflow-y-auto lg:pr-6 lg:snap-y lg:snap-mandatory lg:h-full lg:max-h-[75vh]">
                {rosterData.map((section, index) => (
                  <motion.div
                    key={section.instrument}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-white/5 rounded-lg p-4 border border-white/10 lg:snap-start"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white">{section.instrument}</h3>
                      <div className="text-sm text-gray-300">
                        {section.confirmed}/{section.needed} filled
                      </div>
                    </div>
                    
                    <div className="w-full bg-white/10 rounded-full h-3 mb-3">
                      <motion.div
                        className="h-full bg-gradient-to-r from-purple-400 to-blue-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${section.percentage}%` }}
                        transition={{ duration: 1, delay: 0.5 + index * 0.05 }}
                      />
                    </div>
                    
                    <div className="text-xs text-gray-400">
                      {section.remaining > 0 ? (
                        <span className="text-yellow-400">
                          {section.remaining} position{section.remaining > 1 ? 's' : ''} remaining
                        </span>
                      ) : (
                        <span className="text-green-400">Section complete!</span>
                      )}
                    </div>
                    
                    {section.musicianDetails.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {section.musicianDetails.map((musician, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleOpenMusicianProfile(section.instrument, musician)}
                            className="group w-full text-left bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white font-medium text-sm underline decoration-white/40 underline-offset-4 group-hover:decoration-white">
                                {musician.name}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                musician.status === 'Confirmed' 
                                  ? 'bg-green-500/20 text-green-300'
                                  : musician.status === 'Interested'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : musician.status === 'Pending'
                                  ? 'bg-yellow-500/20 text-yellow-300'
                                  : 'bg-gray-500/20 text-gray-300'
                              }`}>
                                {musician.status}
                              </span>
                            </div>
                            <div className="text-gray-400 text-xs">
                              <div className="flex items-center mb-1">
                                <span className="mr-2">📧</span>
                                <span className="relative inline-flex items-center">
                                  <span className="blur-sm sm:blur select-none pointer-events-none">{musician.email}</span>
                                  <span className="sr-only">Email hidden for privacy</span>
                                </span>
                              </div>
                              <div className="flex items-center mb-1">
                                <span className="mr-2">📅</span>
                                <span className="text-gray-400">
                                  {renderMusicianSource(musician.source)}
                                </span>
                              </div>
                              {musician.notes && (
                                <div className="text-gray-500 text-xs mt-1 italic">
                                  {musician.notes}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Audition Submission Panel */}
              <div className="space-y-6">
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                    <Upload className="w-6 h-6 mr-2 text-purple-400" />
                    Submit Your Audition
                  </h3>
                  
                  {!submittedAudition ? (
                    <div className="space-y-4">
                      <p className="text-gray-300 text-sm">
                        Upload your audition video or provide a link to showcase your musical abilities.
                      </p>
                      
                      <button
                        onClick={() => setShowAuditionForm(!showAuditionForm)}
                        className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
                      >
                        <Upload className="w-5 h-5 mr-2" />
                        {showAuditionForm ? 'Hide Form' : 'Submit Audition'}
                      </button>
                      
                      {showAuditionForm && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4"
                        >
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Full Name
                            </label>
                            <input
                              type="text"
                              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="Enter your full name"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Instrument
                            </label>
                            <select className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                              <option value="">Select your instrument</option>
                              {rosterData.map(section => (
                                <option key={section.instrument} value={section.instrument}>
                                  {section.instrument}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Email Address
                            </label>
                            <input
                              type="email"
                              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="your.email@example.com"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="(555) 123-4567"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Audition Video
                            </label>
                            <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-purple-400 transition-colors cursor-pointer">
                              <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                              <p className="text-gray-300 text-sm">Click to upload or drag and drop</p>
                              <p className="text-gray-500 text-xs mt-1">MP4, MOV, or provide YouTube/Vimeo link</p>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => setSubmittedAudition(true)}
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                          >
                            Submit Audition
                          </button>
                        </motion.div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Award className="w-8 h-8 text-green-400" />
                      </div>
                      <h4 className="text-lg font-semibold text-white mb-2">Audition Submitted!</h4>
                      <p className="text-gray-300 text-sm">
                        Thank you for your submission. We'll review your audition and contact you within 48 hours.
                      </p>
                    </div>
                  )}
                </div>

                {/* Required Excerpts */}
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Play className="w-5 h-5 mr-2 text-purple-400" />
                    Required Excerpts
                  </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                    <div>
                      <p className="text-white font-medium">Montgomery Variations</p>
                      <p className="text-gray-400 text-sm">Margaret Bonds - Movement I</p>
                    </div>
                    <div className="relative">
                      <motion.button 
                        type="button"
                        onMouseEnter={() => setHoveredExcerpt('montgomery')}
                        onMouseLeave={() => setHoveredExcerpt(null)}
                        onFocus={() => setHoveredExcerpt('montgomery')}
                        onBlur={() => setHoveredExcerpt(null)}
                        disabled={!hasMontgomeryDownloads}
                        className={`bg-purple-500 text-white px-4 py-2 rounded-lg text-sm transition-colors ${hasMontgomeryDownloads ? 'hover:bg-purple-600' : 'opacity-50 cursor-not-allowed'}`}
                        aria-disabled={!hasMontgomeryDownloads}
                      >
                        Download PDF
                      </motion.button>
                      <AnimatePresence>
                        {hoveredExcerpt === 'montgomery' && (
                          <motion.span
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap rounded-full bg-white/10 px-3 py-1 text-xs text-gray-200 border border-white/10 backdrop-blur-md"
                          >
                            {excerptStatusMessage('montgomery')}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                    <div>
                      <p className="text-white font-medium">Le Tombeau de Couperin</p>
                      <p className="text-gray-400 text-sm">Maurice Ravel - Parts</p>
                    </div>
                    <div className="relative">
                      <motion.button 
                        type="button"
                        onMouseEnter={() => setHoveredExcerpt('ravel')}
                        onMouseLeave={() => setHoveredExcerpt(null)}
                        onFocus={() => setHoveredExcerpt('ravel')}
                        onBlur={() => setHoveredExcerpt(null)}
                        onClick={() => hasRavelDownloads && setShowRavelModal(true)}
                        disabled={!hasRavelDownloads}
                        className={`bg-purple-500 text-white px-4 py-2 rounded-lg text-sm transition-colors ${hasRavelDownloads ? 'hover:bg-purple-600' : 'opacity-50 cursor-not-allowed'}`}
                        aria-disabled={!hasRavelDownloads}
                      >
                        Download PDF
                      </motion.button>
                      <AnimatePresence>
                        {hoveredExcerpt === 'ravel' && (
                          <motion.span
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap rounded-full bg-white/10 px-3 py-1 text-xs text-gray-200 border border-white/10 backdrop-blur-md"
                          >
                            {excerptStatusMessage('ravel')}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </motion.section>

        {/* Pay & Participation Visualization */}
        <motion.section
          id="compensation"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
              <DollarSign className="w-8 h-8 mr-3 text-green-400" />
              Compensation & Rewards
            </h2>
            
            <div className="flex flex-col gap-6">
              {/* USD Payments */}
              <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <DollarSign className="w-6 h-6 mr-2 text-green-400" />
                  USD Contract Pay (via BDO)
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Sectional Rehearsal (3 hrs)</span>
                    <span className="text-white font-semibold">$50</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Full Orchestra (4 hrs)</span>
                    <span className="text-white font-semibold">$50</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Dress Rehearsal (4 hrs)</span>
                    <span className="text-white font-semibold">$50</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/10 pt-4">
                    <span className="text-white font-semibold">Concert Performance (2 hrs)</span>
                    <span className="text-white font-bold text-lg">100</span>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <p className="text-green-200 text-sm">
                    <strong>Total Project Earnings:</strong> Up to $250 aprroximately per musician
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowBeamCompensation(prev => !prev)}
                className="inline-flex items-center self-start bg-yellow-500/10 border border-yellow-500/30 px-4 py-2 rounded-lg text-sm font-medium text-yellow-200 hover:bg-yellow-500/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                <span className="mr-2">
                  {showBeamCompensation ? 'Hide BEAM Coin payment option' : 'Interested in BEAM Coin payouts?'}
                </span>
                {showBeamCompensation ? (
                  <ChevronUp className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {showBeamCompensation && (
                  <motion.div
                    key="beam-compensation-card"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white/5 rounded-lg p-6 border border-white/10"
                  >
                    {/* BEAM Coin Compensation */}
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                      <Coins className="w-6 h-6 mr-2 text-yellow-400" />
                      BEAM Coin Payment Option
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Sectional Rehearsal</span>
                        <span className="text-yellow-400 font-semibold">5 BEAM</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Full Orchestra Rehearsal</span>
                        <span className="text-yellow-400 font-semibold">5 BEAM</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Dress Rehearsal</span>
                        <span className="text-yellow-400 font-semibold">5 BEAM</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-white/10 pt-4">
                        <span className="text-white font-semibold">Concert Performance</span>
                        <span className="text-yellow-400 font-bold text-lg">10 BEAM</span>
                      </div>
                    </div>
                    <div className="mt-6 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20 space-y-2">
                      <p className="text-yellow-200 text-sm">
                        <strong>Total BEAM Compensation:</strong> 25 BEAM Coins per musician
                      </p>
                      <p className="text-yellow-200 text-xs">
                        1 BEAM ≈ $1 (internal stable value); redeemable for cash, lessons, housing, or future BEAM FCU project staking.
                      </p>
                      <p
                        className="text-sm text-orchestra-gold/80 cursor-pointer hover:text-orchestra-gold transition-colors"
                        onClick={() => setShowBeamVideo(true)}
                      >
                        🎥 What is BEAM Coin? Watch a 1-minute explainer →
                      </p>
                      <p className="text-yellow-200 text-xs">
                        Musicians may opt for partial or full BEAM payouts. Verified attendance required before release.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.section>

        {/* Rehearsal Calendar */}
        <motion.section
          id="schedule"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
              <Calendar className="w-8 h-8 mr-3 text-blue-400" />
              Rehearsal Schedule
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rehearsalSchedule.map((rehearsal, index) => (
                <motion.div
                  key={rehearsal.date}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                  className="bg-white/5 rounded-lg p-6 border border-white/10 hover:border-blue-400/50 transition-colors"
                >
                  <div className="flex items-center mb-3">
                    <Calendar className="w-5 h-5 text-blue-400 mr-2" />
                    <span className="text-white font-semibold">
                      {new Date(rehearsal.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-300">
                      <Clock className="w-4 h-4 mr-2" />
                      <span className="text-sm">{rehearsal.time}</span>
                      <span className="text-xs ml-2">({rehearsal.duration}h)</span>
                    </div>
                    
                    <div className="flex items-center text-gray-300">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span className="text-sm">{rehearsal.location}</span>
                    </div>
                    
                    <div className="mt-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        rehearsal.type.includes('Sectional') 
                          ? 'bg-purple-500/20 text-purple-300' 
                          : rehearsal.type.includes('Concert')
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {rehearsal.type}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* FAQ Section */}
        <motion.section
          id="faq"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
              <Info className="w-8 h-8 mr-3 text-purple-400" />
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-4">
              {faqData.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.9 + index * 0.1 }}
                  className="bg-white/5 rounded-lg border border-white/10 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <span className="text-white font-medium">{faq.question}</span>
                    {expandedFaq === index ? (
                      <ChevronUp className="w-5 h-5 text-purple-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  
                  {expandedFaq === index && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-6 pb-4"
                    >
                      <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Media Gallery */}
        <motion.section
          id="media"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
        >
          <ProjectMediaGallery />
        </motion.section>
      </div>

      {showMusicianModal && selectedMusician && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={handleCloseMusicianProfile}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-white/10 p-6 sm:p-8 space-y-6 overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={handleCloseMusicianProfile}
              className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
              aria-label="Close musician profile"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col gap-6 md:flex-row">
              <div className="flex flex-col items-center md:w-56">
                {selectedMusician.headshotUrl ? (
                  <img
                    src={selectedMusician.headshotUrl}
                    alt={`${selectedMusician.name} headshot`}
                    className="h-56 w-56 rounded-2xl object-cover border border-white/10"
                  />
                ) : (
                  <div className="flex h-56 w-56 items-center justify-center rounded-2xl bg-white/10 border border-white/10 text-4xl font-semibold text-white">
                    {getMusicianInitials(selectedMusician.name)}
                  </div>
                )}
                <div className="mt-4 text-center">
                  <p className="text-base font-semibold text-white">{selectedMusician.name}</p>
                  <p className="text-sm text-purple-200">{selectedMusician.instrument}</p>
                </div>
                <span
                  className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-medium ${
                    selectedMusician.status === 'Confirmed'
                      ? 'bg-green-500/20 text-green-300'
                      : selectedMusician.status === 'Interested'
                      ? 'bg-blue-500/20 text-blue-300'
                      : selectedMusician.status === 'Pending'
                      ? 'bg-yellow-500/20 text-yellow-300'
                      : 'bg-gray-500/20 text-gray-300'
                  }`}
                >
                  {selectedMusician.status}
                </span>
              </div>
              <div className="flex-1 space-y-5">
                <div className="space-y-3">
                  <h4 className="text-lg font-semibold text-white">About</h4>
                  <p className="text-sm leading-relaxed text-gray-300">
                    {selectedMusician.bio?.trim()
                      ? selectedMusician.bio
                      : 'Artist biography coming soon.'}
                  </p>
                </div>
                <div className="space-y-2 text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="text-white/70">Email:</span>
                    <span className="relative inline-flex items-center">
                      <span className="blur-sm sm:blur select-none pointer-events-none">
                        {selectedMusician.email || 'Not provided'}
                      </span>
                      <span className="sr-only">Email hidden for privacy</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/70">Source:</span>
                    <span>{selectedMusician.source || 'Not provided'}</span>
                  </div>
                  {selectedMusician.notes && (
                    <div>
                      <span className="text-white/70">Notes:</span>
                      <p className="mt-1 text-gray-400">{selectedMusician.notes}</p>
                    </div>
                  )}
                </div>
                <div>
                  <h5 className="text-sm font-semibold text-white">Featured Media</h5>
                  {selectedMusician.mediaEmbedUrl ? (
                    <div className="mt-3 aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                      <iframe
                        src={selectedMusician.mediaEmbedUrl}
                        title={`${selectedMusician.name} media`}
                        className="h-full w-full"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="mt-3 flex h-32 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-sm text-gray-400">
                      Media uploads coming soon.
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-gray-400">
                Community members can show appreciation directly through the support link below.
              </div>
              {selectedMusician.supportLink ? (
                <a
                  href={selectedMusician.supportLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-600"
                >
                  Support {getSupportLabel(selectedMusician.name)}
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-gray-400 cursor-not-allowed"
                >
                  Support link coming soon
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {showRavelModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setShowRavelModal(false)}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg h-[45vh] max-h-[45vh] p-6 flex flex-col space-y-4 overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-4 shrink-0">
              <div>
                <h4 className="text-xl font-semibold text-white">Select Your Part</h4>
                <p className="text-sm text-gray-300 mt-1">
                  Choose the instrument-specific download link for Ravel&apos;s <em>Le Tombeau de Couperin</em>.
                </p>
              </div>
              <button
                onClick={() => setShowRavelModal(false)}
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>

            <div className="shrink-0">
              <label htmlFor="ravel-search" className="text-xs uppercase tracking-wide text-gray-400">
                Search instruments
              </label>
              <input
                id="ravel-search"
                type="text"
                placeholder="Start typing, e.g. flute"
                value={ravelSearch}
                onChange={(event) => setRavelSearch(event.target.value)}
                className="mt-2 w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredRavelDownloads.length > 0 ? (
                filteredRavelDownloads.map((part) => (
                  <div
                    key={part.instrument}
                    className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-4 py-3"
                  >
                    <div>
                      <p className="text-white font-medium">{part.instrument}</p>
                      {!part.available && (
                        <p className="text-xs text-gray-400 mt-1">
                          Download link coming soon
                        </p>
                      )}
                    </div>
                    {part.available ? (
                      <a
                        href={part.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Pending</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/5 px-4 text-xs text-gray-400">
                  No matching instruments yet.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {showBeamVideo && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setShowBeamVideo(false)}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-white/10 p-4 sm:p-6 space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="relative w-full overflow-hidden rounded-xl bg-black aspect-video">
              <iframe
                className="absolute inset-0 h-full w-full"
                src="https://www.youtube.com/embed/yourBeamVideoID"
                title="What is BEAM Coin?"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <button
              onClick={() => setShowBeamVideo(false)}
              className="w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white hover:from-purple-600 hover:to-blue-600 transition-colors"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}

      {/* Bottom Navigation - Portfolio Style */}
      <div className="fixed bottom-6 inset-x-0 z-40 px-4 sm:px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="hidden md:flex mx-auto max-w-4xl items-center justify-center bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20"
        >
          {navigationSections.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`mx-2 flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                activeSection === section.id
                  ? 'bg-white text-black'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <section.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{section.label}</span>
            </button>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="md:hidden mx-auto max-w-sm"
        >
          <button
            onClick={() => setMobileNavOpen((prev) => !prev)}
            className="w-full inline-flex items-center justify-center space-x-3 bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/20 text-white"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav-menu"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            <span className="text-sm font-semibold">
              {mobileNavOpen ? 'Close Menu' : 'Open Menu'}
            </span>
          </button>

          <AnimatePresence>
            {mobileNavOpen && (
              <motion.div
                id="mobile-nav-menu"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="mt-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 divide-y divide-white/10 overflow-hidden"
              >
                {navigationSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                      activeSection === section.id
                        ? 'bg-white/20 text-white'
                        : 'text-gray-200 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center space-x-3">
                      <section.icon className="w-4 h-4" />
                      <span className="font-medium">{section.label}</span>
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
