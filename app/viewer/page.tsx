'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  ChevronDown,
  Lock,
  Pause,
  Play,
  PlayCircle,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { addDoc, collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { type ViewerAreaId, type ViewerRoleTemplate } from '@/lib/config/viewerRoleTemplates'
import { loadViewerAreaRolesMap, type ViewerAreaRolesDoc } from '@/lib/viewerAreaRoles'

type AreaSection = {
  id: string
  title: string
  format: string
  summary: string
  availability: 'Open' | 'Subscriber' | 'Regional' | 'Institution'
}

type ViewerArea = {
  id: ViewerAreaId
  title: string
  tag: string
  locked: boolean
  narrative: string
  locationHint: string
  visual: string
  videoUrl: string
  sections: AreaSection[]
}

type ViewerContent = {
  id: string
  areaId: string
  status?: string
  sectionId: string
  title: string
  description: string
  thumbnailUrl?: string
  videoUrl: string
  hlsUrl?: string
  institutionName?: string
  recordedAt?: string
  researchStatus?: string
  participantNames?: string[]
  relatedVersionIds?: string[]
  infoUrl?: string
  isNew?: boolean
  confirmed?: boolean
  confirmedAt?: string
  createdByUid?: string
  createdAt?: unknown
  updatedAt?: unknown
  isPublished: boolean
  sortOrder: number
  accessLevel: 'public' | 'open' | 'subscriber' | 'regional' | 'institution'
  geo?: {
    regions?: string[]
    states?: string[]
    cities?: string[]
  }
}

type ActiveVideo = {
  url: string
  fallbackUrl?: string
  title: string
  areaId: ViewerArea['id']
  overlayClass: string
  sectionId?: string
  contentId?: string
  sourceType?: 'area-default' | 'content' | 'role-explainer'
}

const placeholderVideoUrl = ''
const OVERLAY_RESTORE_DELAY_MS = 1600
const PREVIEW_FADE_DURATION_MS = 700
const STUDENT_TELEMETRY_INTERVAL_MS = 5000
const LOCAL_PROGRESS_STORAGE_KEY = 'viewer-content-progress'
const LOCAL_WATCHED_HISTORY_STORAGE_KEY = 'viewer-watched-history'
const LOCAL_LAST_ACTIVE_VIDEO_STORAGE_KEY = 'viewer-last-active-video'
const PROGRESS_SAVE_INTERVAL_MS = 1200
const BROAD_FETCH_LIMIT = 50
const VIEWER_CONTENT_DEFAULTS = {
  status: 'open',
  isPublished: false,
  confirmed: false,
  accessLevel: 'public',
} as const
const VIEWER_CONTENT_FILTERS = {
  status: 'open',
  isPublished: true,
  confirmed: false,
  accessLevel: ['public', 'open'] as readonly string[],
} as const

type ContentProgress = {
  positionSeconds: number
  durationSeconds: number
  updatedAt: number
}

type WatchedHistoryItem = {
  contentId: string
  title: string
  areaId: ViewerArea['id']
  watchedAt: number
}

type ViewerIntent = 'select' | 'subscriber' | 'student' | 'instructor' | 'partner'
type StoriesLoadState = 'idle' | 'loading' | 'ready' | 'empty' | 'error'
type CommentLoadState = 'idle' | 'loading' | 'ready' | 'error'

type ViewerComment = {
  id: string
  contentId: string
  areaId: string
  sectionId?: string
  authorRole: 'partner' | 'instructor'
  authorLabel: string
  message: string
  timestampSeconds: number
  thumbnailDataUrl?: string
  createdAt?: unknown
}

type StudentTelemetrySession = {
  id: string
  startedAt: number
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const withCode = error as { code?: unknown; message?: unknown }
    const code = typeof withCode.code === 'string' ? withCode.code : null
    const message = typeof withCode.message === 'string' ? withCode.message : null
    if (code && message) return `${code}: ${message}`
    if (message) return message
  }
  if (error instanceof Error) return error.message
  return String(error)
}

function normalizeViewerContent(id: string, data: Partial<ViewerContent>): ViewerContent {
  return {
    id,
    areaId: data.areaId ?? '',
    status: data.status ?? VIEWER_CONTENT_DEFAULTS.status,
    sectionId: data.sectionId ?? '',
    title: data.title ?? '',
    description: data.description ?? '',
    thumbnailUrl: data.thumbnailUrl,
    videoUrl: data.videoUrl ?? '',
    hlsUrl: data.hlsUrl,
    institutionName: data.institutionName,
    recordedAt: data.recordedAt,
    researchStatus: data.researchStatus,
    participantNames: data.participantNames,
    relatedVersionIds: data.relatedVersionIds,
    infoUrl: data.infoUrl,
    isNew: data.isNew,
    confirmed: data.confirmed ?? VIEWER_CONTENT_DEFAULTS.confirmed,
    confirmedAt: data.confirmedAt,
    createdByUid: data.createdByUid,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    isPublished: data.isPublished ?? VIEWER_CONTENT_DEFAULTS.isPublished,
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 999,
    accessLevel: data.accessLevel ?? VIEWER_CONTENT_DEFAULTS.accessLevel,
    geo: data.geo,
  }
}

function contentOverlayClass(content: ViewerContent, fallback: string): string {
  const cities = content.geo?.cities ?? []
  if (cities.includes('Atlanta')) {
    return 'from-[#512245]/64 via-[#1C3B52]/52 to-[#090A0F]/84'
  }
  if (cities.includes('Milwaukee')) {
    return 'from-[#194059]/64 via-[#184A3D]/52 to-[#090A0F]/84'
  }
  if (cities.includes('Houston')) {
    return 'from-[#623917]/64 via-[#2A3F5D]/52 to-[#090A0F]/84'
  }
  if (cities.includes('Chicago')) {
    return 'from-[#34485A]/64 via-[#2C2F48]/52 to-[#090A0F]/84'
  }
  if (cities.includes('Los Angeles')) {
    return 'from-[#5A3721]/64 via-[#402C58]/52 to-[#090A0F]/84'
  }
  return fallback
}

const viewerAreas: ViewerArea[] = [
  {
    id: 'professional',
    title: 'Professional Orchestra',
    tag: 'Flagship Series',
    locked: false,
    narrative:
      'Premier narrative tracks led by contracted professional players. This area is intentionally locked while release and access logic are finalized.',
    locationHint: 'Release windows by metro and partner institutions.',
    visual: 'from-[#293241]/80 via-[#1B1E2B]/70 to-[#090A0F]/92',
    videoUrl: placeholderVideoUrl,
    sections: [
      {
        id: 'pro-origin',
        title: 'Origin Stories',
        format: 'Episode Arc',
        summary: 'How each professional ensemble season is built from concept through live launch.',
        availability: 'Subscriber',
      },
      {
        id: 'pro-rehearsal',
        title: 'Rehearsal Intelligence',
        format: 'Behind The Score',
        summary: 'Conductor-player collaboration cuts with score overlays and rehearsal notes.',
        availability: 'Subscriber',
      },
      {
        id: 'pro-premieres',
        title: 'Premiere Nights',
        format: 'Live Capture',
        summary: 'Curated multicam cuts from premiere events with participant commentary.',
        availability: 'Regional',
      },
    ],
  },
  {
    id: 'community',
    title: 'Community Orchestra',
    tag: 'Neighborhood Stories',
    locked: false,
    narrative:
      'Narratives rooted in local players, schools, and cultural partners. Built to flex by city, state, and institutional collaboration.',
    locationHint: 'Filtered by city, region, and verified institutions.',
    visual: 'from-[#0B5D6E]/75 via-[#12344D]/70 to-[#090A0F]/92',
    videoUrl: placeholderVideoUrl,
    sections: [
      {
        id: 'community-lead',
        title: 'Community Leads',
        format: 'Docu Stories',
        summary: 'Participant-led stories from rehearsal rooms and neighborhood performance spaces.',
        availability: 'Open',
      },
      {
        id: 'community-stages',
        title: 'Regional Stages',
        format: 'Performance Rail',
        summary: 'Location-aware cuts from city and state partner performances.',
        availability: 'Regional',
      },
      {
        id: 'community-youth',
        title: 'Youth + Mentor Tracks',
        format: 'Journey Series',
        summary: 'Intergenerational storytelling through rehearsal milestones and outcomes.',
        availability: 'Institution',
      },
    ],
  },
  {
    id: 'chamber',
    title: 'Chamber Series',
    tag: 'Intimate Format',
    locked: false,
    narrative:
      'Small ensemble narratives where participants shape each chapter from rehearsal draft to polished release.',
    locationHint: 'Programmed by city scene and ensemble roster.',
    visual: 'from-[#83580B]/72 via-[#3B2A14]/70 to-[#090A0F]/92',
    videoUrl: placeholderVideoUrl,
    sections: [
      {
        id: 'chamber-cycle',
        title: 'Cycle Releases',
        format: 'Mini Seasons',
        summary: 'Program arcs delivered in chapters with score notes and player interviews.',
        availability: 'Subscriber',
      },
      {
        id: 'chamber-process',
        title: 'Process Room',
        format: 'Studio Cut',
        summary: 'Versioned rehearsal clips highlighting arrangement and interpretation changes.',
        availability: 'Institution',
      },
      {
        id: 'chamber-archive',
        title: 'Archive Selects',
        format: 'Curated Library',
        summary: 'Region-specific anthology content curated by local artistic teams.',
        availability: 'Regional',
      },
    ],
  },
  {
    id: 'publishing',
    title: 'Publishing',
    tag: 'Publishing',
    locked: false,
    narrative: 'Compose, arrange, and share new and classic works.',
    locationHint: 'Scores, recordings, and scholarship.',
    visual: 'from-[#395B64]/75 via-[#233138]/70 to-[#090A0F]/92',
    videoUrl: placeholderVideoUrl,
    sections: [
      {
        id: 'publishing-main',
        title: 'Publishing Main',
        format: 'Publishing Stories',
        summary: 'Scores, recordings, and scholarship from active publishing projects.',
        availability: 'Open',
      },
      {
        id: 'publishing-catalog',
        title: 'Catalog Highlights',
        format: 'Project Cards',
        summary: 'Featured publishing releases across partner markets.',
        availability: 'Open',
      },
      {
        id: 'publishing-scholarship',
        title: 'Scholarship Notes',
        format: 'Context Cards',
        summary: 'Composer notes, references, and educational guides.',
        availability: 'Open',
      },
    ],
  },
  {
    id: 'business',
    title: 'The Business',
    tag: 'Operations + Impact',
    locked: false,
    narrative:
      'The operational narrative: sponsorship, production decisions, contracts, and audience growth by market.',
    locationHint: 'Data visibility scales by subscription and role.',
    visual: 'from-[#4D3C77]/78 via-[#2B2D42]/70 to-[#090A0F]/92',
    videoUrl: placeholderVideoUrl,
    sections: [
      {
        id: 'business-partnerships',
        title: 'Partnership Diaries',
        format: 'Case Stories',
        summary: 'How institutions and sponsors shape local programming strategy.',
        availability: 'Subscriber',
      },
      {
        id: 'business-production',
        title: 'Production Logic',
        format: 'Workflow Story',
        summary: 'Planning and release logic from intake to published content.',
        availability: 'Institution',
      },
      {
        id: 'business-impact',
        title: 'Impact Reports',
        format: 'Insight Feed',
        summary: 'Audience, education, and community metrics framed as story chapters.',
        availability: 'Regional',
      },
    ],
  },
]

