'use client'

import { useState, useEffect } from 'react'
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
  Navigation, 
  Home, 
  Sparkles, 
  Plus, 
  X, 
  Wrench, 
  Utensils, 
  Layers,
  Globe,
  FileText,
  Video,
  Film,
  Briefcase,
  AlertTriangle,
  Scale,
  Camera,
  LogIn,
  LogOut
} from 'lucide-react'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { 
  DEFAULT_BADO_FLORIDA_PROFILE, 
  DEFAULT_BDSO_PROFILE,
  fetchInstitutionalProfile,
  saveInstitutionalProfile,
  type InstitutionalBusinessProfile, 
  type InstitutionalPortfolioLink, 
  type StateOperationDesignation 
} from '@/lib/api/profile'

export interface CohortMusician {
  id: string
  name: string
  role: string
  instrument: string
  isLive: boolean
  currentCity: string
  coords?: string
  status: 'Active' | 'On Tour' | 'Residency'
  headshotUrl?: string
}

const INITIAL_ROSTER: CohortMusician[] = [
  {
    id: 'm-1',
    name: 'Ezra Haugabrooks',
    role: 'Resident Cellist & Section Leader',
    instrument: 'Cello',
    isLive: true,
    currentCity: 'Orlando, FL (Steinway Gallery Residency)',
    coords: '28.538, -81.379',
    status: 'Residency',
    headshotUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'm-2',
    name: 'Elena Rostova',
    role: 'Principal Concertmaster',
    instrument: 'Violin I',
    isLive: false,
    currentCity: 'Chicago, IL (Home Node)',
    status: 'Active',
    headshotUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'm-3',
    name: 'Marcus Vance',
    role: 'Steinway Piano Technician',
    instrument: 'Piano / Logistics',
    isLive: true,
    currentCity: 'Milwaukee, WI (Miller High Life Theatre)',
    coords: '43.038, -87.906',
    status: 'Active',
    headshotUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'm-4',
    name: 'Sophia Chen',
    role: 'Principal Oboe & Woodwind Lead',
    instrument: 'Oboe',
    isLive: true,
    currentCity: 'Atlanta, GA (Touring)',
    coords: '33.749, -84.388',
    status: 'On Tour',
    headshotUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80'
  }
]

