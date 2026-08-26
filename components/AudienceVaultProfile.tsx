'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { 
  PlayCircle, 
  Video, 
  Coins, 
  Heart, 
  Clock, 
  ShieldCheck, 
  LogIn, 
  User as UserIcon, 
  Sparkles, 
  ExternalLink, 
  Film, 
  Tv, 
  Award, 
  Check, 
  Copy, 
  CheckCircle2,
  Bookmark,
  X,
  Building,
  Users,
  Filter
} from 'lucide-react'

export interface VaultWatchItem {
  id: string
  title: string
  category: string
  ensembleId?: string
  ensembleName?: string
  institutionName?: string
  featuredMusicianName?: string
  uploaderType?: string
  duration: string
  dateWatched: string
  url: string
  thumbnailUrl?: string
  description?: string
}

const DEFAULT_WATCH_HISTORY: VaultWatchItem[] = [
  {
    id: 'v-1',
    title: 'Schumann Adagio & Allegro — Steinway Gallery Orlando',
    category: 'Steinway Session',
    ensembleId: 'chamber-ensemble',
    ensembleName: 'Chamber Ensembles & Steinway Recital Takes',
    institutionName: 'Steinway Gallery Orlando',
    featuredMusicianName: 'Cordie Ruckus & Steinway Artist Fellow',
    uploaderType: 'institution',
    duration: '11:42',
    dateWatched: '2026-02-18',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2Fstudio%2FSchumann%20-%20Adagio%20-%20Take%20II%20-%20Dec%205.mov?alt=media&token=34d0e14a-1721-4826-8e43-e3099d4a81c4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'v-2',
    title: 'BEAM Training Orchestra — Margaret Bonds Ballad Rehearsal',
    category: 'Orchestral Stream',
    ensembleId: 'beam-training-orchestra',
    ensembleName: 'BEAM Training Orchestra',
    institutionName: 'BEAM Academy Milwaukee',
    featuredMusicianName: 'BEAM Orchestra Fellows',
    uploaderType: 'ensemble_director',
    duration: '42:15',
    dateWatched: '2026-01-24',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2Fstudio%2FSchumann%20-%20Adagio%20-%20Take%20II%20-%20Dec%205.mov?alt=media&token=34d0e14a-1721-4826-8e43-e3099d4a81c4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'v-3',
    title: 'Florence Price Piano Concerto — Professional Orchestra Take',
    category: 'Masterclass',
    ensembleId: 'beam-professional-orchestra',
    ensembleName: 'BEAM Professional Orchestra',
    institutionName: 'Milwaukee Symphony Hall',
    featuredMusicianName: 'Dayvin Hallmon & Guest Soloist',
    uploaderType: 'admin',
    duration: '28:30',
    dateWatched: '2025-12-15',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2Fstudio%2FSchumann%20-%20Adagio%20-%20Take%20II%20-%20Dec%205.mov?alt=media&token=34d0e14a-1721-4826-8e43-e3099d4a81c4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80'
  }
]

