'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Users, 
  Building2, 
  Tv, 
  Search, 
  ShieldCheck, 
  Radio, 
  MapPin, 
  Truck, 
  Coins, 
  DollarSign, 
  ExternalLink, 
  CheckCircle2, 
  Plus, 
  Filter, 
  FileText, 
  Award,
  Globe
} from 'lucide-react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { type ParticipantDemographics } from '@/lib/api/profile'

export interface AdminParticipantItem {
  id: string
  fullName: string
  email: string
  primaryRole: string
  primaryInstrument: string
  homeHub: string
  isBroadcastingLive?: boolean
  liveCity?: string
  usdTotalEarned: number
  beamCoinBalance: number
  disciplineTags?: string[]
}

export interface AdminInstitutionItem {
  id: string
  name: string
  tier: string
  hubs: string[]
  rosterCount: number
  allocatedStipendsUsd: number
  beamCoinsGenerated: number
  activeLiveBeacons: number
}

export interface AdminViewerItem {
  id: string
  name: string
  email: string
  membershipTier: string
  patronTokens: number
  sessionsWatchedCount: number
  lastWatched: string
}

const DEFAULT_PARTICIPANTS: AdminParticipantItem[] = [
  {
    id: 'p-1',
    fullName: 'Ezra Haugabrooks',
    email: 'ezra.haugabrooks@gmail.com',
    primaryRole: 'Section Leader & Resident Cellist',
    primaryInstrument: 'Violoncello (Cello)',
    homeHub: 'Milwaukee, WI / Chicago, IL',
    isBroadcastingLive: true,
    liveCity: 'Orlando, FL (Steinway Gallery Residency)',
    usdTotalEarned: 1485,
    beamCoinBalance: 48,
    disciplineTags: ['Resident Cellist', 'Steinway Specialist', 'Media Producer']
  },
  {
    id: 'p-2',
    fullName: 'Elena Rostova',
    email: 'elena.rostova@bdso.org',
    primaryRole: 'Principal Concertmaster',
    primaryInstrument: 'Violin I',
    homeHub: 'Chicago, IL',
    isBroadcastingLive: false,
    liveCity: 'Chicago, IL',
    usdTotalEarned: 2200,
    beamCoinBalance: 64,
    disciplineTags: ['Concertmaster', 'Chamber Leader']
  },
  {
    id: 'p-3',
    fullName: 'Marcus Vance',
    email: 'marcus.vance@steinway.com',
    primaryRole: 'Steinway Piano Technician & Cellist',
    primaryInstrument: 'Piano / Cello',
    homeHub: 'Milwaukee, WI',
    isBroadcastingLive: true,
    liveCity: 'Milwaukee, WI (Miller High Life Theatre)',
    usdTotalEarned: 1850,
    beamCoinBalance: 52,
    disciplineTags: ['Piano Technician', 'Resident Cellist']
  },
  {
    id: 'p-4',
    fullName: 'Sophia Chen',
    email: 'sophia.chen@concord.org',
    primaryRole: 'Principal Oboe & Woodwind Lead',
    primaryInstrument: 'Oboe',
    homeHub: 'Atlanta, GA',
    isBroadcastingLive: true,
    liveCity: 'Atlanta, GA (Touring)',
    usdTotalEarned: 1950,
    beamCoinBalance: 58,
    disciplineTags: ['Woodwind Lead', 'Soloist']
  }
]

const DEFAULT_INSTITUTIONS: AdminInstitutionItem[] = [
  {
    id: 'inst-1',
    name: 'Ballet & Dance Orchestra (BDO)',
    tier: 'Core Institutional Performance Partner',
    hubs: ['Milwaukee, WI', 'Chicago, IL', 'Orlando, FL'],
    rosterCount: 18,
    allocatedStipendsUsd: 8910,
    beamCoinsGenerated: 216,
    activeLiveBeacons: 3
  },
  {
    id: 'inst-2',
    name: 'Black Diaspora Symphony Orchestra (BDSO)',
    tier: 'Founding Symphonic Partner',
    hubs: ['Milwaukee, WI', 'Chicago, IL'],
    rosterCount: 32,
    allocatedStipendsUsd: 14200,
    beamCoinsGenerated: 340,
    activeLiveBeacons: 5
  },
  {
    id: 'inst-3',
    name: 'Steinway Gallery Node — Orlando',
    tier: 'Recording & Residency Node',
    hubs: ['Orlando, FL'],
    rosterCount: 8,
    allocatedStipendsUsd: 4800,
    beamCoinsGenerated: 120,
    activeLiveBeacons: 2
  }
]

const DEFAULT_VIEWERS: AdminViewerItem[] = [
  {
    id: 'v-1',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@patron.org',
    membershipTier: 'All-Access Patron Supporter',
    patronTokens: 120,
    sessionsWatchedCount: 14,
    lastWatched: 'Schumann Adagio & Allegro — Steinway Gallery'
  },
  {
    id: 'v-2',
    name: 'David Miller',
    email: 'david.m@musiclover.com',
    membershipTier: 'Vault Supporter Pass',
    patronTokens: 85,
    sessionsWatchedCount: 9,
    lastWatched: 'Margaret Bonds Ballad of the Brown King'
  },
  {
    id: 'v-3',
    name: 'Amara Okafor',
    email: 'amara.okafor@diaspora.org',
    membershipTier: 'All-Access Patron Supporter',
    patronTokens: 200,
    sessionsWatchedCount: 22,
    lastWatched: 'Florence Price Piano Concerto — Chamber Cut'
  }
]

