'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth'
import { auth, db, storage } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { parseVCard } from '@/lib/vcard'
import { parseCVText } from '@/lib/cvParser'
import { getBrowserCoordinates } from '@/lib/geolocation'
import { 
  fetchParticipantProfile, 
  saveParticipantProfile, 
  ensureParticipantProfileExists,
  dualWriteInstitutionalCommitmentAsGig,
  DEFAULT_EZRA_PROFILE,
  DEFAULT_EZRA_EVENTS,
  BEAM_CATALOG_WORKS,
  DEFAULT_HOOD_ALLOCATION,
  type ParticipantDemographics,
  type EventPlayed,
  type MediaPortfolioItem,
  type CatalogWorkItem,
  type HoodFundAllocation,
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
  LogOut,
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
  ShieldCheck,
  SlidersHorizontal,
  HelpCircle
} from 'lucide-react'

const BDSO_SANDBOX_EMAIL = 'ezra.haugabrooks@gmail.com'

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
  return match ? `https://www.youtube.com/embed/${match[1]}` : null
}

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
  const [activeTab, setActiveTab] = useState<'nodes' | 'portfolio'>('nodes')
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showLogisticsDrawer, setShowLogisticsDrawer] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  // Redesign Packet: Help Modal & Video Explainer Modal State
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [videoModalTitle, setVideoModalTitle] = useState<string | null>(null)

  // Institutional Booking Dual-Write Modal State
  const [showRecordBookingModal, setShowRecordBookingModal] = useState(false)
  const [bookingTitle, setBookingTitle] = useState('')
  const [bookingVenue, setBookingVenue] = useState('')
  const [bookingCityState, setBookingCityState] = useState('Milwaukee, WI')
  const [bookingDate, setBookingDate] = useState('2026-03-15')
  const [bookingType, setBookingType] = useState<EventPlayed['type']>('Full Symphony')
  const [bookingStipend, setBookingStipend] = useState<number>(250)

  const handleShareProfile = () => {
    const shareUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/profile?musician=${encodeURIComponent(targetEmail || 'ezra.haugabrooks@gmail.com')}`
      : 'https://orchestra.beamthinktank.space/profile'
    navigator.clipboard.writeText(shareUrl)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 3500)
  }
  
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
  const [showCatalogModal, setShowCatalogModal] = useState(false)
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<string>('All')
  const [activePlayingMedia, setActivePlayingMedia] = useState<MediaPortfolioItem | null>(null)

  // Media Upload & Add Form State
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file')
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false)
  const [newMediaTitle, setNewMediaTitle] = useState('')
  const [newMediaUrl, setNewMediaUrl] = useState('')
  const [newMediaComposer, setNewMediaComposer] = useState('')
  const [newMediaDescription, setNewMediaDescription] = useState('')
  const [newMediaCategory, setNewMediaCategory] = useState<MediaPortfolioItem['category']>('Steinway Session')
  const videoFileInputRef = useRef<HTMLInputElement>(null)

  const handleToggleCatalogWork = async (work: CatalogWorkItem) => {
    const exists = portfolioItems.some(item => item.url === work.url || item.workId === work.id || item.title === work.title)
    let updated: MediaPortfolioItem[]
    if (exists) {
      updated = portfolioItems.filter(item => item.url !== work.url && item.workId !== work.id && item.title !== work.title)
    } else {
      const newItem: MediaPortfolioItem = {
        id: `work-attached-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        workId: work.id,
        title: work.title,
        url: work.url,
        category: work.category,
        composer: work.composer,
        description: work.description,
        dateAdded: work.dateRecorded || new Date().toISOString().split('T')[0]
      }
      updated = [newItem, ...portfolioItems]
    }
    setPortfolioItems(updated)
    if (targetEmail) {
      await saveParticipantProfile(targetEmail, { portfolioMedia: updated }, user?.uid)
    }
  }

  const handleRemovePortfolioItem = async (itemId: string) => {
    const updated = portfolioItems.filter(item => item.id !== itemId)
    setPortfolioItems(updated)
    if (targetEmail) {
      await saveParticipantProfile(targetEmail, { portfolioMedia: updated }, user?.uid)
    }
  }

  // Hood Fund & Allocation State
  const [showHoodAllocationModal, setShowHoodAllocationModal] = useState(false)
  const [hoodAllocations, setHoodAllocations] = useState<HoodFundAllocation>(DEFAULT_HOOD_ALLOCATION)

  const handleSaveHoodAllocations = async (updated: HoodFundAllocation) => {
    setHoodAllocations(updated)
    setShowHoodAllocationModal(false)
    if (targetEmail) {
      await saveParticipantProfile(targetEmail, { hoodAllocations: updated }, user?.uid)
    }
  }

  const handleRecordInstitutionalBooking = async () => {
    if (!bookingTitle.trim() || !bookingVenue.trim() || !bookingCityState.trim()) {
      alert('Please fill out the contract title, venue, and city/state.')
      return
    }
    const stipendNum = Number(bookingStipend) || 200
    try {
      const result = await dualWriteInstitutionalCommitmentAsGig(
        targetEmail || BDSO_SANDBOX_EMAIL,
        {
          title: bookingTitle.trim(),
          venue: bookingVenue.trim(),
          cityState: bookingCityState.trim(),
          date: bookingDate || new Date().toISOString().split('T')[0],
          type: bookingType,
          usdStipend: stipendNum,
          status: 'Confirmed'
        },
        user?.uid
      )
      setEvents(result.events)
      setProfile(result.profile)
      setShowRecordBookingModal(false)
      setBookingTitle('')
      setBookingVenue('')
      alert(`Institutional booking commitment recorded! Dual-written to Gigs list and updated total earnings to $${result.profile.usdTotalEarned}.`)
    } catch (err) {
      console.error('Error recording institutional booking:', err)
      alert('Could not record booking. Please try again.')
    }
  }

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
        if (data.hoodAllocations) setHoodAllocations(data.hoodAllocations)
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
    if (!auth) {
      setIsSandboxPreview(true)
      alert('Firebase Auth client API key is not configured in .env.local (NEXT_PUBLIC_FIREBASE_API_KEY). Enabled Sandbox Participant Profile Mode for testing.')
      return
    }
    try {
      const provider = new GoogleAuthProvider()
      const res = await signInWithPopup(auth, provider)
      if (res.user) {
        await ensureParticipantProfileExists(res.user)
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err)
      if (err?.code === 'auth/popup-blocked') {
        alert('Sign-In Popup was blocked by your browser. Please allow popups for this site or open in Safari/Chrome directly.')
      } else {
        alert(`Google Sign-In Notice: ${err?.message || 'Could not complete Google Sign-In.'}`)
      }
    }
  }

  const handleSignOut = async () => {
    if (auth) {
      try {
        await signOut(auth)
      } catch (err) {
        console.error('Sign Out Error:', err)
      }
    }
    setIsSandboxPreview(false)
    setProfile(null)
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

  // Add Portfolio Media Item (supports real file upload to Firebase Storage & projectRehearsalMedia Firestore entry)
  const handleAddMediaItem = async () => {
    if (!newMediaTitle.trim()) {
      alert('Please enter a recording title')
      return
    }

    if (uploadMethod === 'file' && !selectedUploadFile) {
      alert('Please select a video or audio file to upload from your device')
      return
    }

    if (uploadMethod === 'url' && !newMediaUrl.trim()) {
      alert('Please enter a valid video URL (YouTube, Vimeo, or MP4 link)')
      return
    }

    setIsUploadingMedia(true)
    setUploadProgress(0)

    try {
      let finalMediaUrl = newMediaUrl.trim()
      let storagePath: string | null = null

      if (uploadMethod === 'file') {
        if (!selectedUploadFile) throw new Error('No file selected')
        if (!storage) {
          throw new Error('Firebase Storage is not initialized on this environment. Please check your Firebase configuration.')
        }

        const timestamp = Date.now()
        const sanitizedTitle = newMediaTitle.trim().replace(/[^a-zA-Z0-9]/g, '_')
        const fileExt = selectedUploadFile.name.split('.').pop() || 'mp4'
        const fileName = `${sanitizedTitle}_${timestamp}.${fileExt}`
        storagePath = `Black Diaspora Symphony/studio/participant-uploads/${fileName}`

        const storageRef = ref(storage, storagePath)
        const uploadTask = uploadBytesResumable(storageRef, selectedUploadFile)

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              setUploadProgress(Math.round(progress))
            },
            (error) => {
              console.error('Firebase Storage upload error:', error)
              reject(error)
            },
            async () => {
              finalMediaUrl = await getDownloadURL(uploadTask.snapshot.ref)
              resolve()
            }
          )
        })
      }

      // 1. Create canonical Firestore document in 'projectRehearsalMedia' collection
      let docId = `doc-${Date.now()}`
      if (db) {
        try {
          const mediaData = {
            projectId: 'beam-training-orchestra',
            ensembleId: 'beam-training-orchestra',
            ensembleName: 'BEAM Training Orchestra',
            institutionName: profile?.academicInstitution || profile?.homeOrchestra || profile?.originProject || 'Partner Conservatory',
            featuredMusicianName: profile?.fullName || user?.displayName || user?.email?.split('@')[0] || 'Participant Musician',
            uploaderType: 'participant',
            title: newMediaTitle.trim(),
            description: newMediaDescription.trim() || null,
            composer: newMediaComposer.trim() || null,
            date: serverTimestamp(),
            url: finalMediaUrl,
            thumbnailUrl: null,
            private: false,
            category: newMediaCategory,
            instrumentGroup: profile?.primaryInstrument || 'Strings',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            uploadedBy: targetEmail || user?.email || 'participant',
            storagePath: storagePath
          }

          const docRef = await addDoc(collection(db, 'projectRehearsalMedia'), mediaData)
          docId = docRef.id
        } catch (firestoreErr) {
          console.warn('Could not write to projectRehearsalMedia collection directly:', firestoreErr)
        }
      }

      // 2. Attach newly uploaded work directly to participant's portfolioMedia
      const newItem: MediaPortfolioItem = {
        id: docId,
        workId: docId,
        title: newMediaTitle.trim(),
        url: finalMediaUrl,
        category: newMediaCategory,
        composer: newMediaComposer.trim() || undefined,
        description: newMediaDescription.trim() || undefined,
        dateAdded: new Date().toISOString().split('T')[0]
      }

      const updatedPortfolio = [newItem, ...portfolioItems]
      setPortfolioItems(updatedPortfolio)

      // Reset Form State
      setNewMediaTitle('')
      setNewMediaUrl('')
      setNewMediaComposer('')
      setNewMediaDescription('')
      setSelectedUploadFile(null)
      setUploadProgress(0)
      setShowAddMediaModal(false)

      if (targetEmail) {
        await saveParticipantProfile(targetEmail, { portfolioMedia: updatedPortfolio }, user?.uid)
      }

      alert('Recording session uploaded & added to your profile portfolio successfully!')
    } catch (error: any) {
      console.error('Error adding recording session:', error)
      alert(error?.message || 'Failed to upload media. Please try again.')
    } finally {
      setIsUploadingMedia(false)
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
    setSaving(true)
    try {
      const emailToUse = targetEmail || 'ezra.haugabrooks@gmail.com'
      const updatedProfileData = {
        ...formData,
        fullName: editName.trim() || 'Participant Musician',
        email: emailToUse,
        culturalCapitalNotes: bioText.trim(),
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
      }

      await saveParticipantProfile(emailToUse, updatedProfileData, user?.uid)

      setProfile((prev) => ({
        ...(prev || DEFAULT_EZRA_PROFILE),
        ...updatedProfileData,
      }))
      setIsEditingBio(false)
      alert('Musician profile updated successfully!')
    } catch (err) {
      console.error('Error saving profile:', err)
      alert('Could not save profile changes. Please try again.')
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

            <div className="flex items-center space-x-2 relative">
              {user || isSandboxPreview ? (
                <span className="px-3 py-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Signed In</span>
                </span>
              ) : null}

              {/* How This Works ? Help Button */}
              <button
                onClick={() => setShowHelpModal(true)}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition shadow-lg"
                title="How This Works Explainer"
              >
                <HelpCircle className="w-5 h-5 text-amber-400" />
              </button>

              {/* ... Dropdown Action Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition shadow-lg"
                  title="More Options Menu"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>

                {showMoreMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={() => setShowMoreMenu(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-56 p-2 rounded-2xl bg-[#151722]/95 backdrop-blur-xl border border-white/20 shadow-2xl z-40 space-y-1 text-xs">
                      <button
                        onClick={() => {
                          setIsEditingBio(true)
                          setShowMoreMenu(false)
                        }}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-white/10 text-white flex items-center space-x-2.5 transition"
                      >
                        <Edit3 className="w-4 h-4 text-amber-400" />
                        <span>Edit Profile & CV</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowPhotoModal(true)
                          setShowMoreMenu(false)
                        }}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-white/10 text-white flex items-center space-x-2.5 transition"
                      >
                        <UserIcon className="w-4 h-4 text-purple-400" />
                        <span>Update Headshot Photo</span>
                      </button>

                      <button
                        onClick={() => {
                          handleShareProfile()
                          setShowMoreMenu(false)
                        }}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-white/10 text-white flex items-center space-x-2.5 transition"
                      >
                        <Copy className="w-4 h-4 text-emerald-400" />
                        <span>{shareCopied ? 'Link Copied!' : 'Copy Shareable Link'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowLogisticsDrawer(true)
                          setShowMoreMenu(false)
                        }}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-white/10 text-white flex items-center space-x-2.5 transition"
                      >
                        <Truck className="w-4 h-4 text-blue-400" />
                        <span>Logistics & Support Settings</span>
                      </button>

                      <div className="border-t border-white/10 my-1" />

                      {!user && !isSandboxPreview ? (
                        <button
                          onClick={() => {
                            handleGoogleSignIn()
                            setShowMoreMenu(false)
                          }}
                          className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-amber-400/20 text-amber-300 flex items-center space-x-2.5 transition"
                        >
                          <LogIn className="w-4 h-4 text-amber-400" />
                          <span>Google Sign In</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            handleSignOut()
                            setShowMoreMenu(false)
                          }}
                          className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-red-500/20 text-red-300 flex items-center space-x-2.5 transition"
                        >
                          <LogOut className="w-4 h-4 text-red-400" />
                          <span>Sign Out</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bottom-anchored Scrim (~40% of photo height) for text legibility */}
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0F1015] via-[#0F1015]/80 to-transparent pointer-events-none z-10" />

          {/* Overlaid Left-Aligned Name & Handle */}
          <div className="absolute bottom-4 inset-x-0 z-20">
            <div className="max-w-6xl mx-auto w-full px-6 text-left space-y-1">
              <h1 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-wide drop-shadow-md">
                {displayName}
              </h1>
              <p className="text-sm sm:text-base font-sans font-medium text-white/80 tracking-tight drop-shadow">
                {handleName}
              </p>
            </div>
          </div>
        </div>

        {/* TWO PILLARS HERO CARD & STATS BAR */}
        <div className="relative z-10 py-4">
          <div className="max-w-6xl mx-auto w-full px-6 space-y-4">
            
            {/* The Two Pillars Welcome Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-black/60 backdrop-blur-xl border border-amber-400/30 shadow-2xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-mono font-bold mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>BEAM Musician Ecosystem</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-serif font-bold text-white leading-tight">
                    Play Institutions. Build Your Village. Tour at Zero Cost.
                  </h2>
                  <p className="text-xs sm:text-sm text-white/70 mt-1 max-w-2xl">
                    BEAM bridges direct institutional contracting with community patron backing so you earn professional stipends while touring with full travel & lodging coverage.
                  </p>
                </div>
              </div>

              {/* Two Pillars Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-black/40 border border-amber-400/20 space-y-1.5">
                  <div className="flex items-center space-x-2 text-amber-300 font-bold font-mono">
                    <Building2 className="w-4 h-4" />
                    <span>1. Direct Institutional Work</span>
                  </div>
                  <p className="text-white/70 text-[11px] leading-relaxed">
                    Verified profiles are directly pitched to partner orchestras, halls, and Steinway recording sessions contracting through BEAM.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/20 space-y-1.5">
                  <div className="flex items-center space-x-2 text-purple-300 font-bold font-mono">
                    <Coins className="w-4 h-4" />
                    <span>2. Community Village Support (&quot;The Hood&quot;)</span>
                  </div>
                  <p className="text-white/70 text-[11px] leading-relaxed">
                    Family, friends, and patrons follow & back your profile to cover travel, lodging, and continuing education at zero out-of-pocket cost.
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="w-full grid grid-cols-3 gap-3 text-center">
              {/* Clickable Institutional Earnings Card (Dual-Write Dual-Source Sync) */}
              <div
                onClick={() => setShowRecordBookingModal(true)}
                className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-black/60 backdrop-blur-md border border-emerald-500/30 hover:border-emerald-500/60 transition cursor-pointer group shadow-lg text-center space-y-1"
                title="Click to test dual-writing an institutional booking commitment"
              >
                <p className="text-2xl sm:text-3xl font-bold text-emerald-400 font-serif">${profile?.usdTotalEarned || 0}</p>
                <p className="text-xs font-semibold text-emerald-300 uppercase font-sans tracking-wider">
                  Institutional Earnings
                </p>
                <div className="inline-flex items-center space-x-1 text-[10px] text-emerald-300/70 group-hover:text-emerald-300 transition font-mono">
                  <Plus className="w-3 h-3 text-emerald-400" />
                  <span>+ Record Booking Dual-Write</span>
                </div>
              </div>

              {/* Clickable Hood Village Support Fund Card */}
              <div
                onClick={() => setShowHoodAllocationModal(true)}
                className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 to-black/60 backdrop-blur-md border border-amber-400/30 hover:border-amber-400/60 transition cursor-pointer group shadow-lg text-center space-y-1"
                title="Click to manage Hood fund allocations"
              >
                <div className="flex items-center justify-center space-x-1.5 text-amber-400">
                  <span className="text-2xl sm:text-3xl font-bold font-serif">
                    ${(profile?.hoodVillageBalance || 0).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs font-semibold text-amber-300 uppercase font-sans tracking-wider">
                  Hood Village Fund
                </p>
                <div className="inline-flex items-center space-x-1 text-[10px] text-white/50 group-hover:text-amber-200 transition font-mono">
                  <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                  <span>Configure Allocations</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
                <p className="text-2xl sm:text-3xl font-bold text-purple-300 font-serif">{events.length}</p>
                <p className="text-xs text-white/60 uppercase font-sans tracking-wider mt-1">Events & Gigs</p>
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
            <div className="flex items-center justify-between overflow-x-auto border-b border-white/10 pb-3 no-scrollbar gap-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveTab('nodes')}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                    activeTab === 'nodes'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>1. Upcoming Work & Node Gigs</span>
                </button>

                <button
                  onClick={() => setActiveTab('portfolio')}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                    activeTab === 'portfolio'
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>2. Media Portfolio & CV</span>
                </button>
              </div>

              <button
                onClick={() => setShowLogisticsDrawer(true)}
                className="px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 shrink-0"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Logistics & Support Settings</span>
              </button>
            </div>

            {/* MODULE 1: IDENTITY & CRAFT (PORTFOLIO & CV) */}
            {activeTab === 'portfolio' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-serif font-bold text-white flex items-center space-x-2">
                      <span>Media Portfolio & Recording CV</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono">
                        {portfolioItems.length} {portfolioItems.length === 1 ? 'Work' : 'Works'}
                      </span>
                    </h2>
                    <p className="text-xs text-white/60">High-caliber recording sessions (e.g. Florida Steinway Sessions, Margaret Bonds Rehearsals) presented to institutions.</p>
                  </div>

                  <div className="flex items-center space-x-2.5 shrink-0">
                    <button
                      onClick={() => setShowCatalogModal(true)}
                      className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 text-black text-xs font-bold hover:brightness-110 transition shadow-lg flex items-center space-x-1.5"
                    >
                      <Sparkles className="w-4 h-4 fill-black/20" />
                      <span>Select Works from BEAM Catalog</span>
                    </button>

                    <button
                      onClick={() => setShowAddMediaModal(true)}
                      className="px-3.5 py-2 rounded-full bg-black/60 border border-white/20 text-white/80 hover:text-white text-xs font-semibold hover:border-white/40 transition flex items-center space-x-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Custom Link</span>
                    </button>
                  </div>
                </div>

                {portfolioItems.length === 0 ? (
                  <div className="p-10 text-center rounded-2xl bg-black/40 border border-white/10 space-y-4">
                    <Video className="w-10 h-10 text-amber-400/40 mx-auto" />
                    <div>
                      <p className="text-sm font-bold text-white">No works attached to your portfolio yet.</p>
                      <p className="text-xs text-white/50 mt-1 max-w-md mx-auto">Select your uploaded recordings from the BEAM Orchestra Catalog (Steinway Gallery Sessions, Rehearsal Footage, Chamber Masterworks) or paste a custom link.</p>
                    </div>

                    <button
                      onClick={() => setShowCatalogModal(true)}
                      className="px-5 py-2.5 rounded-full bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition shadow-lg inline-flex items-center space-x-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Browse BEAM Catalog Works</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {portfolioItems.map((item) => {
                      const ytEmbed = getYouTubeEmbedUrl(item.url)
                      const isMov = item.url.includes('firebasestorage') || item.url.toLowerCase().endsWith('.mov') || item.url.includes('.mov?')

                      return (
                        <div key={item.id} className="p-4 rounded-2xl bg-black/50 border border-white/10 hover:border-amber-400/40 transition space-y-3 shadow-lg flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[10px] font-mono font-semibold">
                                  {item.category}
                                </span>
                                {item.composer && (
                                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-mono font-medium">
                                    {item.composer}
                                  </span>
                                )}
                              </div>
                              {item.dateAdded && (
                                <span className="text-[10px] text-white/40 font-mono shrink-0">{item.dateAdded}</span>
                              )}
                            </div>

                            <h3 className="text-sm font-serif font-bold text-white leading-snug">{item.title}</h3>
                            {item.description && (
                              <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">{item.description}</p>
                            )}

                            {/* Video / Embed Player Section */}
                            <div className="pt-1">
                              {ytEmbed ? (
                                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
                                  <iframe
                                    src={ytEmbed}
                                    title={item.title}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black group">
                                    <video
                                      src={item.url}
                                      controls
                                      playsInline
                                      preload="metadata"
                                      className="w-full h-44 object-cover rounded-xl"
                                    >
                                      <source src={item.url} type="video/mp4" />
                                      <source src={item.url} type="video/quicktime" />
                                      Your browser does not support video playback.
                                    </video>

                                    <button
                                      onClick={() => setActivePlayingMedia(item)}
                                      className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/70 hover:bg-amber-400 hover:text-black text-white text-[10px] font-bold backdrop-blur-md transition flex items-center space-x-1 border border-white/20"
                                    >
                                      <PlayCircle className="w-3.5 h-3.5" />
                                      <span>Expand Player</span>
                                    </button>
                                  </div>

                                  {isMov && (
                                    <div className="p-2 rounded-lg bg-amber-400/10 border border-amber-400/20 text-[10px] font-mono text-amber-200/80 flex items-center justify-between">
                                      <span>🎥 High-Definition QuickTime MOV Session</span>
                                      <button
                                        onClick={() => setActivePlayingMedia(item)}
                                        className="text-amber-300 font-bold underline hover:text-white"
                                      >
                                        Open Fullscreen Modal
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Footer Action Bar */}
                          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                            <button
                              onClick={() => setActivePlayingMedia(item)}
                              className="text-amber-300 hover:text-amber-200 font-semibold flex items-center space-x-1 text-[11px]"
                            >
                              <PlayCircle className="w-3.5 h-3.5" />
                              <span>Play in Modal</span>
                            </button>

                            <div className="flex items-center space-x-2">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white/60 hover:text-white flex items-center space-x-1 text-[11px]"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Direct Link</span>
                              </a>

                              <button
                                onClick={() => handleRemovePortfolioItem(item.id)}
                                className="text-red-400/70 hover:text-red-400 text-[11px] font-medium ml-2"
                              >
                                Detach
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Slide-Over Logistics & Support Settings Drawer */}
            {showLogisticsDrawer && (
              <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm transition-opacity font-sans">
                <div 
                  className="fixed inset-0" 
                  onClick={() => setShowLogisticsDrawer(false)} 
                />
                <div className="relative z-10 w-full max-w-md h-full bg-[#14151D] border-l border-white/20 p-6 overflow-y-auto space-y-6 shadow-2xl flex flex-col justify-between">
                  <div className="space-y-6">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-serif font-bold text-white">Logistics & Support Settings</h3>
                          <p className="text-xs text-white/50">Manage location beacon, roaming, and infrastructure needs.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowLogisticsDrawer(false)}
                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 1. Live Location Beacon Card */}
                    <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                          <span className="text-xs font-bold text-white">Life360 Live Location Beacon</span>
                        </div>
                        <button
                          onClick={handleToggleBroadcasting}
                          className={`w-10 h-5 rounded-full transition p-0.5 ${isBroadcastingLocation ? 'bg-emerald-500' : 'bg-white/20'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isBroadcastingLocation ? 'translate-x-5' : ''}`} />
                        </button>
                      </div>
                      
                      {isBroadcastingLocation && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono space-y-2">
                          <p className="text-emerald-300 font-bold">📍 Active Beacon: {liveBeaconCity}</p>
                          <button
                            onClick={handleCaptureLiveLocation}
                            disabled={isGeoLoading}
                            className="w-full py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 text-[11px] font-bold flex items-center justify-center space-x-1.5 transition"
                          >
                            <Radio className={`w-3.5 h-3.5 ${isGeoLoading ? 'animate-spin' : ''}`} />
                            <span>{isGeoLoading ? 'Capturing GPS...' : 'Refresh GPS Location'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 2. Roaming Presence Card */}
                    <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Navigation className="w-4 h-4 text-purple-400" />
                          <span className="text-xs font-bold text-white">Roaming Presence Status</span>
                        </div>
                        <button
                          onClick={handleToggleRoaming}
                          className={`w-10 h-5 rounded-full transition p-0.5 ${isRoaming ? 'bg-purple-500' : 'bg-white/20'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isRoaming ? 'translate-x-5' : ''}`} />
                        </button>
                      </div>
                      {isRoaming && (
                        <p className="text-xs font-mono text-purple-300">Currently active in: <strong>{roamingLocation}</strong></p>
                      )}
                    </div>

                    {/* 3. Infrastructure Needs Tags */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider font-mono">
                        Wraparound Infrastructure Needs Tags
                      </h4>
                      <div className="space-y-2">
                        {profile?.infrastructureNeeds?.map((need) => (
                          <div
                            key={need.id}
                            className="p-3 rounded-xl bg-black/50 border border-white/10 text-xs flex items-center justify-between"
                          >
                            <span className="text-white font-medium">{need.label}</span>
                            <span className="text-[10px] font-mono text-amber-300 capitalize">{need.priority}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  <button
                    onClick={() => setShowLogisticsDrawer(false)}
                    className="w-full py-3 rounded-xl bg-white text-black font-bold text-xs hover:bg-white/90 transition shadow-lg mt-4"
                  >
                    Done & Close Settings
                  </button>
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



          </div>
        </div>

      </div>

      {/* Add / Upload Media Portfolio Item Modal */}
      {showAddMediaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-[#14151C] border border-white/20 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-serif font-bold text-white">Add Recording Session / Video Upload</h3>
                <p className="text-xs text-white/50">Upload a video/audio file or paste a video URL. Creates a record in projectRehearsalMedia & attaches to portfolio.</p>
              </div>
              <button onClick={() => setShowAddMediaModal(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher: File Upload vs URL Paste */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-black/50 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setUploadMethod('file')}
                className={`py-2 rounded-lg font-semibold transition flex items-center justify-center space-x-1.5 ${
                  uploadMethod === 'file' ? 'bg-amber-400 text-black shadow-md' : 'text-white/60 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Video File</span>
              </button>

              <button
                type="button"
                onClick={() => setUploadMethod('url')}
                className={`py-2 rounded-lg font-semibold transition flex items-center justify-center space-x-1.5 ${
                  uploadMethod === 'url' ? 'bg-amber-400 text-black shadow-md' : 'text-white/60 hover:text-white'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Paste Video Link</span>
              </button>
            </div>

            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1 no-scrollbar">
              <div>
                <label className="text-[10px] text-white/50 block mb-1 uppercase font-mono tracking-wider">Recording Title *</label>
                <input
                  type="text"
                  value={newMediaTitle}
                  onChange={(e) => setNewMediaTitle(e.target.value)}
                  placeholder="e.g. Schumann Adagio & Allegro — Take II"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/50 block mb-1 uppercase font-mono tracking-wider">Category</label>
                  <select
                    value={newMediaCategory}
                    onChange={(e) => setNewMediaCategory(e.target.value as MediaPortfolioItem['category'])}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white text-xs focus:outline-none focus:border-amber-400"
                  >
                    <option value="Steinway Session">Steinway Session</option>
                    <option value="Rehearsal Footage">Rehearsal Footage</option>
                    <option value="Orchestral Performance">Orchestral Performance</option>
                    <option value="Chamber Masterclass">Chamber Masterclass</option>
                    <option value="Solo Recital">Solo Recital</option>
                    <option value="Publishing Release">Publishing Release</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-white/50 block mb-1 uppercase font-mono tracking-wider">Composer / Work</label>
                  <input
                    type="text"
                    value={newMediaComposer}
                    onChange={(e) => setNewMediaComposer(e.target.value)}
                    placeholder="e.g. Robert Schumann"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Upload Input Mode */}
              {uploadMethod === 'file' ? (
                <div>
                  <label className="text-[10px] text-white/50 block mb-1 uppercase font-mono tracking-wider">Video File (.mp4, .mov, .webm) *</label>
                  <input
                    type="file"
                    ref={videoFileInputRef}
                    accept="video/*,audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) setSelectedUploadFile(file)
                    }}
                  />

                  <div
                    onClick={() => videoFileInputRef.current?.click()}
                    className="p-5 rounded-2xl bg-black/60 border-2 border-dashed border-white/20 hover:border-amber-400/60 transition cursor-pointer text-center space-y-2"
                  >
                    <Upload className="w-7 h-7 text-amber-400/80 mx-auto" />
                    {selectedUploadFile ? (
                      <div>
                        <p className="text-xs font-bold text-amber-300 truncate max-w-xs mx-auto">{selectedUploadFile.name}</p>
                        <p className="text-[10px] text-white/50 font-mono">{(selectedUploadFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-white/80">Click to choose a video file from device</p>
                        <p className="text-[10px] text-white/40 font-mono">Supports MP4, MOV, WebM (up to 500MB)</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-[10px] text-white/50 block mb-1 uppercase font-mono tracking-wider">Video URL (YouTube / Vimeo / Direct MP4) *</label>
                  <input
                    type="url"
                    value={newMediaUrl}
                    onChange={(e) => setNewMediaUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or https://firebasestorage..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] text-white/50 block mb-1 uppercase font-mono tracking-wider">Description / Program Notes</label>
                <textarea
                  rows={2}
                  value={newMediaDescription}
                  onChange={(e) => setNewMediaDescription(e.target.value)}
                  placeholder="Rehearsal details, venue notes, or ensemble performance context..."
                  className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/20 text-white text-xs focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              {/* Progress Bar during upload */}
              {isUploadingMedia && (
                <div className="space-y-1.5 p-3 rounded-xl bg-amber-400/10 border border-amber-400/30">
                  <div className="flex items-center justify-between text-xs font-mono text-amber-300 font-bold">
                    <span>Uploading to Firebase Storage...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleAddMediaItem}
                disabled={isUploadingMedia || !newMediaTitle.trim() || (uploadMethod === 'file' ? !selectedUploadFile : !newMediaUrl.trim())}
                className="w-full py-3 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition shadow-lg mt-2 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isUploadingMedia ? (
                  <span>Uploading Media ({uploadProgress}%)...</span>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload & Save to Portfolio</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hood Village Fund Allocation Modal */}
      {showHoodAllocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-[#14151C] border border-amber-400/30 space-y-5 shadow-2xl">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-white">Hood Village Support Allocations</h3>
                  <p className="text-xs text-white/50">Configure how patron backing & stream revenues are split across travel, lodging, & care.</p>
                </div>
              </div>
              <button onClick={() => setShowHoodAllocationModal(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Balance Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 to-black/60 border border-amber-400/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-amber-300/80">Total Hood Fund Raised</span>
                <p className="text-2xl font-serif font-bold text-amber-400">
                  ${(profile?.hoodVillageBalance || 0).toLocaleString()} USD
                </p>
                <p className="text-[11px] text-white/60">Sourced from hood.beamthinktank.space + vault stream rev shares</p>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold">
                100% Backed
              </div>
            </div>

            {/* Allocation Sliders Grid */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 no-scrollbar text-xs">
              
              {/* 1. Ground & Flight Transit */}
              <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-white font-semibold">
                    <Truck className="w-4 h-4 text-amber-400" />
                    <span>Ground Transit & Flights ({hoodAllocations.travelPercent}%)</span>
                  </div>
                  <span className="font-mono text-amber-300 font-bold">
                    ${(((profile?.hoodVillageBalance || 0) * hoodAllocations.travelPercent) / 100).toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={hoodAllocations.travelPercent}
                  onChange={(e) => setHoodAllocations({ ...hoodAllocations, travelPercent: Number(e.target.value) })}
                  className="w-full accent-amber-400 bg-white/20 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* 2. Residency Housing & Hotels */}
              <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-white font-semibold">
                    <Building2 className="w-4 h-4 text-purple-400" />
                    <span>Residency Housing & Hotels ({hoodAllocations.housingPercent}%)</span>
                  </div>
                  <span className="font-mono text-purple-300 font-bold">
                    ${(((profile?.hoodVillageBalance || 0) * hoodAllocations.housingPercent) / 100).toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={hoodAllocations.housingPercent}
                  onChange={(e) => setHoodAllocations({ ...hoodAllocations, housingPercent: Number(e.target.value) })}
                  className="w-full accent-purple-400 bg-white/20 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* 3. Catering & Per Diem Meals */}
              <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-white font-semibold">
                    <Utensils className="w-4 h-4 text-emerald-400" />
                    <span>Catering & Per Diem Meals ({hoodAllocations.mealsPercent}%)</span>
                  </div>
                  <span className="font-mono text-emerald-300 font-bold">
                    ${(((profile?.hoodVillageBalance || 0) * hoodAllocations.mealsPercent) / 100).toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={hoodAllocations.mealsPercent}
                  onChange={(e) => setHoodAllocations({ ...hoodAllocations, mealsPercent: Number(e.target.value) })}
                  className="w-full accent-emerald-400 bg-white/20 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* 4. Instrument Care & Luthier Maintenance */}
              <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-white font-semibold">
                    <Wrench className="w-4 h-4 text-blue-400" />
                    <span>Instrument Care & Luthier ({hoodAllocations.maintenancePercent}%)</span>
                  </div>
                  <span className="font-mono text-blue-300 font-bold">
                    ${(((profile?.hoodVillageBalance || 0) * hoodAllocations.maintenancePercent) / 100).toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={hoodAllocations.maintenancePercent}
                  onChange={(e) => setHoodAllocations({ ...hoodAllocations, maintenancePercent: Number(e.target.value) })}
                  className="w-full accent-blue-400 bg-white/20 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

            </div>

            {/* Total Percentage Calculation Note */}
            <div className="p-3 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between text-xs font-mono">
              <span className="text-white/60">Allocated Percentage Total:</span>
              <span className={`font-bold ${
                (hoodAllocations.travelPercent + hoodAllocations.housingPercent + hoodAllocations.mealsPercent + hoodAllocations.maintenancePercent) === 100
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}>
                {hoodAllocations.travelPercent + hoodAllocations.housingPercent + hoodAllocations.mealsPercent + hoodAllocations.maintenancePercent}%
              </span>
            </div>

            <button
              onClick={() => handleSaveHoodAllocations(hoodAllocations)}
              className="w-full py-3 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition shadow-lg flex items-center justify-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>Save Fund Allocations</span>
            </button>

          </div>
        </div>
      )}

      {/* BEAM Recording Catalog Picker Modal */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col p-6 rounded-3xl bg-[#14151C] border border-white/20 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-serif font-bold text-white flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>BEAM Orchestra Recording Catalog</span>
                </h3>
                <p className="text-xs text-white/60">Select recordings uploaded to Orchestra to claim and feature in your profile portfolio & CV.</p>
              </div>

              <button
                onClick={() => setShowCatalogModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
              {['All', 'Steinway Session', 'Rehearsal Footage', 'Chamber Masterclass', 'Orchestral Performance'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCatalogCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                    catalogCategoryFilter === cat
                      ? 'bg-amber-400 text-black font-bold'
                      : 'bg-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Catalog Grid */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar max-h-[60vh]">
              {BEAM_CATALOG_WORKS
                .filter(w => catalogCategoryFilter === 'All' || w.category === catalogCategoryFilter)
                .map((work) => {
                  const isSelected = portfolioItems.some(item => item.url === work.url || item.workId === work.id || item.title === work.title)

                  return (
                    <div
                      key={work.id}
                      onClick={() => handleToggleCatalogWork(work)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-amber-400/10 border-amber-400/60 shadow-lg shadow-amber-400/5'
                          : 'bg-black/40 border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-mono font-bold">
                            {work.category}
                          </span>
                          {work.composer && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono">
                              {work.composer}
                            </span>
                          )}
                          {work.dateRecorded && (
                            <span className="text-[10px] text-white/40 font-mono">{work.dateRecorded}</span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-white leading-snug">{work.title}</h4>
                        {work.description && (
                          <p className="text-xs text-white/60 leading-relaxed">{work.description}</p>
                        )}
                        {work.ensemble && (
                          <p className="text-[11px] text-white/40 font-mono">Ensemble: {work.ensemble}</p>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleCatalogWork(work)
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition flex items-center space-x-1.5 ${
                          isSelected
                            ? 'bg-amber-400 text-black'
                            : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-black" />
                            <span>Attached to Profile</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>Claim Work</span>
                          </>
                        )}
                      </button>
                    </div>
                  )
                })}
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-white/50 font-mono">
                {portfolioItems.length} work(s) attached to portfolio
              </span>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="px-6 py-2.5 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition shadow-lg"
              >
                Done / Save Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Modal Player */}
      {activePlayingMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl font-sans">
          <div className="w-full max-w-4xl p-6 rounded-3xl bg-[#121319] border border-white/20 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-mono font-bold">
                  {activePlayingMedia.category}
                </span>
                <h3 className="text-lg font-serif font-bold text-white mt-1">{activePlayingMedia.title}</h3>
              </div>

              <button
                onClick={() => setActivePlayingMedia(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/10">
              {getYouTubeEmbedUrl(activePlayingMedia.url) ? (
                <iframe
                  src={getYouTubeEmbedUrl(activePlayingMedia.url)!}
                  title={activePlayingMedia.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={activePlayingMedia.url}
                  controls
                  autoPlay
                  playsInline
                  preload="auto"
                  className="w-full h-full object-contain"
                >
                  <source src={activePlayingMedia.url} type="video/mp4" />
                  <source src={activePlayingMedia.url} type="video/quicktime" />
                  Your browser does not support video playback.
                </video>
              )}
            </div>

            {activePlayingMedia.description && (
              <p className="text-xs text-white/70 bg-black/40 p-3 rounded-xl border border-white/10">
                {activePlayingMedia.description}
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              <a
                href={activePlayingMedia.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition flex items-center space-x-1.5 border border-white/10"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                <span>Open Direct Source Link</span>
              </a>

              <button
                onClick={() => setActivePlayingMedia(null)}
                className="px-5 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition"
              >
                Close Player
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

      {/* Record Institutional Booking Dual-Write Modal */}
      {showRecordBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-[#14151C] border border-emerald-500/40 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-white">Record Institutional Booking (Dual-Write)</h3>
                  <p className="text-xs text-white/50">Syncs institutional contract commitment directly as a gig & updates stipend earnings.</p>
                </div>
              </div>
              <button onClick={() => setShowRecordBookingModal(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-white/50 block mb-1 uppercase tracking-wider font-mono">Contract / Concert Title</label>
                <input
                  type="text"
                  value={bookingTitle}
                  onChange={(e) => setBookingTitle(e.target.value)}
                  placeholder="e.g. BDSO Annual Concert at Bradley Symphony Center"
                  className="w-full p-3 rounded-xl bg-black/60 border border-white/20 text-white font-sans focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/50 block mb-1 uppercase tracking-wider font-mono">Venue Name</label>
                  <input
                    type="text"
                    value={bookingVenue}
                    onChange={(e) => setBookingVenue(e.target.value)}
                    placeholder="e.g. Miller High Life Theatre"
                    className="w-full p-3 rounded-xl bg-black/60 border border-white/20 text-white font-sans focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-white/50 block mb-1 uppercase tracking-wider font-mono">City & State</label>
                  <input
                    type="text"
                    value={bookingCityState}
                    onChange={(e) => setBookingCityState(e.target.value)}
                    placeholder="e.g. Milwaukee, WI"
                    className="w-full p-3 rounded-xl bg-black/60 border border-white/20 text-white font-sans focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-white/50 block mb-1 uppercase tracking-wider font-mono">Performance Date</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full p-3 rounded-xl bg-black/60 border border-white/20 text-white font-sans focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-white/50 block mb-1 uppercase tracking-wider font-mono">Gig Category</label>
                  <select
                    value={bookingType}
                    onChange={(e) => setBookingType(e.target.value as EventPlayed['type'])}
                    className="w-full p-3 rounded-xl bg-black/60 border border-white/20 text-white font-sans focus:outline-none focus:border-emerald-400"
                  >
                    <option value="Full Symphony">Full Symphony</option>
                    <option value="Chamber Residency">Chamber Residency</option>
                    <option value="Sectional & Workshop">Sectional & Workshop</option>
                    <option value="Gala Showcase">Gala Showcase</option>
                    <option value="Tour">Tour</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-white/50 block mb-1 uppercase tracking-wider font-mono">Stipend Amount ($ USD)</label>
                  <input
                    type="number"
                    value={bookingStipend}
                    onChange={(e) => setBookingStipend(Number(e.target.value))}
                    className="w-full p-3 rounded-xl bg-black/60 border border-white/20 text-white font-sans focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowRecordBookingModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordInstitutionalBooking}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-bold transition flex items-center space-x-1.5 shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Dual-Write Booking</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How This Works Explainer Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
          <div className="w-full max-w-xl p-6 rounded-3xl bg-[#14151D] border border-amber-400/40 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-white">How This Works — Ecosystem Architecture</h3>
                  <p className="text-xs text-white/60">Overview of your musician profile, dual funding sources, and logistics.</p>
                </div>
              </div>
              <button onClick={() => setShowHelpModal(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Area 1: Gigs */}
              <div className="p-4 rounded-2xl bg-black/50 border border-blue-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span>1. Gigs</span>
                  </span>
                  <button
                    onClick={() => {
                      setShowHelpModal(false)
                      setVideoModalTitle('Gigs')
                    }}
                    className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold flex items-center space-x-1 hover:bg-blue-500/30 transition"
                  >
                    <PlayCircle className="w-3 h-3" />
                    <span>Watch Explainer</span>
                  </button>
                </div>
                <p className="text-white/70 leading-relaxed">
                  Contract and performance opportunities pitched directly to you. Includes stipends ($ USD) and BEAM credit allocations for regional work.
                </p>
              </div>

              {/* Area 2: Ecosystem & Funds */}
              <div className="p-4 rounded-2xl bg-black/50 border border-amber-400/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm flex items-center space-x-2">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span>2. Ecosystem & Funds (Dual-Source Support)</span>
                  </span>
                  <button
                    onClick={() => {
                      setShowHelpModal(false)
                      setVideoModalTitle('Ecosystem & Funds')
                    }}
                    className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-bold flex items-center space-x-1 hover:bg-amber-400/30 transition"
                  >
                    <PlayCircle className="w-3 h-3" />
                    <span>Watch Explainer</span>
                  </button>
                </div>
                <p className="text-white/70 leading-relaxed">
                  Support flows from two sources: patrons backing you through the Hood (<code className="text-amber-300 font-mono">hoods.beamthinktank.space</code>), and institutions committing directly to book you. An institutional commitment dual-writes as an upcoming or past gig.
                </p>
              </div>

              {/* Area 3: Media & Portfolio */}
              <div className="p-4 rounded-2xl bg-black/50 border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm flex items-center space-x-2">
                    <Video className="w-4 h-4 text-purple-400" />
                    <span>3. Media & Portfolio</span>
                  </span>
                  <button
                    onClick={() => {
                      setShowHelpModal(false)
                      setVideoModalTitle('Media & Portfolio')
                    }}
                    className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold flex items-center space-x-1 hover:bg-purple-500/30 transition"
                  >
                    <PlayCircle className="w-3 h-3" />
                    <span>Watch Explainer</span>
                  </button>
                </div>
                <p className="text-white/70 leading-relaxed">
                  Your studio recordings, Steinway sessions, and CV, presented directly to institutions and partner halls considering you for contracts.
                </p>
              </div>

              {/* Area 4: Logistics */}
              <div className="p-4 rounded-2xl bg-black/50 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm flex items-center space-x-2">
                    <Truck className="w-4 h-4 text-emerald-400" />
                    <span>4. Logistics & Support</span>
                  </span>
                  <button
                    onClick={() => {
                      setShowHelpModal(false)
                      setVideoModalTitle('Logistics')
                    }}
                    className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center space-x-1 hover:bg-emerald-500/30 transition"
                  >
                    <PlayCircle className="w-3 h-3" />
                    <span>Watch Explainer</span>
                  </button>
                </div>
                <p className="text-white/70 leading-relaxed">
                  Life360 GPS location beacon sharing plus ground transit, residency housing, and per diem support status dispatching.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-3 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition shadow-lg mt-2"
            >
              Done & Close Explainer
            </button>
          </div>
        </div>
      )}

      {/* Video Explainer Preview Modal */}
      {videoModalTitle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-[#0F1015] border border-white/20 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <p className="text-sm font-bold text-white">{videoModalTitle} — Explainer Video</p>
              <button onClick={() => setVideoModalTitle(null)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video bg-black/70 rounded-2xl border border-white/10 flex flex-col items-center justify-center space-y-2 p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                <PlayCircle className="w-6 h-6" />
              </div>
              <p className="text-xs text-white/80 font-semibold">{videoModalTitle} Architecture Overview</p>
              <p className="text-[11px] text-white/50">Explainer clip for {videoModalTitle}. Dual-source funding & logistics overview.</p>
            </div>
            <button
              onClick={() => setVideoModalTitle(null)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition"
            >
              Close Video
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