export default function AudienceVaultProfile() {
  const { user, loading: authLoading } = useUserRole()
  const [liveVaultMedia, setLiveVaultMedia] = useState<VaultWatchItem[]>([])
  const [savedFavorites, setSavedFavorites] = useState<string[]>(['v-1', 'v-2'])
  const [activeTab, setActiveTab] = useState<'watchlist' | 'ensembles' | 'institutions' | 'participants' | 'favorites' | 'membership' | 'sync'>('watchlist')
  const [ensembleFilter, setEnsembleFilter] = useState<string>('all')
  const [institutionFilter, setInstitutionFilter] = useState<string>('all')
  const [selectedStreamItem, setSelectedStreamItem] = useState<VaultWatchItem | null>(null)
  const [copied, setCopied] = useState(false)

  // Fetch real-time media from Firestore projectRehearsalMedia collection
  useEffect(() => {
    if (!db || !user) return

    const q = query(
      collection(db, 'projectRehearsalMedia'),
      where('private', '==', false)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedItems: VaultWatchItem[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any
          const dateStr = data.date?.toDate?.()
            ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(data.date.toDate())
            : 'Recent Session'

          return {
            id: docSnap.id,
            title: data.title || 'Untitled Session',
            category: data.category || data.instrumentGroup || 'Studio Take',
            ensembleId: data.ensembleId || data.projectId || 'beam-training-orchestra',
            ensembleName: data.ensembleName || (data.projectId === 'black-diaspora-symphony' ? 'Black Diaspora Symphony Orchestra' : 'BEAM Training Orchestra'),
            institutionName: data.institutionName || 'Steinway Partner Network',
            featuredMusicianName: data.featuredMusicianName || data.uploadedBy || 'BEAM Musician',
            uploaderType: data.uploaderType || 'admin',
            duration: 'Excerpt Take',
            dateWatched: dateStr,
            url: data.url,
            thumbnailUrl: data.thumbnailUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
            description: data.description || ''
          }
        })
        setLiveVaultMedia(fetchedItems)
      },
      (err) => {
        console.warn('Firestore live vault media fetch error:', err)
      }
    )

    return () => unsubscribe()
  }, [user])

  // Combine default static takes with live Firestore items
  const allVaultItems = useMemo(() => {
    const combined = [...DEFAULT_WATCH_HISTORY]
    liveVaultMedia.forEach((liveItem) => {
      if (!combined.some(c => c.id === liveItem.id)) {
        combined.push(liveItem)
      }
    })
    return combined
  }, [liveVaultMedia])

  // Filtered items based on ensemble and institution selectors
  const filteredVaultItems = useMemo(() => {
    return allVaultItems.filter((item) => {
      if (ensembleFilter !== 'all' && item.ensembleId !== ensembleFilter) return false
      if (institutionFilter !== 'all' && item.institutionName !== institutionFilter) return false
      return true
    })
  }, [allVaultItems, ensembleFilter, institutionFilter])

  const handleGoogleSignIn = async () => {
    if (!auth) return
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } catch (err) {
      console.error('Audience Google Sign-In Error:', err)
    }
  }

  const toggleFavorite = (id: string) => {
    if (savedFavorites.includes(id)) {
      setSavedFavorites(savedFavorites.filter(f => f !== id))
    } else {
      setSavedFavorites([...savedFavorites, id])
    }
  }

  const audiencePayload = {
    accountType: 'Studio Vault Audience / Media Viewer',
    displayName: user?.displayName || 'Studio Vault Member',
    email: user?.email || 'viewer@beamthinktank.space',
    subdomainSource: 'orchestra',
    membershipTier: 'All-Access Patron Supporter',
    vaultTokensBalance: 120,
    savedFavoritesCount: savedFavorites.length,
    watchHistoryCount: watchHistory.length,
    lastWatchedSession: watchHistory[0]?.title || 'None'
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(audiencePayload, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#07080A] text-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-amber-400 animate-spin" />
          <p className="text-white/60 font-sans text-xs tracking-widest uppercase">
            Loading Studio Vault Profile...
          </p>
        </div>
      </div>
    )
  }

  // Graceful Google Sign-In Gate if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-[#07080A] text-white flex flex-col justify-between items-center p-6 font-sans">
        <div className="w-full max-w-lg my-auto text-center space-y-6 bg-gradient-to-b from-[#12141C] to-[#0A0B0E] p-8 sm:p-10 rounded-3xl border border-amber-400/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="w-16 h-16 rounded-2xl bg-amber-400/20 text-amber-400 border border-amber-400/40 flex items-center justify-center mx-auto shadow-lg backdrop-blur-md">
            <Tv className="w-8 h-8 text-amber-300" />
          </div>

          <div className="space-y-3">
            <span className="px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 text-xs font-mono font-semibold tracking-wider uppercase border border-amber-400/30">
              BEAM Media Outlet & Studio Vault
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-wide">
              Sign In to View Your Profile
            </h1>
            <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans max-w-sm mx-auto">
              Access your personalized media outlet pass, Steinway recording sessions, rehearsal archives, and patron tokens.
            </p>
          </div>

          <div className="bg-black/50 p-4 rounded-2xl border border-white/10 text-left space-y-2 text-xs text-white/70">
            <div className="flex items-center space-x-2 text-amber-300 font-semibold font-mono">
              <Sparkles className="w-4 h-4" />
              <span>Personalized Outlet Credentials</span>
            </div>
            <p className="text-white/60">
              Sign in with your Google Account (e.g. <span className="font-mono text-amber-200">cordieruckus@gmail.com</span>) to unlock your custom media profile and vault content.
            </p>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full py-4 px-6 rounded-2xl bg-white text-black font-bold text-sm hover:bg-amber-100 transition-all shadow-xl flex items-center justify-center space-x-3 group"
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
            <span className="group-hover:translate-x-0.5 transition-transform">Continue with Google Login</span>
          </button>

          <div className="pt-4 border-t border-white/10 flex flex-col space-y-3">
            <Link
              href="/studio"
              className="text-xs text-white/60 hover:text-white transition font-medium"
            >
              ← Return to Main Studio Page
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const displayName = user.displayName || user.email?.split('@')[0] || 'Studio Vault Audience Member'

  return (
    <div className="w-full bg-[#07080A] text-white font-sans selection:bg-white/20">
      
      {/* Hero Header Section */}
      <div className="relative w-full h-[50dvh] min-h-[320px] max-h-[480px] overflow-hidden bg-[#0A0B0E]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#261E14] via-[#161420] to-[#07080A] flex items-center justify-center relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.15),_transparent_65%)]" />
        </div>

        {/* Top Floating Control Bar */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between max-w-6xl mx-auto w-full px-6 pt-6 pb-4">
          <Link
            href="/"
            className="px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white/80 hover:text-white text-xs font-semibold transition"
          >
            ← Homepage
          </Link>

          <div className="flex items-center space-x-3">
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Audience Member</span>
            </span>
          </div>
        </div>

        {/* Bottom Scrim */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0F1015] via-[#0F1015]/80 to-transparent pointer-events-none z-10" />

        {/* Overlaid Left-Aligned Audience Banner */}
        <div className="absolute bottom-6 inset-x-0 z-20">
          <div className="max-w-6xl mx-auto w-full px-6 text-left space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-400/20 backdrop-blur-md border border-amber-400/40 text-amber-300 text-xs font-mono font-bold flex items-center space-x-1.5 shadow-lg">
                <Tv className="w-3.5 h-3.5" />
                <span>Studio Vault Audience Patron</span>
              </span>

              <span className="px-3 py-1 rounded-full bg-purple-500/20 backdrop-blur-md border border-purple-500/40 text-purple-300 text-xs font-mono font-semibold">
                All-Access Stream Pass
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-wide drop-shadow-md">
              {displayName}
            </h1>
            <p className="text-xs sm:text-sm font-sans text-white/80 max-w-xl leading-relaxed">
              Studio Vault Patron Profile — Watching high-caliber recorded orchestra sessions, Steinway recital takes, and masterclasses across the BEAM Media Network.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="relative z-10 py-6 bg-[#0B0C10] border-b border-white/10">
        <div className="max-w-6xl mx-auto w-full px-6 grid grid-cols-3 gap-4 text-center">
          
          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-1">
            <Coins className="w-5 h-5 text-amber-400 mx-auto" />
            <p className="text-2xl font-serif font-bold text-amber-300">120</p>
            <p className="text-[10px] text-white/60 uppercase font-mono tracking-wider">Patron Tokens</p>
          </div>

          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-1">
            <Heart className="w-5 h-5 text-rose-400 mx-auto" />
            <p className="text-2xl font-serif font-bold text-rose-300">{savedFavorites.length}</p>
            <p className="text-[10px] text-white/60 uppercase font-mono tracking-wider">Saved Sessions</p>
          </div>

          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-1">
            <Clock className="w-5 h-5 text-purple-400 mx-auto" />
            <p className="text-2xl font-serif font-bold text-purple-300">{watchHistory.length}</p>
            <p className="text-[10px] text-white/60 uppercase font-mono tracking-wider">Sessions Watched</p>
          </div>

        </div>
      </div>

      {/* Main Tabs Section */}
      <div className="relative z-10 py-8 pb-16">
        <div className="max-w-6xl mx-auto w-full px-6 space-y-6">
          
          <div className="flex items-center justify-start overflow-x-auto space-x-2 border-b border-white/10 pb-3 no-scrollbar">
            <button
              onClick={() => setActiveTab('watchlist')}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                activeTab === 'watchlist'
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>1. All Vault Media ({filteredVaultItems.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('ensembles')
                setEnsembleFilter('all')
              }}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                activeTab === 'ensembles'
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>2. Ensembles & Orchestras</span>
            </button>

            <button
              onClick={() => setActiveTab('institutions')}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                activeTab === 'institutions'
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>3. Partner Institutions</span>
            </button>

            <button
              onClick={() => setActiveTab('participants')}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                activeTab === 'participants'
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>4. Participant Spotlights</span>
            </button>

            <button
              onClick={() => setActiveTab('favorites')}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                activeTab === 'favorites'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>5. Saved Favorites ({savedFavorites.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('membership')}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                activeTab === 'membership'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Patron Pass</span>
            </button>

            <button
              onClick={() => setActiveTab('sync')}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                activeTab === 'sync'
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Cross-Site Sync</span>
            </button>
          </div>

          {/* Interactive Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-black/40 p-4 rounded-2xl border border-white/10 text-xs">
            <div className="flex items-center space-x-2 text-amber-300 font-mono font-semibold">
              <Filter className="w-4 h-4" />
              <span>Vault Selectors:</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-white/60">Ensemble:</span>
                <select
                  value={ensembleFilter}
                  onChange={(e) => setEnsembleFilter(e.target.value)}
                  className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-400"
                >
                  <option value="all" className="bg-black">All Ensembles</option>
                  <option value="beam-training-orchestra" className="bg-black">BEAM Training Orchestra</option>
                  <option value="beam-professional-orchestra" className="bg-black">BEAM Professional Orchestra</option>
                  <option value="black-diaspora-symphony" className="bg-black">Black Diaspora Symphony Orchestra</option>
                  <option value="uwm-afro-caribbean-jazz" className="bg-black">UWM Afro-Caribbean Jazz Orchestra</option>
                  <option value="chamber-ensemble" className="bg-black">Chamber Ensembles & Steinway Takes</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-white/60">Institution:</span>
                <select
                  value={institutionFilter}
                  onChange={(e) => setInstitutionFilter(e.target.value)}
                  className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-400"
                >
                  <option value="all" className="bg-black">All Institutions</option>
                  <option value="Steinway Gallery Orlando" className="bg-black">Steinway Gallery Orlando</option>
                  <option value="UW-Milwaukee" className="bg-black">UW-Milwaukee Fine Arts</option>
                  <option value="Milwaukee Symphony Hall" className="bg-black">Milwaukee Symphony Hall</option>
                  <option value="BEAM Academy Milwaukee" className="bg-black">BEAM Academy</option>
                </select>
              </div>

              {(ensembleFilter !== 'all' || institutionFilter !== 'all') && (
                <button
                  onClick={() => {
                    setEnsembleFilter('all')
                    setInstitutionFilter('all')
                  }}
                  className="text-amber-300 hover:underline text-[11px] font-mono"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* TAB 1 & DEFAULT: ALL VAULT MEDIA */}
          {activeTab === 'watchlist' && (
            <div className="space-y-4">
              <h2 className="text-lg font-serif font-bold text-white flex items-center justify-between">
                <span>Select & Stream Vault Sessions</span>
                <span className="text-xs text-amber-300 font-mono font-normal">{filteredVaultItems.length} Sessions Available</span>
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {filteredVaultItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-amber-400/50 transition duration-300 space-y-3 group cursor-pointer"
                    onClick={() => setSelectedStreamItem(item)}
                  >
                    <div className="relative h-40 rounded-xl overflow-hidden bg-black/60 border border-white/10">
                      <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition flex items-center justify-center">
                        <PlayCircle className="w-12 h-12 text-amber-400 drop-shadow-xl group-hover:scale-110 transition duration-300" />
                      </div>
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                        {item.duration}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-amber-300 font-semibold px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                          {item.ensembleName || item.category}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(item.id)
                          }}
                        >
                          <Heart className={`w-4 h-4 ${savedFavorites.includes(item.id) ? 'text-rose-500 fill-rose-500' : 'text-white/40 hover:text-white'}`} />
                        </button>
                      </div>

                      <h3 className="text-xs sm:text-sm font-bold text-white leading-snug group-hover:text-amber-300 transition">
                        {item.title}
                      </h3>

                      {item.institutionName && (
                        <p className="text-[11px] text-white/60 flex items-center space-x-1 font-mono">
                          <Building className="w-3 h-3 text-amber-400/80" />
                          <span>{item.institutionName}</span>
                        </p>
                      )}

                      {item.featuredMusicianName && (
                        <p className="text-[10px] text-white/50 flex items-center space-x-1 font-mono">
                          <Users className="w-3 h-3 text-purple-400/80" />
                          <span>{item.featuredMusicianName}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: ENSEMBLES */}
          {activeTab === 'ensembles' && (
            <div className="space-y-6">
              <h2 className="text-lg font-serif font-bold text-white">BEAM Orchestras & Ensembles Stream Hub</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: 'beam-training-orchestra', name: 'BEAM Training Orchestra', desc: 'Emerging fellows and orchestral training cohort sessions.', tag: 'Training Track' },
                  { id: 'beam-professional-orchestra', name: 'BEAM Professional Orchestra', desc: 'High-caliber professional symphonic streams and masterworks.', tag: 'Pro Track' },
                  { id: 'black-diaspora-symphony', name: 'Black Diaspora Symphony Orchestra', desc: 'Memorial concerts featuring Margaret Bonds, Florence Price, and Grieg.', tag: 'Symphony' },
                  { id: 'uwm-afro-caribbean-jazz', name: 'UWM Afro-Caribbean Jazz Orchestra', desc: 'Latin jazz orchestration, big band arrangements, and guest artists.', tag: 'Jazz Series' }
                ].map((ens) => {
                  const ensItems = allVaultItems.filter(i => i.ensembleId === ens.id || i.ensembleName === ens.name)
                  return (
                    <div key={ens.id} className="p-5 rounded-2xl bg-black/50 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded bg-amber-400/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-400/30">
                          {ens.tag}
                        </span>
                        <span className="text-[11px] text-white/50 font-mono">{ensItems.length} Sessions</span>
                      </div>
                      <h3 className="text-base font-bold text-white">{ens.name}</h3>
                      <p className="text-xs text-white/70">{ens.desc}</p>
                      <button
                        onClick={() => {
                          setEnsembleFilter(ens.id)
                          setActiveTab('watchlist')
                        }}
                        className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 text-xs font-bold transition flex items-center justify-center space-x-1"
                      >
                        <PlayCircle className="w-4 h-4" />
                        <span>Filter & Stream {ens.name} Media</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 3: INSTITUTIONS */}
          {activeTab === 'institutions' && (
            <div className="space-y-6">
              <h2 className="text-lg font-serif font-bold text-white">Partner Institutions & Host Venues</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: 'Steinway Gallery Orlando', desc: 'Intimate Steinway recital takes and solo piano recordings.', tag: 'Steinway Sessions' },
                  { name: 'UW-Milwaukee Fine Arts', desc: 'University partner concerts and Afro-Caribbean jazz series.', tag: 'Academic Partner' },
                  { name: 'Milwaukee Symphony Hall', desc: 'Symphony hall recorded masterworks and full ensemble takes.', tag: 'Symphony Hall' },
                  { name: 'BEAM Academy Milwaukee', desc: 'Orchestral fellowship rehearsals and sectional masterclasses.', tag: 'BEAM NGO Campus' }
                ].map((inst) => {
                  const instItems = allVaultItems.filter(i => i.institutionName?.toLowerCase().includes(inst.name.toLowerCase().split(' ')[0]))
                  return (
                    <div key={inst.name} className="p-5 rounded-2xl bg-black/50 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold border border-purple-500/30">
                          {inst.tag}
                        </span>
                        <span className="text-[11px] text-white/50 font-mono">{instItems.length} Media Takes</span>
                      </div>
                      <h3 className="text-base font-bold text-white">{inst.name}</h3>
                      <p className="text-xs text-white/70">{inst.desc}</p>
                      <button
                        onClick={() => {
                          setInstitutionFilter(inst.name)
                          setActiveTab('watchlist')
                        }}
                        className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-purple-300 text-xs font-bold transition flex items-center justify-center space-x-1"
                      >
                        <Building className="w-4 h-4" />
                        <span>Filter {inst.name} Streams</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 4: PARTICIPANTS */}
          {activeTab === 'participants' && (
            <div className="space-y-6">
              <h2 className="text-lg font-serif font-bold text-white">Participant & Musician Vault Spotlights</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {allVaultItems.map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                    <span className="text-[10px] font-mono text-purple-300 font-semibold px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                      Musician Spotlight
                    </span>
                    <h3 className="text-xs font-bold text-white">{item.title}</h3>
                    <p className="text-[11px] text-amber-300 font-mono">{item.featuredMusicianName}</p>
                    <button
                      onClick={() => setSelectedStreamItem(item)}
                      className="w-full py-1.5 rounded-lg bg-amber-400/20 text-amber-300 text-xs font-bold transition flex items-center justify-center space-x-1"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Watch Stream</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: FAVORITES */}
          {activeTab === 'favorites' && (
            <div className="space-y-4">
              <h2 className="text-lg font-serif font-bold text-white">Saved Favorites</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {allVaultItems.filter(h => savedFavorites.includes(h.id)).map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-black/40 border border-rose-500/30 flex items-center space-x-3 cursor-pointer hover:border-rose-500 transition"
                    onClick={() => setSelectedStreamItem(item)}
                  >
                    <img src={item.thumbnailUrl} alt={item.title} className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0" />
                    <div className="space-y-1 flex-1">
                      <span className="text-[10px] font-mono text-rose-300 font-semibold">{item.category}</span>
                      <h3 className="text-xs font-bold text-white">{item.title}</h3>
                      <p className="text-[10px] text-white/50 font-mono">{item.ensembleName || item.institutionName}</p>
                    </div>
                    <PlayCircle className="w-8 h-8 text-rose-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: PATRON MEMBERSHIP PASS */}
          {activeTab === 'membership' && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-black/50 to-purple-500/10 border border-amber-400/30 space-y-4">
              <div className="flex items-center space-x-3 text-amber-300">
                <Award className="w-6 h-6" />
                <h2 className="text-base font-serif font-bold text-white">Studio Vault Patron Pass Status</h2>
              </div>

              <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2 text-xs">
                <p className="font-bold text-white text-sm">All-Access Patron Supporter</p>
                <p className="text-white/70 leading-relaxed">
                  Full stream access to BEAM Training & Professional Orchestras, Black Diaspora Symphony recording sessions, Steinway Orlando recital takes, and exclusive chamber masterclasses.
                </p>
                <div className="pt-2 border-t border-white/10 flex justify-between font-mono text-amber-300">
                  <span>Vault Tokens: 120 Tokens</span>
                  <span>Status: Active Patron</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: CROSS-SITE SYNC */}
          {activeTab === 'sync' && (
            <div className="p-5 rounded-2xl bg-black/40 border border-amber-400/30 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-amber-300 font-semibold font-mono">Audience Cross-Domain Payload</span>
                <button
                  onClick={handleCopyJson}
                  className="px-3 py-1.5 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] flex items-center space-x-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-black/80 border border-white/10 font-mono text-[10px] text-emerald-300 overflow-x-auto max-h-48 leading-relaxed">
                {JSON.stringify(audiencePayload, null, 2)}
              </pre>
            </div>
          )}

        </div>
      </div>

      {/* Interactive Video Stream Modal */}
      {selectedStreamItem && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-4xl bg-[#0F1015] border border-amber-400/40 rounded-3xl overflow-hidden shadow-2xl space-y-4">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
              <div>
                <span className="px-2.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono text-[10px] font-bold">
                  {selectedStreamItem.ensembleName || 'Studio Vault Stream'}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white mt-1">{selectedStreamItem.title}</h3>
              </div>
              <button
                onClick={() => setSelectedStreamItem(null)}
                className="p-2 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4">
              <video
                src={selectedStreamItem.url}
                controls
                autoPlay
                className="w-full max-h-[60dvh] rounded-2xl bg-black border border-white/10 shadow-2xl"
              >
                Your browser does not support HTML5 video streaming.
              </video>
            </div>

            <div className="p-4 bg-black/60 border-t border-white/10 text-xs flex flex-wrap items-center justify-between gap-3 text-white/70">
              <div className="space-y-1">
                {selectedStreamItem.institutionName && (
                  <p className="text-amber-300 font-mono">Host Institution: {selectedStreamItem.institutionName}</p>
                )}
                {selectedStreamItem.featuredMusicianName && (
                  <p className="text-purple-300 font-mono">Featured Musician: {selectedStreamItem.featuredMusicianName}</p>
                )}
              </div>
              <button
                onClick={() => toggleFavorite(selectedStreamItem.id)}
                className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 ${
                  savedFavorites.includes(selectedStreamItem.id)
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                }`}
              >
                <Heart className={`w-4 h-4 ${savedFavorites.includes(selectedStreamItem.id) ? 'fill-rose-300' : ''}`} />
                <span>{savedFavorites.includes(selectedStreamItem.id) ? 'Saved in Favorites' : 'Add to Favorites'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
