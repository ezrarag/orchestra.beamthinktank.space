'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { 
  Building2, 
  Users, 
  MapPin, 
  Truck, 
  Coins, 
  DollarSign, 
  Calendar, 
  Radio, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  Plus, 
  X, 
  Globe, 
  Camera, 
  LogIn, 
  LogOut,
  ChevronUp,
  ChevronDown,
  ShoppingBag,
  CreditCard,
  CheckCircle
} from 'lucide-react'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore'
import { 
  DEFAULT_BADO_FLORIDA_PROFILE, 
  DEFAULT_BDSO_PROFILE,
  fetchInstitutionalProfile,
  saveInstitutionalProfile,
  type InstitutionalBusinessProfile
} from '@/lib/api/profile'

export interface RosterMusician {
  id: string
  name: string
  instrument: string
  available: boolean
  rate: number
  statusLabel?: string
}

const INITIAL_ROSTER_MUSICIANS: RosterMusician[] = [
  { id: 'm-1', name: 'Marisol Ferreira', instrument: 'Violin', available: true, rate: 180 },
  { id: 'm-2', name: 'Devon Kwan', instrument: 'Violin', available: true, rate: 180 },
  { id: 'm-3', name: 'Aaliyah Brooks', instrument: 'Viola', available: false, rate: 165 },
  { id: 'm-4', name: 'Theo Marchetti', instrument: 'Cello', available: true, rate: 195 },
  { id: 'm-5', name: 'Priya Anand', instrument: 'Cello', available: false, rate: 195 },
  { id: 'm-6', name: 'Sam Ellery', instrument: 'Bass', available: true, rate: 175 },
  { id: 'm-7', name: 'Ingrid Solberg', instrument: 'Flute', available: true, rate: 160 },
  { id: 'm-8', name: 'Marcus Webb', instrument: 'Oboe', available: false, rate: 160 },
  { id: 'm-9', name: 'Chinara Diallo', instrument: 'Clarinet', available: true, rate: 160 },
  { id: 'm-10', name: 'Owen Castellan', instrument: 'Percussion', available: false, rate: 170 },
  { id: 'm-11', name: 'Renata Silva', instrument: 'Violin', available: true, rate: 180 },
  { id: 'm-12', name: 'Julian Pham', instrument: 'Percussion', available: true, rate: 170 },
  { id: 'm-13', name: 'Ezra Haugabrooks', instrument: 'Cello', available: true, rate: 195 },
  { id: 'm-14', name: 'Elena Rostova', instrument: 'Violin', available: true, rate: 180 },
  { id: 'm-15', name: 'Marcus Vance', instrument: 'Piano', available: true, rate: 185 },
  { id: 'm-16', name: 'Sophia Chen', instrument: 'Oboe', available: true, rate: 170 },
  { id: 'm-17', name: 'David Miller', instrument: 'Bass', available: false, rate: 175 },
  { id: 'm-18', name: 'Amara Okafor', instrument: 'Flute', available: true, rate: 160 }
]

export interface PastRequestRow {
  id: string
  title: string
  amountLabel: string
  date: string
}

const INITIAL_PAST_REQUESTS: PastRequestRow[] = [
  { id: 'r-1', title: 'Nutcracker Run - 4 strings, Tampa', amountLabel: '-$720.00', date: '2025-12-14' },
  { id: 'r-2', title: 'ReadyAimGo cohort top-up', amountLabel: '+$1,500.00', date: '2026-01-05' },
  { id: 'r-3', title: 'Spring Gala - full cohort', amountLabel: '-$980.00', date: '2026-02-01' }
]

