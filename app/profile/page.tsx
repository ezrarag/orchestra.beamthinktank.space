'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { 
  fetchParticipantProfile, 
  saveParticipantProfile, 
  DEFAULT_EZRA_EVENTS,
  type ParticipantDemographics,
  type EventPlayed 
} from '@/lib/api/profile'
import { 
  X, 
  MoreHorizontal, 
  Camera, 
  Upload, 
  Smartphone, 
  Sparkles, 
  Coins, 
  DollarSign, 
  Calendar, 
  Music, 
  MapPin, 
  Globe, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink,
  Edit3,
  Save,
  LogIn,
  User as UserIcon,
  ShieldCheck,
  ChevronDown
} from 'lucide-react'

const DEFAULT_COVER_IMAGE = 'https://link.storjshare.io/raw/jv56mcbz6f3ebhsnssa5tqlncpfa/orchestabeam/Images%2FBlack%20Diaspora%20Symphony%2F2025%20Annual%20Concert%2FMusican%20photos/IMG_9498.jpg'

export default function ParticipantProfilePage() {
  const { user, role, loading: authLoading } = useUserRole()
  
  // Real authenticated session email or default to ezra.haugabrooks@gmail.com if testing
  const targetEmail = (user?.email && user.email !== 'admin@local.dev') ? user.email : 'ezra.haugabrooks@gmail.com'
  const isBdsoEzra = targetEmail.toLowerCase() === 'ezra.haugabrooks@gmail.com'

  const [profile, setProfile] = useState<ParticipantDemographics | null>(null)
  const [events, setEvents] = useState<EventPlayed[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'events' | 'demographics' | 'interop'>('events')
  
  // Photo management state
  const [profilePhoto, setProfilePhoto] = useState<string>('')
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Editing state
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [bioText, setBioText] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [formData, setFormData] = useState<Partial<ParticipantDemographics>>({})

  useEffect(() => {
    async function loadProfile() {
      setLoading(true)
      try {
        const data = await fetchParticipantProfile(targetEmail)
        setProfile(data)
        setFormData(data)
        setBioText(data.culturalCapitalNotes || 'Cellist & Section Leader for Black Diaspora Symphony Orchestra. Repertoire specialist in Margaret Bonds, Florence Price, and William Grant Still.')
        setEvents(isBdsoEzra ? DEFAULT_EZRA_EVENTS : [])

        // Prefer Google Login photo URL if available, else saved profile headshot, else default
        const photo = user?.photoURL || data.headshotUrl || DEFAULT_COVER_IMAGE
        setProfilePhoto(photo)
      } catch (err) {
        console.error('Error loading profile:', err)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [targetEmail, user?.photoURL, isBdsoEzra])

  const handleGoogleSignIn = async () => {
    if (!auth) return
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } catch (err) {
      console.error('Google Sign-In Error:', err)
    }
  }

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
            saveParticipantProfile(targetEmail, { headshotUrl: newUrl })
          }
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSyncIphoneContact = () => {
    // Simulates iOS Contact / Photo picker sync
    const syncedPhoto = user?.photoURL || DEFAULT_COVER_IMAGE
    setProfilePhoto(syncedPhoto)
    setShowPhotoModal(false)
    if (profile) {
      saveParticipantProfile(targetEmail, { headshotUrl: syncedPhoto })
    }
  }

  const handleSaveBio = async () => {
    if (!profile) return
    setSaving(true)
    try {
      await saveParticipantProfile(targetEmail, { 
        ...formData,
        culturalCapitalNotes: bioText 
      })
      setProfile({ ...profile, ...formData, culturalCapitalNotes: bioText })
      setIsEditingBio(false)
    } catch (err) {
      console.error('Error saving profile:', err)
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

  if (loading || authLoading) {
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

  const displayName = user?.displayName || profile?.fullName || 'Ezra Haugabrooks'
  const handleName = `@${targetEmail.split('@')[0]}`

  return (
    <div className="min-h-screen bg-[#07080A] text-white font-sans selection:bg-white/20">
      
      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Main Full Viewport Container (Minimal Ambient Scroll) */}
      <div className="relative min-h-screen max-w-lg mx-auto flex flex-col justify-between overflow-hidden shadow-2xl bg-[#0F1015]">
        
        {/* Full Background Blur Hero Image (Matching Image 2 Reference) */}
        <div className="absolute inset-0 z-0">
          <img
            src={profilePhoto || DEFAULT_COVER_IMAGE}
            alt={displayName}
            className="w-full h-full object-cover object-center filter brightness-[0.55] contrast-[1.1] scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-[#0F1015] backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F1015] via-[#0F1015]/80 to-transparent" />
        </div>

        {/* Top Floating Control Bar (No Header/Footer) */}
        <div className="relative z-20 flex items-center justify-between px-6 pt-6 pb-4">
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
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-semibold hover:bg-white/30 transition shadow-lg"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Google Login</span>
              </button>
            ) : (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-[11px] font-mono font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
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

        {/* Hero Section: Avatar, Name, Handle, Action Pill (Exact Match to Image 2) */}
        <div className="relative z-10 px-6 pt-16 pb-6 flex flex-col items-center text-center space-y-4">
          
          {/* Avatar Photo with Change Photo Badge */}
          <div className="relative group cursor-pointer" onClick={() => setShowPhotoModal(true)}>
            <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-white/40 shadow-2xl transition group-hover:scale-105 group-hover:border-white">
              <img
                src={profilePhoto || DEFAULT_COVER_IMAGE}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            </div>
            <button className="absolute bottom-1 right-1 p-2 rounded-full bg-black/70 text-white border border-white/30 shadow-lg group-hover:bg-white group-hover:text-black transition">
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* Name & Handle */}
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-wide">
              {displayName}
            </h1>
            <p className="text-sm font-sans font-medium text-white/70 mt-0.5 tracking-tight">
              {handleName}
            </p>
          </div>

          {/* Primary Action Button (White Pill like Image 2) */}
          <div className="w-full max-w-xs pt-1">
            <button
              onClick={() => setIsEditingBio(!isEditingBio)}
              className="w-full py-3.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 transition shadow-xl flex items-center justify-center space-x-2"
            >
              <Edit3 className="w-4 h-4" />
              <span>{isEditingBio ? 'Done Editing' : 'Edit Profile'}</span>
            </button>
          </div>

          {/* Stats Bar (Exact 3 Metric Grid from Image 2) */}
          <div className="w-full max-w-sm pt-4 grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
              <p className="text-xl font-bold text-amber-400 font-serif">48</p>
              <p className="text-[11px] text-white/60 uppercase font-sans tracking-wider mt-0.5">BEAM Coins</p>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
              <p className="text-xl font-bold text-emerald-400 font-serif">$1,485</p>
              <p className="text-[11px] text-white/60 uppercase font-sans tracking-wider mt-0.5">USD Stipends</p>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
              <p className="text-xl font-bold text-purple-300 font-serif">5</p>
              <p className="text-[11px] text-white/60 uppercase font-sans tracking-wider mt-0.5">Events Played</p>
            </div>
          </div>

          {/* Bio Description Box (Translucent Dark Box like Image 2) */}
          <div className="w-full max-w-sm p-4 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 text-left">
            {isEditingBio ? (
              <div className="space-y-3">
                <textarea
                  rows={3}
                  value={bioText}
                  onChange={(e) => setBioText(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/20 text-white text-xs font-sans focus:outline-none focus:border-white"
                />
                <button
                  onClick={handleSaveBio}
                  disabled={saving}
                  className="w-full py-2 rounded-xl bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 transition"
                >
                  {saving ? 'Saving...' : 'Save Bio to Profile'}
                </button>
              </div>
            ) : (
              <p className="text-xs text-white/90 leading-relaxed font-sans">
                {bioText}
              </p>
            )}
          </div>

        </div>

        {/* Minimal Scroll Content Area */}
        <div className="relative z-10 px-6 pb-12 space-y-6">
          
          {/* Minimal Tab Switcher */}
          <div className="flex items-center justify-center space-x-2 border-b border-white/10 pb-3">
            <button
              onClick={() => setActiveTab('events')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                activeTab === 'events'
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Events Played ({events.length})
            </button>

            <button
              onClick={() => setActiveTab('demographics')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                activeTab === 'demographics'
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Demographics
            </button>

            <button
              onClick={() => setActiveTab('interop')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
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
            <div className="grid grid-cols-2 gap-3">
              {events.slice(0, 4).map((event) => (
                <div
                  key={event.id}
                  className="p-3.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 hover:border-white/30 transition flex flex-col justify-between space-y-2"
                >
                  <span className="text-[10px] font-mono uppercase text-amber-300 font-semibold truncate">
                    {event.type}
                  </span>
                  <p className="text-xs font-bold text-white line-clamp-2">{event.title}</p>
                  <div className="flex items-center justify-between text-[11px] text-white/60 pt-1 border-t border-white/10">
                    <span className="text-emerald-400 font-semibold">${event.usdStipend} USD</span>
                    <span>+{event.beamCoinsEarned} BEAM</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Demographics Tab */}
          {activeTab === 'demographics' && (
            <div className="p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 space-y-3 text-xs">
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
            <div className="p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-purple-500/30 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-purple-300 font-semibold font-mono">beamthinktank.space Sync Payload</span>
                <button
                  onClick={handleCopyJson}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px] flex items-center space-x-1"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-black/80 border border-white/10 font-mono text-[10px] text-emerald-300 overflow-x-auto max-h-36">
                {JSON.stringify(crossSitePayload, null, 2)}
              </pre>
            </div>
          )}

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
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs flex items-center justify-center space-x-2 border border-white/10"
              >
                <Upload className="w-4 h-4 text-purple-400" />
                <span>Upload Photo from Device</span>
              </button>

              <button
                onClick={handleSyncIphoneContact}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs flex items-center justify-center space-x-2 border border-white/10"
              >
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>Sync Contact Photo from iPhone / Google</span>
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
