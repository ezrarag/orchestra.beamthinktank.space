'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import Footer from '@/components/Footer'
import AuthButtons from '@/components/AuthButtons'
import { Play, ArrowRight, ExternalLink, Calendar, Lock, User, LogOut } from 'lucide-react'
import Link from 'next/link'

/**
 * To add more rehearsal videos:
 * - Open Firebase Console → Firestore → projectRehearsalMedia
 * - Create a new document with fields:
 *   projectId: "black-diaspora-symphony" or "uwm-afro-caribbean-jazz"
 *   title: "Bonds – 5:08pm excerpt – 11/10/25"
 *   date: Timestamp
 *   instrumentGroup: "Strings" | "Full Orchestra" | "Choir" | "Rhythm Section" | "Other" (optional)
 *   url: "<Firebase Storage download URL>"
 *   thumbnailUrl: "<optional thumbnail URL>"
 *   private: false (for now; set true for future subscription content)
 *   createdAt: Timestamp
 *   updatedAt: Timestamp
 */

type InstrumentGroup =
  | 'Strings'
  | 'Winds'
  | 'Brass'
  | 'Percussion'
  | 'Full Orchestra'
  | 'Choir'
  | 'Rhythm Section'
  | 'Other'

interface RehearsalMedia {
  id: string
  projectId: string
  title: string
  description?: string
  date?: Date
  instrumentGroup?: InstrumentGroup
  url: string
  thumbnailUrl?: string
  private: boolean
}

const DEFAULT_PROJECT_FILTER = 'all'
const DEFAULT_GROUP_FILTER = 'all'

const PROJECT_OPTIONS = [
  { value: 'all', label: 'All projects' },
  { value: 'black-diaspora-symphony', label: 'Black Diaspora Symphony Orchestra' },
  { value: 'uwm-afro-caribbean-jazz', label: 'UWM Afro-Caribbean Jazz Orchestra' },
]

const GROUP_OPTIONS = [
  { value: 'all', label: 'All groups' },
  { value: 'Strings', label: 'Strings' },
  { value: 'Winds', label: 'Winds' },
  { value: 'Brass', label: 'Brass' },
  { value: 'Percussion', label: 'Percussion' },
  { value: 'Full Orchestra', label: 'Full Orchestra' },
  { value: 'Choir', label: 'Choir' },
  { value: 'Rhythm Section', label: 'Rhythm Section' },
  { value: 'Other', label: 'Other' },
]

// Helper function to format project ID to display name
const getProjectDisplayName = (projectId: string): string => {
  const project = PROJECT_OPTIONS.find(p => p.value === projectId)
  return project?.label || projectId
}

// Helper function to format date
const formatDate = (date?: Date): string => {
  if (!date) return 'Date TBD'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

// Allowed phone numbers for testing (hardcoded for now)
// Format: E.164 format (+1XXXXXXXXXX) or just digits
const ALLOWED_PHONE_NUMBERS = [
  '+14049739860', // 404-973-9860
  '+12624964230', // 262-496-4230
  '14049739860',  // Alternative format
  '12624964230',  // Alternative format
]

// Allowed email addresses for testing (hardcoded for now)
// Add your Google sign-in email addresses here for testing
// These emails will have access even if they're not marked as subscribers in Firestore
// TODO: Remove this hardcoded list once proper subscription system is in place
const ALLOWED_EMAILS = [
  // Add your email addresses here, e.g.:
  // 'your-email@gmail.com',
  // 'dayvin@example.com',
]

// Helper function to normalize phone number for comparison
// Returns digits only (no formatting) for consistent comparison
const normalizePhoneNumber = (phone: string | null | undefined): string | null => {
  if (!phone) return null
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  // If 10 digits, assume US number and add country code
  if (digits.length === 10) {
    return `1${digits}`
  }
  // If 11 digits and starts with 1, return as is
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits
  }
  // If already has country code, return digits only
  return digits
}

