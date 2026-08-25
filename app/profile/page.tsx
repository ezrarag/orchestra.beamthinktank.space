'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { parseVCard } from '@/lib/vcard'
import { parseCVText } from '@/lib/cvParser'
import { getBrowserCoordinates } from '@/lib/geolocation'
import { 
  fetchParticipantProfile, 
  saveParticipantProfile, 
  ensureParticipantProfileExists,
  DEFAULT_EZRA_EVENTS,
  type ParticipantDemographics,
  type EventPlayed,
  type MediaPortfolioItem,
  type InfrastructureNeedTag,
  type LiveLocationBeacon
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
  User as UserIcon,
  Video,
  Plus,
  Navigation,
  Truck,
  Home,
  MapPin,
  Sparkles,
  Unlock,
  Lock,
  Building2,
  PlayCircle,
  ExternalLink,
  Layers,
  Utensils,
  Wrench,
  Award,
  FileText,
  Radio,
  Tv,
  ShieldCheck
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
  const [activeTab, setActiveTab] = useState<'portfolio' | 'logistics' | 'nodes' | 'triangle' | 'interop'>('portfolio')
  
  // Photo management & CV File input refs
  const [profilePhoto, setProfilePhoto] = useState<string>('')
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const avatarFileInputRef = useRef<HTMLInputElement>(null)
  const vcardFileInputRef = useRef<HTMLInputElement>(null)
  const cvFileInputRef = useRef<HTMLInputElement>(null)

  // Edit mode state
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [bioText, setBioText] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [formData, setFormData] = useState<Partial<ParticipantDemographics>>({})

  // Editable Contact Info & Discipline Tag Pills state
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [disciplinePills, setDisciplinePills] = useState<string[]>([])
  const [newTagInput, setNewTagInput] = useState('')
  const [vcardImportedNotice, setVcardImportedNotice] = useState(false)
  const [cvImportedNotice, setCvImportedNotice] = useState(false)

  // Live Location Beacon State (Life360 Cross-Domain Sync)
  const [isBroadcastingLocation, setIsBroadcastingLocation] = useState(true)
  const [liveBeaconCity, setLiveBeaconCity] = useState('Atlanta, GA')
  const [liveLat, setLiveLat] = useState(33.749)
  const [liveLng, setLiveLng] = useState(-84.388)
  const [liveAccuracy, setLiveAccuracy] = useState(12)
  const [isGeoLoading, setIsGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState('')

  // Portfolio Media State
  const [portfolioItems, setPortfolioItems] = useState<MediaPortfolioItem[]>([])
  const [showAddMediaModal, setShowAddMediaModal] = useState(false)
  const [newMediaTitle, setNewMediaTitle] = useState('')
  const [newMediaUrl, setNewMediaUrl] = useState('')
  const [newMediaCategory, setNewMediaCategory] = useState<MediaPortfolioItem['category']>('Steinway Session')

  // Roaming Presence & Logistics State
  const [isRoaming, setIsRoaming] = useState(false)
  const [roamingLocation, setRoamingLocation] = useState('')

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
        setDisciplinePills(data.disciplineTags || ['Resident Cellist', 'Steinway Recording Specialist', 'Media Producer'])
        setEvents(isBdsoEzra ? DEFAULT_EZRA_EVENTS : [])
        setPortfolioItems(data.portfolioMedia || [])
        setIsRoaming(Boolean(data.isRoamingActive))
        setRoamingLocation(data.roamingCity || 'Orlando, FL (Steinway Gallery Residency)')

        if (data.current_live_location) {
          setIsBroadcastingLocation(Boolean(data.current_live_location.isBroadcasting))
          if (data.current_live_location.cityState) setLiveBeaconCity(data.current_live_location.cityState)
          if (data.current_live_location.latitude) setLiveLat(data.current_live_location.latitude)
          if (data.current_live_location.longitude) setLiveLng(data.current_live_location.longitude)
          if (data.current_live_location.accuracy) setLiveAccuracy(data.current_live_location.accuracy)
        }

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

  // Trigger Browser Geolocation API Capture
  const handleCaptureLiveLocation = async () => {
    setIsGeoLoading(true)
    setGeoError('')

    const coords = await getBrowserCoordinates()

    if (coords.error) {
      setGeoError(coords.error)
      setIsGeoLoading(false)
      return
    }

    if (coords.latitude && coords.longitude) {
      setLiveLat(coords.latitude)
      setLiveLng(coords.longitude)
      if (coords.accuracy) setLiveAccuracy(coords.accuracy)
      if (coords.cityState) setLiveBeaconCity(coords.cityState)
      setIsBroadcastingLocation(true)

      if (profile) {
        await saveParticipantProfile(targetEmail, {
          current_live_location: {
            isBroadcasting: true,
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            cityState: coords.cityState,
            lastBeaconTime: new Date().toISOString()
          }
        }, user?.uid)
      }
    }
    setIsGeoLoading(false)
  }

  // Toggle Live Location Broadcasting ON/OFF
  const handleToggleBroadcasting = async () => {
    const nextBroadcasting = !isBroadcastingLocation
    setIsBroadcastingLocation(nextBroadcasting)

    if (nextBroadcasting) {
      await handleCaptureLiveLocation()
    } else {
      if (profile) {
        await saveParticipantProfile(targetEmail, {
          current_live_location: {
            isBroadcasting: false,
            cityState: liveBeaconCity,
            lastBeaconTime: new Date().toISOString()
          }
        }, user?.uid)
      }
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

  // Handle .vcf Contact Card import
  const handleVCardSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const content = evt.target?.result as string
      if (content) {
        const parsed = parseVCard(content)
        
        let hasFields = false
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

  // Handle CV / Resume File Upload & Parsing
  const handleCVFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const content = evt.target?.result as string
      if (content) {
        const parsed = parseCVText(content)
        let hasUpdates = false

        if (parsed.fullName) {
          setEditName(parsed.fullName)
          hasUpdates = true
        }
        if (parsed.email) {
          setEditEmail(parsed.email)
          hasUpdates = true
        }
        if (parsed.phone) {
          setEditPhone(parsed.phone)
          hasUpdates = true
        }
        if (parsed.disciplineTags && parsed.disciplineTags.length > 0) {
          setDisciplinePills(prev => Array.from(new Set([...prev, ...parsed.disciplineTags!])))
          hasUpdates = true
        }
        if (parsed.bio) {
          setBioText(parsed.bio)
          hasUpdates = true
        }

        setIsEditingBio(true)
        setShowPhotoModal(false)
        setCvImportedNotice(true)
        setTimeout(() => setCvImportedNotice(false), 6000)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Add / Remove Role Discipline Pills
  const handleAddPill = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim()
    if (trimmed && !disciplinePills.includes(trimmed)) {
      setDisciplinePills([...disciplinePills, trimmed])
      setNewTagInput('')
    }
  }

  const handleRemovePill = (tagToRemove: string) => {
    setDisciplinePills(disciplinePills.filter(t => t !== tagToRemove))
  }

  // Add Portfolio Media Item
  const handleAddMediaItem = async () => {
    if (!newMediaTitle.trim() || !newMediaUrl.trim()) return

    const newItem: MediaPortfolioItem = {
      id: `p-${Date.now()}`,
      title: newMediaTitle.trim(),
      url: newMediaUrl.trim(),
      category: newMediaCategory,
      dateAdded: new Date().toISOString().split('T')[0]
    }

    const updatedPortfolio = [newItem, ...portfolioItems]
    setPortfolioItems(updatedPortfolio)
    setNewMediaTitle('')
    setNewMediaUrl('')
    setShowAddMediaModal(false)

    if (profile) {
      await saveParticipantProfile(targetEmail, { portfolioMedia: updatedPortfolio }, user?.uid)
    }
  }

  // Toggle Roaming Presence
  const handleToggleRoaming = async () => {
    const nextRoaming = !isRoaming
    setIsRoaming(nextRoaming)
    if (profile) {
      await saveParticipantProfile(targetEmail, { 
        isRoamingActive: nextRoaming,
        roamingCity: roamingLocation
      }, user?.uid)
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
        headshotUrl: profilePhoto,
        disciplineTags: disciplinePills,
        isRoamingActive: isRoaming,
        roamingCity: roamingLocation,
        current_live_location: {
          isBroadcasting: isBroadcastingLocation,
          latitude: liveLat,
          longitude: liveLng,
          accuracy: liveAccuracy,
          cityState: liveBeaconCity,
          lastBeaconTime: new Date().toISOString()
        }
      }, user?.uid)
      setProfile({ 
        ...profile, 
        ...formData, 
        fullName: editName, 
        culturalCapitalNotes: bioText,
        headshotUrl: profilePhoto,
        disciplineTags: disciplinePills,
        isRoamingActive: isRoaming,
        roamingCity: roamingLocation,
        current_live_location: {
          isBroadcasting: isBroadcastingLocation,
          latitude: liveLat,
          longitude: liveLng,
          accuracy: liveAccuracy,
          cityState: liveBeaconCity,
          lastBeaconTime: new Date().toISOString()
        }
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
    disciplineTags: disciplinePills,
    subdomainSource: 'orchestra',
    location: profile.homeHub,
    roamingLocation: isRoaming ? roamingLocation : undefined,
    currentLiveLocation: {
      isBroadcasting: isBroadcastingLocation,
      cityState: liveBeaconCity,
      latitude: liveLat,
      longitude: liveLng,
      accuracy: liveAccuracy
    },
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
    portfolioCount: portfolioItems.length,
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

  // Graceful Sign In with Google Gating Screen for Unauthenticated Visitors
  if (!user && !isSandboxPreview) {
    return (
      <div className="min-h-screen bg-[#07080A] text-white flex flex-col justify-between items-center p-6 font-sans">
        <div className="w-full max-w-md my-auto text-center space-y-6 bg-[#0F1015] p-8 rounded-3xl border border-white/10 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-orchestra-gold/20 text-orchestra-gold border border-orchestra-gold/40 flex items-center justify-center mx-auto shadow-lg">
            <Music className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
              BEAM Musician Participant Portal
            </h1>
            <p className="text-xs text-white/60 leading-relaxed font-sans max-w-xs mx-auto">
              Sign in with Google to access your BEAM Musician Profile, portfolio, logistics, stipends, and BEAM Coins.
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

            <div className="flex justify-center space-x-4 pt-1">
              <Link href="/institution/profile" className="text-[11px] font-mono text-purple-300 hover:underline">
                🏛️ Institutional Profile
              </Link>
              <Link href="/audience/profile" className="text-[11px] font-mono text-amber-300 hover:underline">
                📺 Studio Vault Audience
              </Link>
            </div>
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
      <input
        type="file"
        ref={cvFileInputRef}
        onChange={handleCVFileUpload}
        accept=".txt,.md,.pdf,.docx"
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

          {/* Overlaid Left-Aligned Name, Handle, Live Status Badge & Dynamic Role Pills */}
          <div className="absolute bottom-4 inset-x-0 z-20">
            <div className="max-w-6xl mx-auto w-full px-6 text-left space-y-2">
              
              {/* Live Presence Header Badge */}
              <div className="flex flex-wrap items-center gap-2">
                {isBroadcastingLocation ? (
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold shadow-lg">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span>🟢 LIVE BEACON: {liveBeaconCity}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800/80 backdrop-blur-md border border-slate-700/60 text-slate-300 text-xs font-mono">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>📍 Home: {profile?.homeHub || 'Milwaukee, WI'}</span>
                  </div>
                )}

                {/* Dynamic Role / Discipline Pills */}
                {disciplinePills.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-mono font-semibold tracking-wide"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-wide drop-shadow-md">
                {displayName}
              </h1>
              <p className="text-sm sm:text-base font-sans font-medium text-white/80 tracking-tight drop-shadow">
                {handleName}
              </p>
            </div>
          </div>
        </div>

        {/* Action Row Below Photo */}
        <div className="relative z-20 bg-[#0F1015] py-4">
          <div className="max-w-6xl mx-auto w-full px-6 flex items-center space-x-4">
            <button
              onClick={() => setIsEditingBio(!isEditingBio)}
              className="flex-1 py-3.5 px-6 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 transition shadow-xl text-center"
            >
              {isEditingBio ? 'Done Editing' : 'Edit Profile & CV'}
            </button>

            <button
              onClick={() => setShowPhotoModal(true)}
              className="w-12 h-12 rounded-full border border-white/20 bg-black/40 text-white flex items-center justify-center hover:bg-white/10 transition shadow-xl shrink-0"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STATS BAR & BIO DESCRIPTION */}
        <div className="relative z-10 py-4">
          <div className="max-w-6xl mx-auto w-full px-6 space-y-4">
            
            {/* Stats Bar */}
            <div className="w-full grid grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
                <p className="text-2xl sm:text-3xl font-bold text-amber-400 font-serif">{profile?.beamCoinBalance || 48}</p>
                <p className="text-xs text-white/60 uppercase font-sans tracking-wider mt-1">BEAM Coins</p>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
                <p className="text-2xl sm:text-3xl font-bold text-emerald-400 font-serif">${profile?.usdTotalEarned || 1485}</p>
                <p className="text-xs text-white/60 uppercase font-sans tracking-wider mt-1">USD Stipends</p>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
                <p className="text-2xl sm:text-3xl font-bold text-purple-300 font-serif">{events.length}</p>
                <p className="text-xs text-white/60 uppercase font-sans tracking-wider mt-1">Events Played</p>
              </div>
            </div>

            {/* Bio Box & Live CV Edit Mode Form */}
            <div className="w-full p-5 sm:p-6 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 text-left">
              {isEditingBio ? (
                <div className="space-y-5">
                  
                  {/* CV & Contact Card Upload Header */}
                  <div className="space-y-3 pb-3 border-b border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white/80 uppercase tracking-wider font-mono">
                        Contact Information & CV Parser
                      </span>

                      <div className="flex items-center space-x-2">
                        {/* Upload & Parse CV Button */}
                        <button
                          type="button"
                          onClick={() => cvFileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-xs font-medium border border-amber-400/40 flex items-center space-x-1.5 transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Upload & Parse CV</span>
                        </button>

                        {/* Import .vcf Button */}
                        <button
                          type="button"
                          onClick={() => vcardFileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/15 flex items-center space-x-1.5 transition"
                        >
                          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                          <span>Import .vcf</span>
                        </button>
                      </div>
                    </div>

                    {vcardImportedNotice && (
                      <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Parsed .vcf card! Review inputs below before saving.</span>
                      </div>
                    )}

                    {cvImportedNotice && (
                      <div className="p-2.5 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-200 text-xs font-medium flex items-center space-x-1.5">
                        <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>CV Parsed Successfully! Review extracted role pills & fields below before saving.</span>
                      </div>
                    )}

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

                  {/* EDITABLE DISCIPLINE & ROLE PILLS MODULE */}
                  <div className="space-y-2.5 pb-3 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white/80 uppercase tracking-wider font-mono">
                        Artistic Role & Discipline Pills (CV Header)
                      </span>
                      <span className="text-[10px] text-white/40 font-mono">Click (✕) to remove any incorrect role tag</span>
                    </div>

                    {/* Interactive Pills List */}
                    <div className="flex flex-wrap items-center gap-2">
                      {disciplinePills.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white text-xs font-mono font-semibold"
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePill(tag)}
                            className="w-4 h-4 rounded-full bg-white/20 hover:bg-red-500/80 text-white flex items-center justify-center text-[10px] transition ml-1"
                            title={`Remove ${tag}`}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Add Custom Role Tag Input */}
                    <div className="flex items-center space-x-2 pt-1">
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddPill(newTagInput)
                          }
                        }}
                        placeholder="Add custom role tag (e.g. Resident Cellist, Media Producer)"
                        className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-white/20 text-white text-xs font-sans focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddPill(newTagInput)}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition"
                      >
                        + Add Pill
                      </button>
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

                  {/* Save All Edits Button */}
                  <button
                    onClick={handleSaveAllEdits}
                    disabled={saving}
                    className="w-full py-3 rounded-xl bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 transition shadow-lg"
                  >
                    {saving ? 'Saving Live CV & Profile...' : 'Save Live CV & Profile'}
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

        {/* 4 DISTINCT PARTICIPANT WRAPAROUND MODULES */}
        <div className="relative z-10 py-6 pb-16">
          <div className="max-w-6xl mx-auto w-full px-6 space-y-6">
            
            {/* Module Switcher Tabs */}
            <div className="flex items-center justify-start overflow-x-auto space-x-2 border-b border-white/10 pb-3 no-scrollbar">
              <button
                onClick={() => setActiveTab('portfolio')}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                  activeTab === 'portfolio'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>1. Portfolio & CV</span>
              </button>

              <button
                onClick={() => setActiveTab('logistics')}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                  activeTab === 'logistics'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>2. Location & Logistics</span>
              </button>

              <button
                onClick={() => setActiveTab('nodes')}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                  activeTab === 'nodes'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>3. Node Access & Gigs</span>
              </button>

              <button
                onClick={() => setActiveTab('triangle')}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                  activeTab === 'triangle'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>4. Benefits & Unlock Tracker</span>
              </button>

              <button
                onClick={() => setActiveTab('interop')}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                  activeTab === 'interop'
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Global Vision</span>
              </button>
            </div>

            {/* MODULE 1: IDENTITY & CRAFT (PORTFOLIO & CV) */}
            {activeTab === 'portfolio' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-serif font-bold text-white">Media Portfolio & Recording CV</h2>
                    <p className="text-xs text-white/60">High-caliber recording sessions (e.g. Florida Steinway Sessions) presented to institutions.</p>
                  </div>

                  <button
                    onClick={() => setShowAddMediaModal(true)}
                    className="px-3.5 py-2 rounded-full bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition shadow-lg flex items-center space-x-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Recording Link</span>
                  </button>
                </div>

                {portfolioItems.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-black/40 border border-white/10 space-y-3">
                    <Video className="w-8 h-8 text-white/30 mx-auto" />
                    <p className="text-xs font-semibold text-white/80">No recording sessions added yet.</p>
                    <p className="text-[11px] text-white/50">Click &quot;Add Recording Link&quot; above to embed YouTube or Vimeo recital links.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {portfolioItems.map((item) => (
                      <div key={item.id} className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-amber-400/40 transition space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[10px] font-mono font-semibold">
                            {item.category}
                          </span>
                          {item.dateAdded && (
                            <span className="text-[10px] text-white/40 font-mono">{item.dateAdded}</span>
                          )}
                        </div>

                        <h3 className="text-sm font-serif font-bold text-white">{item.title}</h3>

                        {/* Video Embed or Link Card */}
                        {item.url.includes('firebasestorage') || item.url.endsWith('.mov') || item.url.endsWith('.mp4') ? (
                          <video
                            src={item.url}
                            controls
                            className="w-full h-40 object-cover rounded-xl border border-white/10"
                          />
                        ) : (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between text-xs font-mono text-amber-300 hover:text-amber-200 transition"
                          >
                            <span className="truncate max-w-[240px]">{item.url}</span>
                            <ExternalLink className="w-4 h-4 shrink-0 ml-2" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MODULE 2: LOCATION, ROAMING & TRANSPORTATION (LOGISTICS MODULE & LIVE LOCATION BEACON) */}
            {activeTab === 'logistics' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-serif font-bold text-white">Location, Roaming & Live Location Beacon</h2>
                  <p className="text-xs text-white/60">Cross-domain Life360 location beacon broadcasting live coordinates for grounds.beamthinktank.space transport & housing dispatch.</p>
                </div>

                {/* Live Location Beacon Broadcasting Card */}
                <div className="p-5 rounded-2xl bg-black/40 border border-emerald-500/40 space-y-4 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                        <Radio className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-white">Broadcast My Live Location (Life360 Beacon)</h3>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono">
                            grounds.beamthinktank.space
                          </span>
                        </div>
                        <p className="text-xs text-white/60">Broadcasts exact GPS position to BEAM logistics engine for rides & housing.</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 bg-black/60 px-4 py-2 rounded-xl border border-white/10">
                      <span className="text-xs font-mono text-white/80">
                        {isBroadcastingLocation ? '🟢 BROADCASTING LIVE' : '⚪ BEACON OFF'}
                      </span>
                      <button
                        onClick={handleToggleBroadcasting}
                        className={`w-12 h-6 rounded-full transition p-1 ${isBroadcastingLocation ? 'bg-emerald-500' : 'bg-white/20'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isBroadcastingLocation ? 'translate-x-6' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Geolocation Status / Details */}
                  {isBroadcastingLocation && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 text-emerald-300 font-bold text-sm">
                          <MapPin className="w-4 h-4" />
                          <span>Active Beacon Location: {liveBeaconCity}</span>
                        </div>

                        <button
                          onClick={handleCaptureLiveLocation}
                          disabled={isGeoLoading}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 text-[11px] font-bold flex items-center space-x-1 shrink-0 transition"
                        >
                          <Radio className={`w-3.5 h-3.5 ${isGeoLoading ? 'animate-spin' : ''}`} />
                          <span>{isGeoLoading ? 'Capturing GPS...' : 'Refresh GPS Beacon'}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-white/70 text-[11px] pt-1 border-t border-emerald-500/20">
                        <div>Latitude: <strong className="text-white">{liveLat.toFixed(4)}</strong></div>
                        <div>Longitude: <strong className="text-white">{liveLng.toFixed(4)}</strong></div>
                        <div>GPS Accuracy: <strong className="text-emerald-400">±{liveAccuracy}m</strong></div>
                      </div>
                    </div>
                  )}

                  {geoError && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-mono">
                      <span>⚠️ {geoError}</span>
                    </div>
                  )}
                </div>

                {/* Location & Roaming Card */}
                <div className="p-5 rounded-2xl bg-black/40 border border-purple-500/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                    <div className="flex items-center space-x-2">
                      <Home className="w-5 h-5 text-amber-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-white/50 uppercase tracking-wider">Primary Home Node</p>
                        <p className="text-sm font-bold text-white">{profile?.homeHub || 'Milwaukee, WI / Chicago, IL'}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
                      <Navigation className="w-4 h-4 text-purple-400" />
                      <div className="text-left">
                        <span className="text-[10px] text-white/50 block">Roaming Presence Status</span>
                        <span className="text-xs font-semibold text-purple-300">
                          {isRoaming ? 'ACTIVE ROAMING' : 'STATIONARY AT HOME NODE'}
                        </span>
                      </div>
                      <button
                        onClick={handleToggleRoaming}
                        className={`w-10 h-6 rounded-full transition p-1 ${isRoaming ? 'bg-purple-500' : 'bg-white/20'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isRoaming ? 'translate-x-4' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {isRoaming && (
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-200 text-xs flex items-center justify-between font-mono">
                      <span>Currently Active In: <strong>{roamingLocation}</strong></span>
                      <MapPin className="w-4 h-4 text-purple-400" />
                    </div>
                  )}
                </div>

                {/* Infrastructure Needs Tags */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider font-mono">
                    Wraparound Infrastructure Needs Tags
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {profile?.infrastructureNeeds?.map((need) => (
                      <div
                        key={need.id}
                        className={`p-4 rounded-2xl border transition flex items-start space-x-3 ${
                          need.id === 'transit'
                            ? 'bg-amber-500/10 border-amber-400/50 shadow-lg'
                            : 'bg-black/40 border-white/10'
                        }`}
                      >
                        {need.id === 'transit' && <Truck className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />}
                        {need.id === 'housing' && <Building2 className="w-5 h-5 text-purple-400 mt-0.5 shrink-0" />}
                        {need.id === 'meals' && <Utensils className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />}
                        {need.id === 'instrument_maintenance' && <Wrench className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />}

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{need.label}</span>
                            {need.id === 'transit' ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] font-mono font-bold uppercase">
                                Support Delta Priority
                              </span>
                            ) : (
                              <span className="text-[10px] text-white/40 font-mono capitalize">{need.priority}</span>
                            )}
                          </div>
                          <p className="text-[11px] text-white/60 leading-tight">{need.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MODULE 3: REGIONAL NODE ACCESS & OPPORTUNITIES */}
            {activeTab === 'nodes' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-serif font-bold text-white">Regional Node Access & Contract Gigs</h2>
                  <p className="text-xs text-white/60">Institutional partner hubs and contract opportunities mapped to your active region.</p>
                </div>

                <div className="p-5 rounded-2xl bg-black/40 border border-blue-500/30 space-y-3">
                  <div className="flex items-center space-x-2 text-blue-300">
                    <Building2 className="w-5 h-5" />
                    <h3 className="text-xs font-bold uppercase tracking-wider font-mono">Active Mapped Node Access</h3>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-2">
                    <p className="font-bold text-white text-sm">
                      {isBroadcastingLocation ? `Live Beacon: ${liveBeaconCity}` : (isRoaming ? 'Steinway Gallery Node — Orlando, FL' : 'Miller High Life Theatre / BDSO Node — Milwaukee, WI')}
                    </p>
                    <p className="text-white/70 leading-relaxed">
                      {isBroadcastingLocation
                        ? `BEAM logistics engine is tracking your live location in ${liveBeaconCity}. Ground transit and residency housing can be dispatched directly to your position.`
                        : 'Access to Black Diaspora Symphony Orchestra rehearsal hall, string sectional studios, and sheet music repository.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider font-mono">
                    Immediate Regional Opportunities ({events.length})
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-white/30 transition space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-amber-300 uppercase font-semibold">{event.type}</span>
                          <span className="text-[10px] text-white/50 font-mono">{event.cityState}</span>
                        </div>

                        <p className="text-xs font-bold text-white">{event.title}</p>
                        <p className="text-[11px] text-white/60 truncate">{event.repertoire}</p>

                        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                          <span className="text-emerald-400 font-bold">${event.usdStipend} USD</span>
                          <span className="text-amber-400 font-bold">+{event.beamCoinsEarned} BEAM</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MODULE 4: THE BEAM TRIANGLE & BENEFITS TRACKER */}
            {activeTab === 'triangle' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-serif font-bold text-white">The BEAM Triangle & Benefits Unlock Tracker</h2>
                  <p className="text-xs text-white/60">Dual currency redemption engine balancing USD stipends and BEAM Coin credits.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-black/60 border border-amber-400/40 space-y-1">
                    <Coins className="w-6 h-6 text-amber-400" />
                    <p className="text-3xl font-serif font-bold text-amber-300">{profile?.beamCoinBalance || 48}</p>
                    <p className="text-xs text-white/60 uppercase font-mono tracking-wider">BEAM Coins Balance</p>
                  </div>

                  <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-black/60 border border-emerald-400/40 space-y-1">
                    <DollarSign className="w-6 h-6 text-emerald-400" />
                    <p className="text-3xl font-serif font-bold text-emerald-300">${profile?.usdTotalEarned || 1485}</p>
                    <p className="text-xs text-white/60 uppercase font-mono tracking-wider">Total USD Stipends Earned</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider font-mono">
                    Redemption Phases Unlock Tracker
                  </h3>

                  <div className="p-5 rounded-2xl bg-black/40 border border-emerald-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-emerald-400">
                        <Unlock className="w-4 h-4" />
                        <span className="text-xs font-bold font-mono uppercase">Phase 1 (Active / Unlocked)</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono">100% UNLOCKED</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Masterclasses & Repertoire Coaching</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Instrument Maintenance & Bow Rehair</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Private Lessons & Masterwork Sessions</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Concert Tickets & VIP Guest Access</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-black/40 border border-amber-500/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-amber-300">
                        <Lock className="w-4 h-4" />
                        <span className="text-xs font-bold font-mono uppercase">Phase 2 (Locked / Earning Toward)</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono">EARNING PROGRESS</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white/80">Institutional Housing Credits</span>
                          <span className="text-amber-300 font-mono">36 / 48 BEAM (75%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full w-[75%]" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white/80">Regional Food & Catering Passes</span>
                          <span className="text-amber-300 font-mono">30 / 50 BEAM (60%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full w-[60%]" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white/80">BEAM Fleet / Ground Transit Access</span>
                          <span className="text-amber-300 font-mono">42 / 50 BEAM (85%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full w-[85%]" />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* GLOBAL VISION INTEROP TAB */}
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

      {/* Add Media Portfolio Item Modal */}
      {showAddMediaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#14151C] border border-white/20 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-serif font-bold text-white">Add Recording Session / Media Link</h3>
              <button onClick={() => setShowAddMediaModal(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-white/50 block mb-1 uppercase font-mono tracking-wider">Recording Title</label>
                <input
                  type="text"
                  value={newMediaTitle}
                  onChange={(e) => setNewMediaTitle(e.target.value)}
                  placeholder="e.g. Schumann Adagio & Allegro — Steinway Gallery"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-white/50 block mb-1 uppercase font-mono tracking-wider">Media Category</label>
                <select
                  value={newMediaCategory}
                  onChange={(e) => setNewMediaCategory(e.target.value as MediaPortfolioItem['category'])}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white text-xs focus:outline-none focus:border-amber-400"
                >
                  <option value="Steinway Session">Steinway Session</option>
                  <option value="Orchestral Performance">Orchestral Performance</option>
                  <option value="Chamber Masterclass">Chamber Masterclass</option>
                  <option value="Solo Recital">Solo Recital</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-white/50 block mb-1 uppercase font-mono tracking-wider">Video URL (YouTube / Vimeo / MP4)</label>
                <input
                  type="url"
                  value={newMediaUrl}
                  onChange={(e) => setNewMediaUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                onClick={handleAddMediaItem}
                disabled={!newMediaTitle || !newMediaUrl}
                className="w-full py-3 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition shadow-lg mt-2 disabled:opacity-50"
              >
                Save to Portfolio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo / File & Profile Switching Options Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-[#14151C] border border-white/20 space-y-4 text-center shadow-2xl">
            <h3 className="text-lg font-serif font-bold text-white">Profile & Photo Options</h3>
            <p className="text-xs text-white/60">Choose how you want to update your profile, photo, or switch profile views.</p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => cvFileInputRef.current?.click()}
                className="w-full py-3 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 font-medium text-xs flex items-center justify-center space-x-2 border border-amber-400/30"
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Upload & Parse CV / Resume</span>
              </button>

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

            {/* Direct Profile View Route Switchers */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Switch Dedicated Profile View</p>
              
              <Link
                href="/admin/orchestra-network"
                className="w-full py-2.5 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition flex items-center justify-center space-x-2 shadow-lg"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>General Orchestra Admin Directory →</span>
              </Link>

              <Link
                href="/institution/profile"
                className="w-full py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-semibold flex items-center justify-center space-x-2 transition"
              >
                <Building2 className="w-4 h-4" />
                <span>Institutional Cohort Profile →</span>
              </Link>

              <Link
                href="/audience/profile"
                className="w-full py-2.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-xs font-semibold flex items-center justify-center space-x-2 transition"
              >
                <Tv className="w-4 h-4" />
                <span>Studio Vault Audience Profile →</span>
              </Link>
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
