'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MapPin, 
  Users, 
  Plane, 
  Home as HomeIcon, 
  Utensils, 
  Coins, 
  DollarSign, 
  Filter, 
  CheckCircle2, 
  Search, 
  Building2, 
  Sparkles, 
  X,
  ChevronRight,
  Calculator,
  Compass
} from 'lucide-react'
import { getProfiles } from '@/lib/profiles'
import type { Profile, PipelineSourceTag } from '@/lib/types/profile'
import { ENSEMBLE_CONFIGS, EnsembleConfig } from '@/lib/config/ensembles'

// City Geographic Plot Map (Simplified SVG Canvas Coordinates 0..100)
const CITY_MAP_PINS: Record<string, { x: number; y: number; name: string }> = {
  'milwaukee, wi': { x: 55, y: 35, name: 'Milwaukee, WI' },
  'milwaukee': { x: 55, y: 35, name: 'Milwaukee, WI' },
  'concord': { x: 82, y: 22, name: 'Concord' },
  'madison, wi': { x: 48, y: 36, name: 'Madison, WI' },
  'chicago, il': { x: 56, y: 44, name: 'Chicago, IL' },
  'atlanta, ga': { x: 62, y: 72, name: 'Atlanta, GA' },
  'orlando, fl': { x: 74, y: 84, name: 'Orlando, FL' },
  'miami, fl': { x: 78, y: 92, name: 'Miami, FL' },
  'tampa, fl': { x: 72, y: 88, name: 'Tampa, FL' }
}

const DEFAULT_PROJECTS = Object.values(ENSEMBLE_CONFIGS)

// Rates for Infrastructure Support Delta calculation
const INFRASTRUCTURE_RATES = {
  airfareBaseline: 350,   // Standard domestic roundtrip/transit stipend
  lodgingNightly: 150,    // Daily hotel/housing stipend
  mealsPerDiemDaily: 45,  // Daily meal per diem
  defaultProjectDays: 3   // Rehearsal + concert cycle length in days
}

