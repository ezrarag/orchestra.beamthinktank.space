'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { 
  fetchParticipantProfile, 
  saveParticipantProfile, 
  DEFAULT_EZRA_EVENTS,
  type ParticipantDemographics,
  type EventPlayed 
} from '@/lib/api/profile'
import { 
  User, 
  Music, 
  MapPin, 
  Calendar, 
  Coins, 
  DollarSign, 
  Award, 
  Globe, 
  CheckCircle2, 
  Clock, 
  Edit3, 
  Save, 
  Copy, 
  Check, 
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Building2,
  ChevronRight
} from 'lucide-react'

export default function ParticipantProfilePage() {
  const { user, role, loading: authLoading } = useUserRole()
  
  // Determine active profile email (defaults to ezra.haugabrooks@gmail.com for testing & BDSO connection)
  const activeEmail = user?.email || 'ezra.haugabrooks@gmail.com'
  const isEzra = activeEmail.toLowerCase() === 'ezra.haugabrooks@gmail.com'

  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'rewards' | 'interop'>('overview')
  const [profile, setProfile] = useState<ParticipantDemographics | null>(null)
  const [events, setEvents] = useState<EventPlayed[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  // Form state
  const [formData, setFormData] = useState<Partial<ParticipantDemographics>>({})

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const data = await fetchParticipantProfile(activeEmail)
        setProfile(data)
        setFormData(data)
        setEvents(isEzra ? DEFAULT_EZRA_EVENTS : [])
      } catch (err) {
        console.error('Error loading profile:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [activeEmail, isEzra])

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    try {
      await saveParticipantProfile(activeEmail, formData)
      setProfile({ ...profile, ...formData })
      setIsEditing(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch (err) {
      console.error('Error saving profile updates:', err)
      alert('Failed to save profile updates to Firestore.')
    } finally {
      setSaving(false)
    }
  }

  const crossSitePayload = profile ? {
    name: profile.fullName,
    email: profile.email,
    discipline: `${profile.primaryInstrument} Performance / Orchestra Member`,
    subdomainSource: 'orchestra',
    location: profile.homeHub,
    educationHistory: profile.educationBackground,
    culturalCapitalNotes: profile.culturalCapitalNotes,
    uncompensatedRehearsalHours: profile.uncompensatedRehearsalHours,
    orchestraRecord: {
      project: events[0]?.title || 'Black Diaspora Symphony Orchestra - 2025 Annual Concert',
      instrument: profile.primaryInstrument,
      status: 'Confirmed',
      headshotUrl: profile.headshotUrl,
      notes: `${profile.primaryInstrument} playing with ${profile.originProject}.`
    },
    eventsPlayedCount: events.length,
    totalUsdStipends: events.reduce((sum, e) => sum + e.usdStipend, 0),
    totalBeamCoins: events.reduce((sum, e) => sum + e.beamCoinsEarned, 0)
  } : null

  const handleCopyJson = () => {
    if (!crossSitePayload) return
    navigator.clipboard.writeText(JSON.stringify(crossSitePayload, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0B0E] text-white flex flex-col justify-between">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-12 w-12 rounded-full border-4 border-orchestra-gold border-t-transparent animate-spin" />
            <p className="text-orchestra-gold/80 font-mono text-sm tracking-wide">
              Loading BEAM Participant Profile...
            </p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-white flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner Notification for Ezra's BDSO Connection */}
        {isEzra && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-900/40 via-amber-900/30 to-blue-900/40 border border-orchestra-gold/30 backdrop-blur-md shadow-xl flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-orchestra-gold/20 text-orchestra-gold">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-orchestra-gold">
                  BEAM Participant Account Connected: Black Diaspora Orchestra
                </p>
                <p className="text-xs text-white/80">
                  Profile linked to <span className="font-mono text-amber-200">ezra.haugabrooks@gmail.com</span>. Your demographic records and played events are active and synced.
                </p>
              </div>
            </div>
            <span className="shrink-0 px-3 py-1 text-xs font-mono font-semibold rounded-full bg-orchestra-gold/20 text-orchestra-gold border border-orchestra-gold/40">
              BDSO CORE
            </span>
          </div>
        )}

        {/* Profile Identity Header */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#12141C] via-[#0E1017] to-[#181B26] p-6 sm:p-8 shadow-2xl mb-8">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6 text-center md:text-left">
              {profile?.headshotUrl ? (
                <img
                  src={profile.headshotUrl}
                  alt={profile.fullName}
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-2 border-orchestra-gold/50 shadow-2xl"
                />
              ) : (
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-purple-800 to-amber-700 flex items-center justify-center border-2 border-orchestra-gold/50 shadow-2xl">
                  <User className="h-14 w-14 text-white/80" />
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
                    {profile?.fullName || 'BEAM Participant'}
                  </h1>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Active Participant
                  </span>
                </div>

                <p className="text-sm font-medium text-orchestra-gold mb-2">
                  {profile?.primaryRole}
                </p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-white/70">
                  <span className="flex items-center">
                    <Building2 className="w-4 h-4 mr-1 text-purple-400" />
                    {profile?.originProject}
                  </span>
                  <span className="flex items-center">
                    <Music className="w-4 h-4 mr-1 text-amber-400" />
                    {profile?.primaryInstrument}
                  </span>
                  <span className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1 text-blue-400" />
                    {profile?.homeHub}
                  </span>
                </div>
              </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
              <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <p className="text-xs text-white/60 font-medium uppercase tracking-wider mb-1">BEAM Coins</p>
                <div className="flex items-center justify-center text-amber-400 font-bold text-xl">
                  <Coins className="w-5 h-5 mr-1" />
                  {profile?.beamCoinBalance || 0}
                </div>
              </div>

              <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <p className="text-xs text-white/60 font-medium uppercase tracking-wider mb-1">USD Stipends</p>
                <div className="flex items-center justify-center text-emerald-400 font-bold text-xl">
                  <DollarSign className="w-5 h-5" />
                  {profile?.usdTotalEarned || 0}
                </div>
              </div>

              <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <p className="text-xs text-white/60 font-medium uppercase tracking-wider mb-1">Events Played</p>
                <div className="flex items-center justify-center text-purple-400 font-bold text-xl">
                  <Calendar className="w-5 h-5 mr-1" />
                  {events.length}
                </div>
              </div>

              <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <p className="text-xs text-white/60 font-medium uppercase tracking-wider mb-1">Labor Hours</p>
                <div className="flex items-center justify-center text-blue-400 font-bold text-xl">
                  <Clock className="w-5 h-5 mr-1" />
                  {profile?.uncompensatedRehearsalHours || 0}h
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-white/10 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'overview'
                ? 'bg-orchestra-gold/20 text-orchestra-gold border border-orchestra-gold/40 shadow-lg'
                : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Demographics & Bio</span>
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'events'
                ? 'bg-orchestra-gold/20 text-orchestra-gold border border-orchestra-gold/40 shadow-lg'
                : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>Events Played ({events.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rewards')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'rewards'
                ? 'bg-orchestra-gold/20 text-orchestra-gold border border-orchestra-gold/40 shadow-lg'
                : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>BEAM Coins & Stipends</span>
          </button>

          <button
            onClick={() => setActiveTab('interop')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'interop'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg'
                : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Global Vision Interop</span>
          </button>
        </div>

        {/* Tab 1: Overview & Demographics */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-serif font-bold text-white">Demographic & Musician Profile</h2>
                <p className="text-xs text-white/60">
                  Pertinent details for BEAM Orchestra participant identity and roster allocation.
                </p>
              </div>

              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-orchestra-gold/20 text-orchestra-gold border border-orchestra-gold/40 hover:bg-orchestra-gold/30 transition text-xs font-semibold"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setFormData(profile || {})
                      setIsEditing(false)
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition text-xs shadow-lg"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              )}
            </div>

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Profile demographic details updated and saved to Firestore!</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Identity Card */}
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                <h3 className="text-sm font-semibold text-orchestra-gold uppercase tracking-wider flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-2" /> Identity & Affiliation
                </h3>

                <div className="space-y-3 text-sm">
                  <div>
                    <label className="text-xs text-white/50 block mb-1">Full Legal / Stage Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.fullName || ''}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/20 text-white focus:outline-none focus:border-orchestra-gold"
                      />
                    ) : (
                      <p className="font-medium text-white">{profile?.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-white/50 block mb-1">Primary Email (BEAM Origin)</label>
                    <p className="font-mono text-xs text-amber-200 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20">
                      {profile?.email}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-white/50 block mb-1">Origin Ensemble / Project</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.originProject || ''}
                        onChange={(e) => setFormData({ ...formData, originProject: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/20 text-white focus:outline-none focus:border-orchestra-gold"
                      />
                    ) : (
                      <p className="font-medium text-purple-300">{profile?.originProject}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-white/50 block mb-1">Primary Instrument & Role</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.primaryInstrument || ''}
                        onChange={(e) => setFormData({ ...formData, primaryInstrument: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/20 text-white focus:outline-none focus:border-orchestra-gold"
                      />
                    ) : (
                      <p className="font-medium text-white">{profile?.primaryInstrument}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Demographic Details Card */}
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                <h3 className="text-sm font-semibold text-orchestra-gold uppercase tracking-wider flex items-center">
                  <Globe className="w-4 h-4 mr-2" /> Demographics & Base
                </h3>

                <div className="space-y-3 text-sm">
                  <div>
                    <label className="text-xs text-white/50 block mb-1">Home Location Hub</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.homeHub || ''}
                        onChange={(e) => setFormData({ ...formData, homeHub: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/20 text-white focus:outline-none focus:border-orchestra-gold"
                      />
                    ) : (
                      <p className="font-medium text-white">{profile?.homeHub}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-white/50 block mb-1">Ethnicity / Diaspora</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.ethnicity || ''}
                          onChange={(e) => setFormData({ ...formData, ethnicity: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/20 text-white focus:outline-none focus:border-orchestra-gold"
                        />
                      ) : (
                        <p className="font-medium text-white">{profile?.ethnicity}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-white/50 block mb-1">Pronouns</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.pronouns || ''}
                          onChange={(e) => setFormData({ ...formData, pronouns: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/20 text-white focus:outline-none focus:border-orchestra-gold"
                        />
                      ) : (
                        <p className="font-medium text-white">{profile?.pronouns}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-white/50 block mb-1">Education & Repertoire Specialty</label>
                    {isEditing ? (
                      <textarea
                        rows={2}
                        value={formData.educationBackground || ''}
                        onChange={(e) => setFormData({ ...formData, educationBackground: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/20 text-white focus:outline-none focus:border-orchestra-gold text-xs"
                      />
                    ) : (
                      <p className="text-xs text-white/80 leading-relaxed">{profile?.educationBackground}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Cultural Capital & Rehearsal Labor Notes */}
              <div className="md:col-span-2 p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider flex items-center">
                  <Award className="w-4 h-4 mr-2" /> Cultural Capital & Community Leadership
                </h3>

                <div>
                  <label className="text-xs text-white/50 block mb-1">Cultural Capital Notes & Musical Impact</label>
                  {isEditing ? (
                    <textarea
                      rows={3}
                      value={formData.culturalCapitalNotes || ''}
                      onChange={(e) => setFormData({ ...formData, culturalCapitalNotes: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/20 text-white focus:outline-none focus:border-orchestra-gold text-xs"
                    />
                  ) : (
                    <p className="text-xs text-white/90 leading-relaxed bg-black/30 p-4 rounded-xl border border-white/5">
                      {profile?.culturalCapitalNotes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Events Played / Performance History */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-serif font-bold text-white">Completed & Scheduled Events Played</h2>
                <p className="text-xs text-white/60">
                  Full history of concerts, masterclasses, and sectionals played in BEAM Orchestra.
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs text-orchestra-gold font-mono bg-orchestra-gold/10 px-3 py-1.5 rounded-lg border border-orchestra-gold/20">
                <span>Total Earned across events: ${events.reduce((s, e) => s + e.usdStipend, 0)} USD + {events.reduce((s, e) => s + e.beamCoinsEarned, 0)} BEAM</span>
              </div>
            </div>

            {events.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/10">
                <Music className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/60 text-sm">No events played recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event, idx) => (
                  <div
                    key={event.id}
                    className="p-5 rounded-2xl bg-gradient-to-r from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-orchestra-gold/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {event.type}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                          event.status === 'Played' || event.status === 'Completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {event.status}
                        </span>
                        <span className="text-xs text-white/40 font-mono">#{idx + 1}</span>
                      </div>

                      <h3 className="text-base font-bold text-white">{event.title}</h3>
                      
                      <p className="text-xs text-amber-300 font-medium">
                        🎼 Repertoire: <span className="text-white/80">{event.repertoire}</span>
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-white/60 pt-1">
                        <span className="flex items-center text-purple-300">
                          <User className="w-3.5 h-3.5 mr-1" /> {event.role}
                        </span>
                        <span className="flex items-center">
                          <Building2 className="w-3.5 h-3.5 mr-1" /> {event.venue} ({event.cityState})
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1" /> {event.date}
                        </span>
                      </div>
                    </div>

                    <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-white/10 gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-white/50 uppercase font-mono">Compensation</p>
                        <p className="text-sm font-bold text-emerald-400">${event.usdStipend} USD</p>
                        <p className="text-xs font-bold text-amber-400 flex items-center justify-end">
                          <Coins className="w-3 h-3 mr-1" /> +{event.beamCoinsEarned} BEAM
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: BEAM Rewards & Stipends */}
        {activeTab === 'rewards' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-serif font-bold text-white">BEAM Coin Rewards & Financial Summary</h2>
              <p className="text-xs text-white/60">
                Track dual currency earnings: USD project stipends and redeemable BEAM Coins.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-900/30 via-black to-purple-900/30 border border-amber-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">BEAM Coin Credit Balance</h3>
                  <Coins className="w-6 h-6 text-amber-400" />
                </div>
                <p className="text-4xl font-bold text-white">{profile?.beamCoinBalance} <span className="text-sm font-normal text-amber-400">BEAM</span></p>
                <p className="text-xs text-white/60">Earned through sectionals, rehearsals, gala showcases, and content contribution.</p>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-900/30 via-black to-blue-900/30 border border-emerald-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">USD Total Stipends Earned</h3>
                  <DollarSign className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-4xl font-bold text-white">${profile?.usdTotalEarned}</p>
                <p className="text-xs text-white/60">Paid directly via Black Diaspora Orchestra (BDO) per project contract.</p>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-900/30 via-black to-blue-900/30 border border-purple-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Redemption Availability</h3>
                  <Award className="w-6 h-6 text-purple-400" />
                </div>
                <p className="text-xl font-bold text-white">Lessons & Masterclasses Available</p>
                <p className="text-xs text-white/60">Exchange BEAM Coins for private lessons, gear rental, or concert passes.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Global Vision Interop */}
        {activeTab === 'interop' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-serif font-bold text-white flex items-center">
                  <Globe className="w-5 h-5 mr-2 text-purple-400" />
                  Cross-Site Profile Maturation & Global Vision Data
                </h2>
                <p className="text-xs text-white/60">
                  Data structure exported for <span className="font-mono text-purple-300">beamthinktank.space</span> location-based global vision integration.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <a
                  href={`/api/profile/${encodeURIComponent(activeEmail)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition text-xs font-semibold"
                >
                  <span>Open API Route</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={handleCopyJson}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-orchestra-gold/20 text-orchestra-gold border border-orchestra-gold/40 hover:bg-orchestra-gold/30 transition text-xs font-semibold"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied Payload!' : 'Copy Cross-Site JSON'}</span>
                </button>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#090A0D] border border-purple-500/30 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-mono uppercase text-purple-400 font-semibold tracking-wider">
                  Live OrchestraCrossSiteRecord Payload ({activeEmail})
                </span>
                <span className="text-xs text-emerald-400 font-mono flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Ready for beamthinktank.space
                </span>
              </div>

              <pre className="p-4 rounded-xl bg-black/80 border border-white/10 text-xs font-mono text-emerald-300 overflow-x-auto max-h-96 leading-relaxed">
                {JSON.stringify(crossSitePayload, null, 2)}
              </pre>

              <div className="p-4 rounded-xl bg-purple-900/20 border border-purple-500/30 text-xs text-purple-200 leading-relaxed">
                💡 <span className="font-bold">Global Vision Note:</span> When visiting <span className="font-mono text-amber-200">beamthinktank.space</span>, the location-based map profile can query <span className="font-mono text-white">/api/profile/{activeEmail}</span> to pull this exact record, combining musician performance history with global geographic location and cultural capital telemetry.
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