export default function InstitutionalCohortProfile() {
  const { user, loading: authLoading } = useUserRole()
  const [businessProfile, setBusinessProfile] = useState<InstitutionalBusinessProfile>(DEFAULT_BADO_FLORIDA_PROFILE)
  const [rosterMusicians, setRosterMusicians] = useState<RosterMusician[]>(INITIAL_ROSTER_MUSICIANS)
  const [activeTab, setActiveTab] = useState<'roster' | 'billing'>('roster')
  const [activeInstrumentFilter, setActiveInstrumentFilter] = useState<string>('All')
  
  // Cart & Booking Drawer State
  const [cart, setCart] = useState<string[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paymentStep, setPaymentStep] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'credits' | 'per-request' | null>(null)
  
  // Cohort Credit Balance & Requests
  const [cohortBalance, setCohortBalance] = useState<number>(2400)
  const [pastRequests, setPastRequests] = useState<PastRequestRow[]>(INITIAL_PAST_REQUESTS)
  const [toastNotice, setToastNotice] = useState<string | null>(null)

  const [signingIn, setSigningIn] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  // Handle redirect result on mount for mobile / iPad Safari compatibility
  useEffect(() => {
    if (auth) {
      void getRedirectResult(auth).catch((err) => {
        console.warn('Redirect auth result warning:', err)
      })
    }
  }, [])

  // Dynamically fetch profile keyed by Google UID
  useEffect(() => {
    async function loadProfile() {
      if (user?.email) {
        const loaded = await fetchInstitutionalProfile(user.email, user.uid, user.displayName || undefined)
        setBusinessProfile(loaded)
      }
    }
    loadProfile()
  }, [user])

  // Fetch real Firestore participant profiles & institutional requests
  useEffect(() => {
    async function loadRealRosterAndRequests() {
      if (!db) return
      try {
        // 1. Fetch real participant profiles from Firestore
        const snap = await getDocs(collection(db, 'participantProfiles'))
        if (!snap.empty) {
          const loaded: RosterMusician[] = snap.docs.map((docSnap, idx) => {
            const d = docSnap.data() as any
            const rawInst = d.primaryInstrument || (Array.isArray(d.disciplineTags) ? d.disciplineTags[0] : null) || 'Strings'
            let instClean = 'Violin'
            if (rawInst.toLowerCase().includes('cello')) instClean = 'Cello'
            else if (rawInst.toLowerCase().includes('viola')) instClean = 'Viola'
            else if (rawInst.toLowerCase().includes('bass')) instClean = 'Bass'
            else if (rawInst.toLowerCase().includes('piano')) instClean = 'Piano'
            else if (rawInst.toLowerCase().includes('flute')) instClean = 'Flute'
            else if (rawInst.toLowerCase().includes('oboe')) instClean = 'Oboe'
            else if (rawInst.toLowerCase().includes('clarinet')) instClean = 'Clarinet'
            else if (rawInst.toLowerCase().includes('percussion')) instClean = 'Percussion'

            let rate = 180
            if (instClean === 'Cello') rate = 195
            else if (instClean === 'Viola') rate = 165
            else if (instClean === 'Bass') rate = 175
            else if (instClean === 'Piano') rate = 185
            else if (['Flute', 'Oboe', 'Clarinet'].includes(instClean)) rate = 160
            else if (instClean === 'Percussion') rate = 170

            return {
              id: docSnap.id,
              name: d.fullName || d.name || d.email?.split('@')[0] || `Participant ${idx + 1}`,
              instrument: instClean,
              available: Boolean(d.isRoamingActive || d.current_live_location?.isBroadcasting || idx % 4 !== 2),
              rate: rate
            }
          })

          const ids = new Set(loaded.map(l => l.name.toLowerCase()))
          const merged = [...loaded, ...INITIAL_ROSTER_MUSICIANS.filter(m => !ids.has(m.name.toLowerCase()))]
          setRosterMusicians(merged)
        }

        // 2. Fetch real past requests for current user if logged in
        if (user?.email) {
          const reqSnap = await getDocs(query(collection(db, 'institutionalRequests'), where('email', '==', user.email)))
          if (!reqSnap.empty) {
            const loadedReqs: PastRequestRow[] = reqSnap.docs.map(docSnap => {
              const d = docSnap.data() as any
              return {
                id: docSnap.id,
                title: d.title || 'Cohort Booking Request',
                amountLabel: d.amountLabel || '-$500.00',
                date: d.createdAt?.toDate ? d.createdAt.toDate().toISOString().split('T')[0] : (d.date || '2026-02-01')
              }
            })
            setPastRequests(loadedReqs)
          }
        }
      } catch (err) {
        console.warn('Could not load real Firestore roster/requests:', err)
      }
    }
    loadRealRosterAndRequests()
  }, [user])

  const handleGoogleSignIn = async () => {
    if (!auth) return
    setSigningIn(true)
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, provider)
    } catch (err: any) {
      console.warn('Popup sign in failed/blocked on device (e.g. iPad Safari), falling back to redirect:', err)
      try {
        const provider = new GoogleAuthProvider()
        provider.setCustomParameters({ prompt: 'select_account' })
        await signInWithRedirect(auth, provider)
      } catch (redirectErr) {
        console.error('Redirect sign in error:', redirectErr)
      }
    } finally {
      setSigningIn(false)
    }
  }

  const handleSignOut = async () => {
    if (!auth) return
    setSigningOut(true)
    try {
      await signOut(auth)
    } catch (err) {
      console.error('Sign Out Error:', err)
    } finally {
      setSigningOut(false)
    }
  }

  // Instrument Filters List
  const instrumentList = useMemo(() => {
    const set = new Set<string>()
    rosterMusicians.forEach(m => set.add(m.instrument))
    return ['All', ...Array.from(set)]
  }, [rosterMusicians])

  // Visible Roster filtered by Instrument
  const visibleMusicians = useMemo(() => {
    if (activeInstrumentFilter === 'All') return rosterMusicians
    return rosterMusicians.filter(m => m.instrument === activeInstrumentFilter)
  }, [activeInstrumentFilter, rosterMusicians])

  // Stat dots computation for 6x3 visualization grid
  const availableCount = useMemo(() => rosterMusicians.filter(m => m.available).length, [rosterMusicians])
  const totalRosterCount = rosterMusicians.length
  
  const statDots = useMemo(() => {
    const dots = []
    for (let i = 0; i < 18; i++) {
      dots.push({
        id: i,
        color: i < availableCount ? '#34d399' : 'rgba(255,255,255,0.15)'
      })
    }
    return dots
  }, [availableCount])

  // Cart Calculations
  const cartMusicians = useMemo(() => {
    return rosterMusicians.filter(m => cart.includes(m.id))
  }, [cart, rosterMusicians])

  const cartTotal = useMemo(() => {
    return cartMusicians.reduce((sum, m) => sum + m.rate, 0)
  }, [cartMusicians])

  const toggleCart = (id: string) => {
    setCart(prev => {
      const inCart = prev.includes(id)
      const next = inCart ? prev.filter(item => item !== id) : [...prev, id]
      if (next.length > 0 && !drawerOpen) setDrawerOpen(true)
      return next
    })
  }

  const handleSendRequest = async () => {
    if (cart.length === 0) return

    const summaryText = cartMusicians.map(m => m.instrument).join(', ')
    const newRequest: PastRequestRow = {
      id: `req-${Date.now()}`,
      title: `Cohort Request (${cart.length} musicians: ${summaryText})`,
      amountLabel: `-$${cartTotal}.00`,
      date: new Date().toISOString().split('T')[0]
    }

    if (paymentMethod === 'credits') {
      setCohortBalance(prev => Math.max(0, prev - cartTotal))
    }

    setPastRequests(prev => [newRequest, ...prev])

    // Save real request to Firestore
    if (db && user?.email) {
      try {
        await addDoc(collection(db, 'institutionalRequests'), {
          userUid: user.uid || null,
          email: user.email,
          organizationName: businessProfile.organizationName,
          title: newRequest.title,
          amountLabel: newRequest.amountLabel,
          paymentMethod,
          musicianIds: cart,
          createdAt: serverTimestamp()
        })
      } catch (err) {
        console.warn('Firestore request write error:', err)
      }
    }

    setToastNotice(`Booking Request Sent for ${cart.length} Musician(s)! Total: $${cartTotal}`)
    setCart([])
    setDrawerOpen(false)
    setPaymentStep(false)
    setPaymentMethod(null)

    setTimeout(() => setToastNotice(null), 5000)
  }

  const handleAddCredits = () => {
    setCohortBalance(prev => prev + 1000)
    setToastNotice('Added $1,000.00 to ReadyAimGo Cohort Balance!')
    setTimeout(() => setToastNotice(null), 4000)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#07080b] text-[#f0ead6] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-[#fbbf24] animate-spin" />
          <p className="text-white/60 text-xs tracking-widest uppercase font-mono">
            Loading Institution Profile...
          </p>
        </div>
      </div>
    )
  }

  // Institutional Auth Gate
  if (!user) {
    return (
      <div className="min-h-screen bg-[#07080b] text-[#f0ead6] flex flex-col justify-between items-center p-6 font-sans">
        <div className="w-full max-w-md my-auto text-center space-y-6 bg-[#0F1015] p-8 rounded-3xl border border-purple-500/40 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center mx-auto shadow-lg">
            <Building2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
              Institutional & Business Account Portal
            </h1>
            <p className="text-xs text-white/60 leading-relaxed font-sans max-w-xs mx-auto">
              Sign in or register your organization with Google to manage your institution's profile, legal incorporation status, multi-state node mapping, media pipeline, and participant roster.
            </p>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="w-full py-3.5 px-6 rounded-full bg-purple-500 text-white font-bold text-sm hover:bg-purple-400 transition shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <LogIn className="w-4 h-4 text-white" />
            <span>{signingIn ? 'Signing in...' : 'Sign In with Institutional Google Account'}</span>
          </button>

          <div className="pt-4 border-t border-white/10 flex flex-col space-y-2">
            <Link
              href="/"
              className="text-xs text-white/60 hover:text-white transition font-medium"
            >
              ← Return to BEAM Orchestra Homepage
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-[#07080b] text-[#f0ead6] font-sans selection:bg-white/20 relative">
      
      {/* Toast Notification */}
      {toastNotice && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-[#fbbf24] text-[#07080b] font-bold text-xs shadow-2xl flex items-center space-x-2 animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span>{toastNotice}</span>
        </div>
      )}

      {/* 1. TOP NAV (Persistent across both tabs) */}
      <div className="flex items-center justify-between px-7 py-4 border-b border-white/[0.08] sticky top-0 bg-[#07080b]/90 backdrop-blur-md z-40">
        <div className="flex items-center gap-2.5 text-xs tracking-[0.2em] uppercase text-white/50">
          <Link href="/" className="font-bold text-white tracking-[0.25em] hover:text-[#fbbf24] transition">
            BEAM
          </Link>
          <span className="text-white/25">·</span>
          <Link href="/" className="hover:text-white transition">
            Orchestra Home
          </Link>
        </div>

        {/* Right side: Segmented Tab Control + User / Logout */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/10 rounded-[12px] p-[4px]">
            <button
              onClick={() => setActiveTab('roster')}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-[9px] transition-colors ${
                activeTab === 'roster'
                  ? 'bg-white text-[#07080b]'
                  : 'bg-transparent text-white/60 hover:text-white'
              }`}
            >
              Roster
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-[9px] transition-colors ${
                activeTab === 'billing'
                  ? 'bg-white text-[#07080b]'
                  : 'bg-transparent text-white/60 hover:text-white'
              }`}
            >
              Cohort &amp; Billing
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 border-l border-white/10 pl-4">
            <span className="text-xs font-mono text-white/50 truncate max-w-[140px]">
              {user.email}
            </span>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="text-xs font-bold text-red-400 hover:text-red-300 transition"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>

      {/* 2. ROSTER TAB VIEW */}
      {activeTab === 'roster' && (
        <div>
          {/* Hero Band */}
          <div className="relative w-full h-[360px] overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1600&q=80"
              alt="Venue background"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#07080b]/15 via-[#07080b]/55 to-[#07080b]/97 pointer-events-none" />

            {/* Top-Right 6x3 Data Visualization Grid */}
            <div className="absolute top-5 right-7 grid grid-cols-6 gap-1.25 pointer-events-none z-10">
              {statDots.map(dot => (
                <div
                  key={dot.id}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: dot.color }}
                />
              ))}
            </div>

            {/* Bottom-Left Org Identity Card */}
            <div className="absolute left-7 bottom-5 flex items-center gap-4 max-w-[760px] z-10">
              <div className="w-[72px] h-[72px] rounded-[14px] bg-[#14151C] border border-white/20 overflow-hidden shrink-0 shadow-[0_8px_24px_rgba(0,0,0,0.4)] flex items-center justify-center text-purple-300">
                <Building2 className="w-9 h-9" />
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#c084fc] bg-[rgba(192,132,252,0.12)] border border-[rgba(192,132,252,0.3)] px-2.5 py-1 rounded-lg">
                    Presenter &amp; Venue
                  </span>
                  <span className="text-[11px] text-white/50 flex items-center gap-1">
                    📍 Florida · Wisconsin · Illinois
                  </span>
                  <button className="text-[11px] font-semibold text-[#60a5fa] bg-[rgba(96,165,250,0.1)] border border-[rgba(96,165,250,0.3)] px-2.5 py-1 rounded-lg hover:bg-[rgba(96,165,250,0.2)] transition">
                    Import from LinkedIn
                  </button>
                </div>

                <h1 className="text-3xl sm:text-[34px] font-extrabold text-white leading-tight">
                  {businessProfile.organizationName || 'Ballet & Dance Orchestra Florida'}
                </h1>
                <p className="text-sm text-white/55 mt-1">
                  Multi-state ballet &amp; dance production partner · BADO FL
                </p>
              </div>
            </div>
          </div>

          {/* Stat Strip */}
          <div className="grid grid-cols-3 gap-[1px] bg-white/[0.08] border-b border-white/[0.08]">
            <div className="bg-[#07080b] px-7 py-4">
              <div className="text-[20px] font-bold text-[#34d399]">
                {availableCount} <span className="text-xs font-medium text-white/40">available now</span>
              </div>
            </div>
            <div className="bg-[#07080b] px-7 py-4">
              <div className="text-[20px] font-bold text-white">
                {totalRosterCount} <span className="text-xs font-medium text-white/40">roster total</span>
              </div>
            </div>
            <div className="bg-[#07080b] px-7 py-4">
              <div className="text-[20px] font-bold text-[#fbbf24]">
                ${cohortBalance.toLocaleString()} <span className="text-xs font-medium text-white/40">cohort credit balance</span>
              </div>
            </div>
          </div>

          {/* Instrument Filter Chips */}
          <div className="flex gap-2 px-7 pt-5 flex-wrap">
            {instrumentList.map(inst => {
              const active = activeInstrumentFilter === inst
              return (
                <button
                  key={inst}
                  onClick={() => setActiveInstrumentFilter(inst)}
                  className={`text-[12.5px] font-semibold px-3.5 py-1.5 rounded-[10px] transition ${
                    active
                      ? 'border border-[rgba(251,191,36,0.4)] bg-[rgba(251,191,36,0.15)] text-[#fbbf24]'
                      : 'border border-white/12 bg-white/4 text-white/65 hover:text-white'
                  }`}
                >
                  {inst}
                </button>
              )
            })}
          </div>

          {/* Roster Grid */}
          <div className="px-7 pt-4 pb-36 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5">
            {visibleMusicians.map(m => {
              const inCart = cart.includes(m.id)
              return (
                <div
                  key={m.id}
                  className="bg-white/[0.035] border border-white/[0.08] rounded-[16px] p-4 flex flex-col gap-2.5 hover:border-white/20 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: m.available ? '#34d399' : 'rgba(255,255,255,0.25)' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{m.name}</div>
                      <div className="text-xs text-white/45 truncate">
                        {m.instrument} · {m.available ? 'Available' : 'Booked'}
                      </div>
                    </div>
                    <span className="text-xs font-mono text-white/60">
                      ${m.rate}/svc
                    </span>
                  </div>

                  <button
                    onClick={() => toggleCart(m.id)}
                    className={`w-full py-2 rounded-[10px] text-[12.5px] font-semibold transition ${
                      inCart
                        ? 'bg-[rgba(192,132,252,0.18)] border border-[rgba(192,132,252,0.4)] text-[#c084fc]'
                        : 'bg-white/[0.06] border border-white/[0.14] text-white hover:bg-white/10'
                    }`}
                  >
                    {inCart ? 'Added' : 'Add to Request'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 3. COHORT & BILLING TAB VIEW */}
      {activeTab === 'billing' && (
        <div className="max-w-[760px] mx-auto px-7 py-10 pb-36">
          <div className="text-[22px] font-bold text-white mb-1">Cohort &amp; Billing</div>
          <div className="text-xs text-white/45 mb-6">
            ReadyAimGo subscription credits and past requests for this institution.
          </div>

          {/* Balance Card */}
          <div className="bg-[rgba(251,191,36,0.06)] border border-[rgba(251,191,36,0.25)] rounded-[16px] p-5 flex items-center justify-between mb-6">
            <div>
              <div className="text-xs text-white/50 tracking-wider uppercase font-mono">
                ReadyAimGo Cohort Balance
              </div>
              <div className="text-[28px] font-extrabold text-[#fbbf24] mt-1">
                ${cohortBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <button
              onClick={handleAddCredits}
              className="text-xs font-semibold text-[#07080b] bg-[#fbbf24] px-4 py-2.5 rounded-[10px] hover:bg-[#fde68a] transition"
            >
              Add Cohort Credits
            </button>
          </div>

          {/* Recent Requests Section */}
          <div className="text-xs font-bold tracking-widest uppercase text-white/40 mb-2.5 font-mono">
            Recent Requests
          </div>
          <div className="flex flex-col gap-2 mb-7">
            {pastRequests.map(r => (
              <div
                key={r.id}
                className="flex items-center justify-between p-3.5 bg-white/[0.03] border border-white/[0.07] rounded-[12px]"
              >
                <div className="text-xs text-white font-medium">{r.title}</div>
                <div className="text-xs font-mono text-white/50">{r.amountLabel}</div>
              </div>
            ))}
          </div>

          {/* Media Team Request Link */}
          <a
            href="https://forge.beamthinktank.space"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 bg-[rgba(192,132,252,0.06)] border border-[rgba(192,132,252,0.25)] rounded-[12px] text-[#c084fc] font-semibold text-xs hover:bg-[rgba(192,132,252,0.12)] transition"
          >
            <span className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              <span>Request BEAM Media Team for this cohort ↗</span>
            </span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* 4. FLOATING REQUEST CART (Overlay, appears when cart.length > 0) */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 right-6 w-80 bg-[#090b14]/98 backdrop-blur-xl border border-white/[0.14] rounded-[18px] shadow-[0_24px_60px_rgba(0,0,0,0.55)] z-50 overflow-hidden">
          
          {/* Collapsed Header Bar */}
          <div
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-white/5 transition"
          >
            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-[#fbbf24]" />
              <span>Request ({cart.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#fbbf24] font-bold">
                ${cartTotal}
              </span>
              {drawerOpen ? <ChevronDown className="w-4 h-4 text-white/50" /> : <ChevronUp className="w-4 h-4 text-white/50" />}
            </div>
          </div>

          {/* Expanded Cart Body */}
          {drawerOpen && (
            <div className="border-t border-white/[0.08]">
              <div className="max-h-[180px] overflow-y-auto px-2.5 py-1.5 no-scrollbar">
                {cartMusicians.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-1.5">
                    <span className="text-[12.5px] text-white/80 truncate">{c.name} ({c.instrument})</span>
                    <span className="text-[11px] font-mono text-white/40">${c.rate}</span>
                  </div>
                ))}
              </div>

              {/* Payment Step Selection */}
              {paymentStep ? (
                <div className="p-3.5 pt-2.5 border-t border-white/[0.08] space-y-2">
                  <div className="text-[11px] font-bold tracking-wider uppercase text-white/40 font-mono">
                    Pay With
                  </div>

                  <button
                    onClick={() => setPaymentMethod('credits')}
                    className={`w-full text-left p-2.5 rounded-[9px] text-xs font-semibold transition border ${
                      paymentMethod === 'credits'
                        ? 'border-[rgba(251,191,36,0.5)] bg-[rgba(251,191,36,0.15)] text-[#fbbf24]'
                        : 'border-white/12 bg-white/4 text-white/75'
                    }`}
                  >
                    ReadyAimGo Cohort Credits — ${cohortBalance.toLocaleString()} available
                  </button>

                  <button
                    onClick={() => setPaymentMethod('per-request')}
                    className={`w-full text-left p-2.5 rounded-[9px] text-xs font-semibold transition border ${
                      paymentMethod === 'per-request'
                        ? 'border-[rgba(96,165,250,0.5)] bg-[rgba(96,165,250,0.15)] text-[#60a5fa]'
                        : 'border-white/12 bg-white/4 text-white/75'
                    }`}
                  >
                    Pay per request — ${cartTotal} now
                  </button>

                  <button
                    onClick={handleSendRequest}
                    disabled={!paymentMethod}
                    className="w-full mt-2.5 p-2.5 rounded-[10px] bg-[#fbbf24] text-[#07080b] font-bold text-xs hover:bg-[#fde68a] transition disabled:opacity-50"
                  >
                    Send Request
                  </button>
                </div>
              ) : (
                <div className="p-3.5 pt-2.5 border-t border-white/[0.08]">
                  <button
                    onClick={() => setPaymentStep(true)}
                    className="w-full p-2.5 rounded-[10px] bg-[rgba(251,191,36,0.15)] text-[#fbbf24] font-semibold text-xs border border-[rgba(251,191,36,0.3)] hover:bg-[rgba(251,191,36,0.25)] transition"
                  >
                    Continue to Payment
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