// Helper function to check if user has access to rehearsal archives
// This function checks multiple conditions:
// 1. Admin roles
// 2. Subscriber role from useUserRole hook
// 3. Custom claims (beam_subscriber or subscriber)
// 4. Hardcoded phone numbers (for SMS sign-in testing)
// 5. Hardcoded email addresses (for Google/Email sign-in testing)
// 6. Firestore user document subscriber field (for actual subscribers)
const hasRehearsalAccess = async (user: any, role: string | null, db: any): Promise<boolean> => {
  if (!user) return false
  
  // Admins always have access
  if (role === 'beam_admin' || role === 'partner_admin' || role === 'board') return true
  
  // Subscribers have access (from useUserRole hook)
  if (role === 'subscriber') return true
  
  // Check custom claims for subscriber status
  try {
    const tokenResult = await user.getIdTokenResult()
    const claims = tokenResult.claims
    if (claims.beam_subscriber === true || claims.subscriber === true) {
      return true
    }
  } catch (error) {
    console.error('Error checking custom claims:', error)
  }
  
  // Check if email matches allowed list (for Google/Email sign-in testing)
  if (user.email && ALLOWED_EMAILS.length > 0) {
    const normalizedEmail = user.email.toLowerCase().trim()
    if (ALLOWED_EMAILS.some(email => email.toLowerCase().trim() === normalizedEmail)) {
      return true
    }
  }
  
  // Check if phone number matches allowed list (for SMS sign-in testing)
  const userPhone = normalizePhoneNumber(user.phoneNumber)
  if (userPhone) {
    const normalizedAllowed = ALLOWED_PHONE_NUMBERS.map(normalizePhoneNumber).filter(Boolean) as string[]
    if (normalizedAllowed.includes(userPhone)) {
      return true
    }
  }
  
  // Check Firestore user document for subscriber status
  // This handles cases where user signed in but useUserRole hasn't updated yet
  if (db && user.uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        // Check if user is marked as subscriber in Firestore
        if (userData.subscriber === true) {
          return true
        }
      }
    } catch (error) {
      console.error('Error checking user subscriber status:', error)
    }
  }
  
  return false
}

const featuredProjects = [
  {
    id: 'black-diaspora-symphony',
    title: 'Black Diaspora Symphony Orchestra',
    description: 'Annual memorial concert featuring Margaret Bonds\' Montgomery Variations, Maurice Ravel\'s Le Tombeau de Couperin, and works by Edvard Grieg. Rehearsals in Milwaukee leading up to the December 14th performance.',
    tag: 'Memorial Concert 2025',
    projectRoute: '/training/contract-projects/black-diaspora-symphony'
  },
  {
    id: 'afro-caribbean-jazz',
    title: 'UWM Afro-Caribbean Jazz Orchestra',
    description: 'Celebrating Afro-Caribbean musical traditions through jazz orchestration and contemporary arrangements.',
    tag: 'Jazz Series',
    projectRoute: '/training'
  }
]

