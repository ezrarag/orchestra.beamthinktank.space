'use client'

import { useState } from 'react'
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
  Globe
} from 'lucide-react'

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
  const [roster, setRoster] = useState<CohortMusician[]>(INITIAL_ROSTER)
  const [activeTab, setActiveTab] = useState<'roster' | 'projects' | 'services' | 'sync'>('roster')
  const [copied, setCopied] = useState(false)

  // Dispatch Ground Transit Modal State
  const [showDispatchModal, setShowDispatchModal] = useState(false)
  const [selectedMusician, setSelectedMusician] = useState<CohortMusician | null>(null)
  const [dispatchDestination, setDispatchDestination] = useState('')
  const [dispatchNotice, setDispatchNotice] = useState('')

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

  const institutionalPayload = {
    institutionName: 'Ballet & Dance Orchestra (BDO)',
    institutionalTier: 'Core Institutional Performance Partner',
    subdomainSource: 'orchestra',
    hubs: ['Milwaukee, WI', 'Chicago, IL', 'Orlando, FL'],
    rosterSize: roster.length + 14,
    allocatedStipendsUsd: 8910,
    generatedBeamCoins: 216,
    activeLiveBeaconsCount: roster.filter(r => r.isLive).length,
    activeLiveBeacons: roster.filter(r => r.isLive).map(r => ({
      musician: r.name,
      role: r.role,
      location: r.currentCity,
      coords: r.coords
    })),
    wraparoundDelivered: {
      transitRidesFunded: 42,
      housingNightsAllocated: 18,
      mealPerDiemsIssued: 54,
      luthierMaintenanceFunded: 6
    }
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(institutionalPayload, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="w-full bg-[#07080A] text-white font-sans selection:bg-white/20">
      
      {/* Toast Notification */}
      {dispatchNotice && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-emerald-500 text-black font-bold text-xs shadow-2xl flex items-center space-x-2 animate-bounce">
          <Truck className="w-4 h-4" />
          <span>{dispatchNotice}</span>
        </div>
      )}

      {/* Hero Header Section */}
      <div className="relative w-full h-[52dvh] min-h-[340px] max-h-[520px] overflow-hidden bg-[#0A0B0E]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E1B38] via-[#121424] to-[#07080A] flex items-center justify-center relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(168,85,247,0.18),_transparent_65%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(212,175,55,0.12),_transparent_65%)]" />
        </div>

        {/* Top Scrim */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0F1015] via-[#0F1015]/80 to-transparent pointer-events-none z-10" />

        {/* Overlaid Left-Aligned Institution Banner */}
        <div className="absolute bottom-6 inset-x-0 z-20">
          <div className="max-w-6xl mx-auto w-full px-6 text-left space-y-3">
            
            {/* Institution Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-400/20 backdrop-blur-md border border-amber-400/40 text-amber-300 text-xs font-mono font-bold flex items-center space-x-1.5 shadow-lg">
                <Building2 className="w-3.5 h-3.5" />
                <span>Ballet & Dance Orchestra (BDO)</span>
              </span>

              <span className="px-3 py-1 rounded-full bg-purple-500/20 backdrop-blur-md border border-purple-500/40 text-purple-300 text-xs font-mono font-semibold">
                Core Performance Partner
              </span>

              <span className="px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold flex items-center space-x-1">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>3 Live Beacons Broadcasting</span>
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-wide drop-shadow-md">
              Ballet & Dance Orchestra Cohort
            </h1>
            <p className="text-xs sm:text-sm font-sans text-white/80 max-w-2xl leading-relaxed">
              Institutional Ensemble Hub coordinating contract orchestra projects, live musician location tracking, and ground transit wraparound logistics across Milwaukee, Chicago, and Orlando.
            </p>
          </div>
        </div>
      </div>

      {/* Action Row */}
      <div className="relative z-20 bg-[#0F1015] py-4 border-b border-white/10">
        <div className="max-w-6xl mx-auto w-full px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                if (roster.length > 0) handleOpenDispatch(roster[0])
              }}
              className="py-3 px-6 rounded-full bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition shadow-xl flex items-center space-x-2"
            >
              <Truck className="w-4 h-4" />
              <span>Dispatch Ground Transit (grounds.beamthinktank.space)</span>
            </button>

            <Link
              href="https://grounds.beamthinktank.space"
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs transition flex items-center space-x-1.5"
            >
              <span>Open Grounds Portal</span>
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            </Link>
          </div>

          <span className="text-xs font-mono text-white/50">
            Institutional ID: <strong className="text-white">inst_bdo_2026</strong>
          </span>
        </div>
      </div>

      {/* Institutional Key Metrics Row */}
      <div className="relative z-10 py-6 bg-[#0B0C10]">
        <div className="max-w-6xl mx-auto w-full px-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          
          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-1">
            <Users className="w-5 h-5 text-purple-400 mx-auto" />
            <p className="text-2xl font-serif font-bold text-white">18</p>
            <p className="text-[10px] text-white/60 uppercase font-mono tracking-wider">Assigned Musicians</p>
          </div>

          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-1">
            <DollarSign className="w-5 h-5 text-emerald-400 mx-auto" />
            <p className="text-2xl font-serif font-bold text-emerald-400">$8,910</p>
            <p className="text-[10px] text-white/60 uppercase font-mono tracking-wider">Stipends Allocated</p>
          </div>

          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-1">
            <Coins className="w-5 h-5 text-amber-400 mx-auto" />
            <p className="text-2xl font-serif font-bold text-amber-400">216</p>
            <p className="text-[10px] text-white/60 uppercase font-mono tracking-wider">BEAM Coins Generated</p>
          </div>

          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-1">
            <Calendar className="w-5 h-5 text-blue-400 mx-auto" />
            <p className="text-2xl font-serif font-bold text-blue-300">3</p>
            <p className="text-[10px] text-white/60 uppercase font-mono tracking-wider">Active Contract Projects</p>
          </div>

        </div>
      </div>

      {/* Tabs Bar */}
      <div className="relative z-10 py-6">
        <div className="max-w-6xl mx-auto w-full px-6 space-y-6">
          
          <div className="flex items-center justify-start overflow-x-auto space-x-2 border-b border-white/10 pb-3">
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                activeTab === 'roster'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>1. Live Location Roster Radar</span>
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                activeTab === 'projects'
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>2. Cohort Projects & Runs</span>
            </button>

            <button
              onClick={() => setActiveTab('services')}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                activeTab === 'services'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>3. Wraparound Logistics Delivered</span>
            </button>

            <button
              onClick={() => setActiveTab('sync')}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                activeTab === 'sync'
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Cross-Domain Payload</span>
            </button>
          </div>

          {/* TAB 1: LIVE LOCATION ROSTER RADAR */}
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

          {/* TAB 2: COHORT PROJECTS */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <h2 className="text-lg font-serif font-bold text-white">Active Cohort Contract Runs</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-black/40 border border-amber-400/30 space-y-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-mono font-bold uppercase">
                    Full Symphony Showcase
                  </span>
                  <h3 className="text-sm font-serif font-bold text-white">Spring 2026 Ballet & Dance Symphonic Showcase</h3>
                  <p className="text-xs text-white/60">Miller High Life Theatre · Milwaukee, WI</p>
                  <div className="pt-2 border-t border-white/10 flex justify-between text-xs font-mono">
                    <span className="text-emerald-400 font-bold">$3,200 USD</span>
                    <span className="text-amber-400 font-bold">+48 BEAM</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/30 space-y-2">
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold uppercase">
                    Recording Residency
                  </span>
                  <h3 className="text-sm font-serif font-bold text-white">Schumann & Bonds Masterwork Recording Series</h3>
                  <p className="text-xs text-white/60">Steinway Gallery · Orlando, FL</p>
                  <div className="pt-2 border-t border-white/10 flex justify-between text-xs font-mono">
                    <span className="text-emerald-400 font-bold">$2,400 USD</span>
                    <span className="text-amber-400 font-bold">+36 BEAM</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-blue-500/30 space-y-2">
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold uppercase">
                    Multi-City Tour
                  </span>
                  <h3 className="text-sm font-serif font-bold text-white">BDSO & BDO Joint Multi-City Tour 2026</h3>
                  <p className="text-xs text-white/60">Milwaukee → Concord → Orlando → Miami</p>
                  <div className="pt-2 border-t border-white/10 flex justify-between text-xs font-mono">
                    <span className="text-emerald-400 font-bold">$3,310 USD</span>
                    <span className="text-amber-400 font-bold">+48 BEAM</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WRAPAROUND LOGISTICS DELIVERED */}
          {activeTab === 'services' && (
            <div className="space-y-4">
              <h2 className="text-lg font-serif font-bold text-white">Wraparound Infrastructure Delivered to Musicians</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-black/40 border border-amber-400/30 flex items-start space-x-3">
                  <Truck className="w-6 h-6 text-amber-400 mt-1 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-white">42 Ground Transit Rides Funded</h3>
                    <p className="text-xs text-white/60 mt-0.5">Dispatched through grounds.beamthinktank.space for multi-city travel & airport pick-ups.</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/30 flex items-start space-x-3">
                  <Building2 className="w-6 h-6 text-purple-400 mt-1 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-white">18 Residency Housing Nights Allocated</h3>
                    <p className="text-xs text-white/60 mt-0.5">Steinway Gallery Orlando lodgings & Concord Symphony artist housing.</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 flex items-start space-x-3">
                  <Utensils className="w-6 h-6 text-emerald-400 mt-1 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-white">54 Catering & Meal Per Diems Issued</h3>
                    <p className="text-xs text-white/60 mt-0.5">Nutritional & rehearsal catering support provided during contract intensive runs.</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-blue-500/30 flex items-start space-x-3">
                  <Wrench className="w-6 h-6 text-blue-400 mt-1 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-white">6 Luthier & Bow Rehairs Funded</h3>
                    <p className="text-xs text-white/60 mt-0.5">Instrument care & repair credits issued via BEAM Coin redemption Phase 1.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CROSS-DOMAIN PAYLOAD */}
          {activeTab === 'sync' && (
            <div className="p-5 rounded-2xl bg-black/40 border border-purple-500/30 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-purple-300 font-semibold font-mono">Institutional Cross-Domain Sync Payload</span>
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
