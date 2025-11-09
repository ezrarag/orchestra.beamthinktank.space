'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  Music, 
  Calendar, 
  DollarSign, 
  Coins, 
  Upload, 
  Play,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Award,
  Info,
  Download,
  Phone,
  Mail,
  Linkedin,
  MapPin as Location,
  Menu,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { 
  rehearsalSchedule, 
  faqData, 
  ravelExcerptDownloads,
  montgomeryExcerptDownloads
} from './data'
import MusicianProfileModal from '@/components/MusicianProfileModal'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { db, auth } from '@/lib/firebase'
import { doc, setDoc, serverTimestamp, getDoc, collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'

// Define types for Firestore roster data
type MusicianDetail = {
  id?: string
  name: string
  email?: string | null
  phone?: string | null
  status: 'Pending' | 'Interested' | 'Confirmed' | 'Open' | 'pending' | 'interested' | 'confirmed' | 'open'
  source?: string
  notes?: string | null
  bio?: string | null
  headshotUrl?: string | null
  mediaEmbedUrl?: string | null
  supportLink?: string | null
  instrument?: string
  role?: string
  projectId?: string
  joinedAt?: any
  updatedAt?: any
}

type MusicianProfile = MusicianDetail & { instrument: string }

type RosterSection = {
  instrument: string
  needed: number
  confirmed: number
  remaining: number
  percentage: number
  musicians: string[]
  musicianDetails: MusicianDetail[]
}

const navigationSections = [
  { id: 'roster', label: 'Roster', icon: Users },
  { id: 'materials', label: 'Materials', icon: Upload },
  { id: 'compensation', label: 'Compensation', icon: DollarSign },
  { id: 'schedule', label: 'Rehearsals', icon: Calendar },
  { id: 'faq', label: 'FAQ', icon: Info },
  { id: 'media', label: 'Media', icon: Play }
]

// Helper function to group musicians by instrument
function groupByInstrument(musicians: any[]): RosterSection[] {
  // Define instrument requirements (can be moved to Firestore later)
  const instrumentRequirements: Record<string, number> = {
    'Violin I': 6,
    'Violin II': 6,
    'Viola': 6,
    'Cello': 4,
    'Bass': 3,
    'Flute': 2,
    'Oboe': 2,
    'Clarinet': 2,
    'Bassoon': 2,
    'Horn': 4,
    'Trumpet': 3,
    'Trombone': 3,
    'Tuba': 1,
    'Harp': 1,
    'Timpani': 1,
    'Percussion': 2,
    'Conductor': 1,
    'Assistant Conductor': 1,
  }

  const map: Record<string, any[]> = {}
  
  musicians.forEach((m) => {
    const instrument = m.instrument || 'Other'
    if (!map[instrument]) {
      map[instrument] = []
    }
    
    // Map Firestore status to UI status
    let status: 'Pending' | 'Interested' | 'Confirmed' | 'Open' = 'Interested'
    if (m.status === 'confirmed') {
      status = 'Confirmed'
    } else if (m.status === 'pending') {
      status = 'Pending'
    } else if (m.status === 'open') {
      status = 'Open'
    }
    
    map[instrument].push({
      name: m.name || 'Unknown',
      email: m.email || null,
      phone: m.phone || null,
      status: status,
      source: m.source || 'Unknown',
      notes: m.notes || '',
      bio: m.bio || '',
      headshotUrl: m.headshotUrl || '',
      mediaEmbedUrl: m.mediaEmbedUrl || '',
      supportLink: m.supportLink || '',
      instrument: instrument,
    })
  })

  // Get all instruments from requirements and map
  const allInstruments = new Set([
    ...Object.keys(instrumentRequirements),
    ...Object.keys(map),
  ])

  return Array.from(allInstruments).map((instrument) => {
    const details = map[instrument] || []
    const confirmed = details.filter((m) => m.status === 'Confirmed').length
    const needed = instrumentRequirements[instrument] || 0
    const remaining = Math.max(0, needed - confirmed)
    const percentage = needed > 0 ? Math.round((confirmed / needed) * 100) : 0

    return {
      instrument,
      needed,
      confirmed,
      remaining,
      percentage,
      musicians: details.filter((m) => m.status === 'Confirmed').map((m) => m.name),
      musicianDetails: details,
    }
  })
}

export default function BlackDiasporaSymphonyPage() {
  const { user } = useUserRole()
  const [rosterData, setRosterData] = useState<RosterSection[]>([])
  const [rosterLoading, setRosterLoading] = useState(true)
  const [mediaItems, setMediaItems] = useState<any[]>([])
  const [mediaLoading, setMediaLoading] = useState(true)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [showAuditionForm, setShowAuditionForm] = useState(false)
  const [submittedAudition, setSubmittedAudition] = useState(false)
  const [showRavelModal, setShowRavelModal] = useState(false)
  const [showMontgomeryModal, setShowMontgomeryModal] = useState(false)
  const [hoveredExcerpt, setHoveredExcerpt] = useState<string | null>(null)
  const [ravelSearch, setRavelSearch] = useState('')
  const [montgomerySearch, setMontgomerySearch] = useState('')
  const [isVerificationExpanded, setIsVerificationExpanded] = useState(false)
  const [isDocumentsExpanded, setIsDocumentsExpanded] = useState(false)
  const [activeSection, setActiveSection] = useState('roster')
  const [scrollY, setScrollY] = useState(0)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [showBeamVideo, setShowBeamVideo] = useState(false)
  const [showBeamCompensation, setShowBeamCompensation] = useState(false)
  const [showMusicianModal, setShowMusicianModal] = useState(false)
  const [selectedMusician, setSelectedMusician] = useState<any>(null) // Type matches MusicianProfileModal's expected format
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set())
  
  // Verification state
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'uploading' | 'verifying' | 'success' | 'error'>('idle')
  const [verificationMethod, setVerificationMethod] = useState<'document' | 'email' | null>(null)
  const [schoolEmail, setSchoolEmail] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)
  
  // Documents state
  const [showDocumentsModal, setShowDocumentsModal] = useState(false)
  const [documents, setDocuments] = useState<{[key: string]: any}>({})
  const [uploadingDocuments, setUploadingDocuments] = useState<Set<string>>(new Set())
  
  // Project details modal state
  const [showProjectDetailsModal, setShowProjectDetailsModal] = useState(false)
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<'overview' | 'join' | 'media'>('overview')
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  
  // Musician profile state
  const [musicianProfile, setMusicianProfile] = useState({
    name: '',
    instrument: '',
    email: '',
    bio: '',
    headshotUrl: '',
    status: 'Interested' as 'Interested' | 'Confirmed'
  })
  
  const videoRef = useRef<HTMLVideoElement>(null)

  const montgomeryAvailableCount = montgomeryExcerptDownloads.filter(part => part.available).length
  const ravelAvailableCount = ravelExcerptDownloads.filter(part => part.available).length
  const hasMontgomeryDownloads = montgomeryAvailableCount > 0
  const hasRavelDownloads = ravelAvailableCount > 0

  const filteredRavelDownloads = ravelExcerptDownloads.filter(part =>
    part.instrument.toLowerCase().includes(ravelSearch.trim().toLowerCase())
  )

  const filteredMontgomeryDownloads = montgomeryExcerptDownloads.filter(part =>
    part.instrument.toLowerCase().includes(montgomerySearch.trim().toLowerCase())
  )

  const excerptStatusMessage = (work: 'montgomery' | 'ravel') => {
    if (work === 'montgomery') {
      return hasMontgomeryDownloads ? `${montgomeryAvailableCount} downloads ready` : 'No files yet'
    }

    if (!hasRavelDownloads) {
      return 'No files yet'
    }

    return `${ravelAvailableCount} instrument${ravelAvailableCount === 1 ? '' : 's'} ready`
  }

  const totalNeeded = rosterData.reduce((sum, section) => sum + section.needed, 0)
  const totalConfirmed = rosterData.reduce((sum, section) => sum + section.confirmed, 0)
  const totalInterested = rosterData.reduce((sum, section) => 
    sum + section.musicianDetails.filter(m => m.status === 'Interested').length, 0
  )
  const totalPending = rosterData.reduce((sum, section) => 
    sum + section.musicianDetails.filter(m => m.status === 'Pending').length, 0
  )
  const overallPercentage = Math.round((totalConfirmed / totalNeeded) * 100)

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    setMobileNavOpen(false)
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleOpenMusicianProfile = (instrument: string | undefined, musician: MusicianDetail) => {
    // Convert to MusicianProfileModal's expected format
    const profile = {
      name: musician.name,
      email: musician.email || '',
      status: typeof musician.status === 'string' ? musician.status : 'Pending',
      source: musician.source || '',
      notes: musician.notes || undefined,
      bio: musician.bio || undefined,
      headshotUrl: musician.headshotUrl || undefined,
      mediaEmbedUrl: musician.mediaEmbedUrl || undefined,
      supportLink: musician.supportLink || undefined,
      instrument: (instrument || musician.instrument || '') as string,
    }
    setSelectedMusician(profile as any) // Type assertion to handle modal's type
    setShowMusicianModal(true)
  }

  const handleCloseMusicianProfile = () => {
    setShowMusicianModal(false)
    setSelectedMusician(null)
  }

  const handleDirectDownload = async (url: string, filename: string) => {
    const downloadKey = `${url}-${filename}`
    
    try {
      setDownloadingFiles(prev => new Set(prev).add(downloadKey))
      
      // For Firebase Storage URLs, fetch the blob and force download
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const blob = await response.blob()
      
      // Create a temporary URL for the blob
      const blobUrl = window.URL.createObjectURL(blob)
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      
      // Clean up after a short delay to ensure download starts
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(blobUrl)
      }, 100)
    } catch (error) {
      console.error('Download failed:', error)
      // Fallback: try opening in new tab
      window.open(url, '_blank')
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(downloadKey)
        return newSet
      })
    }
  }

  const getMusicianInitials = (name: string) => {
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map(part => part[0]?.toUpperCase() ?? '')
      .join('')
    return initials.slice(0, 2) || 'BDSO'
  }

  const getSupportLabel = (name: string) => {
    const part = name
      .split(' ')
      .map(segment => segment.trim())
      .find(segment => segment.length > 0)
    return part ?? 'This Artist'
  }

  // Project details carousel content
  const projectCarouselContent = [
    {
      type: 'video',
      title: '2025 Memorial Concert - Behind the Scenes',
      url: 'https://link.storjshare.io/raw/ju2fwbvsloifiuwlrnp7jmwurlqa/orchestabeam/1011.mp4',
      description: 'A glimpse into the preparation and dedication behind the Black Diaspora Symphony Orchestra performance.'
    },
    {
      type: 'image',
      title: 'Margaret Bonds - Montgomery Variations',
      url: 'https://example.com/concert-poster.jpg',
      description: 'The featured composition for this year\'s memorial concert.'
    },
    {
      type: 'pdf',
      title: 'Concert Program',
      url: 'https://example.com/program.pdf',
      description: 'Download the full concert program with artist biographies and repertoire details.'
    },
    {
      type: 'video',
      title: 'Rehearsal Highlights',
      url: 'https://example.com/rehearsal-video.mp4',
      description: 'Watch our musicians prepare for this special performance.'
    }
  ]

  const nextCarouselSlide = () => {
    setCurrentCarouselIndex((prev) => (prev + 1) % projectCarouselContent.length)
  }

  const prevCarouselSlide = () => {
    setCurrentCarouselIndex((prev) => (prev - 1 + projectCarouselContent.length) % projectCarouselContent.length)
  }

  // Musician profile submission
  const handleGoogleSignIn = async () => {
    if (!auth) {
      alert('Firebase Auth is not available. Please configure Firebase.')
      return
    }

    try {
      const provider = new GoogleAuthProvider()
      provider.addScope('profile')
      provider.addScope('email')
      
      await signInWithPopup(auth, provider)
    } catch (error: any) {
      console.error('Error signing in:', error)
      if (error.code !== 'auth/popup-closed-by-user') {
        alert(`Authentication failed: ${error.message}`)
      }
    }
  }

  const handleMusicianProfileSubmit = async () => {
    if (!user) {
      alert('Please sign in to join this project')
      return
    }

    try {
      const profileData = {
        ...musicianProfile,
        email: musicianProfile.email || user.email || '',
        verified: false,
        joinedAt: serverTimestamp()
      }

      await setDoc(doc(db, 'musicians', user.uid), profileData)
      
      // Show success animation
      setShowSuccessAnimation(true)
      setTimeout(() => setShowSuccessAnimation(false), 3000)
      
      // Reset form after brief delay
      setTimeout(() => {
        setActiveTab('overview')
      }, 2000)
      
    } catch (error) {
      console.error('Error submitting musician profile:', error)
      alert('Failed to submit profile. Please try again.')
    }
  }

  // Load roster from Firestore
  useEffect(() => {
    if (!db) {
      setRosterLoading(false)
      return
    }

    // Use simpler query without orderBy to avoid requiring a composite index
    // Can add orderBy later if needed, but for now just filter by projectId
    const q = query(
      collection(db, 'projectMusicians'),
      where('projectId', '==', 'black-diaspora-symphony')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const musicians: MusicianDetail[] = snapshot.docs.map((doc) => {
          const data = doc.data()
          // Normalize status to handle both lowercase (Firestore) and capitalized (legacy) values
          const rawStatus = data.status || 'pending'
          const normalizedStatus = typeof rawStatus === 'string' 
            ? rawStatus.toLowerCase() as 'pending' | 'interested' | 'confirmed' | 'open'
            : 'pending'
          
          return {
            id: doc.id,
            name: data.name || '',
            email: data.email || null,
            phone: data.phone || null,
            instrument: data.instrument || '',
            status: normalizedStatus,
            role: data.role || 'musician',
            notes: data.notes || null,
            bio: data.bio || null,
            headshotUrl: data.headshotUrl || null,
            mediaEmbedUrl: data.mediaEmbedUrl || null,
            supportLink: data.supportLink || null,
            source: data.source || '',
            projectId: data.projectId || '',
            joinedAt: data.joinedAt || null,
            updatedAt: data.updatedAt || null,
          }
        })
        
        console.log('🎻 Loaded musicians:', musicians.length)
        console.log('📊 Roster snapshot:', {
          total: musicians.length,
          byStatus: {
            confirmed: musicians.filter(m => m.status === 'confirmed' || m.status === 'Confirmed').length,
            pending: musicians.filter(m => m.status === 'pending' || m.status === 'Pending').length,
            interested: musicians.filter(m => m.status === 'interested' || m.status === 'Interested').length
          }
        })
        
        const grouped = groupByInstrument(musicians)
        setRosterData(grouped)
        setRosterLoading(false)
      },
      (error) => {
        console.error('❌ Error loading roster:', error)
        setRosterLoading(false)
        // Fallback: set empty roster or keep existing
      }
    )

    return () => unsubscribe()
  }, [])

  // Load media from Pulse API
  useEffect(() => {
    fetch('/api/pulse/media?projectId=black-diaspora-symphony')
      .then((res) => res.json())
      .then((data) => {
        setMediaItems(data.items || [])
        setMediaLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load media:', err)
        setMediaLoading(false)
      })
  }, [])

  // Load existing musician profile
  useEffect(() => {
    const loadMusicianProfile = async () => {
      if (user) {
        try {
          const profileDoc = await getDoc(doc(db, 'musicians', user.uid))
          if (profileDoc.exists()) {
            const profileData = profileDoc.data()
            setMusicianProfile({
              name: profileData.name || '',
              instrument: profileData.instrument || '',
              email: profileData.email || user.email || '',
              bio: profileData.bio || '',
              headshotUrl: profileData.headshotUrl || '',
              status: profileData.status || 'Interested'
            })
          } else if (user.email) {
            setMusicianProfile(prev => ({ ...prev, email: user.email || '' }))
          }
        } catch (error) {
          console.error('Error loading musician profile:', error)
        }
      }
    }
    
    loadMusicianProfile()
  }, [user])

  // Verification functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
      if (!allowedTypes.includes(file.type)) {
        setVerificationError('Please upload a PDF, PNG, or JPG file')
        return
      }
      
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        setVerificationError('File size must be less than 10MB')
        return
      }
      
      setUploadedFile(file)
      setVerificationError(null)
      setVerificationMethod('document')
    }
  }

  const handleEmailVerification = () => {
    if (!schoolEmail.trim()) {
      setVerificationError('Please enter your school email')
      return
    }
    
    if (!schoolEmail.endsWith('.edu')) {
      setVerificationError('Please enter a valid .edu email address')
      return
    }
    
    setVerificationMethod('email')
    setVerificationError(null)
    submitVerification()
  }

  const submitVerification = async () => {
    if (!user) {
      setVerificationError('Please sign in to verify your status')
      return
    }

    try {
      setVerificationStatus('uploading')
      
      let documentUrl = ''
      let institution = ''
      
      if (verificationMethod === 'document' && uploadedFile) {
        // Upload file to Firebase Storage
        const fileRef = ref(storage, `verifications/${user.uid}/${uploadedFile.name}`)
        await uploadBytes(fileRef, uploadedFile)
        documentUrl = await getDownloadURL(fileRef)
        
        // Extract institution from filename or use generic
        institution = uploadedFile.name.split('.')[0] || 'Unknown Institution'
      } else if (verificationMethod === 'email') {
        // Extract institution from email domain
        const domain = schoolEmail.split('@')[1]
        institution = domain.replace('.edu', '').replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      }

      // Write to Firestore
      const verificationData = {
        email: verificationMethod === 'email' ? schoolEmail : user.email,
        documentUrl: documentUrl,
        institution: institution,
        verified: false, // Will be manually verified by admin
        verifiedAt: null,
        submittedAt: serverTimestamp(),
        method: verificationMethod
      }

      await setDoc(doc(db, 'verifications', user.uid), verificationData)
      
      setVerificationStatus('success')
      setIsVerified(true)
      setVerificationError(null)
      
    } catch (error) {
      console.error('Verification submission failed:', error)
      setVerificationStatus('error')
      setVerificationError('Failed to submit verification. Please try again.')
    }
  }

  // Document upload functions
  const documentTypes = [
    { id: 'W4', name: 'W-4 Form', description: 'Tax withholding form for payment processing' },
    { id: 'MediaRelease', name: 'Media Release', description: 'Permission for photography and recording' },
    { id: 'Agreement', name: 'Musician Agreement', description: 'Performance contract and terms' },
    { id: 'ID', name: 'Proof of ID', description: 'Government-issued identification' }
  ]

  const handleDocumentUpload = async (docType: string, file: File) => {
    if (!user) {
      alert('Please sign in to upload documents')
      return
    }

    try {
      setUploadingDocuments(prev => new Set(prev).add(docType))
      
      // Upload to Firebase Storage
      const fileRef = ref(storage, `documents/${user.uid}/${docType}/${file.name}`)
      await uploadBytes(fileRef, file)
      const downloadURL = await getDownloadURL(fileRef)
      
      // Save metadata to Firestore
      const documentData = {
        type: docType,
        storagePath: `documents/${user.uid}/${docType}/${file.name}`,
        downloadURL: downloadURL,
        uploadedAt: serverTimestamp(),
        verified: false,
        fileName: file.name,
        fileSize: file.size
      }
      
      await setDoc(doc(db, 'documents', user.uid, 'documents', docType), documentData)
      
      // Update local state
      setDocuments(prev => ({
        ...prev,
        [docType]: documentData
      }))
      
    } catch (error) {
      console.error('Document upload failed:', error)
      alert('Failed to upload document. Please try again.')
    } finally {
      setUploadingDocuments(prev => {
        const newSet = new Set(prev)
        newSet.delete(docType)
        return newSet
      })
    }
  }

  const loadUserDocuments = async () => {
    if (!user) return
    
    try {
      const documentsSnapshot = await getDoc(doc(db, 'documents', user.uid))
      if (documentsSnapshot.exists()) {
        const docsData = documentsSnapshot.data()
        setDocuments(docsData)
      }
    } catch (error) {
      console.error('Error loading documents:', error)
    }
  }

  const renderMusicianSource = (source: string | undefined | null): JSX.Element | string => {
    if (!source) {
      return 'n/a'
    }

    const detailStart = source.indexOf('(')
    if (detailStart !== -1) {
      const label = source.slice(0, detailStart).trimEnd()
      const detail = source.slice(detailStart).trimStart()

      return (
        <>
          {label}
          <span className="relative inline-flex items-center">
            <span className="ml-1 blur-sm sm:blur select-none pointer-events-none">{detail}</span>
            <span className="sr-only">Date hidden for privacy</span>
          </span>
        </>
      )
    }

    return source
  }

  // Check verification status and load documents on component mount
  useEffect(() => {
    const checkVerificationStatus = async () => {
      if (user) {
        try {
          const verificationDoc = await getDoc(doc(db, 'verifications', user.uid))
          if (verificationDoc.exists()) {
            const verificationData = verificationDoc.data()
            if (verificationData.submittedAt) {
              setIsVerified(true)
            }
          }
        } catch (error) {
          console.error('Error checking verification status:', error)
        }
      }
    }

    const loadDocuments = async () => {
      if (user) {
        try {
          const documentsSnapshot = await getDoc(doc(db, 'documents', user.uid))
          if (documentsSnapshot.exists()) {
            const docsData = documentsSnapshot.data()
            setDocuments(docsData)
          }
        } catch (error) {
          console.error('Error loading documents:', error)
        }
      }
    }

    checkVerificationStatus()
    loadDocuments()
  }, [user])

  // Update active section and scroll position based on scroll - throttled for performance
  useEffect(() => {
    let ticking = false
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(window.scrollY)
          
          const sections = navigationSections.map(section => section.id)
          const scrollPosition = window.scrollY + 100 // Offset for better detection

          // Find the section that's currently most visible
          let currentSection = sections[0] // Default to first section
          
          for (let i = sections.length - 1; i >= 0; i--) {
            const section = document.getElementById(sections[i])
            if (section) {
              const sectionTop = section.offsetTop
              
              // If we've scrolled past the start of this section, it's the current one
              if (scrollPosition >= sectionTop) {
                currentSection = sections[i]
                break
              }
            }
          }
          
          setActiveSection(currentSection)
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowRavelModal(false)
        setShowMontgomeryModal(false)
        setShowBeamVideo(false)
        setMobileNavOpen(false)
        setShowMusicianModal(false)
        setSelectedMusician(null)
        setShowProjectDetailsModal(false)
        setActiveTab('overview')
      }
    }

    if (showRavelModal || showMontgomeryModal || showBeamVideo || mobileNavOpen || showMusicianModal || showProjectDetailsModal) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }

    return () => {}
  }, [showRavelModal, showMontgomeryModal, showBeamVideo, mobileNavOpen, showMusicianModal, showProjectDetailsModal])

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fixed Background Video */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onError={(e) => {
            console.error('Video failed to load:', e)
            // Fallback to gradient background if video fails
          }}
          onLoadStart={() => console.log('Video loading started')}
          onCanPlay={() => console.log('Video can play')}
        >
          <source src="https://link.storjshare.io/raw/ju2fwbvsloifiuwlrnp7jmwurlqa/orchestabeam/1011.mp4" type="video/mp4" />
        </video>
        
        {/* Fallback background if video fails */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-yellow-400 to-white" />
        
        {/* Dynamic Overlay - gets darker and blurrier on scroll */}
        <motion.div
          className="absolute inset-0 bg-black"
          style={{
            opacity: Math.min(scrollY / 1000, 0.7),
            backdropFilter: `blur(${Math.min(scrollY / 50, 10)}px)`,
          }}
        />
        
        {/* Static gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 via-slate-900/60 to-blue-900/60" />
      </div>

      {/* Hero Section - Portfolio Style */}
      <div className="relative z-10 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 items-center">
            {/* Left Content Area */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              {/* Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-white text-sm">Active Project</span>
              </div>

              {/* Title */}
              <div>
                <h2 className="text-yellow-400 text-lg font-semibold uppercase tracking-wider mb-2">
                  PROJECT DASHBOARD
                </h2>
                <h1 className="text-6xl md:text-8xl font-bold text-white leading-tight">
                  Black Diaspora<br />Symphony Orchestra
                </h1>
              </div>

              {/* Project Info */}
              <div className="space-y-4">
                <div className="flex items-center text-white">
                  <Calendar className="w-5 h-5 mr-3 text-purple-400" />
                  <span>2025 Annual Memorial Concert</span>
                </div>
                <div className="flex items-center text-white">
                  <Users className="w-5 h-5 mr-3 text-purple-400" />
                  <span>{totalConfirmed}/{totalNeeded} Musicians Confirmed ({overallPercentage}%)</span>
                </div>
                <div className="flex items-center text-white">
                  <Music className="w-5 h-5 mr-3 text-purple-400" />
                  <span>Margaret Bonds' Montgomery Variations</span>
                </div>
                <div className="flex items-center text-white">
                  <Location className="w-5 h-5 mr-3 text-purple-400" />
                  <span>Central United Methodist Church, Wisconsin</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowProjectDetailsModal(true)
                    setActiveTab('overview')
                  }}
                  className="bg-yellow-400 text-black font-semibold px-8 py-3 rounded-lg hover:bg-yellow-300 transition-colors"
                >
                  View Project Details
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowProjectDetailsModal(true)
                    setActiveTab('join')
                  }}
                  className="bg-white/10 text-white font-semibold px-8 py-3 rounded-lg border border-white/20 hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Music className="w-5 h-5" />
                  <span>Play in This Project</span>
                </motion.button>
              </div>
            </motion.div>

          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-24">
        {/* Roster Visualization */}
        <motion.section
          id="roster"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative left-1/2 -ml-[50vw] w-screen px-4 sm:px-6 lg:px-12"
        >
          <div className="max-w-7xl mx-auto bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
              <Music className="w-8 h-8 mr-3 text-purple-400" />
              Orchestra Roster
            </h2>
            
              {/* Roster Table */}
              <div className="space-y-4 lg:space-y-6 lg:overflow-y-auto lg:pr-6 lg:snap-y lg:snap-mandatory lg:h-full lg:max-h-[75vh]">
                {rosterLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
                    <span className="ml-4 text-gray-300">Loading roster...</span>
                  </div>
                ) : rosterData.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p>No musicians registered yet.</p>
                  </div>
                ) : (
                  rosterData.map((section, index) => (
                    <motion.div
                      key={section.instrument}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="bg-white/5 rounded-lg p-4 border border-white/10 lg:snap-start"
                    >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white">{section.instrument}</h3>
                      <div className="text-sm text-gray-300">
                        {section.confirmed}/{section.needed} filled
                      </div>
                    </div>
                    
                    <div className="w-full bg-white/10 rounded-full h-3 mb-3">
                      <motion.div
                        className="h-full bg-gradient-to-r from-purple-400 to-blue-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${section.percentage}%` }}
                        transition={{ duration: 1, delay: 0.5 + index * 0.05 }}
                      />
                    </div>
                    
                    <div className="text-xs text-gray-400">
                      {section.remaining > 0 ? (
                        <span className="text-yellow-400">
                          {section.remaining} position{section.remaining > 1 ? 's' : ''} remaining
                        </span>
                      ) : (
                        <span className="text-green-400">Section complete!</span>
                      )}
                    </div>
                    
                    {section.musicianDetails.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {section.musicianDetails.map((musician, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleOpenMusicianProfile(section.instrument || '', musician)}
                            className="group w-full text-left bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white font-medium text-sm underline decoration-white/40 underline-offset-4 group-hover:decoration-white">
                                {musician.name}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                musician.status === 'Confirmed' 
                                  ? 'bg-green-500/20 text-green-300'
                                  : musician.status === 'Interested'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : musician.status === 'Pending'
                                  ? 'bg-yellow-500/20 text-yellow-300'
                                  : 'bg-gray-500/20 text-gray-300'
                              }`}>
                                {musician.status}
                              </span>
                            </div>
                            <div className="text-gray-400 text-xs">
                              <div className="flex items-center mb-1">
                                <span className="mr-2">📧</span>
                                <span className="relative inline-flex items-center">
                                  <span className="blur-sm sm:blur select-none pointer-events-none">{musician.email}</span>
                                  <span className="sr-only">Email hidden for privacy</span>
                                </span>
                              </div>
                              <div className="flex items-center mb-1">
                                <span className="mr-2">📅</span>
                                <span className="text-gray-400">
                                  {renderMusicianSource(musician.source)}
                                </span>
                              </div>
                              {musician.notes && (
                                <div className="text-gray-500 text-xs mt-1 italic">
                                  {musician.notes}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                  ))
                )}
              </div>
          </div>
        </motion.section>

        {/* Materials Section */}
        <motion.section
          id="materials"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
              <Upload className="w-8 h-8 mr-3 text-purple-400" />
              Materials
            </h2>
            
            {/* Memorial Concert Repertoire - Moved to top */}
            <div className="bg-white/5 rounded-lg p-6 border border-white/10 mb-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Play className="w-5 h-5 mr-2 text-purple-400" />
                Memorial Concert Repertoire
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div>
                    <p className="text-white font-medium">Montgomery Variations</p>
                    <p className="text-gray-400 text-sm">Margaret Bonds - Movement I</p>
                  </div>
                  <div className="relative">
                    <motion.button 
                      type="button"
                      onClick={() => hasMontgomeryDownloads && setShowMontgomeryModal(true)}
                      onMouseEnter={() => setHoveredExcerpt('montgomery')}
                      onMouseLeave={() => setHoveredExcerpt(null)}
                      onFocus={() => setHoveredExcerpt('montgomery')}
                      onBlur={() => setHoveredExcerpt(null)}
                      disabled={!hasMontgomeryDownloads}
                      className={`bg-purple-500 text-white px-4 py-2 rounded-lg text-sm transition-colors ${hasMontgomeryDownloads ? 'hover:bg-purple-600' : 'opacity-50 cursor-not-allowed'}`}
                      aria-disabled={!hasMontgomeryDownloads}
                    >
                      Download PDF
                    </motion.button>
                    <AnimatePresence>
                      {hoveredExcerpt === 'montgomery' && (
                        <motion.span
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap rounded-full bg-white/10 px-3 py-1 text-xs text-gray-200 border border-white/10 backdrop-blur-md"
                        >
                          {excerptStatusMessage('montgomery')}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div>
                    <p className="text-white font-medium">Le Tombeau de Couperin</p>
                    <p className="text-gray-400 text-sm">Maurice Ravel - Parts</p>
                  </div>
                  <div className="relative">
                    <motion.button 
                      type="button"
                      onMouseEnter={() => setHoveredExcerpt('ravel')}
                      onMouseLeave={() => setHoveredExcerpt(null)}
                      onFocus={() => setHoveredExcerpt('ravel')}
                      onBlur={() => setHoveredExcerpt(null)}
                      onClick={() => hasRavelDownloads && setShowRavelModal(true)}
                      disabled={!hasRavelDownloads}
                      className={`bg-purple-500 text-white px-4 py-2 rounded-lg text-sm transition-colors ${hasRavelDownloads ? 'hover:bg-purple-600' : 'opacity-50 cursor-not-allowed'}`}
                      aria-disabled={!hasRavelDownloads}
                    >
                      Download PDF
                    </motion.button>
                    <AnimatePresence>
                      {hoveredExcerpt === 'ravel' && (
                        <motion.span
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap rounded-full bg-white/10 px-3 py-1 text-xs text-gray-200 border border-white/10 backdrop-blur-md"
                        >
                          {excerptStatusMessage('ravel')}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Student/Alumni Verification */}
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <button
                    onClick={() => setIsVerificationExpanded(!isVerificationExpanded)}
                    className="w-full flex items-center justify-between mb-4"
                  >
                    <h3 className="text-xl font-semibold text-white flex items-center">
                      <Upload className="w-6 h-6 mr-2 text-purple-400" />
                      Verify Student or Alumni Status
                    </h3>
                    {isVerificationExpanded ? (
                      <ChevronUp className="w-5 h-5 text-purple-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  
                  <AnimatePresence initial={false}>
                    {isVerificationExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                  
                  {!user ? (
                    <div className="text-center py-8">
                      <p className="text-gray-300 mb-4">Please sign in to verify your student or alumni status</p>
                      <button
                        onClick={handleGoogleSignIn}
                        className="bg-orchestra-gold hover:bg-orchestra-gold/90 text-orchestra-dark font-bold px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-3 mx-auto"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#1a1a1a" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#1a1a1a" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#1a1a1a" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#1a1a1a" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span>Sign In with Google</span>
                      </button>
                    </div>
                  ) : !isVerified ? (
                    <div className="space-y-4">
                      <p className="text-gray-300 text-sm">
                        If you are currently enrolled or an alumnus of a college or university, you can verify your status here to join the BEAM Participant Program and earn in BEAM Coin.
                      </p>
                      
                      {verificationError && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center">
                          <AlertCircle className="w-4 h-4 text-red-400 mr-2" />
                          <p className="text-red-200 text-sm">{verificationError}</p>
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        {/* Option A: Document Upload */}
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <h4 className="text-white font-medium mb-2 flex items-center">
                            <Upload className="w-4 h-4 mr-2 text-purple-400" />
                            Option A: Upload Document
                          </h4>
                          <p className="text-gray-400 text-xs mb-3">
                            Upload school ID or transcript (PDF, PNG, JPG)
                          </p>
                          <div className="space-y-3">
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              onChange={handleFileUpload}
                              className="hidden"
                              id="document-upload"
                            />
                            <label
                              htmlFor="document-upload"
                              className="border-2 border-dashed border-white/20 rounded-lg p-4 text-center hover:border-purple-400 transition-colors cursor-pointer block"
                            >
                              <Upload className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                              <p className="text-gray-300 text-sm">Click to upload or drag and drop</p>
                              <p className="text-gray-500 text-xs mt-1">PDF, PNG, JPG files accepted</p>
                            </label>
                            {uploadedFile && (
                              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 flex items-center">
                                <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                                <p className="text-green-200 text-sm">{uploadedFile.name}</p>
                              </div>
                            )}
                            {verificationMethod === 'document' && uploadedFile && (
                              <button
                                onClick={submitVerification}
                                disabled={verificationStatus === 'uploading'}
                                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm"
                              >
                                {verificationStatus === 'uploading' ? 'Uploading...' : 'Submit Verification'}
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Option B: Email Verification */}
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <h4 className="text-white font-medium mb-2 flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-purple-400" />
                            Option B: Email Verification
                          </h4>
                          <p className="text-gray-400 text-xs mb-3">
                            Enter your official school email (ends with .edu)
                          </p>
                          <div className="space-y-3">
                            <input
                              type="email"
                              value={schoolEmail}
                              onChange={(e) => setSchoolEmail(e.target.value)}
                              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="your.name@university.edu"
                            />
                            <button
                              onClick={handleEmailVerification}
                              disabled={verificationStatus === 'verifying'}
                              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm"
                            >
                              {verificationStatus === 'verifying' ? 'Verifying...' : 'Verify Email'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-400" />
                      </div>
                      <h4 className="text-lg font-semibold text-white mb-2">Verification Submitted!</h4>
                      <p className="text-gray-300 text-sm">
                        Thank you for your submission. We'll review your verification and contact you within 48 hours to confirm your BEAM Participant Program status.
                      </p>
                    </div>
                  )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Documents Submission */}
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <button
                    onClick={() => setIsDocumentsExpanded(!isDocumentsExpanded)}
                    className="w-full flex items-center justify-between mb-4"
                  >
                    <h3 className="text-xl font-semibold text-white flex items-center">
                      <Upload className="w-6 h-6 mr-2 text-purple-400" />
                      Required Documents
                    </h3>
                    {isDocumentsExpanded ? (
                      <ChevronUp className="w-5 h-5 text-purple-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  
                  <AnimatePresence initial={false}>
                    {isDocumentsExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                  
                  {!user ? (
                    <div className="text-center py-8">
                      <p className="text-gray-300 mb-4">Please sign in to access required documents</p>
                      <button
                        onClick={handleGoogleSignIn}
                        className="bg-orchestra-gold hover:bg-orchestra-gold/90 text-orchestra-dark font-bold px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-3 mx-auto"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#1a1a1a" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#1a1a1a" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#1a1a1a" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#1a1a1a" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span>Sign In with Google</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-gray-300 text-sm">
                        Complete all required forms and documents to participate in the BEAM Orchestra project.
                      </p>
                      
                      <button
                        onClick={() => {
                          setShowDocumentsModal(true)
                          loadUserDocuments()
                        }}
                        className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
                      >
                        <Upload className="w-5 h-5 mr-2" />
                        Complete Required Forms
                      </button>
                      
                      {/* Required Documents List */}
                      <div className="mt-4 space-y-2">
                        <h4 className="text-white font-medium text-sm mb-3">Required Documents:</h4>
                        <div className="space-y-2">
                          <div className="flex items-center text-gray-300 text-sm">
                            <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                            <span>W-4 Form (Tax withholding)</span>
                          </div>
                          <div className="flex items-center text-gray-300 text-sm">
                            <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                            <span>Media Release (Photography permission)</span>
                          </div>
                          <div className="flex items-center text-gray-300 text-sm">
                            <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                            <span>Musician Agreement (Performance contract)</span>
                          </div>
                          <div className="flex items-center text-gray-300 text-sm">
                            <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                            <span>Proof of ID (Government identification)</span>
                          </div>
                        </div>
                        <p className="text-gray-400 text-xs mt-3 italic">
                          All documents must be uploaded as PDF, PNG, JPG, or DOC files.
                        </p>
                      </div>
                    </div>
                  )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
            </div>
          </div>
        </motion.section>

        {/* Pay & Participation Visualization */}
        <motion.section
          id="compensation"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
              <DollarSign className="w-8 h-8 mr-3 text-green-400" />
              Compensation & Rewards
            </h2>
            
            <div className="flex flex-col gap-6">
              {/* USD Payments */}
              <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <DollarSign className="w-6 h-6 mr-2 text-green-400" />
                  USD Contract Pay (via BDO)
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Sectional Rehearsal (3 hrs)</span>
                    <span className="text-white font-semibold">$50</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Full Orchestra (4 hrs)</span>
                    <span className="text-white font-semibold">$50</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Dress Rehearsal (4 hrs)</span>
                    <span className="text-white font-semibold">$50</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/10 pt-4">
                    <span className="text-white font-semibold">Concert Performance (2 hrs)</span>
                    <span className="text-white font-bold text-lg">100</span>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <p className="text-green-200 text-sm">
                    <strong>Total Project Earnings:</strong> Up to $250 aprroximately per musician
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowBeamCompensation(prev => !prev)}
                className="inline-flex items-center self-start bg-yellow-500/10 border border-yellow-500/30 px-4 py-2 rounded-lg text-sm font-medium text-yellow-200 hover:bg-yellow-500/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                <span className="mr-2">
                  {showBeamCompensation ? 'Hide BEAM Coin payment option' : 'Interested in BEAM Coin payouts?'}
                </span>
                {showBeamCompensation ? (
                  <ChevronUp className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {showBeamCompensation && (
                  <motion.div
                    key="beam-compensation-card"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white/5 rounded-lg p-6 border border-white/10"
                  >
                    {/* BEAM Coin Compensation */}
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                      <Coins className="w-6 h-6 mr-2 text-yellow-400" />
                      BEAM Coin Payment Option
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Sectional Rehearsal</span>
                        <span className="text-yellow-400 font-semibold">5 BEAM</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Full Orchestra Rehearsal</span>
                        <span className="text-yellow-400 font-semibold">5 BEAM</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Dress Rehearsal</span>
                        <span className="text-yellow-400 font-semibold">5 BEAM</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-white/10 pt-4">
                        <span className="text-white font-semibold">Concert Performance</span>
                        <span className="text-yellow-400 font-bold text-lg">10 BEAM</span>
                      </div>
                    </div>
                    <div className="mt-6 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20 space-y-2">
                      <p className="text-yellow-200 text-sm">
                        <strong>Total BEAM Compensation:</strong> 25 BEAM Coins per musician
                      </p>
                      <p className="text-yellow-200 text-xs">
                        1 BEAM ≈ $1 (internal stable value); redeemable for cash, lessons, housing, or future BEAM FCU project staking.
                      </p>
                      <p
                        className="text-sm text-orchestra-gold/80 cursor-pointer hover:text-orchestra-gold transition-colors"
                        onClick={() => setShowBeamVideo(true)}
                      >
                        🎥 What is BEAM Coin? Watch a 1-minute explainer →
                      </p>
                      <p className="text-yellow-200 text-xs">
                        Musicians may opt for partial or full BEAM payouts. Verified attendance required before release.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.section>

        {/* Rehearsal Calendar */}
        <motion.section
          id="schedule"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
              <Calendar className="w-8 h-8 mr-3 text-blue-400" />
              Rehearsal Schedule
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rehearsalSchedule.map((rehearsal, index) => (
                <motion.div
                  key={rehearsal.date}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                  className="bg-white/5 rounded-lg p-6 border border-white/10 hover:border-blue-400/50 transition-colors"
                >
                  <div className="flex items-center mb-3">
                    <Calendar className="w-5 h-5 text-blue-400 mr-2" />
                    <span className="text-white font-semibold">
                      {new Date(rehearsal.date + 'T00:00:00').toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-300">
                      <Clock className="w-4 h-4 mr-2" />
                      <span className="text-sm">{rehearsal.time}</span>
                      <span className="text-xs ml-2">({rehearsal.duration}h)</span>
                    </div>
                    
                    <div className="flex items-center text-gray-300">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span className="text-sm">{rehearsal.location}</span>
                    </div>
                    
                    <div className="mt-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        rehearsal.type.includes('Sectional') 
                          ? 'bg-purple-500/20 text-purple-300' 
                          : rehearsal.type.includes('Concert')
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {rehearsal.type}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* FAQ Section */}
        <motion.section
          id="faq"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
              <Info className="w-8 h-8 mr-3 text-purple-400" />
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-4">
              {faqData.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.9 + index * 0.1 }}
                  className="bg-white/5 rounded-lg border border-white/10 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <span className="text-white font-medium">{faq.question}</span>
                    {expandedFaq === index ? (
                      <ChevronUp className="w-5 h-5 text-purple-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  
                  {expandedFaq === index && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-6 pb-4"
                    >
                      <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Media Gallery */}
        <motion.section
          id="media"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1 }}
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white flex items-center">
                <Play className="w-8 h-8 mr-3 text-purple-400" />
                Media & Coverage
              </h2>
              <button
                onClick={() => {
                  setMediaLoading(true)
                  fetch('/api/pulse/media?projectId=black-diaspora-symphony')
                    .then((res) => res.json())
                    .then((data) => {
                      setMediaItems(data.items || [])
                      setMediaLoading(false)
                    })
                    .catch((err) => {
                      console.error('Failed to refresh media:', err)
                      setMediaLoading(false)
                    })
                }}
                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors text-sm"
              >
                Refresh
              </button>
            </div>

            {mediaLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10 animate-pulse h-64" />
                ))}
              </div>
            ) : mediaItems.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p>No media content available at this time.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mediaItems.map((item: any, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-purple-400/50 transition-all"
                  >
                    {item.mediaType === 'video' || item.type === 'video' ? (
                      <div className="aspect-video">
                        {item.url?.includes('youtube.com') || item.url?.includes('youtu.be') ? (
                          <iframe
                            src={item.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                            className="w-full h-full"
                            allowFullScreen
                            title={item.title}
                          />
                        ) : (
                          <video
                            src={item.url}
                            className="w-full h-full object-cover"
                            controls
                          />
                        )}
                      </div>
                    ) : (
                      <div className="p-6">
                        {item.thumbnail && (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-40 object-cover rounded-lg mb-4"
                          />
                        )}
                        <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                        <p className="text-gray-300 mb-4 line-clamp-3">{item.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">{item.source}</span>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                          >
                            Read More →
                          </a>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.section>
      </div>

      <MusicianProfileModal
        isOpen={showMusicianModal}
        onClose={handleCloseMusicianProfile}
        musician={selectedMusician as any}
      />

      {/* Project Details Full-Screen Modal */}
      <AnimatePresence>
        {showProjectDetailsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-md p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowProjectDetailsModal(false)
                setActiveTab('overview')
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-orchestra-cream/80 backdrop-blur-lg rounded-2xl border-2 border-orchestra-gold/50 flex flex-col overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Success Animation */}
            {showSuccessAnimation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center z-[300] pointer-events-none"
              >
                <div className="bg-green-500/20 backdrop-blur-lg border-2 border-green-400 rounded-2xl p-12 text-center">
                  <CheckCircle className="w-24 h-24 text-green-400 mx-auto mb-4 animate-bounce" />
                  <h3 className="text-3xl font-bold text-white mb-2">Profile Submitted!</h3>
                  <p className="text-gray-200">You'll be notified when your profile is approved.</p>
                </div>
              </motion.div>
            )}

            {/* Close Button */}
            <button
              onClick={() => {
                setShowProjectDetailsModal(false)
                setActiveTab('overview')
              }}
              className="absolute top-6 right-6 z-10 text-orchestra-dark hover:text-orchestra-gold transition-colors bg-white/80 hover:bg-white rounded-full p-2 shadow-lg"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Tab Navigation */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-200 ${
                  activeTab === 'overview'
                    ? 'bg-orchestra-gold text-orchestra-dark shadow-lg scale-105'
                    : 'bg-white/80 text-orchestra-dark hover:bg-white hover:scale-105'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('join')}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-200 ${
                  activeTab === 'join'
                    ? 'bg-orchestra-gold text-orchestra-dark shadow-lg scale-105'
                    : 'bg-white/80 text-orchestra-dark hover:bg-white hover:scale-105'
                }`}
              >
                Join / Update
              </button>
              <button
                onClick={() => setActiveTab('media')}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-200 ${
                  activeTab === 'media'
                    ? 'bg-orchestra-gold text-orchestra-dark shadow-lg scale-105'
                    : 'bg-white/80 text-orchestra-dark hover:bg-white hover:scale-105'
                }`}
              >
                Media
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 flex items-center justify-center p-6 pb-6 overflow-y-auto mt-20">
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="w-full max-w-4xl space-y-6"
                  >
                    <h2 className="text-4xl font-bold text-orchestra-dark mb-6 text-center">Black Diaspora Symphony Orchestra</h2>
                    <div className="bg-white/90 rounded-xl p-6 border-2 border-orchestra-gold/30 space-y-4 shadow-lg">
                      <div>
                        <h3 className="text-xl font-semibold text-orchestra-dark mb-2">About the Project</h3>
                        <p className="text-orchestra-brown/80">Join us for the 2025 Annual Memorial Concert featuring Margaret Bonds' Montgomery Variations and Maurice Ravel's Le Tombeau de Couperin.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-orchestra-brown/70 text-sm">Rehearsals:</span>
                          <p className="text-orchestra-dark font-medium">4 rehearsal sessions</p>
                        </div>
                        <div>
                          <span className="text-orchestra-brown/70 text-sm">Compensation:</span>
                          <p className="text-orchestra-dark font-medium">Up to $250 USD or 25 BEAM Coins</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'join' && (
                  <motion.div
                    key="join"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="w-full max-w-2xl space-y-6"
                  >
                    <div className="bg-orchestra-cream/30 backdrop-blur-sm rounded-xl p-8 border-2 border-orchestra-gold/30 shadow-xl">
                      <h2 className="text-3xl md:text-4xl font-bold text-orchestra-dark mb-6 text-center">Join or Update Your Profile</h2>
                      
                      {!user ? (
                        <div className="text-center py-8">
                          <p className="text-lg text-orchestra-brown/80 mb-8">Please sign in to join this project</p>
                          <button
                            onClick={handleGoogleSignIn}
                            className="bg-orchestra-gold hover:bg-orchestra-gold/90 text-orchestra-dark font-bold px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-3 mx-auto"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                              <path fill="#1a1a1a" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="#1a1a1a" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="#1a1a1a" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="#1a1a1a" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            <span>Sign In with Google</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-orchestra-dark mb-2">Name</label>
                            <input
                              type="text"
                              value={musicianProfile.name}
                              onChange={(e) => setMusicianProfile({ ...musicianProfile, name: e.target.value })}
                              className="w-full bg-white/90 border-2 border-orchestra-gold/30 rounded-lg px-4 py-2 text-orchestra-dark focus:outline-none focus:ring-2 focus:ring-orchestra-gold focus:border-orchestra-gold"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-orchestra-dark mb-2">Instrument</label>
                            <select
                              value={musicianProfile.instrument}
                              onChange={(e) => setMusicianProfile({ ...musicianProfile, instrument: e.target.value })}
                              className="w-full bg-white/90 border-2 border-orchestra-gold/30 rounded-lg px-4 py-2 text-orchestra-dark focus:outline-none focus:ring-2 focus:ring-orchestra-gold focus:border-orchestra-gold"
                            >
                              <option value="">Select your instrument</option>
                              {rosterData.map(section => (
                                <option key={section.instrument} value={section.instrument}>
                                  {section.instrument}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-orchestra-dark mb-2">Email</label>
                            <input
                              type="email"
                              value={musicianProfile.email}
                              disabled
                              className="w-full bg-white/50 border-2 border-orchestra-gold/20 rounded-lg px-4 py-2 text-orchestra-brown/70"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-orchestra-dark mb-2">Bio</label>
                            <textarea
                              value={musicianProfile.bio}
                              onChange={(e) => setMusicianProfile({ ...musicianProfile, bio: e.target.value })}
                              rows={4}
                              className="w-full bg-white/90 border-2 border-orchestra-gold/30 rounded-lg px-4 py-2 text-orchestra-dark focus:outline-none focus:ring-2 focus:ring-orchestra-gold focus:border-orchestra-gold"
                              placeholder="Tell us about your musical background..."
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-orchestra-dark mb-2">Status</label>
                            <select
                              value={musicianProfile.status}
                              onChange={(e) => setMusicianProfile({ ...musicianProfile, status: e.target.value as 'Interested' | 'Confirmed' })}
                              className="w-full bg-white/90 border-2 border-orchestra-gold/30 rounded-lg px-4 py-2 text-orchestra-dark focus:outline-none focus:ring-2 focus:ring-orchestra-gold focus:border-orchestra-gold"
                            >
                              <option value="Interested">Interested</option>
                              <option value="Confirmed">Confirmed</option>
                            </select>
                          </div>
                          
                          <button
                            onClick={handleMusicianProfileSubmit}
                            className="w-full bg-orchestra-gold hover:bg-orchestra-gold/90 text-orchestra-dark font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg"
                          >
                            Submit Profile
                          </button>
                          
                          <p className="text-orchestra-brown/80 text-sm text-center mt-4">
                            Already listed in the roster? Log in to update your information.
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'media' && (
                  <motion.div
                    key="media"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="w-full max-w-6xl h-full flex flex-col items-center justify-center space-y-6"
                  >
                    <motion.div
                      key={currentCarouselIndex}
                      initial={{ opacity: 0, x: 100 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ duration: 0.3 }}
                      className="w-full max-w-6xl h-full flex flex-col items-center justify-center space-y-6"
                    >
                      {projectCarouselContent[currentCarouselIndex].type === 'video' && (
                        <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
                          <video
                            src={projectCarouselContent[currentCarouselIndex].url}
                            controls
                            className="w-full h-full"
                            autoPlay
                          />
                        </div>
                      )}
                      
                      {projectCarouselContent[currentCarouselIndex].type === 'image' && (
                        <div className="w-full aspect-video bg-white/5 rounded-xl overflow-hidden">
                          <img
                            src={projectCarouselContent[currentCarouselIndex].url}
                            alt={projectCarouselContent[currentCarouselIndex].title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      {projectCarouselContent[currentCarouselIndex].type === 'pdf' && (
                        <div className="w-full aspect-video bg-white/5 rounded-xl flex items-center justify-center">
                          <a
                            href={projectCarouselContent[currentCarouselIndex].url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center space-y-4 text-white hover:text-yellow-400 transition-colors"
                          >
                            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center">
                              <Download className="w-12 h-12" />
                            </div>
                            <span className="text-xl font-semibold">Download PDF</span>
                          </a>
                        </div>
                      )}

                      {/* Content Info */}
                      <div className="text-center space-y-2">
                        <h3 className="text-3xl font-bold text-white">
                          {projectCarouselContent[currentCarouselIndex].title}
                        </h3>
                        <p className="text-gray-300 text-lg max-w-2xl mx-auto">
                          {projectCarouselContent[currentCarouselIndex].description}
                        </p>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation Buttons - Only show on Media tab */}
            {activeTab === 'media' && (
              <>
                <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10">
                  <button
                    onClick={prevCarouselSlide}
                    className="p-4 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>
                </div>
                
                <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10">
                  <button
                    onClick={nextCarouselSlide}
                    className="p-4 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                </div>

                {/* Carousel Indicators */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex space-x-2">
                  {projectCarouselContent.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentCarouselIndex(index)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        currentCarouselIndex === index ? 'bg-yellow-400' : 'bg-white/30'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>

                {/* Slide Counter */}
                <div className="absolute bottom-6 right-6 z-10 text-white/50 text-sm">
                  {currentCarouselIndex + 1} / {projectCarouselContent.length}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Documents Modal */}
      {showDocumentsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setShowDocumentsModal(false)}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Setup Guide</h2>
                  <p className="text-gray-300 text-sm">
                    Complete your required documents to participate in the BEAM Orchestra project.
                  </p>
                </div>
                <button
                  onClick={() => setShowDocumentsModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* User Info */}
              {user && (
                <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Name:</span>
                      <span className="text-white ml-2">{user.displayName || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white ml-2">{user.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Verification:</span>
                      <span className={`ml-2 ${isVerified ? 'text-green-400' : 'text-yellow-400'}`}>
                        {isVerified ? 'Verified Student/Alumni' : 'Pending Verification'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">BEAM Coin:</span>
                      <span className={`ml-2 ${isVerified ? 'text-green-400' : 'text-gray-400'}`}>
                        {isVerified ? 'Eligible' : 'Not Eligible'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                {/* Verify Identity Section */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <CheckCircle className={`w-5 h-5 mr-2 ${isVerified ? 'text-green-400' : 'text-gray-400'}`} />
                    Verify Identity
                  </h3>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-gray-300 text-sm">
                      {isVerified 
                        ? '✅ Your student/alumni status has been verified. You are eligible for BEAM Coin rewards.'
                        : 'Complete student/alumni verification above to unlock BEAM Coin eligibility.'
                      }
                    </p>
                  </div>
                </div>

                {/* Complete Documents Section */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Upload className="w-5 h-5 mr-2 text-purple-400" />
                    Complete Documents
                  </h3>
                  
                  <div className="space-y-4">
                    {documentTypes.map((docType) => {
                      const isUploaded = documents[docType.id]
                      const isUploading = uploadingDocuments.has(docType.id)
                      
                      return (
                        <div key={docType.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 ${
                                isUploaded ? 'border-green-400 bg-green-400' : 'border-gray-400'
                              }`}>
                                {isUploaded && <CheckCircle className="w-4 h-4 text-white" />}
                              </div>
                              <div>
                                <h4 className="text-white font-medium">{docType.name}</h4>
                                <p className="text-gray-400 text-xs">{docType.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                isUploaded ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                              }`}>
                                {isUploaded ? 'Uploaded' : 'Pending'}
                              </span>
                            </div>
                          </div>
                          
                          {isUploaded ? (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                                  <span className="text-green-200 text-sm">{isUploaded.fileName}</span>
                                </div>
                                <span className="text-green-200 text-xs">
                                  Uploaded {isUploaded.uploadedAt && new Date(isUploaded.uploadedAt.seconds * 1000).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    handleDocumentUpload(docType.id, file)
                                  }
                                }}
                                className="hidden"
                                id={`upload-${docType.id}`}
                              />
                              <label
                                htmlFor={`upload-${docType.id}`}
                                className={`block w-full text-center py-3 px-4 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                                  isUploading 
                                    ? 'border-purple-400 bg-purple-500/10' 
                                    : 'border-white/20 hover:border-purple-400'
                                }`}
                              >
                                {isUploading ? (
                                  <div className="flex items-center justify-center">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    <span className="text-white text-sm">Uploading...</span>
                                  </div>
                                ) : (
                                  <div>
                                    <Upload className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                                    <span className="text-gray-300 text-sm">Click to upload</span>
                                    <p className="text-gray-500 text-xs mt-1">PDF, PNG, JPG, DOC files accepted</p>
                                  </div>
                                )}
                              </label>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 bg-white/5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Progress: {Object.keys(documents).length} of {documentTypes.length} documents uploaded
                </div>
                <button
                  onClick={() => setShowDocumentsModal(false)}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200"
                >
                  Save Progress
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Ravel Modal */}
      <AnimatePresence>
        {showRavelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-md p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowRavelModal(false)
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
              className="relative bg-orchestra-cream/80 backdrop-blur-lg rounded-2xl border-2 border-orchestra-gold/50 w-full max-w-lg max-h-[70vh] p-6 flex flex-col space-y-4 overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-start justify-between gap-4 shrink-0">
                <div>
                  <h4 className="text-2xl font-bold text-orchestra-dark">Select Your Part</h4>
                  <p className="text-sm text-orchestra-brown/80 mt-1">
                    Choose the instrument-specific download link for Ravel&apos;s <em>Le Tombeau de Couperin</em>.
                  </p>
                </div>
                <button
                  onClick={() => setShowRavelModal(false)}
                  className="text-orchestra-dark hover:text-orchestra-gold transition-colors bg-white/80 hover:bg-white rounded-full p-2 shadow-lg"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="shrink-0">
                <label htmlFor="ravel-search" className="text-xs uppercase tracking-wide text-orchestra-brown/70 font-medium">
                  Search instruments
                </label>
                <input
                  id="ravel-search"
                  type="text"
                  placeholder="Start typing, e.g. flute"
                  value={ravelSearch}
                  onChange={(event) => setRavelSearch(event.target.value)}
                  className="mt-2 w-full bg-white/90 border-2 border-orchestra-gold/30 rounded-lg px-4 py-2 text-sm text-orchestra-dark placeholder-orchestra-brown/50 focus:outline-none focus:ring-2 focus:ring-orchestra-gold focus:border-orchestra-gold"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {filteredRavelDownloads.length > 0 ? (
                  filteredRavelDownloads.map((part) => (
                    <div
                      key={part.instrument}
                      className="flex items-center justify-between bg-white/90 border-2 border-orchestra-gold/30 rounded-lg px-4 py-3 shadow-sm"
                    >
                      <div>
                        <p className="text-orchestra-dark font-medium">{part.instrument}</p>
                        {!part.available && (
                          <p className="text-xs text-orchestra-brown/70 mt-1">
                            Download link coming soon
                          </p>
                        )}
                      </div>
                      {part.available ? (
                        <button
                          onClick={() => handleDirectDownload(part.url, `Ravel-Tombeau-${part.instrument}.pdf`)}
                          disabled={downloadingFiles.has(`${part.url}-Ravel-Tombeau-${part.instrument}.pdf`)}
                          className="inline-flex items-center space-x-2 bg-orchestra-gold hover:bg-orchestra-gold/90 disabled:bg-orchestra-gold/50 disabled:cursor-not-allowed text-orchestra-dark text-sm font-bold px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg"
                        >
                          {downloadingFiles.has(`${part.url}-Ravel-Tombeau-${part.instrument}.pdf`) ? (
                            <>
                              <div className="w-4 h-4 border-2 border-orchestra-dark border-t-transparent rounded-full animate-spin" />
                              <span>Downloading...</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4" />
                              <span>Download</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-orchestra-brown/70 italic">Pending</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-orchestra-gold/30 bg-white/50 px-4 text-sm text-orchestra-brown/70">
                    No matching instruments found.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Montgomery Modal */}
      <AnimatePresence>
        {showMontgomeryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-md p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowMontgomeryModal(false)
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
              className="relative bg-orchestra-cream/80 backdrop-blur-lg rounded-2xl border-2 border-orchestra-gold/50 w-full max-w-lg max-h-[70vh] p-6 flex flex-col space-y-4 overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-start justify-between gap-4 shrink-0">
                <div>
                  <h4 className="text-2xl font-bold text-orchestra-dark">Select Your Part</h4>
                  <p className="text-sm text-orchestra-brown/80 mt-1">
                    Choose the instrument-specific download link for Margaret Bonds&apos; <em>Montgomery Variations</em>.
                  </p>
                </div>
                <button
                  onClick={() => setShowMontgomeryModal(false)}
                  className="text-orchestra-dark hover:text-orchestra-gold transition-colors bg-white/80 hover:bg-white rounded-full p-2 shadow-lg"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="shrink-0">
                <label htmlFor="montgomery-search" className="text-xs uppercase tracking-wide text-orchestra-brown/70 font-medium">
                  Search instruments
                </label>
                <input
                  id="montgomery-search"
                  type="text"
                  placeholder="Start typing, e.g. violin"
                  value={montgomerySearch}
                  onChange={(event) => setMontgomerySearch(event.target.value)}
                  className="mt-2 w-full bg-white/90 border-2 border-orchestra-gold/30 rounded-lg px-4 py-2 text-sm text-orchestra-dark placeholder-orchestra-brown/50 focus:outline-none focus:ring-2 focus:ring-orchestra-gold focus:border-orchestra-gold"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {filteredMontgomeryDownloads.length > 0 ? (
                  filteredMontgomeryDownloads.map((part) => (
                    <div
                      key={part.instrument}
                      className="flex items-center justify-between bg-white/90 border-2 border-orchestra-gold/30 rounded-lg px-4 py-3 shadow-sm"
                    >
                      <div>
                        <p className="text-orchestra-dark font-medium">{part.instrument}</p>
                        {!part.available && (
                          <p className="text-xs text-orchestra-brown/70 mt-1">
                            Download link coming soon
                          </p>
                        )}
                      </div>
                      {part.available ? (
                        <button
                          onClick={() => handleDirectDownload(part.url, `Montgomery-Variations-${part.instrument}.pdf`)}
                          disabled={downloadingFiles.has(`${part.url}-Montgomery-Variations-${part.instrument}.pdf`)}
                          className="inline-flex items-center space-x-2 bg-orchestra-gold hover:bg-orchestra-gold/90 disabled:bg-orchestra-gold/50 disabled:cursor-not-allowed text-orchestra-dark text-sm font-bold px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg"
                        >
                          {downloadingFiles.has(`${part.url}-Montgomery-Variations-${part.instrument}.pdf`) ? (
                            <>
                              <div className="w-4 h-4 border-2 border-orchestra-dark border-t-transparent rounded-full animate-spin" />
                              <span>Downloading...</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4" />
                              <span>Download</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-orchestra-brown/70 italic">Pending</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-orchestra-gold/30 bg-white/50 px-4 text-sm text-orchestra-brown/70">
                    No matching instruments found.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showBeamVideo && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setShowBeamVideo(false)}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-white/10 p-4 sm:p-6 space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="relative w-full overflow-hidden rounded-xl bg-black aspect-video">
              <iframe
                className="absolute inset-0 h-full w-full"
                src="https://www.youtube.com/embed/yourBeamVideoID"
                title="What is BEAM Coin?"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <button
              onClick={() => setShowBeamVideo(false)}
              className="w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white hover:from-purple-600 hover:to-blue-600 transition-colors"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}

      {/* Bottom Navigation - Portfolio Style */}
      <div className="fixed bottom-6 inset-x-0 z-40 px-4 sm:px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="hidden md:flex mx-auto max-w-4xl items-center justify-center bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20"
        >
          {navigationSections.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`mx-2 flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                activeSection === section.id
                  ? 'bg-white text-black'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <section.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{section.label}</span>
            </button>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="md:hidden mx-auto max-w-sm"
        >
          <button
            onClick={() => setMobileNavOpen((prev) => !prev)}
            className="w-full inline-flex items-center justify-center space-x-3 bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/20 text-white"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav-menu"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            <span className="text-sm font-semibold">
              {mobileNavOpen ? 'Close Menu' : 'Open Menu'}
            </span>
          </button>

          <AnimatePresence>
            {mobileNavOpen && (
              <motion.div
                id="mobile-nav-menu"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="mt-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 divide-y divide-white/10 overflow-hidden"
              >
                {navigationSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                      activeSection === section.id
                        ? 'bg-white/20 text-white'
                        : 'text-gray-200 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center space-x-3">
                      <section.icon className="w-4 h-4" />
                      <span className="font-medium">{section.label}</span>
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