export default function InstitutionalCohortProfile() {
  const { user, loading: authLoading } = useUserRole()
  const [businessProfile, setBusinessProfile] = useState<InstitutionalBusinessProfile>(DEFAULT_BADO_FLORIDA_PROFILE)
  const [roster, setRoster] = useState<CohortMusician[]>(INITIAL_ROSTER)
  const [activeTab, setActiveTab] = useState<'business' | 'states' | 'portfolio' | 'roster' | 'sync'>('business')
  const [copied, setCopied] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  // Dispatch Ground Transit Modal State
  const [showDispatchModal, setShowDispatchModal] = useState(false)
  const [selectedMusician, setSelectedMusician] = useState<CohortMusician | null>(null)
  const [dispatchDestination, setDispatchDestination] = useState('')
  const [dispatchNotice, setDispatchNotice] = useState('')

  // Add Portfolio Link Modal State
  const [showAddLinkModal, setShowAddLinkModal] = useState(false)
  const [newLinkTitle, setNewLinkTitle] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkType, setNewLinkType] = useState<InstitutionalPortfolioLink['type']>('Video Reel')

  // Request Media / Legal Team State
  const [requestNotice, setRequestNotice] = useState('')

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

  const handleOpenDispatch = (musician: CohortMusician) => {
    setSelectedMusician(musician)
    setDispatchDestination(musician.currentCity)
    setShowDispatchModal(true)
  }

  const handleConfirmDispatch = () => {
    if (!selectedMusician) return
    setDispatchNotice(`Transit Request Dispatched for ${selectedMusician.name} to grounds.beamthinktank.space!`)
    setShowDispatchModal(false)
    setTimeout(() => setDispatchNotice(''), 6000)
  }

  const handleAddPortfolioLink = async () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return

    const newLink: InstitutionalPortfolioLink = {
      id: `pl-${Date.now()}`,
      title: newLinkTitle.trim(),
      url: newLinkUrl.trim(),
      type: newLinkType,
      dateAdded: new Date().toISOString().split('T')[0]
    }

    const updatedProfile = {
      ...businessProfile,
      portfolioLinks: [newLink, ...businessProfile.portfolioLinks]
    }

    setBusinessProfile(updatedProfile)

    if (user?.uid && user?.email) {
      await saveInstitutionalProfile(user.uid, user.email, { portfolioLinks: updatedProfile.portfolioLinks })
    }

    setNewLinkTitle('')
    setNewLinkUrl('')
    setShowAddLinkModal(false)
    setRequestNotice('Saved new accomplishment link to Institutional Portfolio!')
    setTimeout(() => setRequestNotice(''), 4000)
  }

  const handleRequestLegalSupport = () => {
    setRequestNotice('Legal & Incorporation support request submitted to law.beamthinktank.space!')
    setTimeout(() => setRequestNotice(''), 6000)
  }

  const handleRequestMediaTeam = () => {
    setRequestNotice('BEAM Media & Video Production team request submitted to forge.beamthinktank.space!')
    setTimeout(() => setRequestNotice(''), 6000)
  }

  const institutionalPayload = {
    authUid: user?.uid || null,
    institutionName: businessProfile.organizationName,
    legalName: businessProfile.legalName,
    email: businessProfile.email,
    incorporationStatus: businessProfile.incorporationStatus,
    stateOfRegistration: businessProfile.stateOfRegistration,
    feinStatus: businessProfile.feinStatus,
    legalDevelopmentNeeds: businessProfile.legalDevelopmentNeeds,
    hasContentPipeline: businessProfile.hasContentPipeline,
    contentCapabilities: businessProfile.contentCapabilities,
    needsMediaTeamSupport: businessProfile.needsMediaTeamSupport,
    stateOperations: businessProfile.stateOperations,
    portfolioLinksCount: businessProfile.portfolioLinks.length,
    subdomainSource: 'orchestra',
    rosterSize: roster.length + 14,
    allocatedStipendsUsd: businessProfile.allocatedStipendsBudgetUsd,
    generatedBeamCoins: businessProfile.generatedBeamCoins,
    activeLiveBeaconsCount: roster.filter(r => r.isLive).length
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(institutionalPayload, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#07080A] text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-purple-400 animate-spin" />
          <p className="text-white/60 text-xs tracking-widest uppercase font-mono">
            Loading Institutional Profile...
          </p>
        </div>
      </div>
    )
  }

  // Institutional Auth Gate: Require Google Sign-In to connect institution identity
  if (!user) {
    return (
      <div className="min-h-screen bg-[#07080A] text-white flex flex-col justify-between items-center p-6 font-sans">
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
    <div className="w-full bg-[#07080A] text-white font-sans selection:bg-white/20">
      
      {/* Toast Notification */}
      {(dispatchNotice || requestNotice) && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-purple-500 text-white font-bold text-xs shadow-2xl flex items-center space-x-2 animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span>{dispatchNotice || requestNotice}</span>
        </div>
      )}

      {/* Hero Header Section */}
      <div className="relative w-full h-[56dvh] min-h-[380px] max-h-[560px] overflow-hidden bg-[#0A0B0E]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E1B38] via-[#121424] to-[#07080A] flex items-center justify-center relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(168,85,247,0.25),_transparent_65%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(212,175,55,0.18),_transparent_65%)]" />
        </div>

        {/* Top Right Log Out Bar */}
        <div className="absolute top-6 right-6 z-30 flex items-center space-x-3">
          <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs font-mono text-white/80">
            Institution: <strong className="text-purple-300">{user.email}</strong>
          </div>

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="px-4 py-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-bold transition flex items-center space-x-1.5 shadow-lg"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{signingOut ? 'Logging out...' : 'Log Out'}</span>
          </button>
        </div>

        {/* Bottom Scrim */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0F1015] via-[#0F1015]/80 to-transparent pointer-events-none z-10" />

        {/* Overlaid Left-Aligned Institution Banner */}
        <div className="absolute bottom-6 inset-x-0 z-20">
          <div className="max-w-6xl mx-auto w-full px-6 text-left space-y-3">
            
            {/* Business & Legal Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-400/20 backdrop-blur-md border border-amber-400/40 text-amber-300 text-xs font-mono font-bold flex items-center space-x-1.5 shadow-lg">
                <Building2 className="w-3.5 h-3.5" />
                <span>{businessProfile.organizationName}</span>
              </span>

              <span className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border backdrop-blur-md ${
                businessProfile.incorporationStatus === 'Unincorporated / Incubating'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-200'
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              }`}>
                🏛️ {businessProfile.incorporationStatus}
              </span>

              <span className="px-3 py-1 rounded-full bg-purple-500/20 backdrop-blur-md border border-purple-500/40 text-purple-300 text-xs font-mono font-semibold">
                📍 Multi-State: Florida · Wisconsin · Illinois
              </span>

              <span className="px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold flex items-center space-x-1">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>3 Live Beacons</span>
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-wide drop-shadow-md">
              {businessProfile.organizationName}
            </h1>
            <p className="text-xs sm:text-sm font-sans text-white/80 max-w-2xl leading-relaxed">
              Institutional Business & Production Profile — Operating across Florida, Wisconsin, and Illinois with active media content pipelines, legal incorporation tracking, and participant mapping.
            </p>
          </div>
        </div>
      </div>

      {/* Action Bar Below Hero */}
      <div className="relative z-20 bg-[#0F1015] py-4 border-b border-white/10">
        <div className="max-w-6xl mx-auto w-full px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRequestLegalSupport}
              className="py-2.5 px-5 rounded-full bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 font-bold text-xs transition shadow-lg flex items-center space-x-1.5"
            >
              <Scale className="w-4 h-4" />
              <span>Legal & Incorporation Support (law.beamthinktank.space)</span>
            </button>

            <button
              onClick={handleRequestMediaTeam}
              className="py-2.5 px-5 rounded-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-bold text-xs transition shadow-lg flex items-center space-x-1.5"
            >
              <Camera className="w-4 h-4" />
              <span>Request BEAM Media Team (forge.beamthinktank.space)</span>
            </button>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            <span className="text-white/50">FEIN: <strong className="text-amber-300">{businessProfile.feinStatus}</strong></span>
            <button
              onClick={handleSignOut}
              className="text-red-400 hover:underline font-bold"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>

      {/* Institutional Key Metrics Row */}
      <div className="relative z-10 py-6 bg-[#0B0C10]">
        <div className="max-w-6xl mx-auto w-full px-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          
          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-1">
            <Users className="w-5 h-5 text-purple-400 mx-auto" />
            <p className="text-2xl font-serif font-bold text-white">{businessProfile.totalRosterSize}</p>
            <p className="text-[10px] text-white/60 uppercase font-mono tracking-wider">Musician Roster</p>
          </div>

          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-1">
            <Globe className="w-5 h-5 text-amber-400 mx-auto" />
            <p className="text-2xl font-serif font-bold text-amber-300">{businessProfile.stateOperations.length} States</p>
            <p className="text-[10px] text-white/60 uppercase font-mono tracking-wider">Multi-State Hubs</p>
          </div>

          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-1">
            <Film className="w-5 h-5 text-emerald-400 mx-auto" />
            <p className="text-2xl font-serif font-bold text-emerald-300">{businessProfile.portfolioLinks.length}</p>
            <p className="text-[10px] text-white/60 uppercase font-mono tracking-wider">Portfolio Items</p>
          </div>

          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-1">
            <DollarSign className="w-5 h-5 text-blue-400 mx-auto" />
            <p className="text-2xl font-serif font-bold text-blue-300">${businessProfile.allocatedStipendsBudgetUsd}</p>
            <p className="text-[10px] text-white/60 uppercase font-mono tracking-wider">Stipends Allocated</p>
          </div>

        </div>
      </div>

      {/* Tabs Bar */}
      <div className="relative z-10 py-6">
        <div className="max-w-6xl mx-auto w-full px-6 space-y-6">
          
          <div className="flex items-center justify-start overflow-x-auto space-x-2 border-b border-white/10 pb-3 no-scrollbar">
            <button
              onClick={() => setActiveTab('business')}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                activeTab === 'business'
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>1. Legal & Business Readiness</span>
            </button>

            <button
              onClick={() => setActiveTab('states')}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                activeTab === 'states'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>2. Multi-State Operations & Needs ({businessProfile.stateOperations.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('portfolio')}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                activeTab === 'portfolio'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>3. Aggregate Accomplishments Vault ({businessProfile.portfolioLinks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('roster')}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                activeTab === 'roster'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>4. Live Musician Radar</span>
            </button>

            <button
              onClick={() => setActiveTab('sync')}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                activeTab === 'sync'
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Cross-Domain Payload</span>
            </button>
          </div>

          {/* TAB 1: LEGAL & BUSINESS READINESS */}
          {activeTab === 'business' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-serif font-bold text-white">Incorporation & Legal Development Status</h2>
                <p className="text-xs text-white/60">Business entity readiness synced with law.beamthinktank.space and BEAM Business Incubator.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Legal Structure Card */}
                <div className="p-5 rounded-2xl bg-black/40 border border-amber-400/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-mono font-bold text-amber-300 uppercase">Entity Incorporation Status</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/40 text-[10px] font-mono">
                      {businessProfile.incorporationStatus}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <p className="text-white/80">Organization Name: <strong className="text-white">{businessProfile.organizationName}</strong></p>
                    <p className="text-white/80">State of Registration: <strong className="text-white">{businessProfile.stateOfRegistration}</strong></p>
                    <p className="text-white/80">FEIN Status: <strong className="text-amber-300">{businessProfile.feinStatus}</strong></p>
                    <p className="text-white/60 leading-relaxed pt-1">
                      {businessProfile.organizationName} is synced within the BEAM ecosystem. BEAM Law division assists with 501(c)(3) filing, entity chartering, and fiscal sponsorship.
                    </p>
                  </div>
                </div>

                {/* Content Generation Pipeline Card */}
                <div className="p-5 rounded-2xl bg-black/40 border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-mono font-bold text-purple-300 uppercase">Content Generation Pipeline</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-mono">
                      ACTIVE PIPELINE
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <p className="text-white/80">Media Capabilities:</p>
                    <ul className="space-y-1 text-white/70 pl-2">
                      {businessProfile.contentCapabilities.map((cap, idx) => (
                        <li key={idx} className="flex items-center space-x-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span>{cap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Legal Development Needs List */}
              <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white/80">
                    Active Business & Legal Development Needs (law.beamthinktank.space)
                  </h3>
                  <button
                    onClick={handleRequestLegalSupport}
                    className="px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-xs font-bold transition flex items-center space-x-1"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>Dispatch Legal Support</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {businessProfile.legalDevelopmentNeeds.map((need, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{need}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MULTI-STATE OPERATIONS & PARTICIPANT NEED MAPPING */}
          {activeTab === 'states' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-serif font-bold text-white">Multi-State Operations & Participant Need Mapping</h2>
                <p className="text-xs text-white/60">State-by-state node designations mapping regional musician needs for orchestra.beamthinktank.space.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {businessProfile.stateOperations.map((op) => (
                  <div key={op.stateCode} className="p-5 rounded-2xl bg-black/40 border border-purple-500/30 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="text-sm font-bold text-white flex items-center space-x-1.5">
                        <Globe className="w-4 h-4 text-purple-400" />
                        <span>{op.stateName} ({op.stateCode})</span>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold">
                        ACTIVE NODE
                      </span>
                    </div>

                    <p className="text-xs font-bold text-amber-300">{op.hubName}</p>
                    <p className="text-[11px] text-white/70 leading-relaxed">{op.operationsDescription}</p>

                    <div className="pt-2 border-t border-white/10 space-y-1">
                      <span className="text-[10px] text-white/50 uppercase font-mono block">Musician Roles Needed in {op.stateCode}:</span>
                      <div className="flex flex-wrap gap-1">
                        {op.neededMusicianRoles.map((role, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-white/10 text-white text-[10px] font-mono">
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: AGGREGATE ACCOMPLISHMENTS VAULT */}
          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-serif font-bold text-white">Aggregate Accomplishments & Media Vault</h2>
                  <p className="text-xs text-white/60">Portfolio of completed recitals, recording reels, grant documents, and press files.</p>
                </div>

                <button
                  onClick={() => setShowAddLinkModal(true)}
                  className="px-4 py-2 rounded-full bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition shadow-lg flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Project Link or File</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {businessProfile.portfolioLinks.map((link) => (
                  <div key={link.id} className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono">
                        {link.type}
                      </span>
                      <span className="text-[10px] text-white/40 font-mono">{link.dateAdded}</span>
                    </div>

                    <h3 className="text-sm font-serif font-bold text-white">{link.title}</h3>

                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between text-xs font-mono text-emerald-300 hover:text-emerald-200 transition"
                    >
                      <span className="truncate max-w-[260px]">{link.url}</span>
                      <ExternalLink className="w-4 h-4 shrink-0 ml-2" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: LIVE MUSICIAN RADAR */}
          {activeTab === 'roster' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-serif font-bold text-white">Live Musician Location Radar (Life360 Cross-Domain Sync)</h2>
                  <p className="text-xs text-white/60">Real-time GPS beacons broadcasting from active cohort musicians for ground transit & housing dispatch.</p>
                </div>
                <span className="text-xs font-mono text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/30">
                  Syncing with grounds.beamthinktank.space
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {roster.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-purple-500/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={m.headshotUrl}
                        alt={m.name}
                        className="w-12 h-12 rounded-full object-cover border border-white/20 shrink-0"
                      />
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-serif font-bold text-white">{m.name}</h3>
                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-mono">
                            {m.instrument}
                          </span>
                        </div>
                        <p className="text-xs text-white/60 font-sans">{m.role}</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {m.isLive ? (
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center space-x-2">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                          </span>
                          <span>LIVE: {m.currentCity}</span>
                        </div>
                      ) : (
                        <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-400 text-xs font-mono flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{m.currentCity}</span>
                        </div>
                      )}

                      <button
                        onClick={() => handleOpenDispatch(m)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-xs font-bold transition flex items-center space-x-1"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Dispatch Transit</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: CROSS-DOMAIN PAYLOAD */}
          {activeTab === 'sync' && (
            <div className="p-5 rounded-2xl bg-black/40 border border-purple-500/30 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-purple-300 font-semibold font-mono">Institutional Business Cross-Domain Payload</span>
                <button
                  onClick={handleCopyJson}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px] flex items-center space-x-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-black/80 border border-white/10 font-mono text-[10px] text-emerald-300 overflow-x-auto max-h-48 leading-relaxed">
                {JSON.stringify(institutionalPayload, null, 2)}
              </pre>
            </div>
          )}

        </div>
      </div>

      {/* Add Portfolio Link Modal */}
      {showAddLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#14151C] border border-white/20 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-serif font-bold text-white">Add Project Link or File</h3>
              <button onClick={() => setShowAddLinkModal(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-white/50 block mb-1 uppercase font-mono tracking-wider">Item Title</label>
                <input
                  type="text"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  placeholder="e.g. BADO Florida 2026 Recital Series / Grant Proposal"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-white/50 block mb-1 uppercase font-mono tracking-wider">Link Category</label>
                <select
                  value={newLinkType}
                  onChange={(e) => setNewLinkType(e.target.value as InstitutionalPortfolioLink['type'])}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="Video Reel">Video Reel</option>
                  <option value="Performance Link">Performance Link</option>
                  <option value="Press Kit / Doc">Press Kit / Doc</option>
                  <option value="Grant Document">Grant Document</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-white/50 block mb-1 uppercase font-mono tracking-wider">URL or File Link</label>
                <input
                  type="url"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or https://.../proposal.pdf"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <button
                onClick={handleAddPortfolioLink}
                disabled={!newLinkTitle || !newLinkUrl}
                className="w-full py-3 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition shadow-lg mt-2 disabled:opacity-50"
              >
                Save to Accomplishments Vault
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Transit Modal */}
      {showDispatchModal && selectedMusician && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#14151C] border border-amber-400/30 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2 text-amber-400">
                <Truck className="w-5 h-5" />
                <h3 className="text-base font-serif font-bold text-white">Dispatch Ground Transit</h3>
              </div>
              <button onClick={() => setShowDispatchModal(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-black/60 border border-white/10 flex items-center space-x-3">
                <img src={selectedMusician.headshotUrl} alt={selectedMusician.name} className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <p className="font-bold text-white text-sm">{selectedMusician.name}</p>
                  <p className="text-white/60">{selectedMusician.role}</p>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-white/50 block mb-1 uppercase font-mono tracking-wider">Pickup / Current Live Location</label>
                <input
                  type="text"
                  readOnly
                  value={selectedMusician.currentCity}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/20 text-emerald-300 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-white/50 block mb-1 uppercase font-mono tracking-wider">Destination Venue / Hub</label>
                <input
                  type="text"
                  value={dispatchDestination}
                  onChange={(e) => setDispatchDestination(e.target.value)}
                  placeholder="e.g. Steinway Gallery Orlando / Miller High Life Theatre"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                onClick={handleConfirmDispatch}
                className="w-full py-3 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition shadow-lg mt-2 flex items-center justify-center space-x-2"
              >
                <Truck className="w-4 h-4" />
                <span>Confirm Dispatch to grounds.beamthinktank.space</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
