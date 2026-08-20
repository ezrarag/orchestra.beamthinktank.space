'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '@/lib/firebase'
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
  Bookmark
} from 'lucide-react'

export interface VaultWatchItem {
  id: string
  title: string
  category: 'Steinway Session' | 'Orchestral Stream' | 'Masterclass'
  duration: string
  dateWatched: string
  url: string
  thumbnailUrl: string
}

const DEFAULT_WATCH_HISTORY: VaultWatchItem[] = [
  {
    id: 'v-1',
    title: 'Schumann Adagio & Allegro — Steinway Gallery Orlando',
    category: 'Steinway Session',
    duration: '11:42',
    dateWatched: '2026-02-18',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2Fstudio%2FSchumann%20-%20Adagio%20-%20Take%20II%20-%20Dec%205.mov?alt=media&token=34d0e14a-1721-4826-8e43-e3099d4a81c4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'v-2',
    title: 'Margaret Bonds Ballad of the Brown King — BDSO Concert',
    category: 'Orchestral Stream',
    duration: '42:15',
    dateWatched: '2026-01-24',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnailUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'v-3',
    title: 'Florence Price Piano Concerto in One Movement — Chamber Cut',
    category: 'Masterclass',
    duration: '28:30',
    dateWatched: '2025-12-15',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80'
  }
]

export default function AudienceVaultProfile() {
  const { user, loading: authLoading } = useUserRole()
  const [watchHistory, setWatchHistory] = useState<VaultWatchItem[]>(DEFAULT_WATCH_HISTORY)
  const [savedFavorites, setSavedFavorites] = useState<string[]>(['v-1', 'v-2'])
  const [activeTab, setActiveTab] = useState<'watchlist' | 'favorites' | 'membership' | 'sync'>('watchlist')
  const [copied, setCopied] = useState(false)

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
        <div className="w-full max-w-md my-auto text-center space-y-6 bg-[#0F1015] p-8 rounded-3xl border border-amber-400/30 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/40 flex items-center justify-center mx-auto shadow-lg">
            <Tv className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
              Studio Vault Patron Portal
            </h1>
            <p className="text-xs text-white/60 leading-relaxed font-sans max-w-xs mx-auto">
              Sign in with your Google account to access your saved orchestra streams, Steinway recording sessions, and patron tokens.
            </p>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full py-3.5 px-6 rounded-full bg-amber-400 text-black font-bold text-sm hover:bg-amber-300 transition shadow-xl flex items-center justify-center space-x-2"
          >
            <LogIn className="w-4 h-4 text-black" />
            <span>Sign In with Google</span>
          </button>

          <div className="pt-4 border-t border-white/10 flex flex-col space-y-3">
            <Link
              href="/"
              className="text-xs text-white/60 hover:text-white transition font-medium"
            >
              ← Return to Orchestra Homepage
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
              <span>1. Watch History</span>
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
              <span>2. Saved Favorites ({savedFavorites.length})</span>
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
              <span>3. Patron Membership Pass</span>
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

          {/* TAB 1: WATCH HISTORY */}
          {activeTab === 'watchlist' && (
            <div className="space-y-4">
              <h2 className="text-lg font-serif font-bold text-white">Recently Watched Studio Vault Sessions</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {watchHistory.map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-amber-400/40 transition space-y-3">
                    <div className="relative h-36 rounded-xl overflow-hidden bg-black/60 border border-white/10">
                      <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <PlayCircle className="w-10 h-10 text-amber-400 drop-shadow-lg hover:scale-110 transition" />
                      </div>
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                        {item.duration}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-amber-300 font-semibold">{item.category}</span>
                        <button onClick={() => toggleFavorite(item.id)}>
                          <Heart className={`w-4 h-4 ${savedFavorites.includes(item.id) ? 'text-rose-500 fill-rose-500' : 'text-white/40'}`} />
                        </button>
                      </div>
                      <h3 className="text-xs font-bold text-white leading-tight">{item.title}</h3>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: FAVORITES */}
          {activeTab === 'favorites' && (
            <div className="space-y-4">
              <h2 className="text-lg font-serif font-bold text-white">Saved Favorites</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {watchHistory.filter(h => savedFavorites.includes(h.id)).map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl bg-black/40 border border-rose-500/30 flex items-center space-x-3">
                    <img src={item.thumbnailUrl} alt={item.title} className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0" />
                    <div className="space-y-1 flex-1">
                      <span className="text-[10px] font-mono text-rose-300 font-semibold">{item.category}</span>
                      <h3 className="text-xs font-bold text-white">{item.title}</h3>
                      <p className="text-[10px] text-white/50 font-mono">Duration: {item.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PATRON MEMBERSHIP PASS */}
          {activeTab === 'membership' && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-black/50 to-purple-500/10 border border-amber-400/30 space-y-4">
              <div className="flex items-center space-x-3 text-amber-300">
                <Award className="w-6 h-6" />
                <h2 className="text-base font-serif font-bold text-white">Studio Vault Patron Pass Status</h2>
              </div>

              <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2 text-xs">
                <p className="font-bold text-white text-sm">All-Access Patron Supporter</p>
                <p className="text-white/70 leading-relaxed">
                  Full stream access to Black Diaspora Orchestra recording sessions, Steinway Orlando recital takes, and exclusive chamber masterclasses.
                </p>
                <div className="pt-2 border-t border-white/10 flex justify-between font-mono text-amber-300">
                  <span>Vault Tokens: 120 Tokens</span>
                  <span>Status: Active Patron</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CROSS-SITE SYNC */}
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

    </div>
  )
}
