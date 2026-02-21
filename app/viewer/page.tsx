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
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
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
  sectionId: string
  title: string
  description: string
  thumbnailUrl?: string
  videoUrl: string
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
  accessLevel: 'open' | 'subscriber' | 'regional' | 'institution'
  geo?: {
    regions?: string[]
    states?: string[]
    cities?: string[]
  }
}

type ActiveVideo = {
  url: string
  title: string
  areaId: ViewerArea['id']
  overlayClass: string
  sectionId?: string
  contentId?: string
  sourceType?: 'area-default' | 'content' | 'role-explainer'
}

const placeholderVideoUrl = ''
const OVERLAY_RESTORE_DELAY_MS = 1600
const LOCAL_PROGRESS_STORAGE_KEY = 'viewer-content-progress'
const LOCAL_WATCHED_HISTORY_STORAGE_KEY = 'viewer-watched-history'
const LOCAL_LAST_ACTIVE_VIDEO_STORAGE_KEY = 'viewer-last-active-video'
const PROGRESS_SAVE_INTERVAL_MS = 1200

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

type ViewerIntent = 'subscriber' | 'student' | 'instructor' | 'partner'

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
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const progressSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedAreaId, setSelectedAreaId] = useState<ViewerArea['id']>('professional')
  const [activeVideo, setActiveVideo] = useState<ActiveVideo>({
    url: viewerAreas[0].videoUrl,
    title: viewerAreas[0].title,
    areaId: viewerAreas[0].id,
    overlayClass: viewerAreas[0].visual,
    sourceType: 'area-default',
  })
  const [isPlayerOverlayVisible, setIsPlayerOverlayVisible] = useState(true)
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [selectedCity, setSelectedCity] = useState('')
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [selectedAreaCatalog, setSelectedAreaCatalog] = useState<ViewerContent[]>([])
  const [selectedAreaStories, setSelectedAreaStories] = useState<ViewerContent[]>([])
  const [isStoriesLoading, setIsStoriesLoading] = useState(false)
  const [storiesError, setStoriesError] = useState<string | null>(null)
  const [contentProgress, setContentProgress] = useState<Record<string, ContentProgress>>({})
  const [watchedHistory, setWatchedHistory] = useState<WatchedHistoryItem[]>([])
  const [viewerIntent, setViewerIntent] = useState<ViewerIntent>('subscriber')
  const [partnerType, setPartnerType] = useState('Community Partner')
  const [showMoreInfo, setShowMoreInfo] = useState(false)
  const [isVideoPaused, setIsVideoPaused] = useState(false)
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(0.85)
  const [areaNewBadgeMap, setAreaNewBadgeMap] = useState<Record<string, boolean>>({})
  const [viewerAreaRolesMap, setViewerAreaRolesMap] = useState<Record<ViewerAreaId, ViewerAreaRolesDoc> | null>(null)
  const [hasRestoredLastActiveVideo, setHasRestoredLastActiveVideo] = useState(false)
  const [hasAutoSelectedInitialContent, setHasAutoSelectedInitialContent] = useState(false)
  const [moduleBannerVisible, setModuleBannerVisible] = useState(false)
  const [allPublishedContent, setAllPublishedContent] = useState<ViewerContent[]>([])

  const requestedAreaFilter = useMemo(() => {
    const area = searchParams.get('area')
    if (!area) return null
    return viewerAreas.some((item) => item.id === area) ? (area as ViewerAreaId) : null
  }, [searchParams])
  const moduleMode = searchParams.get('module') === '1'

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
  }, [hasRestoredLastActiveVideo])

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

  const selectedAreaRoles = useMemo<ViewerRoleTemplate[]>(() => {
    return selectedAreaRoleDoc?.roles ?? []
  }, [selectedAreaRoleDoc])

  const recentWatchedStories = useMemo(() => {
    return [...watchedHistory]
      .sort((a, b) => b.watchedAt - a.watchedAt)
      .slice(0, 5)
  }, [watchedHistory])

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
        url: selectedArea.videoUrl,
        title: selectedArea.title,
        areaId: selectedArea.id,
        overlayClass: selectedArea.visual,
        sourceType: 'area-default',
      }
    })
    setIsPlayerOverlayVisible(true)
  }, [selectedArea])

  useEffect(() => {
    if (!requestedAreaFilter || requestedAreaFilter === selectedAreaId) return
    const area = viewerAreas.find((item) => item.id === requestedAreaFilter)
    if (!area) return

    setSelectedAreaId(area.id)
    setActiveVideo({
      url: area.videoUrl,
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
    if (!db) return

    let mounted = true

    const loadAreaStories = async () => {
      setIsStoriesLoading(true)
      setStoriesError(null)

      try {
        const contentQuery = query(
          collection(db, 'viewerContent'),
          where('areaId', '==', selectedAreaId),
          where('isPublished', '==', true)
        )

        const snapshot = await getDocs(contentQuery)
        if (!mounted) return

        const catalog = snapshot.docs
          .map((item) => {
            const data = item.data() as Omit<ViewerContent, 'id'>
            return {
              id: item.id,
              ...data,
            } as ViewerContent
          })
          .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))

        setSelectedAreaCatalog(catalog)

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
        setStoriesError(`Unable to load ${selectedArea.title.toLowerCase()} stories right now.`)
        setSelectedAreaCatalog([])
        setSelectedAreaStories([])
        setAvailableCities([])
        setSelectedCity('')
      } finally {
        if (mounted) {
          setIsStoriesLoading(false)
        }
      }
    }

    loadAreaStories()

    return () => {
      mounted = false
    }
  }, [selectedAreaId, selectedArea.title])

  useEffect(() => {
    if (!db) return
    let mounted = true

    const loadAllPublishedContent = async () => {
      try {
        const snapshot = await getDocs(query(collection(db, 'viewerContent'), where('isPublished', '==', true)))
        if (!mounted) return
        const rows = snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ViewerContent, 'id'>) }))
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
    if (typeof window === 'undefined') return
    if (!activeVideo.url) return
    if (activeVideo.sourceType === 'area-default' && !activeVideo.contentId) return
    window.localStorage.setItem(LOCAL_LAST_ACTIVE_VIDEO_STORAGE_KEY, JSON.stringify(activeVideo))
  }, [activeVideo])

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
    if (activeVideo.sourceType && activeVideo.sourceType !== 'area-default') {
      setHasAutoSelectedInitialContent(true)
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

  async function handleOpenContent(content: ViewerContent, areaId: ViewerArea['id']) {
    const area = viewerAreas.find((item) => item.id === areaId)
    const fallbackOverlay = area?.visual ?? viewerAreas[0].visual

    setActiveVideo({
      url: content.videoUrl,
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
    setIsMuted(false)
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
    setIsMuted(false)
    setVolume((current) => (current > 0 ? current : 0.85))
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
            className="absolute inset-0 h-full w-full object-cover"
            src={activeVideo.url}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            onLoadedMetadata={(event) => {
              const element = event.currentTarget
              setVideoDuration(Number.isFinite(element.duration) ? element.duration : 0)
              setCurrentPlaybackTime(element.currentTime || 0)
              setIsVideoPaused(element.paused)
              setVolume(element.volume)
              setIsMuted(element.muted)
              saveCurrentVideoProgress()
            }}
            onTimeUpdate={(event) => {
              setCurrentPlaybackTime(event.currentTarget.currentTime || 0)
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
          />
        ) : null}

        <div
          className={`absolute inset-0 bg-gradient-to-br ${activeVideo.overlayClass} transition-opacity duration-500 ${
            isPlayerOverlayVisible ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div
          className={`absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.16),transparent_42%),radial-gradient(circle_at_80%_10%,rgba(212,175,55,0.22),transparent_35%)] backdrop-blur-[2px] transition-opacity duration-500 ${
            isPlayerOverlayVisible ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <div
          className={`relative mx-auto flex h-full w-full max-w-7xl flex-col justify-end px-4 pb-6 pt-8 transition-opacity duration-500 sm:px-6 lg:px-8 md:justify-between md:py-8 ${
            isPlayerOverlayVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <div className="absolute right-4 top-8 sm:right-6 lg:right-8 md:static md:flex md:justify-end">
            <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-black/35 p-3 text-white md:w-[360px]">
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
                <div className="mt-3 flex items-center gap-3">
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
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={(event) => handleVolumeChange(Number(event.target.value))}
                    className="w-36 accent-[#D4AF37]"
                  />
                  <select
                    value={viewerIntent}
                    onChange={(event) => setViewerIntent(event.target.value as ViewerIntent)}
                    className="rounded-lg border border-white/20 bg-black/35 px-3 py-1.5 text-xs text-white outline-none focus:border-[#D4AF37]"
                  >
                    <option value="subscriber">Subscriber</option>
                    <option value="student">Student Learner</option>
                    <option value="instructor">Institutional Instructor</option>
                    <option value="partner">Partner</option>
                  </select>
                  {viewerIntent === 'partner' ? (
                    <select
                      value={partnerType}
                      onChange={(event) => setPartnerType(event.target.value)}
                      className="rounded-lg border border-white/20 bg-black/35 px-3 py-1.5 text-xs text-white outline-none focus:border-[#D4AF37]"
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
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

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
                {requestedAreaFilter ? (
                  <div className="flex items-center gap-2">
                    <p className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#F5D37A]">
                      Filtered Module: {requestedAreaFilter}
                    </p>
                    <button
                      type="button"
                      onClick={() => setAreaFilterInUrl(null)}
                      className="rounded-full border border-white/25 bg-black/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white transition hover:border-[#D4AF37] hover:text-[#F5D37A]"
                    >
                      Show All Areas
                    </button>
                  </div>
                ) : (
                  <p className="text-xs uppercase tracking-[0.14em] text-white/60">Streaming Home Rail</p>
                )}
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
                          url: area.videoUrl,
                          title: area.title,
                          areaId: area.id,
                          overlayClass: area.visual,
                          sourceType: 'area-default',
                        })
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

              {isStoriesLoading ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/75">
                  Loading stories...
                </div>
              ) : null}

              {storiesError ? (
                <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-5 text-sm text-red-100">
                  {storiesError}
                </div>
              ) : null}

              {!isStoriesLoading && !storiesError && selectedAreaStories.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/75">
                  No stories are published for {selectedArea.title} yet.
                </div>
              ) : null}

              {!isStoriesLoading && !storiesError && selectedAreaStories.length > 0 ? (
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
                {selectedArea.sections.map((section) => (
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