export default function StudioPage() {
  const { user, role, loading: authLoading } = useUserRole()
  const [media, setMedia] = useState<RehearsalMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [projectFilter, setProjectFilter] = useState<string>(DEFAULT_PROJECT_FILTER)
  const [groupFilter, setGroupFilter] = useState<string>(DEFAULT_GROUP_FILTER)
  const [videoError, setVideoError] = useState<Record<string, boolean>>({})
  const [scrollY, setScrollY] = useState(0)
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Check if user has access to rehearsal archives
  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading) {
        setCheckingAccess(true)
        return
      }

      if (!user) {
        setHasAccess(false)
        setCheckingAccess(false)
        return
      }

      try {
        const access = await hasRehearsalAccess(user, role, db)
        setHasAccess(access)
      } catch (error) {
        console.error('Error checking access:', error)
        setHasAccess(false)
      } finally {
        setCheckingAccess(false)
      }
    }

    checkAccess()
  }, [user, role, authLoading])

  // Load media from Firestore only if user has access
  useEffect(() => {
    if (!hasAccess || !db) {
      setLoading(false)
      return
    }

    // Load ALL non-private media and filter in memory
    const q = query(
      collection(db, 'projectRehearsalMedia'),
      where('private', '==', false),
      orderBy('date', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const items: RehearsalMedia[] = snapshot.docs.map(doc => {
          const data = doc.data() as any
          return {
            id: doc.id,
            projectId: data.projectId || 'unknown',
            title: data.title || 'Untitled rehearsal',
            description: data.description,
            date: data.date?.toDate?.() ?? undefined,
            instrumentGroup: data.instrumentGroup,
            url: data.url,
            thumbnailUrl: data.thumbnailUrl,
            private: data.private === true,
          }
        })

        setMedia(items)
        setLoading(false)

        if (process.env.NODE_ENV === 'development') {
          console.log('🎥 Loaded rehearsal media:', {
            total: items.length,
            byProject: items.reduce((acc, item) => {
              acc[item.projectId] = (acc[item.projectId] || 0) + 1
              return acc
            }, {} as Record<string, number>),
          })
        }
      },
      error => {
        console.error('Error loading rehearsal media:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [hasAccess])

  // Filter media based on selected filters
  const filteredMedia = useMemo(() => {
    return media.filter(item => {
      if (projectFilter !== 'all' && item.projectId !== projectFilter) return false
      if (groupFilter !== 'all' && item.instrumentGroup !== groupFilter) return false
      return true
    })
  }, [media, projectFilter, groupFilter])

  const handleVideoError = (videoId: string) => {
    console.error('Video failed to load', videoId)
    setVideoError(prev => ({ ...prev, [videoId]: true }))
  }

  // Track scroll position for floating avatar
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.user-menu-container')) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Watch & Explore
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-6">
              Rehearsals, interviews, and project archives from BEAM Orchestra and partner ensembles.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="px-4 py-2 bg-[#D4AF37]/20 text-[#D4AF37] text-sm font-medium rounded-full border border-[#D4AF37]/30">
                Black Diaspora Symphony Orchestra
              </span>
              <span className="px-4 py-2 bg-white/10 text-white/70 text-sm font-medium rounded-full border border-white/20">
                UWM Afro-Caribbean Jazz Orchestra
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Project Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">Featured Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {featuredProjects.map((project) => (
              <div
                key={project.id}
                className="bg-white/5 border border-white/10 rounded-xl p-8 hover:border-[#D4AF37]/50 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-2xl font-bold text-white">{project.title}</h3>
                  <span className="px-3 py-1 bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-medium rounded-full">
                    {project.tag}
                  </span>
                </div>
                <p className="text-white/70 mb-6 leading-relaxed">
                  {project.description}
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a
                    href="#rehearsal-gallery"
                    className="inline-flex items-center justify-center px-6 py-3 bg-[#D4AF37] hover:bg-[#B8941F] text-black font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-[#D4AF37]/50"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    View Rehearsals
                  </a>
                  <Link
                    href={project.projectRoute}
                    className="inline-flex items-center justify-center px-6 py-3 bg-transparent border-2 border-[#D4AF37] hover:bg-[#D4AF37]/10 text-[#D4AF37] font-bold rounded-lg transition-all duration-300"
                  >
                    Project Details
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rehearsal Video Gallery - Only visible to authenticated subscribers or allowed phone numbers */}
      {hasAccess ? (
        <section id="rehearsal-gallery" className="px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">Rehearsal Archives</h2>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="flex-1">
                <label htmlFor="project-filter" className="block text-sm font-medium text-white/70 mb-2">
                  Filter by Project
                </label>
                <select
                  id="project-filter"
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50"
                >
                  {PROJECT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-black">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label htmlFor="group-filter" className="block text-sm font-medium text-white/70 mb-2">
                  Filter by Instrument Group
                </label>
                <select
                  id="group-filter"
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50"
                >
                  {GROUP_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-black">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37] mb-4"></div>
                <p className="text-white/60 text-lg">Loading rehearsal footage...</p>
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm text-zinc-400">
                  No rehearsal footage is available yet for this selection. Check back soon or adjust your filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {filteredMedia.map((video) => (
                  <div
                    key={video.id}
                    className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#D4AF37]/50 transition-all duration-300"
                  >
                    <div className="mb-4">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-[#D4AF37] text-xs font-medium uppercase tracking-wide">
                          {getProjectDisplayName(video.projectId)}
                        </p>
                        {video.instrumentGroup && (
                          <span className="px-2 py-1 bg-white/10 text-white/70 text-xs font-medium rounded-full border border-white/20">
                            {video.instrumentGroup}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{video.title}</h3>
                      {video.description && (
                        <p className="text-sm text-white/60 mb-2">{video.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(video.date)}</span>
                      </div>
                    </div>
                    {videoError[video.id] ? (
                      <div className="w-full aspect-video bg-black/50 rounded-lg border border-white/10 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-white/60 mb-2">Video failed to load</p>
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#D4AF37] hover:text-[#B8941F] text-sm inline-flex items-center gap-2"
                          >
                            Open video link
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <video
                        src={video.url}
                        controls
                        poster={video.thumbnailUrl}
                        className="w-full rounded-lg border border-white/10 bg-black max-h-[480px]"
                        onError={() => handleVideoError(video.id)}
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : (
        <section id="rehearsal-gallery" className="px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
              <Lock className="h-16 w-16 text-[#D4AF37] mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Rehearsal Archives</h2>
              <p className="text-lg text-white/80 mb-8 leading-relaxed">
                This content is available exclusively to subscribers. Sign in or subscribe to access rehearsal footage, interviews, and behind-the-scenes materials.
              </p>
              {authLoading || checkingAccess ? (
                <div className="flex justify-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
                </div>
              ) : (
                <div className="max-w-md mx-auto">
                  <AuthButtons
                    onSignInSuccess={() => {
                      // Page will automatically update when auth state changes
                      window.location.reload()
                    }}
                    mobileFriendly={true}
                  />
                  {user && !hasAccess && (
                    <p className="text-sm text-white/60 mt-4 text-center">
                      Your account doesn't have access yet. If you're a subscriber, please contact support.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Support & Subscribe Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Support & Subscribe</h2>
          <p className="text-lg text-white/80 mb-8 leading-relaxed">
            Subscribers get full access to rehearsal archives, interviews, and behind-the-scenes materials across the BEAM network. Your subscription will connect through the BEAM Neighbor portal.
          </p>
          {/* TODO: Replace this with real subscription flow (Stripe + Neighbor SSO) */}
          {/* TODO: After subscription, redirect user to neighbor.beamthinktank.space with SSO token */}
          <Link
            href="/subscriber"
            className="inline-flex items-center justify-center px-8 py-4 bg-[#D4AF37] hover:bg-[#B8941F] text-black font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-[#D4AF37]/50"
          >
            Sign In / Subscribe
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      <Footer />

      {/* Floating Avatar Button (Bottom Right) - Appears when signed in and scrolled */}
      <AnimatePresence>
        {user && scrollY > 200 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, x: 50, y: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, x: 50, y: 50 }}
            transition={{ 
              type: 'spring', 
              damping: 25, 
              stiffness: 300,
              mass: 0.8
            }}
            className="fixed bottom-6 right-6 z-50 user-menu-container"
          >
            <motion.button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center justify-center w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full transition-colors border border-white/20 backdrop-blur-md shadow-lg"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title={user.displayName || user.email?.split('@')[0] || 'User'}
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-yellow-400/30 flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
              )}
            </motion.button>

            {/* Dropdown Menu - Opens upward from bottom */}
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="absolute bottom-full right-0 mb-2 w-56 bg-white/95 backdrop-blur-lg rounded-xl shadow-2xl border-2 border-[#D4AF37]/30 overflow-hidden"
                >
                  <div className="py-2">
                    <div className="px-4 py-3 border-b border-[#D4AF37]/20">
                      <p className="text-black font-medium truncate">
                        {user.displayName || 'User'}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {user.email}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        if (auth) {
                          try {
                            await signOut(auth)
                            setShowUserMenu(false)
                          } catch (error) {
                            console.error('Error signing out:', error)
                          }
                        }
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-500/20 transition-colors text-left"
                    >
                      <LogOut className="h-5 w-5 text-red-500" />
                      <span className="text-black font-medium">Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