export default function ViewerPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useUserRole()
  const areaFromUrl = searchParams.get('area')
  const initialAreaId: ViewerAreaId =
    areaFromUrl && viewerAreas.some((item) => item.id === areaFromUrl)
      ? (areaFromUrl as ViewerAreaId)
      : 'professional'
  const initialArea = viewerAreas.find((area) => area.id === initialAreaId) ?? viewerAreas[0]
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hlsRef = useRef<any>(null)
  const progressSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedAreaId, setSelectedAreaId] = useState<ViewerArea['id']>(initialArea.id)
  const [activeVideo, setActiveVideo] = useState<ActiveVideo>({
    url: initialArea.videoUrl || '',
    title: initialArea.title,
    areaId: initialArea.id,
    overlayClass: initialArea.visual,
    sourceType: 'area-default',
  })
  const [isPlayerOverlayVisible, setIsPlayerOverlayVisible] = useState(true)
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previewLoopTransitioningRef = useRef(false)
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [selectedCity, setSelectedCity] = useState('')
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [selectedAreaCatalog, setSelectedAreaCatalog] = useState<ViewerContent[]>([])
  const [selectedAreaStories, setSelectedAreaStories] = useState<ViewerContent[]>([])
  const [storiesLoadState, setStoriesLoadState] = useState<StoriesLoadState>('idle')
  const [storiesError, setStoriesError] = useState<string | null>(null)
  const [playbackNotice, setPlaybackNotice] = useState<string | null>(null)
  const [firestoreNarrativeSections, setFirestoreNarrativeSections] = useState<AreaSection[] | null>(null)
  const [contentProgress, setContentProgress] = useState<Record<string, ContentProgress>>({})
  const [watchedHistory, setWatchedHistory] = useState<WatchedHistoryItem[]>([])
  const [viewerIntent, setViewerIntent] = useState<ViewerIntent>('select')
  const [partnerType, setPartnerType] = useState('Community Partner')
  const [showMoreInfo, setShowMoreInfo] = useState(false)
  const [isVideoPaused, setIsVideoPaused] = useState(false)
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(true)
  const [hasUserEnabledAudio, setHasUserEnabledAudio] = useState(false)
  const [volume, setVolume] = useState(0.85)
  const [areaNewBadgeMap, setAreaNewBadgeMap] = useState<Record<string, boolean>>({})
  const [viewerAreaRolesMap, setViewerAreaRolesMap] = useState<Record<ViewerAreaId, ViewerAreaRolesDoc> | null>(null)
  const [hasRestoredLastActiveVideo, setHasRestoredLastActiveVideo] = useState(false)
  const [hasAutoSelectedInitialContent, setHasAutoSelectedInitialContent] = useState(false)
  const [moduleBannerVisible, setModuleBannerVisible] = useState(false)
  const [allPublishedContent, setAllPublishedContent] = useState<ViewerContent[]>([])
  const [isUsingFallbackContent, setIsUsingFallbackContent] = useState(false)
  const [previewWindow, setPreviewWindow] = useState<{ start: number; end: number } | null>(null)
  const [isPreviewLoopFading, setIsPreviewLoopFading] = useState(false)
  const [commentsLoadState, setCommentsLoadState] = useState<CommentLoadState>('idle')
  const [commentsError, setCommentsError] = useState<string | null>(null)
  const [activeComments, setActiveComments] = useState<ViewerComment[]>([])
  const [isCommentComposerOpen, setIsCommentComposerOpen] = useState(false)
  const [draftCommentMessage, setDraftCommentMessage] = useState('')
  const [draftCommentThumbnail, setDraftCommentThumbnail] = useState<string | null>(null)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isStudentCameraEnabled, setIsStudentCameraEnabled] = useState(false)
  const [studentTelemetrySession, setStudentTelemetrySession] = useState<StudentTelemetrySession | null>(null)
  const studentCameraPreviewRef = useRef<HTMLVideoElement | null>(null)
  const studentCameraStreamRef = useRef<MediaStream | null>(null)
  const studentTelemetryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const requestedAreaFilter = useMemo(() => {
    const area = searchParams.get('area')
    if (!area) return null
    return viewerAreas.some((item) => item.id === area) ? (area as ViewerAreaId) : null
  }, [searchParams])
  const moduleMode = searchParams.get('module') === '1'
  const isDevelopment = process.env.NODE_ENV === 'development'
  const devProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'unknown'
  const firestoreEmulatorHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST
  const isUsingEmulators =
    Boolean(firestoreEmulatorHost) || process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === 'true'
  const activeFirestoreFilters = useMemo(
    () => ({
      areaId: selectedAreaId,
      status: VIEWER_CONTENT_FILTERS.status,
      isPublished: VIEWER_CONTENT_FILTERS.isPublished,
      confirmed: VIEWER_CONTENT_FILTERS.confirmed,
      accessLevel: [...VIEWER_CONTENT_FILTERS.accessLevel],
    }),
    [selectedAreaId]
  )

  const setAreaFilterInUrl = (areaId: ViewerAreaId | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (areaId) {
      params.set('area', areaId)
    } else {
      params.delete('area')
    }
    const nextQuery = params.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
  }

  useEffect(() => {
    document.body.style.overflow = isLibraryOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isLibraryOpen])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = window.localStorage.getItem(LOCAL_PROGRESS_STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved) as Record<string, ContentProgress>
      setContentProgress(parsed)
    } catch (error) {
      console.error('Error restoring story progress:', error)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || hasRestoredLastActiveVideo) return
    try {
      const saved = window.localStorage.getItem(LOCAL_LAST_ACTIVE_VIDEO_STORAGE_KEY)
      if (!saved) {
        setHasRestoredLastActiveVideo(true)
        return
      }

      const parsed = JSON.parse(saved) as ActiveVideo
      if (!parsed || !parsed.url || !parsed.areaId) {
        setHasRestoredLastActiveVideo(true)
        return
      }
      if (requestedAreaFilter && parsed.areaId !== requestedAreaFilter) {
        setHasRestoredLastActiveVideo(true)
        return
      }

      const matchingArea = viewerAreas.find((area) => area.id === parsed.areaId)
      if (!matchingArea) {
        setHasRestoredLastActiveVideo(true)
        return
      }

      const inferredSourceType: ActiveVideo['sourceType'] =
        parsed.sourceType ?? (parsed.contentId ? 'content' : 'area-default')

      setSelectedAreaId(parsed.areaId)
      setActiveVideo({
        ...parsed,
        sourceType: inferredSourceType,
      })
      if (inferredSourceType !== 'area-default') {
        setHasAutoSelectedInitialContent(true)
      }
      setHasRestoredLastActiveVideo(true)
      setIsPlayerOverlayVisible(false)
    } catch (error) {
      console.error('Error restoring last active video:', error)
      setHasRestoredLastActiveVideo(true)
    }
  }, [hasRestoredLastActiveVideo, requestedAreaFilter])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = window.localStorage.getItem(LOCAL_WATCHED_HISTORY_STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved) as WatchedHistoryItem[]
      setWatchedHistory(parsed)
    } catch (error) {
      console.error('Error restoring watched history:', error)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (overlayTimerRef.current) {
        clearTimeout(overlayTimerRef.current)
      }
      if (progressSaveTimerRef.current) {
        clearTimeout(progressSaveTimerRef.current)
      }
      if (studentTelemetryTimerRef.current) {
        clearInterval(studentTelemetryTimerRef.current)
      }
      if (studentCameraStreamRef.current) {
        studentCameraStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const selectedArea = useMemo(
    () => viewerAreas.find((area) => area.id === selectedAreaId) ?? viewerAreas[0],
    [selectedAreaId]
  )

  const activeStory = useMemo(
    () => selectedAreaCatalog.find((item) => item.id === activeVideo.contentId) ?? null,
    [selectedAreaCatalog, activeVideo.contentId]
  )

  const selectedAreaRoleDoc = useMemo(() => {
    return viewerAreaRolesMap?.[selectedAreaId] ?? null
  }, [selectedAreaId, viewerAreaRolesMap])
  const hasNoDefaultAreaVideoConfigured = !selectedArea.videoUrl?.trim()
  const activeNarrativeSections = useMemo(() => {
    if (firestoreNarrativeSections) return firestoreNarrativeSections
    return selectedArea.sections
  }, [firestoreNarrativeSections, selectedArea.sections])

  const selectedAreaRoles = useMemo<ViewerRoleTemplate[]>(() => {
    return selectedAreaRoleDoc?.roles ?? []
  }, [selectedAreaRoleDoc])

  const recentWatchedStories = useMemo(() => {
    return [...watchedHistory]
      .sort((a, b) => b.watchedAt - a.watchedAt)
      .slice(0, 5)
  }, [watchedHistory])
  const canViewComments = viewerIntent !== 'select'
  const canCreateComments = viewerIntent === 'partner' || viewerIntent === 'instructor'

  const recordedLabel = useMemo(() => {
    if (!activeStory?.recordedAt) return 'Date not provided'
    const parsed = new Date(activeStory.recordedAt)
    if (Number.isNaN(parsed.getTime())) return activeStory.recordedAt
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }, [activeStory?.recordedAt])

  const getStoryProgressPercent = (contentId: string): number => {
    const progress = contentProgress[contentId]
    if (!progress || progress.durationSeconds <= 0) return 0
    const ratio = (progress.positionSeconds / progress.durationSeconds) * 100
    return Math.max(0, Math.min(100, ratio))
  }

  const formatDuration = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
    const total = Math.floor(seconds)
    const mins = Math.floor(total / 60)
    const secs = total % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTimestampLabel = (seconds: number): string => {
    const safeSeconds = Math.max(0, Math.floor(seconds))
    const mins = Math.floor(safeSeconds / 60)
    const secs = safeSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const isHlsSource = (url: string): boolean => {
    const normalized = url.toLowerCase()
    return normalized.includes('.m3u8') || normalized.includes('format=m3u8')
  }

  const saveProgressToStorage = (next: Record<string, ContentProgress>) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(LOCAL_PROGRESS_STORAGE_KEY, JSON.stringify(next))
  }

  const saveWatchedHistoryToStorage = (next: WatchedHistoryItem[]) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(LOCAL_WATCHED_HISTORY_STORAGE_KEY, JSON.stringify(next))
  }

  useEffect(() => {
    setActiveVideo((current) => {
      if (current.areaId === selectedArea.id && current.contentId) {
        return current
      }
      return {
        url: '',
        title: selectedArea.title,
        areaId: selectedArea.id,
        overlayClass: selectedArea.visual,
        sourceType: 'area-default',
      }
    })
    setIsUsingFallbackContent(false)
    setIsPlayerOverlayVisible(true)
  }, [selectedArea])

  useEffect(() => {
    if (!requestedAreaFilter || requestedAreaFilter === selectedAreaId) return
    const area = viewerAreas.find((item) => item.id === requestedAreaFilter)
    if (!area) return

    setSelectedAreaId(area.id)
    setActiveVideo({
      url: '',
      title: area.title,
      areaId: area.id,
      overlayClass: area.visual,
      sourceType: 'area-default',
    })
  }, [requestedAreaFilter, selectedAreaId])

  useEffect(() => {
    if (!moduleMode || !requestedAreaFilter) return
    setIsLibraryOpen(true)
    setModuleBannerVisible(true)
  }, [moduleMode, requestedAreaFilter])

  useEffect(() => {
    if (!db) {
      setStoriesLoadState('error')
      setStoriesError('Firebase is not configured.')
      setIsUsingFallbackContent(Boolean(selectedArea.videoUrl))
      setActiveVideo((current) => {
        if (current.contentId) return current
        return {
          url: selectedArea.videoUrl || '',
          title: selectedArea.title,
          areaId: selectedArea.id,
          overlayClass: selectedArea.visual,
          sourceType: 'area-default',
        }
      })
      return
    }

    let mounted = true

    const applyFallbackForArea = () => {
      if (!mounted) return
      setIsUsingFallbackContent(Boolean(selectedArea.videoUrl))
      setActiveVideo((current) => {
        if (current.areaId === selectedAreaId && current.contentId) return current
        return {
          url: selectedArea.videoUrl || '',
          title: selectedArea.title,
          areaId: selectedArea.id,
          overlayClass: selectedArea.visual,
          sourceType: 'area-default',
        }
      })
    }

    if (isDevelopment) {
      console.info('[viewer] Firestore query filters', activeFirestoreFilters)
    }

    const loadAreaStories = async () => {
      setStoriesLoadState('loading')
      setStoriesError(null)
      setIsUsingFallbackContent(false)

      try {
        const strictQuery = query(
          collection(db, 'viewerContent'),
          where('areaId', '==', selectedAreaId),
          where('status', '==', VIEWER_CONTENT_FILTERS.status),
          where('isPublished', '==', VIEWER_CONTENT_FILTERS.isPublished),
          where('confirmed', '==', VIEWER_CONTENT_FILTERS.confirmed),
          where('accessLevel', 'in', [...VIEWER_CONTENT_FILTERS.accessLevel])
        )

        let strictSnapshot
        try {
          strictSnapshot = await getDocs(strictQuery)
        } catch (strictError) {
          const code =
            strictError && typeof strictError === 'object' && 'code' in strictError
              ? String((strictError as { code?: unknown }).code)
              : ''
          if (code === 'permission-denied' || code.endsWith('/permission-denied')) {
            throw strictError
          }
          if (isDevelopment) {
            console.warn('[viewer] strict query failed, trying broader query', strictError)
          }
          const broaderQuery = query(
            collection(db, 'viewerContent'),
            where('areaId', '==', selectedAreaId),
            where('isPublished', '==', VIEWER_CONTENT_FILTERS.isPublished),
            limit(BROAD_FETCH_LIMIT)
          )
          strictSnapshot = await getDocs(broaderQuery)
        }
        if (!mounted) return

        if (strictSnapshot.empty) {
          try {
            const broaderQuery = query(
              collection(db, 'viewerContent'),
              where('areaId', '==', selectedAreaId),
              where('isPublished', '==', VIEWER_CONTENT_FILTERS.isPublished),
              limit(BROAD_FETCH_LIMIT)
            )
            strictSnapshot = await getDocs(broaderQuery)
          } catch (broaderError) {
            throw broaderError
          }
        }

        if (!mounted) return

        let catalog = strictSnapshot.docs
          .map((item) => normalizeViewerContent(item.id, item.data() as Partial<ViewerContent>))
          .filter((item) => {
            const status = item.status ?? VIEWER_CONTENT_DEFAULTS.status
            const confirmed = item.confirmed ?? VIEWER_CONTENT_DEFAULTS.confirmed
            const accessLevel = item.accessLevel ?? VIEWER_CONTENT_DEFAULTS.accessLevel
            return (
              status === VIEWER_CONTENT_FILTERS.status &&
              item.isPublished === VIEWER_CONTENT_FILTERS.isPublished &&
              confirmed === VIEWER_CONTENT_FILTERS.confirmed &&
              VIEWER_CONTENT_FILTERS.accessLevel.includes(accessLevel)
            )
          })
          .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))

        setSelectedAreaCatalog(catalog)

        if (catalog.length === 0) {
          setStoriesLoadState('empty')
          setAvailableCities([])
          setSelectedCity('')
          applyFallbackForArea()
          return
        }

        setStoriesLoadState('ready')

        if (selectedAreaId !== 'community') {
          setAvailableCities([])
          setSelectedCity('')
          return
        }

        const citySet = new Set<string>()
        for (const item of catalog) {
          for (const city of item.geo?.cities ?? []) {
            if (city.trim()) citySet.add(city.trim())
          }
        }
        const cities = Array.from(citySet).sort((a, b) => a.localeCompare(b))
        setAvailableCities(cities)
        setSelectedCity((current) =>
          current && cities.includes(current) ? current : (cities[0] ?? '')
        )
      } catch (error) {
        console.error('Error loading viewer stories:', error)
        if (!mounted) return
        setStoriesError(getErrorMessage(error))
        setStoriesLoadState('error')
        setSelectedAreaCatalog([])
        setSelectedAreaStories([])
        setAvailableCities([])
        setSelectedCity('')
        applyFallbackForArea()
      }
    }

    void loadAreaStories()

    return () => {
      mounted = false
    }
  }, [activeFirestoreFilters, isDevelopment, selectedArea, selectedAreaId, selectedArea.title])

  useEffect(() => {
    if (!db) return
    let mounted = true

    const loadAllPublishedContent = async () => {
      try {
        const snapshot = await getDocs(query(collection(db, 'viewerContent'), where('isPublished', '==', true)))
        if (!mounted) return
        const rows = snapshot.docs.map((item) =>
          normalizeViewerContent(item.id, item.data() as Partial<ViewerContent>)
        )
        setAllPublishedContent(rows)
      } catch (error) {
        console.error('Error loading all published viewer content:', error)
      }
    }

    void loadAllPublishedContent()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!db) return
    let mounted = true

    const loadAreaBadges = async () => {
      try {
        const badgeQuery = query(collection(db, 'viewerContent'), where('isPublished', '==', true))
        const snapshot = await getDocs(badgeQuery)
        if (!mounted) return

        const map: Record<string, boolean> = {}
        const recentThreshold = Date.now() - 1000 * 60 * 60 * 24 * 7

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as ViewerContent & { updatedAt?: any; confirmedAt?: any }
          const areaKey = data.areaId
          if (!areaKey) return

          let isRecent = false
          const updatedAt = data.updatedAt
          if (updatedAt && typeof updatedAt.toMillis === 'function') {
            isRecent = updatedAt.toMillis() >= recentThreshold
          } else if (typeof data.confirmedAt === 'string') {
            const parsed = Date.parse(data.confirmedAt)
            if (!Number.isNaN(parsed)) isRecent = parsed >= recentThreshold
          }

          if (data.isNew || isRecent) {
            map[areaKey] = true
          }
        })

        setAreaNewBadgeMap(map)
      } catch (error) {
        console.error('Error loading area badge states:', error)
        if (mounted) setAreaNewBadgeMap({})
      }
    }

    loadAreaBadges()
    return () => {
      mounted = false
    }
  }, [db, selectedAreaId])

  useEffect(() => {
    if (!db) {
      setFirestoreNarrativeSections(null)
      return
    }
    let mounted = true

    const loadNarrativeSections = async () => {
      try {
        const sectionsQuery = query(collection(db, 'viewerSections'), where('active', '==', true))
        const snapshot = await getDocs(sectionsQuery)
        if (!mounted) return
        const sections = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data() as Partial<AreaSection> & {
              availability?: string
              areaId?: string
              order?: number
            }
            return {
              id: docSnap.id,
              areaId: data.areaId ?? '',
              order: typeof data.order === 'number' ? data.order : 999,
              title: data.title ?? 'Untitled Arc',
              format: data.format ?? 'Narrative Arc',
              summary: data.summary ?? '',
              availabilityRaw: data.availability ?? 'open',
            }
          })
          .filter((item) => item.areaId === selectedAreaId)
          .sort((a, b) => a.order - b.order)
          .map((item) => ({
            id: item.id,
            title: item.title,
            format: item.format,
            summary: item.summary,
            availability:
              (item.availabilityRaw.charAt(0).toUpperCase() + item.availabilityRaw.slice(1)) as AreaSection['availability'],
          }))
        setFirestoreNarrativeSections(sections.length > 0 ? sections : [])
      } catch (error) {
        console.error('Error loading narrative arcs from Firestore:', error)
        if (mounted) setFirestoreNarrativeSections(null)
      }
    }

    void loadNarrativeSections()
    return () => {
      mounted = false
    }
  }, [db, selectedAreaId])

  useEffect(() => {
    if (!db) return
    let mounted = true

    const loadAreaRoles = async () => {
      try {
        const rolesMap = await loadViewerAreaRolesMap(db)
        if (!mounted) return
        setViewerAreaRolesMap(rolesMap)
      } catch (error) {
        console.error('Error loading viewer area roles:', error)
      }
    }

    void loadAreaRoles()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const filtered = selectedAreaCatalog
      .filter((item) => {
        if (selectedAreaId !== 'community') return true
        if (!selectedCity) return true
        return (item.geo?.cities ?? []).includes(selectedCity)
      })
      .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))

    setSelectedAreaStories(filtered)
  }, [selectedAreaCatalog, selectedAreaId, selectedCity])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const preloadTargets = selectedAreaStories.slice(0, 2).map((item) => item.hlsUrl || item.videoUrl).filter(Boolean)
    const links: HTMLLinkElement[] = []
    preloadTargets.forEach((url) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'video'
      link.href = url
      link.crossOrigin = 'anonymous'
      link.dataset.viewerPreload = '1'
      document.head.appendChild(link)
      links.push(link)
    })
    return () => {
      links.forEach((link) => link.remove())
    }
  }, [selectedAreaStories])

  useEffect(() => {
    const element = videoRef.current
    if (!element) return
    if (viewerIntent === 'select') return
    setPreviewWindow(null)
    setIsPreviewLoopFading(false)
    previewLoopTransitioningRef.current = false
    if (viewerIntent === 'subscriber' && activeVideo.sourceType === 'content') {
      element.currentTime = 0
      setCurrentPlaybackTime(0)
      void element.play().catch((error) => {
        console.error('Unable to start full-length playback for subscriber mode:', error)
      })
    }
  }, [viewerIntent, activeVideo.sourceType, activeVideo.contentId])

  useEffect(() => {
    if (!db || !activeVideo.contentId || !canViewComments) {
      setCommentsLoadState(canViewComments ? 'ready' : 'idle')
      setActiveComments([])
      setCommentsError(null)
      return
    }
    let mounted = true

    const loadComments = async () => {
      setCommentsLoadState('loading')
      setCommentsError(null)
      try {
        const commentsQuery = query(collection(db, 'viewerComments'), where('contentId', '==', activeVideo.contentId))
        const snapshot = await getDocs(commentsQuery)
        if (!mounted) return
        const comments = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data() as Partial<ViewerComment>
            return {
              id: docSnap.id,
              contentId: data.contentId ?? '',
              areaId: data.areaId ?? '',
              sectionId: data.sectionId,
              authorRole:
                data.authorRole === 'partner' || data.authorRole === 'instructor'
                  ? data.authorRole
                  : 'partner',
              authorLabel: data.authorLabel ?? 'Partner',
              message: data.message ?? '',
              timestampSeconds: Number.isFinite(data.timestampSeconds) ? Number(data.timestampSeconds) : 0,
              thumbnailDataUrl: data.thumbnailDataUrl,
              createdAt: data.createdAt,
            } as ViewerComment
          })
          .filter((item) => item.contentId === activeVideo.contentId)
          .sort((a, b) => a.timestampSeconds - b.timestampSeconds)
        setActiveComments(comments)
        setCommentsLoadState('ready')
      } catch (error) {
        console.error('Error loading viewer comments:', error)
        if (!mounted) return
        setCommentsError(getErrorMessage(error))
        setCommentsLoadState('error')
        setActiveComments([])
      }
    }

    void loadComments()
    return () => {
      mounted = false
    }
  }, [db, activeVideo.contentId, canViewComments])

  useEffect(() => {
    if (viewerIntent !== 'student') {
      setIsStudentCameraEnabled(false)
    }
  }, [viewerIntent])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!activeVideo.url) return
    if (activeVideo.sourceType === 'area-default' && !activeVideo.contentId) return
    window.localStorage.setItem(LOCAL_LAST_ACTIVE_VIDEO_STORAGE_KEY, JSON.stringify(activeVideo))
  }, [activeVideo])

  useEffect(() => {
    setIsCommentComposerOpen(false)
    setDraftCommentMessage('')
    setDraftCommentThumbnail(null)
  }, [activeVideo.contentId])

  const getTimestampMillis = (value: unknown): number => {
    if (!value) return 0
    if (typeof value === 'string') {
      const parsed = Date.parse(value)
      return Number.isNaN(parsed) ? 0 : parsed
    }
    if (typeof value === 'object' && value && 'toMillis' in value && typeof (value as any).toMillis === 'function') {
      try {
        return (value as any).toMillis()
      } catch {
        return 0
      }
    }
    return 0
  }

  const pickLatestOrTopSeeded = (items: ViewerContent[]): ViewerContent | null => {
    if (items.length === 0) return null
    const newest = [...items].sort((a, b) => {
      const bTs = Math.max(getTimestampMillis(b.updatedAt), getTimestampMillis(b.createdAt), Date.parse(b.confirmedAt ?? '') || 0)
      const aTs = Math.max(getTimestampMillis(a.updatedAt), getTimestampMillis(a.createdAt), Date.parse(a.confirmedAt ?? '') || 0)
      if (bTs !== aTs) return bTs - aTs
      return (a.sortOrder ?? 999) - (b.sortOrder ?? 999)
    })[0]

    const newestTs = Math.max(
      getTimestampMillis(newest.updatedAt),
      getTimestampMillis(newest.createdAt),
      Date.parse(newest.confirmedAt ?? '') || 0
    )
    if (newestTs > 0) return newest

    return [...items].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))[0]
  }

  useEffect(() => {
    if (hasAutoSelectedInitialContent) return
    if (!hasRestoredLastActiveVideo) return
    if (storiesLoadState === 'idle' || storiesLoadState === 'loading') return
    if (activeVideo.sourceType && activeVideo.sourceType !== 'area-default') {
      setHasAutoSelectedInitialContent(true)
      return
    }
    if (storiesLoadState === 'empty' || storiesLoadState === 'error') {
      return
    }
    const preferredFromArea = pickLatestOrTopSeeded(selectedAreaCatalog)
    if (preferredFromArea) {
      void handleOpenContent(preferredFromArea, preferredFromArea.areaId as ViewerArea['id'])
      setHasAutoSelectedInitialContent(true)
      return
    }

    const preferredGlobal = pickLatestOrTopSeeded(allPublishedContent)
    if (preferredGlobal) {
      void handleOpenContent(preferredGlobal, preferredGlobal.areaId as ViewerArea['id'])
      setHasAutoSelectedInitialContent(true)
    }
  }, [
    activeVideo.sourceType,
    allPublishedContent,
    hasAutoSelectedInitialContent,
    hasRestoredLastActiveVideo,
    storiesLoadState,
    selectedAreaCatalog,
  ])

  useEffect(() => {
    if (!activeVideo.contentId || !videoRef.current) return
    const saved = contentProgress[activeVideo.contentId]
    if (!saved || saved.positionSeconds <= 0) return
    videoRef.current.currentTime = saved.positionSeconds
  }, [activeVideo.contentId, contentProgress])

  const saveCurrentVideoProgress = () => {
    const contentId = activeVideo.contentId
    const element = videoRef.current
    if (!contentId || !element || !Number.isFinite(element.duration) || element.duration <= 0) return

    const nextProgress: ContentProgress = {
      positionSeconds: element.currentTime,
      durationSeconds: element.duration,
      updatedAt: Date.now(),
    }

    setContentProgress((current) => {
      const next = {
        ...current,
        [contentId]: nextProgress,
      }
      saveProgressToStorage(next)
      return next
    })

    if (!user || !db) return
    void setDoc(
      doc(db, 'users', user.uid, 'viewerState', 'current'),
      {
        lastAreaId: activeVideo.areaId,
        lastSectionId: activeVideo.sectionId ?? null,
        lastContentId: contentId,
        playheadSeconds: element.currentTime,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ).catch((error) => {
      console.error('Error saving viewer playhead:', error)
    })
  }

  const queueVideoProgressSave = () => {
    if (progressSaveTimerRef.current) return
    progressSaveTimerRef.current = setTimeout(() => {
      progressSaveTimerRef.current = null
      saveCurrentVideoProgress()
    }, PROGRESS_SAVE_INTERVAL_MS)
  }

  const handlePlayPause = () => {
    const element = videoRef.current
    if (!element) return
    if (element.paused) {
      void element.play().catch((error) => {
        console.error('Unable to start playback:', error)
      })
      setIsVideoPaused(false)
    } else {
      element.pause()
      setIsVideoPaused(true)
    }
  }

  const handleSeek = (nextSeconds: number) => {
    const element = videoRef.current
    if (!element || !Number.isFinite(nextSeconds)) return
    element.currentTime = nextSeconds
    setCurrentPlaybackTime(nextSeconds)
  }

  const handleVolumeChange = (nextVolume: number) => {
    const element = videoRef.current
    if (!element || !Number.isFinite(nextVolume)) return
    const clamped = Math.max(0, Math.min(1, nextVolume))
    element.volume = clamped
    element.muted = clamped === 0
    setVolume(clamped)
    setIsMuted(clamped === 0)
    if (clamped > 0) {
      setHasUserEnabledAudio(true)
    }
  }

  const toggleMute = () => {
    const element = videoRef.current
    if (!element) return
    const nextMuted = !element.muted
    element.muted = nextMuted
    setIsMuted(nextMuted)
    if (!nextMuted && element.volume === 0) {
      element.volume = 0.6
      setVolume(0.6)
    }
    if (!nextMuted) {
      setHasUserEnabledAudio(true)
    }
  }

  const handleEnableAudio = () => {
    const element = videoRef.current
    if (!element) return
    if (element.volume === 0) {
      element.volume = 0.6
      setVolume(0.6)
    }
    element.muted = false
    setIsMuted(false)
    setHasUserEnabledAudio(true)
    void element.play().catch((error) => {
      console.error('Unable to continue playback with audio enabled:', error)
    })
  }

  const captureCommentThumbnail = (): string | null => {
    const element = videoRef.current
    if (!element || element.videoWidth <= 0 || element.videoHeight <= 0) return null
    try {
      const canvas = document.createElement('canvas')
      const width = 240
      const height = Math.max(135, Math.round((width / element.videoWidth) * element.videoHeight))
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(element, 0, 0, width, height)
      return canvas.toDataURL('image/jpeg', 0.72)
    } catch (error) {
      console.error('Unable to capture comment thumbnail:', error)
      return null
    }
  }

  const openCommentComposer = () => {
    setDraftCommentMessage('')
    setDraftCommentThumbnail(captureCommentThumbnail())
    setIsCommentComposerOpen(true)
  }

  const submitComment = async () => {
    if (!db || !activeVideo.contentId || !canCreateComments) return
    const message = draftCommentMessage.trim()
    if (!message) return
    const currentSeconds = Math.max(0, Math.floor(videoRef.current?.currentTime ?? currentPlaybackTime ?? 0))
    const authorRole: 'partner' | 'instructor' = viewerIntent === 'instructor' ? 'instructor' : 'partner'
    const authorLabel = viewerIntent === 'instructor' ? 'Institutional Instructor' : partnerType

    setIsSubmittingComment(true)
    try {
      const payload = {
        contentId: activeVideo.contentId,
        areaId: activeVideo.areaId,
        sectionId: activeVideo.sectionId ?? null,
        authorRole,
        authorLabel,
        message,
        timestampSeconds: currentSeconds,
        thumbnailDataUrl: draftCommentThumbnail ?? null,
        createdAt: serverTimestamp(),
      }
      const created = await addDoc(collection(db, 'viewerComments'), payload)
      const optimistic: ViewerComment = {
        id: created.id,
        contentId: activeVideo.contentId,
        areaId: activeVideo.areaId,
        sectionId: activeVideo.sectionId,
        authorRole,
        authorLabel,
        message,
        timestampSeconds: currentSeconds,
        thumbnailDataUrl: draftCommentThumbnail ?? undefined,
      }
      setActiveComments((current) => [...current, optimistic].sort((a, b) => a.timestampSeconds - b.timestampSeconds))
      setIsCommentComposerOpen(false)
      setDraftCommentMessage('')
      setDraftCommentThumbnail(null)
    } catch (error) {
      console.error('Error creating viewer comment:', error)
      setCommentsError(getErrorMessage(error))
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const enableStudentCamera = async () => {
    if (viewerIntent !== 'student') return
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        void Notification.requestPermission().catch(() => undefined)
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 360 } },
        audio: false,
      })
      studentCameraStreamRef.current = stream
      if (studentCameraPreviewRef.current) {
        studentCameraPreviewRef.current.srcObject = stream
      }
      const nextSession: StudentTelemetrySession = {
        id: `student-${Date.now()}`,
        startedAt: Date.now(),
      }
      setStudentTelemetrySession(nextSession)
      setIsStudentCameraEnabled(true)
    } catch (error) {
      console.error('Unable to enable student camera:', error)
      setPlaybackNotice('Unable to access the front camera for learner analysis.')
    }
  }

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveCurrentVideoProgress()
      }
    }
    const handleBeforeUnload = () => {
      saveCurrentVideoProgress()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [activeVideo, contentProgress, db, user])

  useEffect(() => {
    if (!isStudentCameraEnabled || viewerIntent !== 'student' || !db || !studentTelemetrySession) {
      if (studentTelemetryTimerRef.current) {
        clearInterval(studentTelemetryTimerRef.current)
        studentTelemetryTimerRef.current = null
      }
      return
    }

    const tick = async () => {
      if (!activeVideo.contentId) return
      const payload = {
        sessionId: studentTelemetrySession.id,
        startedAtMs: studentTelemetrySession.startedAt,
        contentId: activeVideo.contentId,
        areaId: activeVideo.areaId,
        playbackTimeSeconds: Math.floor(videoRef.current?.currentTime ?? 0),
        paused: Boolean(videoRef.current?.paused),
        volume: Number(videoRef.current?.volume ?? volume),
        muted: Boolean(videoRef.current?.muted ?? isMuted),
        viewport: {
          width: typeof window !== 'undefined' ? window.innerWidth : 0,
          height: typeof window !== 'undefined' ? window.innerHeight : 0,
        },
        createdAt: serverTimestamp(),
      }
      try {
        await addDoc(collection(db, 'studentSessionTelemetry'), payload)
      } catch (error) {
        console.error('Error writing student telemetry event:', error)
      }
    }

    studentTelemetryTimerRef.current = setInterval(() => {
      void tick()
    }, STUDENT_TELEMETRY_INTERVAL_MS)

    return () => {
      if (studentTelemetryTimerRef.current) {
        clearInterval(studentTelemetryTimerRef.current)
        studentTelemetryTimerRef.current = null
      }
    }
  }, [db, isMuted, isStudentCameraEnabled, studentTelemetrySession, viewerIntent, activeVideo.contentId, activeVideo.areaId, volume])

  useEffect(() => {
    if (isStudentCameraEnabled) return
    if (studentCameraStreamRef.current) {
      studentCameraStreamRef.current.getTracks().forEach((track) => track.stop())
      studentCameraStreamRef.current = null
    }
    if (studentCameraPreviewRef.current) {
      studentCameraPreviewRef.current.srcObject = null
    }
  }, [isStudentCameraEnabled])

  useEffect(() => {
    const element = videoRef.current
    if (!element || !activeVideo.url) return

    let canceled = false
    setPlaybackNotice(null)

    const clearHls = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }

    const applyDirectSource = (url: string) => {
      clearHls()
      element.src = url
      element.load()
    }

    const setupSource = async () => {
      const sourceUrl = activeVideo.url
      if (!isHlsSource(sourceUrl)) {
        applyDirectSource(sourceUrl)
        return
      }

      if (element.canPlayType('application/vnd.apple.mpegurl')) {
        applyDirectSource(sourceUrl)
        return
      }

      try {
        const getHlsCtor = async () => {
          const win = window as Window & { Hls?: any }
          if (win.Hls) return win.Hls
          await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector('script[data-hlsjs-cdn="1"]') as HTMLScriptElement | null
            if (existing) {
              existing.addEventListener('load', () => resolve(), { once: true })
              existing.addEventListener('error', () => reject(new Error('hls.js CDN failed to load')), { once: true })
              return
            }

            const script = document.createElement('script')
            script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js'
            script.async = true
            script.dataset.hlsjsCdn = '1'
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('hls.js CDN failed to load'))
            document.head.appendChild(script)
          })
          return win.Hls
        }

        const HlsCtor = await getHlsCtor()
        if (canceled || !HlsCtor) return
        if (!HlsCtor.isSupported()) {
          if (activeVideo.fallbackUrl) {
            applyDirectSource(activeVideo.fallbackUrl)
          } else {
            applyDirectSource(sourceUrl)
            setPlaybackNotice('This browser may not support adaptive stream playback for this video.')
          }
          return
        }

        clearHls()
        const hls = new HlsCtor({
          enableWorker: true,
          backBufferLength: 90,
          maxBufferLength: 30,
          lowLatencyMode: false,
        })
        hlsRef.current = hls
        hls.loadSource(sourceUrl)
        hls.attachMedia(element)
        hls.on(HlsCtor.Events.ERROR, (_event: unknown, data: any) => {
          if (!data?.fatal) return
          if (data.type === HlsCtor.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad()
            return
          }
          if (data.type === HlsCtor.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError()
            return
          }
          if (activeVideo.fallbackUrl) {
            applyDirectSource(activeVideo.fallbackUrl)
            setPlaybackNotice('Stream quality fallback activated.')
          } else {
            setPlaybackNotice('Adaptive stream failed to recover for this video.')
          }
        })
      } catch (error) {
        console.error('Error initializing HLS playback:', error)
        if (activeVideo.fallbackUrl) {
          applyDirectSource(activeVideo.fallbackUrl)
          setPlaybackNotice('Adaptive stream unavailable, using fallback video source.')
        } else {
          applyDirectSource(sourceUrl)
          setPlaybackNotice('Adaptive stream library unavailable in this environment.')
        }
      }
    }

    void setupSource()
    return () => {
      canceled = true
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [activeVideo.url, activeVideo.fallbackUrl])

  async function handleOpenContent(content: ViewerContent, areaId: ViewerArea['id']) {
    const area = viewerAreas.find((item) => item.id === areaId)
    const fallbackOverlay = area?.visual ?? viewerAreas[0].visual

    setActiveVideo({
      url: (content.hlsUrl && content.hlsUrl.trim()) || content.videoUrl,
      fallbackUrl: content.hlsUrl ? content.videoUrl : undefined,
      title: content.title,
      areaId,
      overlayClass: contentOverlayClass(content, fallbackOverlay),
      sectionId: content.sectionId,
      contentId: content.id,
      sourceType: 'content',
    })
    setSelectedAreaId(areaId)
    setIsLibraryOpen(false)
    setIsPlayerOverlayVisible(false)
    setShowMoreInfo(false)
    setIsUsingFallbackContent(false)
    setPreviewWindow(null)
    setIsMuted(true)
    setHasUserEnabledAudio(false)
    setVolume((current) => (current > 0 ? current : 0.85))

    setWatchedHistory((current) => {
      const deduped = current.filter((item) => item.contentId !== content.id)
      const next = [
        {
          contentId: content.id,
          title: content.title || activeVideo.title,
          areaId,
          watchedAt: Date.now(),
        },
        ...deduped,
      ].slice(0, 20)
      saveWatchedHistoryToStorage(next)
      return next
    })

    if (!user || !db) return

    try {
      await setDoc(
        doc(db, 'users', user.uid, 'viewerState', 'current'),
        {
          lastAreaId: areaId,
          lastSectionId: content.sectionId,
          lastContentId: content.id,
          playheadSeconds: contentProgress[content.id]?.positionSeconds ?? 0,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    } catch (error) {
      console.error('Error saving viewer state:', error)
    }
  }

  const handlePlayerInteraction = () => {
    // Keep the initial landing overlay persistent until a specific content video is selected.
    if (activeVideo.sourceType === 'area-default' && !activeVideo.contentId) return

    setIsPlayerOverlayVisible(true)

    if (overlayTimerRef.current) {
      clearTimeout(overlayTimerRef.current)
    }

    overlayTimerRef.current = setTimeout(() => {
      setIsPlayerOverlayVisible(false)
    }, OVERLAY_RESTORE_DELAY_MS)
  }

  const handlePlayRoleExplainer = () => {
    const explainerUrl = selectedAreaRoleDoc?.explainerVideoUrl?.trim() ?? ''
    if (!explainerUrl) return

    setActiveVideo({
      url: explainerUrl,
      title: `${selectedArea.title}: Role Overview`,
      areaId: selectedAreaId,
      overlayClass: selectedArea.visual,
      sourceType: 'role-explainer',
    })
    setIsLibraryOpen(false)
    setIsPlayerOverlayVisible(false)
    setIsUsingFallbackContent(false)
    setPreviewWindow(null)
    setIsMuted(true)
    setHasUserEnabledAudio(false)
    setVolume((current) => (current > 0 ? current : 0.85))
  }

  const runPreviewLoopTransition = (element: HTMLVideoElement, startSeconds: number) => {
    if (previewLoopTransitioningRef.current) return
    previewLoopTransitioningRef.current = true
    setIsPreviewLoopFading(true)

    window.setTimeout(() => {
      element.currentTime = startSeconds
      void element.play().catch((error) => {
        console.error('Unable to continue preview loop playback:', error)
      })
      setCurrentPlaybackTime(startSeconds)
      setIsVideoPaused(false)
      setIsPreviewLoopFading(false)
      previewLoopTransitioningRef.current = false
    }, PREVIEW_FADE_DURATION_MS)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07080B] text-white">
      <section
        className="relative min-h-[100svh] w-full md:h-screen"
        onMouseMove={handlePlayerInteraction}
        onTouchStart={handlePlayerInteraction}
      >
        {moduleBannerVisible ? (
          <div className="absolute left-1/2 top-4 z-30 w-[min(95%,640px)] -translate-x-1/2 rounded-xl border border-[#D4AF37]/40 bg-black/75 px-4 py-3 text-center backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-[#F5D37A]">Focused Module</p>
            <p className="mt-1 text-sm text-white">
              You are viewing the <span className="font-semibold">{selectedArea.title}</span> module.
            </p>
            <button
              type="button"
              onClick={() => setModuleBannerVisible(false)}
              className="mt-2 text-xs font-semibold text-white/80 underline underline-offset-4 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {activeVideo.url ? (
          <video
            ref={videoRef}
            key={`${activeVideo.areaId}-${activeVideo.contentId ?? 'area-default'}`}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              isPreviewLoopFading ? 'opacity-0' : 'opacity-100'
            }`}
            autoPlay
            loop={viewerIntent === 'select'}
            preload="auto"
            muted={isMuted}
            playsInline
            onLoadedMetadata={(event) => {
              const element = event.currentTarget
              setVideoDuration(Number.isFinite(element.duration) ? element.duration : 0)
              if (
                viewerIntent === 'select' &&
                activeVideo.sourceType === 'content' &&
                Number.isFinite(element.duration) &&
                element.duration > 0
              ) {
                const midpoint = Math.max(0, element.duration / 2)
                const end = Math.min(element.duration, midpoint + 15)
                element.currentTime = midpoint
                setPreviewWindow({ start: midpoint, end })
                setCurrentPlaybackTime(midpoint)
                setIsPreviewLoopFading(true)
                window.setTimeout(() => setIsPreviewLoopFading(false), PREVIEW_FADE_DURATION_MS)
              } else {
                setPreviewWindow(null)
                setCurrentPlaybackTime(element.currentTime || 0)
              }
              setIsVideoPaused(element.paused)
              setVolume(element.volume)
              setIsMuted(element.muted)
              if (!element.muted) {
                setHasUserEnabledAudio(true)
              }
              saveCurrentVideoProgress()
            }}
            onTimeUpdate={(event) => {
              const current = event.currentTarget.currentTime || 0
              if (viewerIntent === 'select' && previewWindow && current >= previewWindow.end) {
                runPreviewLoopTransition(event.currentTarget, previewWindow.start)
                return
              }
              setCurrentPlaybackTime(current)
              queueVideoProgressSave()
            }}
            onPause={(event) => {
              setIsVideoPaused(true)
              setCurrentPlaybackTime(event.currentTarget.currentTime || 0)
              saveCurrentVideoProgress()
            }}
            onPlay={() => setIsVideoPaused(false)}
            onEnded={(event) => {
              setCurrentPlaybackTime(event.currentTarget.currentTime || 0)
              saveCurrentVideoProgress()
            }}
            onWaiting={() => setPlaybackNotice('Buffering… optimizing playback.')}
            onStalled={() => setPlaybackNotice('Playback stalled. Reconnecting stream…')}
            onCanPlay={() => setPlaybackNotice(null)}
          />
        ) : null}

        <div
          className={`absolute inset-0 bg-gradient-to-br ${activeVideo.overlayClass} transition-opacity duration-500 ${
            isPlayerOverlayVisible ? 'opacity-65 md:opacity-100' : 'opacity-0'
          }`}
        />
        <div
          className={`absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.16),transparent_42%),radial-gradient(circle_at_80%_10%,rgba(212,175,55,0.22),transparent_35%)] backdrop-blur-[2px] transition-opacity duration-500 ${
            isPlayerOverlayVisible ? 'opacity-50 md:opacity-100' : 'opacity-0'
          }`}
        />

        <div
          className={`relative mx-auto flex h-full w-full max-w-7xl flex-col justify-end px-4 pb-6 pt-8 transition-opacity duration-500 sm:px-6 lg:px-8 md:justify-between md:py-8 ${
            isPlayerOverlayVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <div className="absolute right-4 top-8 flex items-center gap-2 sm:right-6 lg:right-8 md:hidden">
            <Link
              href={user ? '/studio' : '/subscriber'}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/35 px-2.5 py-1.5 text-sm text-white transition hover:border-[#D4AF37] hover:text-[#F5D37A]"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/25 bg-white/10 text-xs font-semibold uppercase">
                {user?.displayName?.charAt(0) ?? 'U'}
              </span>
              <span>{user ? 'Studio' : 'Log In'}</span>
            </Link>
            {activeVideo.contentId || activeVideo.sourceType === 'role-explainer' ? (
              <button
                type="button"
                onClick={() => setShowMoreInfo((current) => !current)}
                className="inline-flex items-center gap-1 rounded-full border border-[#D4AF37]/55 bg-[#D4AF37]/12 px-3 py-1.5 text-xs font-semibold text-[#F5D37A] transition hover:bg-[#D4AF37]/20"
              >
                Details <ChevronDown className={`h-3.5 w-3.5 transition ${showMoreInfo ? 'rotate-180' : ''}`} />
              </button>
            ) : null}
          </div>

          <div className="hidden md:flex md:justify-end">
            <div className="w-[360px] rounded-2xl border border-white/20 bg-black/35 p-3 text-white">
              <div className="flex items-center justify-between gap-3">
                <Link
                  href={user ? '/studio' : '/subscriber'}
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/35 px-2.5 py-1.5 text-sm text-white transition hover:border-[#D4AF37] hover:text-[#F5D37A]"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/25 bg-white/10 text-xs font-semibold uppercase">
                    {user?.displayName?.charAt(0) ?? 'U'}
                  </span>
                  <span>{user ? 'Continue Watching' : 'Log In'}</span>
                </Link>
                {activeVideo.contentId ? (
                  <button
                    type="button"
                    onClick={() => setShowMoreInfo((current) => !current)}
                    className="inline-flex items-center gap-1 rounded-full border border-[#D4AF37]/55 bg-[#D4AF37]/12 px-3 py-1.5 text-xs font-semibold text-[#F5D37A] transition hover:bg-[#D4AF37]/20"
                  >
                    More Info <ChevronDown className={`h-3.5 w-3.5 transition ${showMoreInfo ? 'rotate-180' : ''}`} />
                  </button>
                ) : null}
              </div>

              {activeVideo.contentId || activeVideo.sourceType === 'role-explainer' ? (
                <div className="mt-3 space-y-2 text-xs text-white/85">
                  {activeVideo.sourceType === 'role-explainer' ? (
                    <p className="rounded-lg border border-white/15 bg-black/30 px-3 py-2">
                      Role overview for {selectedArea.title}. Browse content to return to story playback.
                    </p>
                  ) : (
                    <>
                      <p className="rounded-lg border border-white/15 bg-black/30 px-3 py-2">
                        Institution: {activeStory?.institutionName ?? 'Not listed'}
                      </p>
                      <p className="rounded-lg border border-white/15 bg-black/30 px-3 py-2">
                        Recorded: {recordedLabel}
                      </p>
                      <p className="rounded-lg border border-white/15 bg-black/30 px-3 py-2">
                        Research Status: {activeStory?.researchStatus ?? 'General release'}
                      </p>
                    </>
                  )}

                  {showMoreInfo && activeVideo.sourceType !== 'role-explainer' ? (
                    <div className="space-y-2 rounded-xl border border-white/15 bg-black/30 p-3">
                      <p>Participants: {activeStory?.participantNames?.join(', ') || 'Not listed yet.'}</p>
                      <p>
                        Other Versions:{' '}
                        {activeStory?.relatedVersionIds && activeStory.relatedVersionIds.length > 0
                          ? `${activeStory.relatedVersionIds.length} available`
                          : 'Not listed yet.'}
                      </p>
                      <Link
                        href={activeStory?.infoUrl || '/home'}
                        className="inline-flex items-center gap-1 font-semibold text-[#F5D37A] hover:text-[#EACE7B]"
                      >
                        Open Reference Materials <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        href="/viewer/book"
                        className="inline-flex items-center gap-1 font-semibold text-[#F5D37A] hover:text-[#EACE7B]"
                      >
                        Book Participants <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  ) : null}

                  {recentWatchedStories.length > 0 ? (
                    <div>
                      <p className="mb-1 text-[11px] uppercase tracking-[0.12em] text-[#F5D37A]">Recently Watched</p>
                      <div className="flex flex-wrap gap-1.5">
                        {recentWatchedStories.map((item) => (
                          <button
                            key={`${item.contentId}-${item.watchedAt}`}
                            type="button"
                            onClick={async () => {
                              if (!db) return
                              const currentMatch = selectedAreaCatalog.find((story) => story.id === item.contentId)
                              if (currentMatch) {
                                await handleOpenContent(currentMatch, item.areaId)
                                return
                              }
                              const watchedDoc = await getDoc(doc(db, 'viewerContent', item.contentId))
                              if (!watchedDoc.exists()) return
                              const watchedData = watchedDoc.data() as Omit<ViewerContent, 'id'>
                              await handleOpenContent({ id: watchedDoc.id, ...watchedData }, item.areaId)
                            }}
                            className="rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-[11px] text-white/85 transition hover:border-[#D4AF37] hover:text-[#F5D37A]"
                          >
                            {item.title}
                          </button>
                        ))}
                      </div>
                    </div>
                ) : null}
              </div>
              ) : null}
            </div>
          </div>

          <div className="w-full pb-2 text-left md:pb-5">
            <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl md:text-7xl">BEAM Viewer</h1>
            <p className="mt-3 text-sm text-white/85 md:text-base">
              Now Playing: {activeStory?.title ?? activeVideo.title}
            </p>
            {isUsingFallbackContent ? (
              <p className="mt-2 inline-flex rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-1 text-xs text-[#F5D37A]">
                Using fallback content after Firestore returned no playable items.
              </p>
            ) : null}
            {playbackNotice ? (
              <p className="mt-2 inline-flex rounded-full border border-white/30 bg-black/35 px-3 py-1 text-xs text-white/85">
                {playbackNotice}
              </p>
            ) : null}
            {hasNoDefaultAreaVideoConfigured && activeVideo.sourceType === 'area-default' ? (
              <p className="mt-2 inline-flex rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-1 text-xs text-[#F5D37A]">
                No default area video configured.
              </p>
            ) : null}
            {isMuted && !hasUserEnabledAudio ? (
              <button
                type="button"
                onClick={handleEnableAudio}
                className="mt-2 inline-flex rounded-full border border-white/30 bg-black/35 px-3 py-1 text-xs font-semibold text-white transition hover:border-[#D4AF37] hover:text-[#F5D37A]"
              >
                Tap to enable audio
              </button>
            ) : null}

            <div className="mt-7 flex flex-wrap justify-start gap-3">
              <button
                type="button"
                onClick={() => setIsLibraryOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[#D4AF37] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#E6C86A]"
              >
                <PlayCircle className="h-4 w-4" />
                {activeVideo.contentId ? 'Browse' : 'Start Watching'}
              </button>
              <Link
                href="/home"
                className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-black/25 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-[#D4AF37] hover:text-[#F5D37A]"
              >
                Back to Home <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {showMoreInfo && (activeVideo.contentId || activeVideo.sourceType === 'role-explainer') ? (
              <div className="mt-3 max-h-[30vh] space-y-2 overflow-y-auto rounded-xl border border-white/20 bg-black/45 p-3 text-xs text-white/85 md:hidden">
                {activeVideo.sourceType === 'role-explainer' ? (
                  <p className="rounded-lg border border-white/15 bg-black/30 px-3 py-2">
                    Role overview for {selectedArea.title}. Browse content to return to story playback.
                  </p>
                ) : (
                  <>
                    <p className="rounded-lg border border-white/15 bg-black/30 px-3 py-2">
                      Institution: {activeStory?.institutionName ?? 'Not listed'}
                    </p>
                    <p className="rounded-lg border border-white/15 bg-black/30 px-3 py-2">
                      Recorded: {recordedLabel}
                    </p>
                    <p className="rounded-lg border border-white/15 bg-black/30 px-3 py-2">
                      Research Status: {activeStory?.researchStatus ?? 'General release'}
                    </p>
                    <p>Participants: {activeStory?.participantNames?.join(', ') || 'Not listed yet.'}</p>
                  </>
                )}
              </div>
            ) : null}

            {activeVideo.url ? (
              <div className="mt-5 w-full max-w-3xl rounded-2xl border border-white/20 bg-black/35 p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-white/70">
                  <span>{formatDuration(currentPlaybackTime)}</span>
                  <span>{formatDuration(videoDuration)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(videoDuration, 0)}
                  step={0.1}
                  value={Math.min(currentPlaybackTime, videoDuration || 0)}
                  onChange={(event) => handleSeek(Number(event.target.value))}
                  className="w-full accent-[#D4AF37]"
                />
                {canViewComments && activeComments.length > 0 && videoDuration > 0 ? (
                  <div className="relative mt-2 h-4">
                    {activeComments.map((comment) => {
                      const leftPercent = Math.max(0, Math.min(100, (comment.timestampSeconds / videoDuration) * 100))
                      return (
                        <button
                          key={comment.id}
                          type="button"
                          title={`${getTimestampLabel(comment.timestampSeconds)} • ${comment.authorLabel}`}
                          onClick={() => handleSeek(comment.timestampSeconds)}
                          className="group absolute top-0 -translate-x-1/2"
                          style={{ left: `${leftPercent}%` }}
                        >
                          <span className="block h-2.5 w-2.5 rounded-full border border-[#D4AF37] bg-[#D4AF37]" />
                          {comment.thumbnailDataUrl ? (
                            <span className="pointer-events-none absolute bottom-5 left-1/2 hidden -translate-x-1/2 overflow-hidden rounded border border-white/25 bg-black/70 group-hover:block">
                              <img
                                src={comment.thumbnailDataUrl}
                                alt="Comment frame"
                                className="h-12 w-20 object-cover"
                              />
                            </span>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                ) : null}
                <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handlePlayPause}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/35 text-white hover:border-[#D4AF37] hover:text-[#F5D37A]"
                    >
                      {isVideoPaused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/35 text-white hover:border-[#D4AF37] hover:text-[#F5D37A]"
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={(event) => handleVolumeChange(Number(event.target.value))}
                    className="w-full accent-[#D4AF37] sm:w-36"
                  />
                  <select
                    value={viewerIntent}
                    onChange={(event) => setViewerIntent(event.target.value as ViewerIntent)}
                    className="w-full rounded-lg border border-white/20 bg-black/35 px-3 py-1.5 text-xs text-white outline-none focus:border-[#D4AF37] sm:w-auto"
                  >
                    <option value="select">Select</option>
                    <option value="subscriber">Subscriber</option>
                    <option value="student">Student Learner</option>
                    <option value="instructor">Institutional Instructor</option>
                    <option value="partner">Partner</option>
                  </select>
                  {viewerIntent === 'partner' ? (
                    <select
                      value={partnerType}
                      onChange={(event) => setPartnerType(event.target.value)}
                      className="w-full rounded-lg border border-white/20 bg-black/35 px-3 py-1.5 text-xs text-white outline-none focus:border-[#D4AF37] sm:w-auto"
                    >
                      <option>Community Partner</option>
                      <option>Institutional Partner</option>
                      <option>Presenter</option>
                      <option>Sponsor</option>
                    </select>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setIsLibraryOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white hover:border-[#D4AF37] hover:text-[#F5D37A]"
                  >
                    Browse Content
                  </button>
                  <Link
                    href="/home"
                    className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white hover:border-[#D4AF37] hover:text-[#F5D37A]"
                  >
                    Home
                  </Link>
                  {canCreateComments && activeVideo.contentId ? (
                    <button
                      type="button"
                      onClick={openCommentComposer}
                      className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white hover:border-[#D4AF37] hover:text-[#F5D37A]"
                    >
                      Add Comment
                    </button>
                  ) : null}
                  {viewerIntent === 'student' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (isStudentCameraEnabled) {
                          setIsStudentCameraEnabled(false)
                          return
                        }
                        void enableStudentCamera()
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white hover:border-[#D4AF37] hover:text-[#F5D37A]"
                    >
                      {isStudentCameraEnabled ? 'Disable Camera Coach' : 'Enable Camera Coach'}
                    </button>
                  ) : null}
                </div>
                {canViewComments && activeVideo.contentId ? (
                  <div className="mt-3 space-y-2 rounded-xl border border-white/15 bg-black/30 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-[#F5D37A]">Comments</p>
                      <p className="text-[11px] text-white/65">
                        {canCreateComments
                          ? 'You can comment'
                          : viewerIntent === 'subscriber'
                            ? 'Read only for subscribers'
                            : 'Read only'}
                      </p>
                    </div>
                    {commentsLoadState === 'loading' ? (
                      <p className="text-xs text-white/70">Loading comments…</p>
                    ) : null}
                    {commentsError ? (
                      <p className="text-xs text-red-200">{commentsError}</p>
                    ) : null}
                    {commentsLoadState === 'ready' && activeComments.length === 0 ? (
                      <p className="text-xs text-white/70">No comments yet for this moment.</p>
                    ) : null}
                    {activeComments.slice(0, 3).map((comment) => (
                      <button
                        key={`inline-${comment.id}`}
                        type="button"
                        onClick={() => handleSeek(comment.timestampSeconds)}
                        className="w-full rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-left transition hover:border-[#D4AF37]/40"
                      >
                        <p className="text-[11px] uppercase tracking-[0.12em] text-[#F5D37A]">
                          {getTimestampLabel(comment.timestampSeconds)} • {comment.authorLabel}
                        </p>
                        <p className="mt-1 text-xs text-white/85">{comment.message}</p>
                      </button>
                    ))}
                  </div>
                ) : null}
                {viewerIntent === 'student' && isStudentCameraEnabled ? (
                  <div className="mt-3 rounded-xl border border-white/15 bg-black/30 p-2.5">
                    <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[#F5D37A]">
                      Learner Camera (Session Analysis)
                    </p>
                    <video
                      ref={studentCameraPreviewRef}
                      autoPlay
                      muted
                      playsInline
                      className="h-24 w-40 rounded-md border border-white/20 bg-black object-cover"
                    />
                    <p className="mt-2 text-[11px] text-white/70">
                      Camera movement events are sampled to Firestore every {Math.round(STUDENT_TELEMETRY_INTERVAL_MS / 1000)}s.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {isCommentComposerOpen ? (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsCommentComposerOpen(false)} />
          <div className="relative mx-auto mt-16 w-[min(92%,560px)] rounded-2xl border border-white/20 bg-[#0E1018] p-5 text-white">
            <h3 className="text-lg font-semibold">Add Timestamp Comment</h3>
            <p className="mt-1 text-xs text-white/70">
              Comment at {getTimestampLabel(Math.floor(videoRef.current?.currentTime ?? currentPlaybackTime ?? 0))}
            </p>
            {draftCommentThumbnail ? (
              <img
                src={draftCommentThumbnail}
                alt="Current video frame"
                className="mt-3 h-28 w-48 rounded border border-white/20 object-cover"
              />
            ) : null}
            <textarea
              value={draftCommentMessage}
              onChange={(event) => setDraftCommentMessage(event.target.value)}
              rows={4}
              placeholder="Add coaching or partner context for this moment…"
              className="mt-3 w-full rounded-xl border border-white/20 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIsCommentComposerOpen(false)}
                className="rounded-full border border-white/30 bg-black/25 px-4 py-1.5 text-xs font-semibold text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingComment || !draftCommentMessage.trim()}
                onClick={() => {
                  void submitComment()
                }}
                className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/15 px-4 py-1.5 text-xs font-semibold text-[#F5D37A] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmittingComment ? 'Saving…' : 'Save Comment'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isLibraryOpen ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(255,255,255,0.12),transparent_40%),radial-gradient(circle_at_80%_8%,rgba(212,175,55,0.18),transparent_36%)]" />

          <div className="relative h-full overflow-y-auto">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 pt-6 sm:px-6 lg:px-8">
              <h2 className="text-xl font-semibold">Viewer Library</h2>
              <button
                type="button"
                onClick={() => setIsLibraryOpen(false)}
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/35 px-3 py-1.5 text-sm text-white hover:border-[#D4AF37] hover:text-[#F5D37A]"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>

            <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold">Areas</h3>
                <p className="text-xs uppercase tracking-[0.14em] text-white/60">Streaming Home Rail</p>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2">
                {(requestedAreaFilter
                  ? viewerAreas.filter((area) => area.id === requestedAreaFilter)
                  : viewerAreas).map((area, index) => {
                  const isSelected = area.id === selectedAreaId

                  return (
                    <button
                      key={area.id}
                      onClick={() => {
                        setSelectedAreaId(area.id)
                        setAreaFilterInUrl(area.id)
                        setActiveVideo({
                          url: '',
                          title: area.title,
                          areaId: area.id,
                          overlayClass: area.visual,
                          sourceType: 'area-default',
                        })
                        setIsUsingFallbackContent(false)
                      }}
                      className={`group relative min-w-[260px] flex-1 rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-[#D4AF37] bg-white/[0.08]'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/30'
                      }`}
                      type="button"
                    >
                      <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[#F5D37A]">Slide {index + 1}</p>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <h4 className="text-lg font-semibold">{area.title}</h4>
                        {area.locked ? <Lock className="h-4 w-4 text-[#F5D37A]" /> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-white/75">{area.tag}</p>
                        {areaNewBadgeMap[area.id] ? (
                          <span className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#F5D37A]">
                            New
                          </span>
                        ) : null}
                      </div>
                      {requestedAreaFilter ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            setAreaFilterInUrl(null)
                          }}
                          className="mt-3 rounded-full border border-white/25 bg-black/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white transition hover:border-[#D4AF37] hover:text-[#F5D37A]"
                        >
                          Show All Areas
                        </button>
                      ) : null}
                      {area.locked ? (
                        <p className="mt-3 inline-flex items-center rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#F5D37A]">
                          Locked for now
                        </p>
                      ) : null}
                      <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-transparent transition group-hover:ring-white/20" />
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold">{selectedArea.title} Stories</h3>
                <p className="text-xs text-white/65">
                  {selectedAreaId === 'community' ? `City Filter: ${selectedCity || 'All'}` : 'All Markets'}
                </p>
              </div>
              {isDevelopment ? (
                <div className="mb-4 rounded-xl border border-white/20 bg-black/35 p-3 text-xs text-white/80">
                  <p>Firebase projectId: {devProjectId}</p>
                  <p>
                    Emulators: {isUsingEmulators ? 'enabled' : 'disabled'}
                    {firestoreEmulatorHost ? ` (${firestoreEmulatorHost})` : ''}
                  </p>
                </div>
              ) : null}

              {storiesLoadState === 'loading' ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/75">
                  Loading Firestore content…
                </div>
              ) : null}

              {storiesError ? (
                <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-5 text-sm text-red-100">
                  {storiesError}
                </div>
              ) : null}

              {storiesLoadState === 'empty' || storiesLoadState === 'error' ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/75">
                  No published content found for {selectedArea.title}.
                </div>
              ) : null}

              {storiesLoadState === 'ready' && selectedAreaStories.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {selectedAreaStories.map((content) => {
                    const progressPercent = getStoryProgressPercent(content.id)

                    return (
                      <button
                        key={content.id}
                        type="button"
                        onClick={() => handleOpenContent(content, selectedAreaId)}
                        className="w-full cursor-pointer rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-left transition hover:border-[#D4AF37]/60"
                      >
                        <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[#F5D37A]">
                          {content.geo?.cities?.join(', ') || selectedArea.title}
                        </p>
                        <h4 className="mb-2 text-lg font-semibold">{content.title}</h4>
                        <p className="text-sm text-white/75">{content.description}</p>
                        <div className="mt-5 flex items-center justify-between gap-3">
                          <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-white/75">
                            {content.accessLevel}
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleOpenContent(content, selectedAreaId)
                            }}
                            aria-label={`Play ${content.title}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D4AF37]/55 bg-[#D4AF37]/12 text-[#F5D37A] transition hover:border-[#D4AF37] hover:bg-[#D4AF37]/20"
                          >
                            <Play className="h-4 w-4 fill-current" />
                          </button>
                        </div>
                        <div className="mt-3">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                            <div
                              className="h-full rounded-full bg-[#D4AF37] transition-[width] duration-300"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.11em] text-white/60">
                            Watched {Math.round(progressPercent)}%
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </section>

            <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold">{selectedArea.title} Narrative Arcs</h3>
                <p className="text-xs text-white/65">Location: {selectedCity || 'All / N/A'}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {activeNarrativeSections.map((section) => (
                  <article
                    key={section.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
                  >
                    <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[#F5D37A]">{section.format}</p>
                    <h4 className="mb-2 text-lg font-semibold">{section.title}</h4>
                    <p className="text-sm text-white/75">{section.summary}</p>
                    <div className="mt-5">
                      <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-white/75">
                        {section.availability}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold">{selectedArea.title} Role Avatars</h3>
                <button
                  type="button"
                  onClick={handlePlayRoleExplainer}
                  disabled={!selectedAreaRoleDoc?.explainerVideoUrl}
                  className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/55 bg-[#D4AF37]/12 px-3.5 py-1.5 text-xs font-semibold text-[#F5D37A] transition hover:border-[#D4AF37] hover:bg-[#D4AF37]/22 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Play Roles Overview
                </button>
              </div>

              <div className="mb-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/65">
                Role slots only. Participant names remain hidden here and are set through onboarding/dashboard flows.
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {selectedAreaRoles.map((role) => {
                  const initials = role.title
                    .split(' ')
                    .map((word) => word.charAt(0))
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                  return (
                    <article key={role.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                      <div className="mb-2 flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D4AF37]/45 bg-[#D4AF37]/15 text-sm font-semibold text-[#F5D37A]">
                          {initials}
                        </span>
                        <div>
                          <h4 className="text-sm font-semibold">{role.title}</h4>
                          <p className="text-[11px] uppercase tracking-[0.1em] text-white/60">Open Role Slot</p>
                        </div>
                      </div>
                      <p className="text-sm text-white/75">{role.description || 'Role description not provided.'}</p>
                    </article>
                  )
                })}
              </div>
            </section>

          </div>
        </div>
      ) : null}
    </div>
  )
}
