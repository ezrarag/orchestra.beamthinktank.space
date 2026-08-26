'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import Footer from '@/components/Footer'
import AuthButtons from '@/components/AuthButtons'
import { Play, ArrowRight, ExternalLink, Calendar, Lock, User, LogOut, Music, Users } from 'lucide-react'
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
const ALLOWED_EMAILS: string[] = [
  'cordieruckus@gmail.com',
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
  if (!user) {
    console.log('🔐 Access check: No user')
    return false
  }
  
  console.log('🔐 Access check starting:', {
    email: user.email,
    role: role,
    uid: user.uid
  })
  
  // Admins always have access
  if (role === 'beam_admin' || role === 'partner_admin' || role === 'board') {
    console.log('✅ Access granted: Admin role')
    return true
  }
  
  // Subscribers have access (from useUserRole hook)
  if (role === 'subscriber') {
    console.log('✅ Access granted: Subscriber role')
    return true
  }
  
  // Check custom claims for subscriber status
  try {
    const tokenResult = await user.getIdTokenResult(true) // Force refresh
    const claims = tokenResult.claims
    console.log('🔐 Custom claims:', claims)
    if (claims.beam_subscriber === true || claims.subscriber === true) {
      console.log('✅ Access granted: Custom claim (beam_subscriber or subscriber)')
      return true
    }
  } catch (error) {
    console.error('❌ Error checking custom claims:', error)
  }
  
  // Check if email matches allowed list (for Google/Email sign-in testing)
  if (user.email && ALLOWED_EMAILS.length > 0) {
    const normalizedEmail = user.email.toLowerCase().trim()
    if (ALLOWED_EMAILS.some(email => email.toLowerCase().trim() === normalizedEmail)) {
      console.log('✅ Access granted: Email in allowed list')
      return true
    }
  }
  
  // Check if phone number matches allowed list (for SMS sign-in testing)
  const userPhone = normalizePhoneNumber(user.phoneNumber)
  if (userPhone) {
    const normalizedAllowed = ALLOWED_PHONE_NUMBERS.map(normalizePhoneNumber).filter(Boolean) as string[]
    if (normalizedAllowed.includes(userPhone)) {
      console.log('✅ Access granted: Phone in allowed list')
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
        console.log('🔐 Firestore user data:', { subscriber: userData.subscriber, role: userData.role })
        // Check if user is marked as subscriber in Firestore
        if (userData.subscriber === true) {
          console.log('✅ Access granted: Firestore subscriber field')
          return true
        }
      } else {
        console.log('⚠️ No Firestore user document found')
      }
    } catch (error) {
      console.error('❌ Error checking user subscriber status:', error)
    }
  }
  
  console.log('❌ Access denied: No matching conditions')
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

  const handleGoogleSignIn = async () => {
    if (!auth) return
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } catch (err) {
      console.error('Studio Google Sign-In Error:', err)
    }
  }

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
        console.log('🔐 Checking access for user:', {
          email: user.email,
          phone: user.phoneNumber,
          role: role,
          uid: user.uid
        })
        const access = await hasRehearsalAccess(user, role, db)
        console.log('🔐 Access result:', access)
        setHasAccess(access)
      } catch (error) {
        console.error('❌ Error checking access:', error)
        setHasAccess(false)
      } finally {
        setCheckingAccess(false)
      }
    }

    checkAccess()
  }, [user, role, authLoading])

  // Load media from Firestore only if user has access
  useEffect(() => {
    console.log('🔐 Access check:', { hasAccess, dbExists: !!db, user: user?.email, role })
    
    if (!hasAccess) {
      console.log('❌ No access - user must be subscriber/admin or have allowed phone/email')
      setLoading(false)
      return
    }
    
    if (!db) {
      console.log('❌ Firebase not initialized')
      setLoading(false)
      return
    }

    console.log('🔍 Loading rehearsal media from Firestore...')

    // Try the query with orderBy first (requires index)
    // If it fails, fall back to a simpler query
    const q = query(
      collection(db, 'projectRehearsalMedia'),
      where('private', '==', false),
      orderBy('date', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        console.log(`📊 Snapshot received: ${snapshot.docs.length} documents`)
        
        const items: RehearsalMedia[] = snapshot.docs.map(doc => {
          const data = doc.data() as any
          console.log('📄 Document:', doc.id, {
            title: data.title,
            private: data.private,
            projectId: data.projectId,
            hasDate: !!data.date,
            hasUrl: !!data.url,
          })
          
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

        // Filter out items that don't have required fields
        const validItems = items.filter(item => {
          const isValid = item.url && !item.private
          if (!isValid) {
            console.log(`⚠️ Filtered out item: ${item.title}`, {
              hasUrl: !!item.url,
              isPrivate: item.private
            })
          }
          return isValid
        })
        console.log(`✅ Valid items: ${validItems.length} out of ${items.length}`)
        
        if (validItems.length === 0 && items.length > 0) {
          console.warn('⚠️ All items were filtered out! Check URL and private fields.')
        }

        setMedia(validItems)
        setLoading(false)

        if (process.env.NODE_ENV === 'development') {
          console.log('🎥 Loaded rehearsal media:', {
            total: validItems.length,
            byProject: validItems.reduce((acc, item) => {
              acc[item.projectId] = (acc[item.projectId] || 0) + 1
              return acc
            }, {} as Record<string, number>),
          })
        }
      },
      error => {
        console.error('❌ Error loading rehearsal media:', error)
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        
        // If index error, try simpler query without orderBy
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
          console.log('⚠️ Index not ready, trying simpler query...')
          const simpleQ = query(
            collection(db, 'projectRehearsalMedia'),
            where('private', '==', false)
          )
          
          const simpleUnsubscribe = onSnapshot(
            simpleQ,
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
              
              // Sort client-side
              items.sort((a, b) => {
                if (!a.date || !b.date) return 0
                return b.date.getTime() - a.date.getTime()
              })
              
              const validItems = items.filter(item => item.url && !item.private)
              setMedia(validItems)
              setLoading(false)
              console.log(`✅ Loaded ${validItems.length} items with fallback query`)
            },
            fallbackError => {
              console.error('❌ Fallback query also failed:', fallbackError)
              setLoading(false)
            }
          )
          
          return () => simpleUnsubscribe()
        }
        
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
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-white/10 relative overflow-hidden bg-gradient-to-b from-[#0F1015] to-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <span className="px-3.5 py-1.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-mono font-bold tracking-wider uppercase border border-[#D4AF37]/40 inline-block mb-4">
              BEAM Media Outlet & Studio Vault
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Watch & Explore
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-6">
              Rehearsals, Steinway recording sessions, interviews, and project archives from BEAM Orchestra.
            </p>

            {/* Profile & Google Auth Prompt Banner */}
            <div className="max-w-xl mx-auto mt-8 mb-6">
              {user ? (
                <div className="bg-white/5 border border-[#D4AF37]/40 rounded-2xl p-5 backdrop-blur-md text-left flex items-center justify-between gap-4 shadow-xl">
                  <div className="flex items-center space-x-4">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || 'User'} className="w-12 h-12 rounded-full border border-[#D4AF37]" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] font-bold">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-white font-bold text-base">{user.displayName || 'Media Viewer'}</p>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/40">Verified Access</span>
                      </div>
                      <p className="text-xs text-white/70 font-mono">{user.email}</p>
                    </div>
                  </div>
                  <Link
                    href="/studio/vault"
                    className="px-4 py-2.5 rounded-xl bg-[#D4AF37] text-black font-bold text-xs hover:bg-[#B8941F] transition shrink-0 shadow-lg"
                  >
                    View Vault Profile →
                  </Link>
                </div>
              ) : (
                <div className="bg-gradient-to-b from-[#161822] to-black border border-[#D4AF37]/30 rounded-2xl p-6 shadow-2xl text-center space-y-4">
                  <p className="text-sm text-white/80">
                    Sign in with your Google account (<span className="text-[#D4AF37] font-mono">cordieruckus@gmail.com</span>) to view your personalized profile & media vault.
                  </p>
                  <button
                    onClick={handleGoogleSignIn}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-amber-100 transition shadow-xl inline-flex items-center justify-center space-x-3"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign In with Google</span>
                  </button>
                </div>
              )}
            </div>

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

      {/* Content Categories */}
      <section className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">Explore Content</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link
              href="#rehearsal-gallery"
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#D4AF37]/50 transition-all group"
            >
              <Play className="h-12 w-12 text-[#D4AF37] mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-white mb-2">Rehearsals</h3>
              <p className="text-white/60 text-sm">Full orchestra and sectional rehearsal footage</p>
            </Link>
            <Link
              href="/studio/chamber"
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#D4AF37]/50 transition-all group"
            >
              <Music className="h-12 w-12 text-[#D4AF37] mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-white mb-2">Chamber Projects</h3>
              <p className="text-white/60 text-sm">Intimate chamber music performances and projects</p>
            </Link>
            <Link
              href="/studio/interviews"
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#D4AF37]/50 transition-all group"
            >
              <Users className="h-12 w-12 text-[#D4AF37] mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-white mb-2">Interviews</h3>
              <p className="text-white/60 text-sm">Conversations with musicians and artists</p>
            </Link>
            <Link
              href="/watch/partners/dayvin-hallmon-interview"
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#D4AF37]/50 transition-all group"
            >
              <Play className="h-12 w-12 text-[#D4AF37] mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-white mb-2">Dayvin Hallmon Interview</h3>
              <p className="text-white/60 text-sm">Interactive video with chapter navigation</p>
            </Link>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 opacity-50">
              <Play className="h-12 w-12 text-white/30 mb-4" />
              <h3 className="text-xl font-bold text-white/50 mb-2">Behind the Scenes</h3>
              <p className="text-white/40 text-sm">Coming soon</p>
            </div>
          </div>
          
          {/* Featured Interview */}
          <div className="mt-8 bg-gradient-to-r from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/30 rounded-xl p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-2">Featured Interview</h3>
                <p className="text-white/70 mb-4">
                  Watch our interactive interview with Dayvin Hallmon, featuring chapter navigation, topic filtering, and shareable timestamps.
                </p>
              </div>
              <Link
                href="/watch/partners/dayvin-hallmon-interview"
                className="inline-flex items-center justify-center px-6 py-3 bg-[#D4AF37] hover:bg-[#B8941F] text-black font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-[#D4AF37]/50 whitespace-nowrap"
              >
                <Play className="mr-2 h-5 w-5" />
                Watch Interview
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Project Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
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
            <div className="bg-gradient-to-b from-[#12141F] to-black border border-[#D4AF37]/30 rounded-2xl p-8 sm:p-12 text-center shadow-2xl space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center mx-auto text-[#D4AF37]">
                <Lock className="h-8 w-8" />
              </div>
              <div>
                <span className="px-3 py-1 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-mono font-semibold uppercase tracking-wider border border-[#D4AF37]/30 inline-block mb-2">
                  Studio Media Vault Access
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Rehearsal & Steinway Archives</h2>
                <p className="text-sm sm:text-base text-white/80 max-w-lg mx-auto leading-relaxed">
                  Sign in with your Google Account (<span className="text-[#D4AF37] font-mono">cordieruckus@gmail.com</span>) to view exclusive rehearsal footage, Steinway recital takes, and your personalized media outlet profile.
                </p>
              </div>

              {authLoading || checkingAccess ? (
                <div className="flex justify-center py-6">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
                </div>
              ) : (
                <div className="max-w-md mx-auto space-y-4">
                  <button
                    onClick={handleGoogleSignIn}
                    className="w-full py-4 px-6 rounded-2xl bg-white text-black font-bold text-sm hover:bg-amber-100 transition shadow-xl flex items-center justify-center space-x-3 group"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign In with Google</span>
                  </button>

                  <div className="relative my-4 flex items-center justify-center">
                    <div className="border-t border-white/10 w-full" />
                    <span className="bg-black px-3 text-[11px] text-white/40 font-mono uppercase shrink-0">Or alternative sign in</span>
                    <div className="border-t border-white/10 w-full" />
                  </div>

                  <AuthButtons
                    onSignInSuccess={() => {
                      window.location.reload()
                    }}
                    mobileFriendly={true}
                  />
                  {user && !hasAccess && (
                    <p className="text-sm text-amber-300 mt-4 text-center bg-amber-500/10 p-3 rounded-xl border border-amber-500/30">
                      Signed in as <span className="font-mono">{user.email}</span>. Account pending subscriber verification.
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