export default function TalentDiscoveryMap() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedHostProject, setSelectedHostProject] = useState<EnsembleConfig>(DEFAULT_PROJECTS[0])
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [pipelineFilter, setPipelineFilter] = useState<string>('all')
  const [travelOnlyFilter, setTravelOnlyFilter] = useState<boolean>(false)
  const [infraFilter, setInfraFilter] = useState<string>('all')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const fetched = await getProfiles()
        if (!mounted) return
        setProfiles(fetched)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching talent profiles:', err)
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  // Filter Logic
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const nameMatch = p.name.toLowerCase().includes(q)
        const instMatch = (p.instrument || '').toLowerCase().includes(q)
        const cityMatch = (p.city_state || p.location || '').toLowerCase().includes(q)
        if (!nameMatch && !instMatch && !cityMatch) return false
      }

      // Role / Section
      if (roleFilter !== 'all') {
        const section = (p.section || '').toLowerCase()
        const instrument = (p.instrument || '').toLowerCase()
        if (roleFilter === 'strings' && !section.includes('string') && !instrument.includes('violin') && !instrument.includes('cello') && !instrument.includes('viola') && !instrument.includes('bass')) return false
        if (roleFilter === 'winds' && !section.includes('wind') && !section.includes('brass') && !instrument.includes('flute') && !instrument.includes('oboe') && !instrument.includes('clarinet') && !instrument.includes('horn') && !instrument.includes('trumpet') && !instrument.includes('trombone')) return false
        if (roleFilter === 'conductor' && !section.includes('conductor') && !instrument.includes('conductor')) return false
        if (roleFilter === 'media' && !section.includes('media') && !instrument.includes('audio') && !instrument.includes('video')) return false
      }

      // Pipeline Source
      if (pipelineFilter !== 'all') {
        const pSource = p.pipeline_source || p.pipelineSource || ''
        if (pSource !== pipelineFilter) return false
      }

      // Willingness to Travel
      if (travelOnlyFilter) {
        const willing = typeof p.willingness_to_travel === 'boolean' ? p.willingness_to_travel : p.willingnessToTravel
        if (!willing) return false
      }

      // Infrastructure Needs
      if (infraFilter !== 'all') {
        const infra = p.infrastructure_needs || p.infrastructureNeeds
        if (!infra) return false
        if (infraFilter === 'housing' && !infra.housing) return false
        if (infraFilter === 'flights' && !(infra.flights_transport || infra.flightsTransport)) return false
        if (infraFilter === 'meals' && !(infra.meals_per_diem || infra.mealsPerDiem)) return false
      }

      return true
    })
  }, [profiles, searchQuery, roleFilter, pipelineFilter, travelOnlyFilter, infraFilter])

  // Support Delta Calculator Function
  const calculateInfrastructureDelta = (profile: Profile, project: EnsembleConfig) => {
    const candidateCity = (profile.city_state || profile.location || '').toLowerCase()
    const hostCity = project.city.toLowerCase()

    const isLocal = candidateCity.includes(hostCity.replace(/, wi|, fl|, ga/g, '').trim())

    const infra = profile.infrastructure_needs || profile.infrastructureNeeds

    let airfareCost = 0
    let housingCost = 0
    let mealsCost = 0

    if (!isLocal && infra) {
      if (infra.flights_transport || infra.flightsTransport) {
        airfareCost = INFRASTRUCTURE_RATES.airfareBaseline
      }
      if (infra.housing) {
        housingCost = INFRASTRUCTURE_RATES.lodgingNightly * INFRASTRUCTURE_RATES.defaultProjectDays
      }
      if (infra.meals_per_diem || infra.mealsPerDiem) {
        mealsCost = INFRASTRUCTURE_RATES.mealsPerDiemDaily * INFRASTRUCTURE_RATES.defaultProjectDays
      }
    }

    const totalDelta = airfareCost + housingCost + mealsCost
    const usdBaseStipend = project.compensation.usdTotal
    const beamCoinsReward = project.compensation.beamCoinsTotal
    const totalUSDCommitment = usdBaseStipend + totalDelta

    return {
      isLocal,
      airfareCost,
      housingCost,
      mealsCost,
      totalDelta,
      usdBaseStipend,
      beamCoinsReward,
      totalUSDCommitment
    }
  }

  return (
    <div className="bg-slate-950 text-white rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
      {/* Top Bar / Header */}
      <div className="bg-gradient-to-r from-purple-900/40 via-slate-900 to-blue-900/40 p-6 sm:p-8 border-b border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs uppercase tracking-[0.25em] text-purple-400 font-bold mb-2">
              <Compass className="w-4 h-4 text-purple-400" />
              <span>Spatial Network & Budget Discovery</span>
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Talent Pipeline Map & Support Delta Calculator</h2>
            <p className="text-gray-300 text-sm mt-1 max-w-2xl">
              Discover registered musicians, filter by pipeline origin, and calculate wraparound infrastructure deltas for host projects.
            </p>
          </div>

          {/* Host Project Selector */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/15 min-w-[280px]">
            <label className="text-xs font-semibold uppercase tracking-wider text-purple-300 block mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-purple-400" /> Active Host Project
            </label>
            <select
              value={selectedHostProject.slug}
              onChange={(e) => {
                const found = DEFAULT_PROJECTS.find(p => p.slug === e.target.value)
                if (found) setSelectedHostProject(found)
              }}
              className="w-full bg-slate-900 border border-white/20 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-purple-400"
            >
              {DEFAULT_PROJECTS.map((proj) => (
                <option key={proj.slug} value={proj.slug} className="bg-slate-900 text-white">
                  {proj.name} ({proj.city})
                </option>
              ))}
            </select>
            <div className="mt-2 text-xs text-gray-400 flex justify-between">
              <span>Base Stipend: <strong className="text-green-400">${selectedHostProject.compensation.usdTotal}</strong></span>
              <span>BEAM Reward: <strong className="text-amber-400">{selectedHostProject.compensation.beamCoinsTotal} Coins</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="p-6 bg-white/[0.02] border-b border-white/10 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, instrument, city..."
              className="w-full bg-white/5 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
          >
            <option value="all">All Roles & Instruments</option>
            <option value="strings">String Players</option>
            <option value="winds">Winds & Brass</option>
            <option value="conductor">Conductors</option>
            <option value="media">Media Editors</option>
          </select>

          {/* Pipeline Source Filter */}
          <select
            value={pipelineFilter}
            onChange={(e) => setPipelineFilter(e.target.value)}
            className="bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
          >
            <option value="all">All Pipeline Sources</option>
            <option value="BDSO Core">BDSO Core</option>
            <option value="Concord Candidate">Concord Candidate</option>
            <option value="MYSO Alumni">MYSO Alumni</option>
            <option value="ASO Sub/Reject List">ASO Sub/Reject List</option>
            <option value="BEAM Talent Pipeline">BEAM Talent Pipeline</option>
          </select>

          {/* Infrastructure Need Filter */}
          <select
            value={infraFilter}
            onChange={(e) => setInfraFilter(e.target.value)}
            className="bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
          >
            <option value="all">All Infrastructure Needs</option>
            <option value="housing">Needs Housing</option>
            <option value="flights">Needs Flights/Transit</option>
            <option value="meals">Needs Per Diem</option>
          </select>

          {/* Willingness to Travel Toggle Button */}
          <button
            onClick={() => setTravelOnlyFilter(!travelOnlyFilter)}
            className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              travelOnlyFilter
                ? 'bg-purple-600 border-purple-400 text-white shadow-lg'
                : 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/10'
            }`}
          >
            <Plane className="w-3.5 h-3.5" />
            <span>Willing to Travel Only</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Showing <strong className="text-white">{filteredProfiles.length}</strong> registered candidates</span>
          {(searchQuery || roleFilter !== 'all' || pipelineFilter !== 'all' || infraFilter !== 'all' || travelOnlyFilter) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setRoleFilter('all')
                setPipelineFilter('all')
                setInfraFilter('all')
                setTravelOnlyFilter(false)
              }}
              className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
            >
              <X className="w-3.5 h-3.5" /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Spatial Map Visualizer & Candidate Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        
        {/* Left Column: Spatial Map Visualizer */}
        <div className="lg:col-span-7 p-6 border-r border-b lg:border-b-0 border-white/10 bg-slate-950 relative flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase font-bold tracking-wider text-gray-400">Talent Density Map</span>
            <span className="text-xs text-purple-300 font-semibold bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
              Host: {selectedHostProject.city}
            </span>
          </div>

          {/* Interactive Map Visualizer Canvas */}
          <div className="relative w-full h-[420px] bg-slate-900/60 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center p-4">
            {/* Map Grid Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#3b0764_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

            {/* City Nodes */}
            {Object.entries(CITY_MAP_PINS).map(([key, pin]) => {
              const cityCandidates = filteredProfiles.filter((p) => 
                (p.city_state || p.location || '').toLowerCase().includes(key.replace(/, wi|, fl|, ga/g, '').trim())
              )

              const isHostCity = pin.name.toLowerCase().includes(selectedHostProject.city.toLowerCase().replace(/, wi/g, ''))

              return (
                <motion.div
                  key={key}
                  style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                >
                  <div className="relative flex flex-col items-center">
                    {/* Node Pulse Effect */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                      isHostCity
                        ? 'bg-amber-500/30 border-amber-400 text-amber-300 ring-4 ring-amber-500/20'
                        : cityCandidates.length > 0
                        ? 'bg-purple-500/30 border-purple-400 text-purple-300 ring-4 ring-purple-500/20'
                        : 'bg-slate-800 border-slate-700 text-gray-500'
                    }`}>
                      <MapPin className="w-4 h-4" />
                    </div>

                    {/* Candidate Badge */}
                    {cityCandidates.length > 0 && (
                      <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center shadow-lg">
                        {cityCandidates.length}
                      </span>
                    )}

                    {/* Label */}
                    <span className={`text-[11px] font-bold mt-1 px-2 py-0.5 rounded bg-slate-950/80 border whitespace-nowrap ${
                      isHostCity ? 'text-amber-300 border-amber-500/40' : 'text-gray-200 border-white/10'
                    }`}>
                      {pin.name} {isHostCity ? '(Host)' : ''}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>

          <div className="mt-4 text-xs text-gray-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Host City Location</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" /> Candidate Origin Nodes</span>
          </div>
        </div>

        {/* Right Column: Roster & Budget Delta Cards */}
        <div className="lg:col-span-5 p-6 space-y-4 max-h-[680px] overflow-y-auto">
          <h3 className="text-lg font-bold text-white flex items-center justify-between">
            <span>Candidate Roster & Support Deltas</span>
            <span className="text-xs font-normal text-gray-400">{filteredProfiles.length} candidates</span>
          </h3>

          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Loading registered talent pipeline...</div>
          ) : filteredProfiles.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm border border-white/10 rounded-2xl bg-white/5 p-6">
              No candidates found matching the selected filter criteria.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProfiles.map((p) => {
                const delta = calculateInfrastructureDelta(p, selectedHostProject)
                const isSelected = selectedProfile?.id === p.id

                return (
                  <motion.div
                    key={p.id}
                    onClick={() => setSelectedProfile(isSelected ? null : p)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-900/30 border-purple-400 shadow-xl'
                        : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-white">{p.name}</h4>
                          {p.pipeline_source || p.pipelineSource ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {p.pipeline_source || p.pipelineSource}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-gray-300 mt-1 font-medium">
                          {p.instrument || 'Instrument TBD'} • {p.city_state || p.location || 'Milwaukee, WI'}
                        </p>
                      </div>

                      {/* Travel Willingness Badge */}
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                        p.willingness_to_travel || p.willingnessToTravel
                          ? 'bg-green-500/20 text-green-300 border-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }`}>
                        {p.willingness_to_travel || p.willingnessToTravel ? 'Willing to Travel' : 'Local Only'}
                      </span>
                    </div>

                    {/* Infrastructure Needs Indicators */}
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                      {p.infrastructure_needs?.housing || p.infrastructureNeeds?.housing ? (
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                          <HomeIcon className="w-3 h-3" /> Housing
                        </span>
                      ) : null}
                      {p.infrastructure_needs?.flights_transport || p.infrastructure_needs?.flightsTransport || p.infrastructureNeeds?.flightsTransport ? (
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                          <Plane className="w-3 h-3" /> Airfare / Transit
                        </span>
                      ) : null}
                      {p.infrastructure_needs?.meals_per_diem || p.infrastructure_needs?.mealsPerDiem || p.infrastructureNeeds?.mealsPerDiem ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Utensils className="w-3 h-3" /> Per Diem
                        </span>
                      ) : null}
                    </div>

                    {/* Infrastructure Support Delta Breakdown */}
                    <div className="mt-4 pt-3 border-t border-white/10 bg-black/40 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-gray-400">Community Support Needed:</span>
                        <span className={`font-bold ${delta.totalDelta > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                          {delta.totalDelta > 0 ? `+$${delta.totalDelta} USD Support Delta` : 'Local ($0 Extra)'}
                        </span>
                      </div>

                      {/* Detailed Delta Breakdown if Non-Local */}
                      {delta.totalDelta > 0 && (
                        <div className="text-[11px] text-gray-400 space-y-1 pl-2 border-l-2 border-amber-500/40 mt-1">
                          {delta.airfareCost > 0 && (
                            <div className="flex justify-between">
                              <span>• Roundtrip Airfare / Transit Baseline:</span>
                              <span className="text-gray-200 font-semibold">${delta.airfareCost}</span>
                            </div>
                          )}
                          {delta.housingCost > 0 && (
                            <div className="flex justify-between">
                              <span>• Housing / Lodging (3 Nights @ $150):</span>
                              <span className="text-gray-200 font-semibold">${delta.housingCost}</span>
                            </div>
                          )}
                          {delta.mealsCost > 0 && (
                            <div className="flex justify-between">
                              <span>• Meals & Per Diem (3 Days @ $45):</span>
                              <span className="text-gray-200 font-semibold">${delta.mealsCost}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Total Dual Currency Commitment */}
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                        <span className="text-gray-300 font-medium">Total Project Commitment:</span>
                        <div className="text-right">
                          <span className="text-green-400 font-bold block">${delta.totalUSDCommitment} USD</span>
                          <span className="text-amber-400 font-semibold text-[10px]">+{delta.beamCoinsReward} BEAM Coins</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
