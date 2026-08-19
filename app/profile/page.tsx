'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { parseVCard } from '@/lib/vcard'
import { 
  fetchParticipantProfile, 
  saveParticipantProfile, 
  ensureParticipantProfileExists,
  DEFAULT_EZRA_EVENTS,
  type ParticipantDemographics,
  type EventPlayed 
} from '@/lib/api/profile'
import { 
  X, 
  MoreHorizontal, 
  Upload, 
  Smartphone, 
  Coins, 
  DollarSign, 
  Calendar, 
  Music, 
  Globe, 
  CheckCircle2, 
  Copy, 
  Check, 
  Edit3, 
  Save, 
  LogIn, 
  User as UserIcon
} from 'lucide-react'

const BDSO_SANDBOX_EMAIL = 'ezra.haugabrooks@gmail.com'

export default function ParticipantProfilePage() {
  const { user, role, loading: authLoading } = useUserRole()
  
  // Explicit Sandbox Preview toggle for testing BDSO core profile
  const [isSandboxPreview, setIsSandboxPreview] = useState(false)

  // Real authenticated session email or sandbox preview email
  const targetEmail = (user?.email && user.email !== 'admin@local.dev')
    ? user.email 
    : (isSandboxPreview ? BDSO_SANDBOX_EMAIL : '')

  const isBdsoEzra = targetEmail.toLowerCase() === BDSO_SANDBOX_EMAIL

  const [profile, setProfile] = useState<ParticipantDemographics | null>(null)
  const [events, setEvents] = useState<EventPlayed[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'events' | 'demographics' | 'interop'>('events')
  
  // Photo management state
  const [profilePhoto, setProfilePhoto] = useState<string>('')
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const avatarFileInputRef = useRef<HTMLInputElement>(null)
  const vcardFileInputRef = useRef<HTMLInputElement>(null)

  // Edit mode state
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [bioText, setBioText] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [formData, setFormData] = useState<Partial<ParticipantDemographics>>({})

  // Editable Contact Info fields (Part 2)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [vcardImportedNotice, setVcardImportedNotice] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      if (!targetEmail) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const data = await fetchParticipantProfile(
          targetEmail, 
          user?.uid, 
          user?.displayName, 
          user?.photoURL
        )
        setProfile(data)
        setFormData(data)
        setBioText(data.culturalCapitalNotes || 'Welcome to BEAM Orchestra! Click Edit Profile to complete your musician bio, contact card, and repertoire specialties.')
        setEditName(user?.displayName || data.fullName || targetEmail.split('@')[0])
        setEditEmail(targetEmail)
        setEditPhone('(414) 555-0199')
        setEvents(isBdsoEzra ? DEFAULT_EZRA_EVENTS : [])

        // Fallback chain: Google Auth photo -> saved profile headshot -> empty string (gradient fallback)
        const photo = user?.photoURL || data.headshotUrl || ''
        setProfilePhoto(photo)
      } catch (err) {
        console.error('Error loading profile:', err)
      } finally {
        setLoading(false)
      }
    }
    if (targetEmail || !authLoading) {
      loadProfile()
    }
  }, [targetEmail, user?.uid, user?.photoURL, user?.displayName, isBdsoEzra, authLoading])

  const handleGoogleSignIn = async () => {
    if (!auth) return
    try {
      const provider = new GoogleAuthProvider()
      const res = await signInWithPopup(auth, provider)
      if (res.user) {
        await ensureParticipantProfileExists(res.user)
      }
    } catch (err) {
      console.error('Google Sign-In Error:', err)
    }
  }

  // Handle image upload from device
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (evt) => {
        if (evt.target?.result) {
          const newUrl = evt.target.result as string
          setProfilePhoto(newUrl)
          setShowPhotoModal(false)
          if (profile) {
            saveParticipantProfile(targetEmail, { headshotUrl: newUrl }, user?.uid)
          }
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle .vcf Contact Card import (Supporting multiline photos & Apple vCard format)
  const handleVCardSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const content = evt.target?.result as string
      if (content) {
        const parsed = parseVCard(content)
        
        let hasFields = false
        // Prefill inputs (no auto-save until user reviews & hits save)
        if (parsed.name) {
          setEditName(parsed.name)
          hasFields = true
        }
        if (parsed.email) {
          setEditEmail(parsed.email)
          hasFields = true
        }
        if (parsed.phone) {
          setEditPhone(parsed.phone)
          hasFields = true
        }

        // Only overwrite avatar if photo is explicitly present in vCard
        if (parsed.photo) {
          setProfilePhoto(parsed.photo)
          hasFields = true
          if (profile) {
            saveParticipantProfile(targetEmail, { headshotUrl: parsed.photo }, user?.uid)
          }
        }

        if (hasFields) {
          setIsEditingBio(true)
          setShowPhotoModal(false)
          setVcardImportedNotice(true)
          setTimeout(() => setVcardImportedNotice(false), 5000)
        } else {
          alert('Could not find Name, Email, Phone, or Photo in the selected .vcf file.')
        }
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleSyncIphoneContact = () => {
    const syncedPhoto = user?.photoURL || ''
    setProfilePhoto(syncedPhoto)
    setShowPhotoModal(false)
    if (profile && syncedPhoto) {
      saveParticipantProfile(targetEmail, { headshotUrl: syncedPhoto }, user?.uid)
    }
  }

  const handleSaveAllEdits = async () => {
    if (!profile) return
    setSaving(true)
    try {
      await saveParticipantProfile(targetEmail, { 
        ...formData,
        fullName: editName,
        culturalCapitalNotes: bioText,
        headshotUrl: profilePhoto
      }, user?.uid)
      setProfile({ 
        ...profile, 
        ...formData, 
        fullName: editName, 
        culturalCapitalNotes: bioText,
        headshotUrl: profilePhoto
      })
      setIsEditingBio(false)
    } catch (err) {
      console.error('Error saving profile:', err)
    } finally {
      setSaving(false)
    }
  }

  const crossSitePayload = profile ? {
    name: editName || profile.fullName,
    email: editEmail || profile.email,
    discipline: `${profile.primaryInstrument} Performance / Orchestra Member`,
    subdomainSource: 'orchestra',
    location: profile.homeHub,
    educationHistory: profile.educationBackground,
    culturalCapitalNotes: bioText,
    uncompensatedRehearsalHours: profile.uncompensatedRehearsalHours,
    orchestraRecord: {
      project: events[0]?.title || 'Black Diaspora Symphony Orchestra - 2025 Annual Concert',
      instrument: profile.primaryInstrument,
      status: 'Confirmed',
      headshotUrl: profilePhoto,
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#07080A] text-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          <p className="text-white/60 font-sans text-xs tracking-widest uppercase">
            Loading BEAM Profile...
          </p>
        </div>
      </div>
    )
  }

  // PART B — Graceful Sign In with Google Gating Screen for Unauthenticated Visitors
  if (!user && !isSandboxPreview) {
    return (
      <div className="min-h-screen bg-[#07080A] text-white flex flex-col justify-between items-center p-6 font-sans">
        <div className="w-full max-w-md my-auto text-center space-y-6 bg-[#0F1015] p-8 rounded-3xl border border-white/10 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-orchestra-gold/20 text-orchestra-gold border border-orchestra-gold/40 flex items-center justify-center mx-auto shadow-lg">
            <Music className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
              BEAM Participant Portal
            </h1>
            <p className="text-xs text-white/60 leading-relaxed font-sans max-w-xs mx-auto">
              Sign in with Google to access your BEAM Musician Profile, performance history, stipends, and BEAM Coins.
            </p>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full py-3.5 px-6 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 transition shadow-xl flex items-center justify-center space-x-2"
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

            <button
              onClick={() => setIsSandboxPreview(true)}
              className="text-[11px] font-mono text-orchestra-gold/80 hover:text-orchestra-gold transition"
            >
              ⚡ Preview BDSO Core Sandbox Profile (ezra.haugabrooks@gmail.com)
            </button>
          </div>
        </div>
      </div>
    )
  }

  const displayName = editName || user?.displayName || profile?.fullName || targetEmail.split('@')[0]
  const handleName = `@${(editEmail || targetEmail).split('@')[0]}`

  return (
    <div className="min-h-screen bg-[#07080A] text-white font-sans selection:bg-white/20">
      
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={avatarFileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={vcardFileInputRef}
        onChange={handleVCardSelect}
        accept=".vcf,text/vcard,text/x-vcard"
        className="hidden"
      />

      {/* Main Full Viewport Width Container */}
      <div className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden shadow-2xl bg-[#0F1015]">
        
        {/* Sandbox Preview Banner */}
        {isSandboxPreview && !user && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2 flex items-center justify-between text-xs font-mono text-amber-200">
            <span>⚡ SANDBOX PREVIEW (BDSO CORE)</span>
            <button
              onClick={() => setIsSandboxPreview(false)}
              className="underline text-amber-300 hover:text-white"
            >
              Exit Preview
            </button>
          </div>
        )}

        {/* Dynamic Viewport Height (68dvh) Hero Container */}
        <div className="relative w-full h-[68dvh] min-h-[360px] max-h-[640px] overflow-hidden bg-[#0A0B0E]">
          {/* Full-bleed Cover/Profile Photo or Dark Gradient Fallback */}
          {profilePhoto ? (
            <img
              src={profilePhoto}
              alt={displayName}
              onError={() => setProfilePhoto('')}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#241F38] via-[#151724] to-[#0A0B0E] flex items-center justify-center relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(212,175,55,0.12),_transparent_65%)]" />
            </div>
          )}

          {/* Top Floating Header Control Bar */}
          <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between max-w-6xl mx-auto w-full px-6 pt-6 pb-4">
            <Link
              href="/"
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition shadow-lg"
            >
              <X className="w-5 h-5" />
            </Link>

            <div className="flex items-center space-x-3">
              {!user ? (
                <button
                  onClick={handleGoogleSignIn}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-semibold hover:bg-white/30 transition shadow-lg"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Google Login</span>
                </button>
              ) : (
                <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Signed In</span>
                </span>
              )}

              <button
                onClick={() => setShowPhotoModal(true)}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition shadow-lg"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Bottom-anchored Scrim (~40% of photo height) for text legibility */}
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0F1015] via-[#0F1015]/80 to-transparent pointer-events-none z-10" />

          {/* Overlaid Left-Aligned Name & Handle */}
          <div className="absolute bottom-4 inset-x-0 z-20">
            <div className="max-w-6xl mx-auto w-full px-6 text-left">
              <h1 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-wide drop-shadow-md">
                {displayName}
              </h1>
              <p className="text-sm sm:text-base font-sans font-medium text-white/80 tracking-tight mt-0.5 drop-shadow">
                {handleName}
              </p>
            </div>
          </div>
        </div>

        {/* Action Row Below Photo: Wide White Pill on Left + Secondary Icon Button on Right */}
        <div className="relative z-20 bg-[#0F1015] py-4">
          <div className="max-w-6xl mx-auto w-full px-6 flex items-center space-x-4">
            <button
              onClick={() => setIsEditingBio(!isEditingBio)}
              className="flex-1 py-3.5 px-6 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 transition shadow-xl text-center"
            >
              {isEditingBio ? 'Done Editing' : 'Edit Profile'}
            </button>

            <button
              onClick={() => setShowPhotoModal(true)}
              className="w-12 h-12 rounded-full border border-white/20 bg-black/40 text-white flex items-center justify-center hover:bg-white/10 transition shadow-xl shrink-0"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STATS ROW & BIO BOX                                                        */}
        {/* ========================================================================= */}

        <div className="relative z-10 py-4">
          <div className="max-w-6xl mx-auto w-full px-6 space-y-4">
            
            {/* Stats Bar */}
            <div className="w-full grid grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
                <p className="text-2xl sm:text-3xl font-bold text-amber-400 font-serif">{profile?.beamCoinBalance || 0}</p>
                <p className="text-xs text-white/60 uppercase font-sans tracking-wider mt-1">BEAM Coins</p>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
                <p className="text-2xl sm:text-3xl font-bold text-emerald-400 font-serif">${profile?.usdTotalEarned || 0}</p>
                <p className="text-xs text-white/60 uppercase font-sans tracking-wider mt-1">USD Stipends</p>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
                <p className="text-2xl sm:text-3xl font-bold text-purple-300 font-serif">{events.length}</p>
                <p className="text-xs text-white/60 uppercase font-sans tracking-wider mt-1">Events Played</p>
              </div>
            </div>

            {/* Bio Description Box & Edit Mode Form */}
            <div className="w-full p-5 sm:p-6 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 text-left">
              {isEditingBio ? (
                <div className="space-y-4">
                  
                  {/* Contact Information & .vcf Import */}
                  <div className="space-y-3 pb-3 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white/80 uppercase tracking-wider font-mono">
                        Contact Information
                      </span>

                      {/* Import from .vcf Contact Card Control */}
                      <button
                        type="button"
                        onClick={() => vcardFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/15 flex items-center space-x-1.5 transition"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                        <span>Import .vcf Card</span>
                      </button>
                    </div>

                    {vcardImportedNotice && (
                      <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Parsed .vcf card! Review inputs below before saving.</span>
                      </div>
                    )}

                    {/* 3 Editable Inputs with Native Browser Autofill Attributes */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] text-white/50 block mb-0.5 uppercase tracking-wider">Full Name</label>
                        <input
                          type="text"
                          name="name"
                          autoComplete="name"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Full Name"
                          className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/20 text-white text-xs font-sans focus:outline-none focus:border-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-white/50 block mb-0.5 uppercase tracking-wider">Email Address</label>
                        <input
                          type="email"
                          name="email"
                          autoComplete="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="email@domain.com"
                          className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/20 text-white text-xs font-sans focus:outline-none focus:border-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-white/50 block mb-0.5 uppercase tracking-wider">Phone Number</label>
                        <input
                          type="tel"
                          name="phone"
                          autoComplete="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="(555) 000-0000"
                          className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/20 text-white text-xs font-sans focus:outline-none focus:border-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bio Textarea Section */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/50 block mb-0.5 uppercase tracking-wider">Musician Bio & Cultural Notes</label>
                    <textarea
                      rows={3}
                      value={bioText}
                      onChange={(e) => setBioText(e.target.value)}
                      className="w-full p-3 rounded-xl bg-black/60 border border-white/20 text-white text-xs font-sans focus:outline-none focus:border-white"
                    />
                  </div>

                  {/* Save Contact Info & Bio Action Button */}
                  <button
                    onClick={handleSaveAllEdits}
                    disabled={saving}
                    className="w-full py-3 rounded-xl bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 transition shadow-lg"
                  >
                    {saving ? 'Saving Profile...' : 'Save Contact Info & Bio'}
                  </button>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-sans">
                  {bioText}
                </p>
              )}
            </div>

          </div>
        </div>

        {/* Minimal Scroll Content Tabs */}
        <div className="relative z-10 py-6 pb-16">
          <div className="max-w-6xl mx-auto w-full px-6 space-y-6">
            
            {/* Minimal Tab Switcher */}
            <div className="flex items-center justify-center space-x-2 border-b border-white/10 pb-3">
              <button
                onClick={() => setActiveTab('events')}
                className={`px-5 py-2 rounded-full text-xs font-semibold transition ${
                  activeTab === 'events'
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                Events Played ({events.length})
              </button>

              <button
                onClick={() => setActiveTab('demographics')}
                className={`px-5 py-2 rounded-full text-xs font-semibold transition ${
                  activeTab === 'demographics'
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                Demographics
              </button>

              <button
                onClick={() => setActiveTab('interop')}
                className={`px-5 py-2 rounded-full text-xs font-semibold transition ${
                  activeTab === 'interop'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                Global Vision
              </button>
            </div>

            {/* Events Played Tab */}
            {activeTab === 'events' && (
              <div>
                {events.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-black/30 border border-white/10 space-y-2">
                    <Music className="w-8 h-8 text-white/30 mx-auto" />
                    <p className="text-xs font-semibold text-white/80">No events played recorded yet.</p>
                    <p className="text-[11px] text-white/50">Audition for upcoming contract projects in the Training portal.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {events.slice(0, 4).map((event) => (
                      <div
                        key={event.id}
                        className="p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 hover:border-white/30 transition flex flex-col justify-between space-y-3"
                      >
                        <span className="text-[10px] font-mono uppercase text-amber-300 font-semibold truncate">
                          {event.type}
                        </span>
                        <p className="text-xs font-bold text-white line-clamp-2">{event.title}</p>
                        <div className="flex items-center justify-between text-[11px] text-white/60 pt-2 border-t border-white/10">
                          <span className="text-emerald-400 font-semibold">${event.usdStipend} USD</span>
                          <span>+{event.beamCoinsEarned} BEAM</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Demographics Tab */}
            {activeTab === 'demographics' && (
              <div className="p-5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 space-y-3 text-xs">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-white/50">Primary Instrument</span>
                  <span className="font-semibold text-white">{profile?.primaryInstrument}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-white/50">Location Hub</span>
                  <span className="font-semibold text-white">{profile?.homeHub}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-white/50">Ethnicity / Diaspora</span>
                  <span className="font-semibold text-white">{profile?.ethnicity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Pronouns</span>
                  <span className="font-semibold text-white">{profile?.pronouns}</span>
                </div>
              </div>
            )}

            {/* Global Vision Interop Tab */}
            {activeTab === 'interop' && (
              <div className="p-5 rounded-2xl bg-black/40 backdrop-blur-md border border-purple-500/30 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-purple-300 font-semibold font-mono">beamthinktank.space Sync Payload</span>
                  <button
                    onClick={handleCopyJson}
                    className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px] flex items-center space-x-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-black/80 border border-white/10 font-mono text-[10px] text-emerald-300 overflow-x-auto max-h-48 leading-relaxed">
                  {JSON.stringify(crossSitePayload, null, 2)}
                </pre>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Photo Selection / Sync Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-[#14151C] border border-white/20 space-y-4 text-center shadow-2xl">
            <h3 className="text-lg font-serif font-bold text-white">Profile Photo Options</h3>
            <p className="text-xs text-white/60">Choose how you want to load or update your profile picture.</p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => avatarFileInputRef.current?.click()}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs flex items-center justify-center space-x-2 border border-white/10"
              >
                <Upload className="w-4 h-4 text-purple-400" />
                <span>Upload Photo from Device</span>
              </button>

              <button
                onClick={() => vcardFileInputRef.current?.click()}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs flex items-center justify-center space-x-2 border border-white/10"
              >
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>Import from .vcf Contact Card</span>
              </button>

              {user?.photoURL && (
                <button
                  onClick={() => {
                    setProfilePhoto(user.photoURL!)
                    setShowPhotoModal(false)
                  }}
                  className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs flex items-center justify-center space-x-2 border border-white/10"
                >
                  <UserIcon className="w-4 h-4 text-emerald-400" />
                  <span>Use Google Account Photo</span>
                </button>
              )}
            </div>

            <button
              onClick={() => setShowPhotoModal(false)}
              className="w-full py-2 text-xs text-white/40 hover:text-white font-medium pt-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