export default function OrchestraNetworkAdminDirectory({ adminEmail }: { adminEmail: string }) {
  const [activeTab, setActiveTab] = useState<'participants' | 'institutions' | 'viewers'>('participants')
  const [searchQuery, setSearchQuery] = useState('')
  const [participants, setParticipants] = useState<AdminParticipantItem[]>(DEFAULT_PARTICIPANTS)
  const [institutions, setInstitutions] = useState<AdminInstitutionItem[]>(DEFAULT_INSTITUTIONS)
  const [viewers, setViewers] = useState<AdminViewerItem[]>(DEFAULT_VIEWERS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadFirestoreDirectory() {
      if (!db) {
        setLoading(false)
        return
      }
      try {
        const snap = await getDocs(collection(db, 'participantProfiles'))
        if (!snap.empty) {
          const loaded: AdminParticipantItem[] = snap.docs.map(doc => {
            const data = doc.data() as ParticipantDemographics
            return {
              id: doc.id,
              fullName: data.fullName || doc.id,
              email: data.email || '',
              primaryRole: data.primaryRole || 'Musician',
              primaryInstrument: data.primaryInstrument || 'Strings',
              homeHub: data.homeHub || 'Member Hub',
              isBroadcastingLive: Boolean(data.current_live_location?.isBroadcasting),
              liveCity: data.current_live_location?.cityState || data.roamingCity || data.homeHub,
              usdTotalEarned: data.usdTotalEarned || 0,
              beamCoinBalance: data.beamCoinBalance || 0,
              disciplineTags: data.disciplineTags || [data.primaryInstrument]
            }
          })
          
          // Merge with default list for complete directory view
          const ids = new Set(loaded.map(l => l.email.toLowerCase()))
          const combined = [...loaded, ...DEFAULT_PARTICIPANTS.filter(p => !ids.has(p.email.toLowerCase()))]
          setParticipants(combined)
        }
      } catch (err) {
        console.warn('Could not load Firestore directory, using pre-populated profiles:', err)
      } finally {
        setLoading(false)
      }
    }
    loadFirestoreDirectory()
  }, [])

  const filteredParticipants = participants.filter(p => 
    p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.primaryInstrument.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.homeHub.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredInstitutions = institutions.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.tier.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredViewers = viewers.filter(v =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="w-full bg-[#07080A] text-white font-sans selection:bg-white/20 p-6 sm:p-8 space-y-6">
      
      {/* Top Admin Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#0F1015] border border-amber-400/30 shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>General Orchestra Admin Directory</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono">
              {adminEmail}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white tracking-wide">
            BEAM Orchestra Network Directory
          </h1>
          <p className="text-xs text-white/60 font-sans max-w-xl">
            Unified management dashboard for <strong className="text-white">{adminEmail}</strong> to view and inspect all Participants, Institutional Cohorts, and Studio Vault Viewers.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <Link
            href="/profile"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition flex items-center space-x-1.5"
          >
            <Users className="w-4 h-4 text-amber-400" />
            <span>Participant Profile View</span>
          </Link>

          <Link
            href="/institution/profile"
            className="px-4 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-semibold transition flex items-center space-x-1.5"
          >
            <Building2 className="w-4 h-4" />
            <span>Institutional Cohort Profile</span>
          </Link>
        </div>
      </div>

      {/* Directory Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div className="p-4 rounded-2xl bg-[#0F1015] border border-white/10 space-y-1">
          <Users className="w-5 h-5 text-amber-400 mx-auto" />
          <p className="text-2xl font-serif font-bold text-white">{participants.length}</p>
          <p className="text-[10px] text-white/60 uppercase font-mono tracking-wider">Registered Participants</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F1015] border border-white/10 space-y-1">
          <Building2 className="w-5 h-5 text-purple-400 mx-auto" />
          <p className="text-2xl font-serif font-bold text-purple-300">{institutions.length}</p>
          <p className="text-[10px] text-white/60 uppercase font-mono tracking-wider">Institutional Cohorts</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F1015] border border-white/10 space-y-1">
          <Tv className="w-5 h-5 text-emerald-400 mx-auto" />
          <p className="text-2xl font-serif font-bold text-emerald-300">{viewers.length}</p>
          <p className="text-[10px] text-white/60 uppercase font-mono tracking-wider">Studio Vault Viewers</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F1015] border border-white/10 space-y-1">
          <DollarSign className="w-5 h-5 text-blue-400 mx-auto" />
          <p className="text-2xl font-serif font-bold text-blue-300">$27,910</p>
          <p className="text-[10px] text-white/60 uppercase font-mono tracking-wider">Total Contract Stipends</p>
        </div>
      </div>

      {/* Tabs & Search Filter Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        
        {/* Directory Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('participants')}
            className={`px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-2 ${
              activeTab === 'participants'
                ? 'bg-amber-400 text-black shadow-lg font-bold'
                : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>1. Musician Participants ({participants.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('institutions')}
            className={`px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-2 ${
              activeTab === 'institutions'
                ? 'bg-purple-500 text-white shadow-lg font-bold'
                : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>2. Institutional Cohorts ({institutions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('viewers')}
            className={`px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-2 ${
              activeTab === 'viewers'
                ? 'bg-emerald-500 text-black shadow-lg font-bold'
                : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>3. Studio Vault Viewers ({viewers.length})</span>
          </button>
        </div>

        {/* Live Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search directory..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white text-xs font-sans focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* TAB 1: MUSICIAN PARTICIPANTS DIRECTORY */}
      {activeTab === 'participants' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-white">Musician Participants Directory</h2>
            <span className="text-xs font-mono text-amber-300">
              Showing {filteredParticipants.length} Participants
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredParticipants.map((p) => (
              <div
                key={p.id}
                className="p-5 rounded-2xl bg-[#0F1015] border border-white/10 hover:border-amber-400/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-serif font-bold text-white">{p.fullName}</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-mono font-bold">
                      {p.primaryInstrument}
                    </span>
                  </div>

                  <p className="text-xs text-white/70 font-sans">{p.email} · {p.primaryRole}</p>
                  <p className="text-[11px] text-white/50 font-mono">Home Node: {p.homeHub}</p>

                  {/* Discipline Pills */}
                  {p.disciplineTags && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {p.disciplineTags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-mono">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {p.isBroadcastingLive ? (
                    <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center space-x-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                      <span>LIVE: {p.liveCity}</span>
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-400 text-xs font-mono flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{p.liveCity}</span>
                    </div>
                  )}

                  <div className="text-right text-xs font-mono px-3 py-1.5 rounded-xl bg-black/40 border border-white/10">
                    <p className="text-emerald-400 font-bold">${p.usdTotalEarned} USD</p>
                    <p className="text-amber-400 font-bold">{p.beamCoinBalance} BEAM</p>
                  </div>

                  <Link
                    href={`/profile?email=${encodeURIComponent(p.email)}`}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition"
                  >
                    View Profile →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: INSTITUTIONAL COHORTS DIRECTORY */}
      {activeTab === 'institutions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-white">Institutional Cohorts Directory</h2>
            <span className="text-xs font-mono text-purple-300">
              Showing {filteredInstitutions.length} Institutional Partners
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredInstitutions.map((inst) => (
              <div
                key={inst.id}
                className="p-5 rounded-2xl bg-[#0F1015] border border-purple-500/30 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-serif font-bold text-white">{inst.name}</h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-mono">
                        {inst.tier}
                      </span>
                    </div>
                    <p className="text-xs text-white/60 font-mono mt-0.5">
                      Hubs: {inst.hubs.join(' · ')}
                    </p>
                  </div>

                  <Link
                    href="/institution/profile"
                    className="px-4 py-2 rounded-xl bg-purple-500 text-white font-bold text-xs hover:bg-purple-400 transition shadow-lg shrink-0 text-center"
                  >
                    Open Institutional Profile →
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <p className="text-white font-bold text-base">{inst.rosterCount}</p>
                    <p className="text-white/50 text-[10px]">Roster Musicians</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <p className="text-emerald-400 font-bold text-base">${inst.allocatedStipendsUsd}</p>
                    <p className="text-white/50 text-[10px]">Stipends Budget</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <p className="text-amber-400 font-bold text-base">{inst.beamCoinsGenerated}</p>
                    <p className="text-white/50 text-[10px]">BEAM Coins</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <p className="text-emerald-300 font-bold text-base">🟢 {inst.activeLiveBeacons} Live</p>
                    <p className="text-white/50 text-[10px]">GPS Beacons</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: STUDIO VAULT VIEWERS DIRECTORY */}
      {activeTab === 'viewers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-white">Studio Vault Viewers & Patrons Directory</h2>
            <span className="text-xs font-mono text-emerald-300">
              Showing {filteredViewers.length} Media Viewers
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {filteredViewers.map((vw) => (
              <div key={vw.id} className="p-5 rounded-2xl bg-[#0F1015] border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono">
                    {vw.membershipTier}
                  </span>
                  <span className="text-[10px] font-mono text-amber-300 font-bold">{vw.patronTokens} Tokens</span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white">{vw.name}</h3>
                  <p className="text-xs text-white/60">{vw.email}</p>
                </div>

                <div className="pt-2 border-t border-white/10 text-[11px] space-y-1 font-mono text-white/70">
                  <p>Watched Sessions: <strong className="text-white">{vw.sessionsWatchedCount}</strong></p>
                  <p className="truncate">Last Watched: <strong className="text-amber-300">{vw.lastWatched}</strong></p>
                </div>

                <Link
                  href="/audience/profile"
                  className="block w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-center text-xs font-semibold transition"
                >
                  View Audience Profile →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
