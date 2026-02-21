'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { CheckCircle2, ChevronDown, ChevronUp, Copy, Plus, RefreshCw, Save, Search, Trash2, Video, X } from 'lucide-react'
import { auth, db } from '@/lib/firebase'
import { DEFAULT_VIEWER_AREA_ROLE_TEMPLATES } from '@/lib/config/viewerRoleTemplates'

type AccessLevel = 'open' | 'subscriber' | 'regional' | 'institution'

type ViewerEntry = {
  id: string
  areaId: string
  sectionId: string
  title: string
  description: string
  videoUrl: string
  hlsUrl?: string
  thumbnailUrl?: string
  accessLevel: AccessLevel
  isPublished: boolean
  sortOrder: number
  geo?: {
    regions?: string[]
    states?: string[]
    cities?: string[]
  }
  institutions?: string[]
  participants?: string[]
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
  submissionSessionId?: string
  submissionDisplayName?: string
  status?: 'open' | 'archived'
}

type BookingRequest = {
  id: string
  userId: string
  date: string
  location: string
  instrumentation: string
  status: string
  creditsUsed?: number
  createdAt?: unknown
}

type ViewerSectionDoc = {
  id: string
  areaId: string
  title: string
  format: string
  summary: string
  availability: 'open' | 'subscriber' | 'regional' | 'institution'
  order: number
  active: boolean
}

type ViewerAreaOptionDoc = {
  id: string
  title: string
  order: number
  active: boolean
}

type Props = {
  mode: 'admin' | 'participant'
  scope?: 'all' | 'mine'
}

type MetadataCategory = 'cities' | 'states' | 'regions'

type MetadataOptionItem = {
  value: string
  label: string
  active: boolean
  order: number
}

type MetadataOptionsMap = Record<MetadataCategory, MetadataOptionItem[]>

type SubmissionGuideFocus = 'entries' | 'form_core' | 'form_meta' | 'submit'

type SubmissionGuideStep = {
  id: string
  title: string
  description: string
  focus: SubmissionGuideFocus
}

type FormState = {
  submissionDisplayName: string
  areaId: string
  sectionId: string
  title: string
  description: string
  videoUrl: string
  hlsUrl: string
  thumbnailUrl: string
  accessLevel: AccessLevel
  isPublished: boolean
  sortOrder: number
  regions: string
  states: string
  cities: string
  institutions: string
  participants: string
  institutionName: string
  recordedAt: string
  researchStatus: string
  participantNames: string
  relatedVersionIds: string
  infoUrl: string
  status: 'open' | 'archived'
  isNew: boolean
  confirmed: boolean
}

type DeleteTarget = Pick<ViewerEntry, 'id' | 'title'>

type CloneTarget = Pick<ViewerEntry, 'id' | 'title' | 'areaId' | 'sectionId'> & {
  source: ViewerEntry
}

const DEFAULT_FORM: FormState = {
  submissionDisplayName: '',
  areaId: 'community',
  sectionId: 'community-lead',
  title: '',
  description: '',
  videoUrl: '',
  hlsUrl: '',
  thumbnailUrl: '',
  accessLevel: 'open',
  isPublished: true,
  sortOrder: 1,
  regions: '',
  states: '',
  cities: '',
  institutions: '',
  participants: '',
  institutionName: '',
  recordedAt: '',
  researchStatus: '',
  participantNames: '',
  relatedVersionIds: '',
  infoUrl: '',
  status: 'open',
  isNew: true,
  confirmed: false,
}

const SUBMISSION_GUIDE_DISABLED_KEY = 'guide-disabled:viewer-submissions'
const SUBMISSION_GUIDE_HIGHLIGHT_MS = 1400
const VIEWER_SUBMISSION_SESSION_KEY = 'viewer-submission-session-id'

const PARTICIPANT_SUBMISSION_GUIDE_STEPS: SubmissionGuideStep[] = [
  {
    id: 'submission-step-1',
    title: 'Review Existing Entries',
    description: 'Use Current Entries to see what is already submitted before adding new material.',
    focus: 'entries',
  },
  {
    id: 'submission-step-2',
    title: 'Complete Core Fields',
    description: 'Fill areaId, sectionId, title, description, and videoUrl to map the story correctly in Viewer.',
    focus: 'form_core',
  },
  {
    id: 'submission-step-3',
    title: 'Add Metadata For Placement',
    description: 'Use city/state/region and institutional metadata so frontend placement and filtering are accurate.',
    focus: 'form_meta',
  },
  {
    id: 'submission-step-4',
    title: 'Submit To Firestore',
    description: 'Add Entry writes the submission so it can be represented in Viewer and edited later.',
    focus: 'submit',
  },
]

function parseCsv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function toCsv(value?: string[]): string {
  return (value ?? []).join(', ')
}

function toMillis(value: unknown): number {
  if (!value) return 0
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'object' && value !== null) {
    const maybeTimestamp = value as { toMillis?: () => number; seconds?: number }
    if (typeof maybeTimestamp.toMillis === 'function') {
      return maybeTimestamp.toMillis()
    }
    if (typeof maybeTimestamp.seconds === 'number') {
      return maybeTimestamp.seconds * 1000
    }
  }
  return 0
}

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function createSessionId(): string {
  return `sess_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}

function normalizeMetadataOptions(value: unknown): MetadataOptionItem[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null
      const entry = item as Partial<MetadataOptionItem>
      const rawValue = typeof entry.value === 'string' ? entry.value.trim() : ''
      if (!rawValue) return null
      return {
        value: rawValue,
        label: typeof entry.label === 'string' && entry.label.trim() ? entry.label.trim() : rawValue,
        active: entry.active !== false,
        order: Number.isFinite(entry.order) ? Number(entry.order) : index + 1,
      }
    })
    .filter((item): item is MetadataOptionItem => Boolean(item))
    .sort((a, b) => a.order - b.order)
}

export default function ViewerEntryManager({ mode, scope = 'all' }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [entries, setEntries] = useState<ViewerEntry[]>([])
  const [bookings, setBookings] = useState<BookingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteCheckboxConfirmed, setDeleteCheckboxConfirmed] = useState(false)
  const [cloneTarget, setCloneTarget] = useState<CloneTarget | null>(null)
  const [cloneTitle, setCloneTitle] = useState('')
  const [cloneAreaId, setCloneAreaId] = useState('')
  const [cloneSectionId, setCloneSectionId] = useState('')
  const [cloneCopyMediaUrls, setCloneCopyMediaUrls] = useState(true)
  const [cloneCopyAdvancedMetadata, setCloneCopyAdvancedMetadata] = useState(true)
  const [cloneCopyPublishingFlags, setCloneCopyPublishingFlags] = useState(false)
  const [cloneError, setCloneError] = useState<string | null>(null)
  const [isCloning, setIsCloning] = useState(false)
  const [entriesSearch, setEntriesSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [sectionOpen, setSectionOpen] = useState({
    required: true,
    media: true,
    publishing: false,
    advanced: false,
  })
  const [submissionGuideOpen, setSubmissionGuideOpen] = useState(false)
  const [submissionGuideDisabled, setSubmissionGuideDisabled] = useState(false)
  const [submissionGuideIndex, setSubmissionGuideIndex] = useState(0)
  const [focusCooling, setFocusCooling] = useState(false)
  const [sections, setSections] = useState<ViewerSectionDoc[]>([])
  const [areas, setAreas] = useState<ViewerAreaOptionDoc[]>([])
  const [sectionId, setSectionId] = useState('')
  const [sectionForm, setSectionForm] = useState<Omit<ViewerSectionDoc, 'id'>>({
    areaId: 'community',
    title: '',
    format: '',
    summary: '',
    availability: 'open',
    order: 1,
    active: true,
  })
  const [sectionSaving, setSectionSaving] = useState(false)
  const [areaOptionId, setAreaOptionId] = useState('')
  const [areaOptionForm, setAreaOptionForm] = useState<Omit<ViewerAreaOptionDoc, 'id'>>({
    title: '',
    order: 1,
    active: true,
  })
  const [areaOptionSlug, setAreaOptionSlug] = useState('')
  const [areaOptionSaving, setAreaOptionSaving] = useState(false)
  const [submissionSessionId, setSubmissionSessionId] = useState('')
  const [metadataOptions, setMetadataOptions] = useState<MetadataOptionsMap>({
    cities: [],
    states: [],
    regions: [],
  })
  const [metadataCategory, setMetadataCategory] = useState<MetadataCategory>('cities')
  const [metadataOptionValue, setMetadataOptionValue] = useState('')
  const [metadataOptionLabel, setMetadataOptionLabel] = useState('')
  const [metadataOptionSaving, setMetadataOptionSaving] = useState(false)
  const [customCity, setCustomCity] = useState('')
  const [customState, setCustomState] = useState('')
  const [customRegion, setCustomRegion] = useState('')
  const [claimedSessionOwnership, setClaimedSessionOwnership] = useState(false)

  const canManageAll = mode === 'admin'
  const mineOnly = mode === 'participant' && scope === 'mine'
  const guideStep = PARTICIPANT_SUBMISSION_GUIDE_STEPS[submissionGuideIndex] ?? null

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedId) ?? null,
    [entries, selectedId]
  )

  const filteredEntries = useMemo(() => {
    const queryText = entriesSearch.trim().toLowerCase()
    if (!queryText) return entries
    return entries.filter((entry) => {
      const haystack = [
        entry.id,
        entry.title,
        entry.description,
        entry.areaId,
        entry.sectionId,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(queryText)
    })
  }, [entries, entriesSearch])

  const areaOptions = useMemo(() => {
    const values = new Set(entries.map((entry) => entry.areaId).filter(Boolean))
    if (cloneTarget?.areaId) values.add(cloneTarget.areaId)
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [cloneTarget?.areaId, entries])

  const sectionOptions = useMemo(() => {
    const values = new Set(
      entries
        .filter((entry) => !cloneAreaId || entry.areaId === cloneAreaId)
        .map((entry) => entry.sectionId)
        .filter(Boolean),
    )
    if (cloneTarget?.sectionId) values.add(cloneTarget.sectionId)
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [cloneAreaId, cloneTarget?.sectionId, entries])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const fromQuery = searchParams.get('sid')?.trim() ?? ''
    const fromStorage = window.localStorage.getItem(VIEWER_SUBMISSION_SESSION_KEY)?.trim() ?? ''
    const next = fromQuery || fromStorage || createSessionId()
    window.localStorage.setItem(VIEWER_SUBMISSION_SESSION_KEY, next)
    setSubmissionSessionId(next)
  }, [searchParams])

  useEffect(() => {
    const displayName = auth?.currentUser?.displayName?.trim() ?? ''
    if (!displayName) return
    setForm((prev) => (prev.submissionDisplayName ? prev : { ...prev, submissionDisplayName: displayName }))
  }, [auth?.currentUser?.displayName])

  const formAreaOptions = useMemo(() => {
    const labels = new Map<string, string>()
    Object.keys(DEFAULT_VIEWER_AREA_ROLE_TEMPLATES).forEach((id) => labels.set(id, id))
    areas.forEach((area) => labels.set(area.id, area.title || area.id))
    sections.forEach((section) => {
      if (!labels.has(section.areaId)) labels.set(section.areaId, section.areaId)
    })
    entries.forEach((entry) => {
      if (entry.areaId && !labels.has(entry.areaId)) labels.set(entry.areaId, entry.areaId)
    })
    if (form.areaId && !labels.has(form.areaId)) labels.set(form.areaId, form.areaId)
    return Array.from(labels.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [areas, entries, form.areaId, sections])

  const formSectionOptions = useMemo(() => {
    const options = new Map<string, string>()
    sections
      .filter((section) => section.areaId === form.areaId)
      .forEach((section) => options.set(section.id, section.title || section.id))
    entries
      .filter((entry) => entry.areaId === form.areaId && Boolean(entry.sectionId))
      .forEach((entry) => {
        if (!options.has(entry.sectionId)) options.set(entry.sectionId, entry.sectionId)
      })
    if (form.sectionId && !options.has(form.sectionId)) {
      options.set(form.sectionId, form.sectionId)
    }
    return Array.from(options.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [entries, form.areaId, form.sectionId, sections])

  const loadData = async () => {
    if (!db) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      let rows: ViewerEntry[] = []
      if (canManageAll) {
        const snapshot = await getDocs(query(collection(db, 'viewerContent')))
        rows = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<ViewerEntry, 'id'>) }))
      } else {
        const publishedSnapshot = await getDocs(query(collection(db, 'viewerContent'), where('isPublished', '==', true)))
        const ownDocs = auth?.currentUser
          ? (await getDocs(query(collection(db, 'viewerContent'), where('createdByUid', '==', auth.currentUser.uid)))).docs
          : []
        const byId = new Map<string, ViewerEntry>()
        publishedSnapshot.docs.forEach((docSnap) => {
          byId.set(docSnap.id, { id: docSnap.id, ...(docSnap.data() as Omit<ViewerEntry, 'id'>) })
        })
        ownDocs.forEach((docSnap) => {
          byId.set(docSnap.id, { id: docSnap.id, ...(docSnap.data() as Omit<ViewerEntry, 'id'>) })
        })
        rows = Array.from(byId.values())
      }

      if (mineOnly) {
        rows = rows.filter((entry) => entry.createdByUid === auth?.currentUser?.uid || (entry as any).submissionSessionId === submissionSessionId)
      }

      rows = rows
        .sort((a, b) => {
          const updatedDelta = toMillis((b as any).updatedAt) - toMillis((a as any).updatedAt)
          if (updatedDelta !== 0) return updatedDelta
          return toMillis((b as any).createdAt) - toMillis((a as any).createdAt)
        })
      setEntries(rows)

      const areasSnapshot = await getDocs(query(collection(db, 'viewerAreas'), where('active', '==', true)))
      const areaRows = areasSnapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<ViewerAreaOptionDoc, 'id'>),
        }))
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      setAreas(areaRows)

      const sectionsSnapshot = await getDocs(query(collection(db, 'viewerSections'), where('active', '==', true)))
      const sectionRows = sectionsSnapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<ViewerSectionDoc, 'id'>),
        }))
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      setSections(sectionRows)

      const metadataCategories: MetadataCategory[] = ['cities', 'states', 'regions']
      const metadataPairs = await Promise.all(
        metadataCategories.map(async (category) => {
          const snap = await getDocs(query(collection(db, 'viewerMetadataOptions'), where('category', '==', category)))
          const firstDoc = snap.docs[0]
          return [category, normalizeMetadataOptions(firstDoc?.data()?.options)] as const
        }),
      )
      const nextMetadata: MetadataOptionsMap = { cities: [], states: [], regions: [] }
      metadataPairs.forEach(([category, options]) => {
        nextMetadata[category] = options
      })
      setMetadataOptions(nextMetadata)

      if (canManageAll) {
        const bookingsQuery = query(collection(db, 'bookingRequests'), orderBy('createdAt', 'desc'), limit(50))
        const bookingsSnapshot = await getDocs(bookingsQuery)
        const bookingRows = bookingsSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<BookingRequest, 'id'>),
        }))
        setBookings(bookingRows)
      }
    } catch (error) {
      console.error('Error loading viewer manager data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (mode === 'participant' && !submissionSessionId) return
    void loadData()
  }, [canManageAll, mineOnly, mode, submissionSessionId])

  useEffect(() => {
    if (mode !== 'participant') return
    if (!db || !submissionSessionId || claimedSessionOwnership) return
    const currentUser = auth?.currentUser
    if (!currentUser) return

    let active = true
    const claim = async () => {
      try {
        const snapshot = await getDocs(
          query(collection(db, 'viewerContent'), where('submissionSessionId', '==', submissionSessionId)),
        )
        if (!active) return
        const toClaim = snapshot.docs.filter((docSnap) => {
          const data = docSnap.data() as Partial<ViewerEntry>
          return !data.createdByUid
        })
        if (toClaim.length === 0) {
          setClaimedSessionOwnership(true)
          return
        }
        await Promise.all(
          toClaim.map((docSnap) =>
            updateDoc(doc(db, 'viewerContent', docSnap.id), {
              createdByUid: currentUser.uid,
              claimedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }),
          ),
        )
        setClaimedSessionOwnership(true)
        await loadData()
      } catch (error) {
        console.error('Error claiming pre-account submissions:', error)
      }
    }

    void claim()
    return () => {
      active = false
    }
  }, [claimedSessionOwnership, mode, submissionSessionId])

  useEffect(() => {
    if (mode !== 'participant') return
    if (typeof window === 'undefined') return
    const disabled = window.localStorage.getItem(SUBMISSION_GUIDE_DISABLED_KEY) === '1'
    setSubmissionGuideDisabled(disabled)
    setSubmissionGuideOpen(!disabled)
  }, [mode])

  useEffect(() => {
    if (mode !== 'participant') return
    if (!submissionGuideOpen) return
    setFocusCooling(true)
    const timer = setTimeout(() => setFocusCooling(false), SUBMISSION_GUIDE_HIGHLIGHT_MS)
    return () => clearTimeout(timer)
  }, [mode, submissionGuideOpen, submissionGuideIndex])

  useEffect(() => {
    if (!form.areaId) return
    if (formSectionOptions.length === 0) return
    const exists = formSectionOptions.some((option) => option.id === form.sectionId)
    if (!exists) {
      setForm((prev) => ({ ...prev, sectionId: formSectionOptions[0].id }))
    }
  }, [form.areaId, form.sectionId, formSectionOptions])

  const sectionHighlightClass = (focus: SubmissionGuideFocus) => {
    if (mode !== 'participant') return ''
    if (!submissionGuideOpen) return ''
    if (guideStep?.focus !== focus) return ''
    return 'ring-2 ring-[#D4AF37]/70 shadow-[0_0_0_2px_rgba(212,175,55,0.25)]'
  }

  const selectEntry = (entry: ViewerEntry) => {
    setSelectedId(entry.id)
    setForm({
      submissionDisplayName: entry.submissionDisplayName ?? '',
      areaId: entry.areaId,
      sectionId: entry.sectionId,
      title: entry.title,
      description: entry.description,
      videoUrl: entry.videoUrl,
      hlsUrl: entry.hlsUrl ?? '',
      thumbnailUrl: entry.thumbnailUrl ?? '',
      accessLevel: entry.accessLevel,
      isPublished: entry.isPublished,
      sortOrder: entry.sortOrder ?? 1,
      regions: toCsv(entry.geo?.regions),
      states: toCsv(entry.geo?.states),
      cities: toCsv(entry.geo?.cities),
      institutions: toCsv(entry.institutions),
      participants: toCsv(entry.participants),
      institutionName: entry.institutionName ?? '',
      recordedAt: entry.recordedAt ?? '',
      researchStatus: entry.researchStatus ?? '',
      participantNames: toCsv(entry.participantNames),
      relatedVersionIds: toCsv(entry.relatedVersionIds),
      infoUrl: entry.infoUrl ?? '',
      status: (entry as any).status === 'archived' ? 'archived' : 'open',
      isNew: entry.isNew ?? false,
      confirmed: entry.confirmed ?? false,
    })
  }

  const clearForm = () => {
    setSelectedId(null)
    setForm((prev) => ({ ...DEFAULT_FORM, submissionDisplayName: auth?.currentUser?.displayName?.trim() ?? prev.submissionDisplayName }))
    setSubmitError(null)
    setSubmitSuccess(null)
  }

  const toPayload = () => {
    const participantManaged = mode === 'participant'
    const forcedConfirmed = participantManaged ? true : form.confirmed
    return {
      areaId: form.areaId,
      sectionId: form.sectionId,
      title: form.title.trim(),
      description: form.description.trim(),
      videoUrl: form.videoUrl.trim(),
      hlsUrl: form.hlsUrl.trim(),
      thumbnailUrl: form.thumbnailUrl.trim(),
      accessLevel: participantManaged ? 'open' : form.accessLevel,
      isPublished: participantManaged ? true : form.isPublished,
      sortOrder: Number.isFinite(form.sortOrder) ? form.sortOrder : 1,
      geo: {
        regions: parseCsv(form.regions),
        states: parseCsv(form.states),
        cities: parseCsv(form.cities),
      },
      institutions: parseCsv(form.institutions),
      participants: parseCsv(form.participants),
      institutionName: form.institutionName.trim(),
      recordedAt: form.recordedAt.trim(),
      researchStatus: form.researchStatus.trim(),
      participantNames: parseCsv(form.participantNames),
      relatedVersionIds: parseCsv(form.relatedVersionIds),
      infoUrl: form.infoUrl.trim(),
      status: participantManaged ? 'open' : form.status,
      isNew: form.isNew,
      confirmed: forcedConfirmed,
      confirmedAt: forcedConfirmed ? new Date().toISOString() : '',
      createdByUid: selectedEntry?.createdByUid ?? auth?.currentUser?.uid ?? '',
      submissionDisplayName: form.submissionDisplayName.trim(),
      submissionSessionId,
      updatedAt: serverTimestamp(),
    }
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!db) {
      setSubmitError('Database is not initialized in this environment.')
      return
    }
    setSubmitError(null)
    setSubmitSuccess(null)

    if (!form.title.trim() || !form.description.trim() || !form.areaId.trim() || !form.sectionId.trim()) {
      setSubmitError('Required fields missing: areaId, sectionId, title, and description are all required.')
      return
    }
    if (!auth?.currentUser && !form.submissionDisplayName.trim()) {
      setSubmitError('Name is required before account creation so your submissions can be tracked.')
      return
    }

    setSaving(true)
    try {
      const payload = toPayload()
      if (selectedId) {
        await updateDoc(doc(db, 'viewerContent', selectedId), { ...payload, isNew: true })
      } else {
        await addDoc(collection(db, 'viewerContent'), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isNew: true,
        })
      }
      await loadData()
      clearForm()
      setSubmitSuccess(selectedId ? 'Entry updated successfully.' : 'Entry added successfully.')
      if (mode === 'participant') {
        router.push(`/studio/viewer-submissions/mine?sid=${encodeURIComponent(submissionSessionId)}`)
      }
    } catch (error) {
      console.error('Error saving viewer entry:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      setSubmitError(`Save failed: ${message}`)
    } finally {
      setSaving(false)
    }
  }

  const confirmEntry = async (entryId: string) => {
    if (!db) return
    try {
      await updateDoc(doc(db, 'viewerContent', entryId), {
        confirmed: true,
        confirmedAt: new Date().toISOString(),
        isNew: true,
        updatedAt: serverTimestamp(),
      })
      await loadData()
    } catch (error) {
      console.error('Error confirming entry:', error)
    }
  }

  const resetDeleteModal = () => {
    setDeleteTarget(null)
    setDeleteConfirmText('')
    setDeleteCheckboxConfirmed(false)
    setDeleteError(null)
  }

  const openCloneModal = (entry: ViewerEntry) => {
    setCloneTarget({
      id: entry.id,
      title: entry.title,
      areaId: entry.areaId,
      sectionId: entry.sectionId,
      source: entry,
    })
    setCloneTitle(`Copy of ${entry.title}`)
    setCloneAreaId(entry.areaId)
    setCloneSectionId(entry.sectionId)
    setCloneCopyMediaUrls(true)
    setCloneCopyAdvancedMetadata(true)
    setCloneCopyPublishingFlags(false)
    setCloneError(null)
  }

  const resetCloneModal = () => {
    setCloneTarget(null)
    setCloneTitle('')
    setCloneAreaId('')
    setCloneSectionId('')
    setCloneCopyMediaUrls(true)
    setCloneCopyAdvancedMetadata(true)
    setCloneCopyPublishingFlags(false)
    setCloneError(null)
  }

  const toggleFormSection = (section: 'required' | 'media' | 'publishing' | 'advanced') => {
    setSectionOpen((current) => ({ ...current, [section]: !current[section] }))
  }

  const pickSection = (item: ViewerSectionDoc) => {
    setSectionId(item.id)
    setSectionForm({
      areaId: item.areaId,
      title: item.title,
      format: item.format,
      summary: item.summary,
      availability: item.availability,
      order: item.order,
      active: item.active,
    })
  }

  const clearSectionForm = () => {
    setSectionId('')
    setSectionForm({
      areaId: 'community',
      title: '',
      format: '',
      summary: '',
      availability: 'open',
      order: 1,
      active: true,
    })
  }

  const pickAreaOption = (item: ViewerAreaOptionDoc) => {
    setAreaOptionId(item.id)
    setAreaOptionSlug(item.id)
    setAreaOptionForm({
      title: item.title ?? item.id,
      order: item.order ?? 1,
      active: item.active ?? true,
    })
  }

  const clearAreaOptionForm = () => {
    setAreaOptionId('')
    setAreaOptionSlug('')
    setAreaOptionForm({
      title: '',
      order: 1,
      active: true,
    })
  }

  const saveAreaOption = async () => {
    if (!db || !canManageAll) return
    const nextSlug = toSlug(areaOptionSlug)
    if (!nextSlug || !areaOptionForm.title.trim()) return

    setAreaOptionSaving(true)
    try {
      const nextData = {
        title: areaOptionForm.title.trim(),
        order: Number.isFinite(areaOptionForm.order) ? areaOptionForm.order : 1,
        active: areaOptionForm.active,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }
      await setDoc(doc(db, 'viewerAreas', nextSlug), nextData, { merge: true })
      if (areaOptionId && areaOptionId !== nextSlug) {
        await deleteDoc(doc(db, 'viewerAreas', areaOptionId))
      }
      await loadData()
      clearAreaOptionForm()
    } catch (error) {
      console.error('Error saving viewer area option:', error)
    } finally {
      setAreaOptionSaving(false)
    }
  }

  const removeAreaOption = async () => {
    if (!db || !canManageAll || !areaOptionId) return
    try {
      await deleteDoc(doc(db, 'viewerAreas', areaOptionId))
      await loadData()
      clearAreaOptionForm()
    } catch (error) {
      console.error('Error removing viewer area option:', error)
    }
  }

  const saveSection = async () => {
    if (!db || !canManageAll) return
    if (!sectionForm.areaId.trim() || !sectionForm.title.trim()) return
    setSectionSaving(true)
    try {
      const targetRef = sectionId
        ? doc(db, 'viewerSections', sectionId)
        : doc(collection(db, 'viewerSections'))
      await setDoc(
        targetRef,
        {
          ...sectionForm,
          areaId: sectionForm.areaId.trim(),
          title: sectionForm.title.trim(),
          format: sectionForm.format.trim(),
          summary: sectionForm.summary.trim(),
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      )
      await loadData()
      clearSectionForm()
    } catch (error) {
      console.error('Error saving viewer section:', error)
    } finally {
      setSectionSaving(false)
    }
  }

  const removeSection = async () => {
    if (!db || !canManageAll || !sectionId) return
    try {
      await deleteDoc(doc(db, 'viewerSections', sectionId))
      await loadData()
      clearSectionForm()
    } catch (error) {
      console.error('Error removing viewer section:', error)
    }
  }

  const addCsvToken = (field: 'cities' | 'states' | 'regions', raw: string) => {
    const token = raw.trim()
    if (!token) return
    setForm((prev) => {
      const current = parseCsv(prev[field])
      if (current.some((item) => item.toLowerCase() === token.toLowerCase())) return prev
      return { ...prev, [field]: [...current, token].join(', ') }
    })
  }

  const removeCsvToken = (field: 'cities' | 'states' | 'regions', token: string) => {
    setForm((prev) => {
      const next = parseCsv(prev[field]).filter((item) => item.toLowerCase() !== token.toLowerCase())
      return { ...prev, [field]: next.join(', ') }
    })
  }

  const suggestMetadataOption = async (category: MetadataCategory, raw: string) => {
    const value = raw.trim()
    if (!value || !db) return
    addCsvToken(category, value)
    if (category === 'cities') setCustomCity('')
    if (category === 'states') setCustomState('')
    if (category === 'regions') setCustomRegion('')

    try {
      await addDoc(collection(db, 'viewerMetadataSuggestions'), {
        category,
        value,
        createdByUid: auth?.currentUser?.uid ?? '',
        submissionSessionId,
        status: 'pending',
        createdAt: serverTimestamp(),
      })
    } catch (error) {
      console.error('Error suggesting metadata option:', error)
    }
  }

  const saveMetadataOption = async () => {
    if (!db || !canManageAll) return
    const value = metadataOptionValue.trim()
    const label = metadataOptionLabel.trim() || value
    if (!value) return

    setMetadataOptionSaving(true)
    try {
      const current = metadataOptions[metadataCategory]
      const exists = current.some((item) => item.value.toLowerCase() === value.toLowerCase())
      const next = exists
        ? current.map((item) =>
            item.value.toLowerCase() === value.toLowerCase()
              ? { ...item, label, active: true }
              : item,
          )
        : [...current, { value, label, active: true, order: current.length + 1 }]
      await setDoc(
        doc(db, 'viewerMetadataOptions', metadataCategory),
        {
          category: metadataCategory,
          options: next,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
      setMetadataOptionValue('')
      setMetadataOptionLabel('')
      await loadData()
    } catch (error) {
      console.error('Error saving metadata option:', error)
    } finally {
      setMetadataOptionSaving(false)
    }
  }

  const removeMetadataOption = async (category: MetadataCategory, value: string) => {
    if (!db || !canManageAll) return
    try {
      const next = metadataOptions[category].filter((item) => item.value !== value)
      await setDoc(
        doc(db, 'viewerMetadataOptions', category),
        {
          category,
          options: next,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
      await loadData()
    } catch (error) {
      console.error('Error removing metadata option:', error)
    }
  }

  const confirmDeleteEntry = async () => {
    if (!db || !deleteTarget) return
    setDeleteError(null)
    setIsDeleting(true)
    try {
      await deleteDoc(doc(db, 'viewerContent', deleteTarget.id))
      // TODO: In a follow-up step, also delete any associated Storage assets (video/thumbnail) safely.
      setEntries((current) => current.filter((entry) => entry.id !== deleteTarget.id))
      if (selectedId === deleteTarget.id) {
        clearForm()
      }
      resetDeleteModal()
    } catch (error) {
      console.error('Error deleting viewer entry:', error)
      setDeleteError('Delete failed. Verify permissions and try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const confirmCloneEntry = async () => {
    if (!db || !cloneTarget) return

    const nextTitle = cloneTitle.trim()
    const nextAreaId = cloneAreaId.trim()
    const nextSectionId = cloneSectionId.trim()
    if (!nextTitle || !nextAreaId || !nextSectionId) {
      setCloneError('Title, area, and section are required to clone.')
      return
    }

    setIsCloning(true)
    setCloneError(null)
    try {
      const source = cloneTarget.source
      const cloneRef = doc(collection(db, 'viewerContent'))

      const payload: Record<string, unknown> = {
        title: nextTitle,
        areaId: nextAreaId,
        sectionId: nextSectionId,
        description: source.description ?? '',
        videoUrl: cloneCopyMediaUrls ? source.videoUrl ?? '' : '',
        hlsUrl: cloneCopyMediaUrls ? source.hlsUrl ?? '' : '',
        thumbnailUrl: cloneCopyMediaUrls ? source.thumbnailUrl ?? '' : '',
        institutionName: source.institutionName ?? '',
        recordedAt: source.recordedAt ?? '',
        createdByUid: source.createdByUid ?? '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      if (cloneCopyAdvancedMetadata) {
        payload.geo = source.geo ?? { regions: [], states: [], cities: [] }
        payload.institutions = source.institutions ?? []
        payload.participants = source.participants ?? []
        payload.participantNames = source.participantNames ?? []
        payload.relatedVersionIds = source.relatedVersionIds ?? []
        payload.infoUrl = source.infoUrl ?? ''
        payload.researchStatus = source.researchStatus ?? ''
      } else {
        payload.geo = { regions: [], states: [], cities: [] }
        payload.institutions = []
        payload.participants = []
        payload.participantNames = []
        payload.relatedVersionIds = []
        payload.infoUrl = ''
        payload.researchStatus = ''
      }

      if (cloneCopyPublishingFlags) {
        payload.status = source.status ?? 'open'
        payload.isPublished = source.isPublished ?? false
        payload.confirmed = source.confirmed ?? false
        payload.isNew = source.isNew ?? false
        payload.sortOrder = Number.isFinite(source.sortOrder) ? source.sortOrder : 0
        payload.accessLevel = source.accessLevel ?? 'open'
        payload.confirmedAt = source.confirmedAt ?? ''
      } else {
        payload.status = 'open'
        payload.isPublished = false
        payload.confirmed = false
        payload.isNew = true
        payload.sortOrder = 0
        payload.accessLevel = 'open'
        payload.confirmedAt = ''
      }

      await setDoc(cloneRef, payload)

      const optimisticEntry: ViewerEntry = {
        id: cloneRef.id,
        title: nextTitle,
        areaId: nextAreaId,
        sectionId: nextSectionId,
        description: String(payload.description ?? ''),
        videoUrl: String(payload.videoUrl ?? ''),
        hlsUrl: String(payload.hlsUrl ?? ''),
        thumbnailUrl: String(payload.thumbnailUrl ?? ''),
        accessLevel: (payload.accessLevel as AccessLevel) ?? 'open',
        isPublished: Boolean(payload.isPublished),
        sortOrder: Number(payload.sortOrder ?? 0),
        geo: (payload.geo as ViewerEntry['geo']) ?? { regions: [], states: [], cities: [] },
        institutions: (payload.institutions as string[]) ?? [],
        participants: (payload.participants as string[]) ?? [],
        institutionName: String(payload.institutionName ?? ''),
        recordedAt: String(payload.recordedAt ?? ''),
        researchStatus: String(payload.researchStatus ?? ''),
        participantNames: (payload.participantNames as string[]) ?? [],
        relatedVersionIds: (payload.relatedVersionIds as string[]) ?? [],
        infoUrl: String(payload.infoUrl ?? ''),
        isNew: Boolean(payload.isNew),
        confirmed: Boolean(payload.confirmed),
        confirmedAt: String(payload.confirmedAt ?? ''),
        createdByUid: String(payload.createdByUid ?? ''),
        status: (payload.status as 'open' | 'archived') ?? 'open',
      }

      setEntries((current) => [optimisticEntry, ...current])
      selectEntry(optimisticEntry)
      resetCloneModal()
    } catch (error) {
      console.error('Error cloning viewer entry:', error)
      setCloneError('Clone failed. Verify permissions and try again.')
    } finally {
      setIsCloning(false)
    }
  }

  return (
    <div className="space-y-6 text-white">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          {mode === 'admin'
            ? 'Viewer Content Admin'
            : mineOnly
              ? 'My Viewer Submissions'
              : 'Participant Viewer Submissions'}
        </h1>
        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/5 px-3 py-2 text-sm hover:border-[#D4AF37] hover:text-[#F5D37A]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {mineOnly ? (
        <div className="rounded-xl border border-[#D4AF37]/35 bg-[#D4AF37]/10 p-3 text-sm text-[#F5D37A]">
          Showing entries created in this browser session or linked account. Submissions keep your name + timestamp before account creation.
        </div>
      ) : null}

      <div className={`grid gap-4 md:grid-cols-3 ${sectionHighlightClass('entries')}`}>
        <div className="rounded-xl border border-white/15 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/60">Entries</p>
          <p className="mt-1 text-2xl font-semibold">{entries.length}</p>
        </div>
        <div className="rounded-xl border border-white/15 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/60">Published</p>
          <p className="mt-1 text-2xl font-semibold">{entries.filter((item) => item.isPublished).length}</p>
        </div>
        <div className="rounded-xl border border-white/15 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-white/60">Needs Confirm</p>
          <p className="mt-1 text-2xl font-semibold">{entries.filter((item) => !item.confirmed).length}</p>
        </div>
      </div>

      <div className={`grid gap-6 ${mineOnly ? '' : 'lg:grid-cols-[1fr,1.4fr]'}`}>
        <div className={`rounded-2xl border border-white/15 bg-white/[0.03] p-4 max-h-[72vh] flex flex-col ${sectionHighlightClass('entries')}`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Current Entries</h2>
            <button
              type="button"
              onClick={clearForm}
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-2.5 py-1 text-xs hover:border-[#D4AF37] hover:text-[#F5D37A]"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
          </div>

          <div className="mb-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-white/50" />
              <input
                value={entriesSearch}
                onChange={(event) => setEntriesSearch(event.target.value)}
                placeholder="Search title, description, area, section, or id"
                className="w-full rounded-lg border border-white/20 bg-black/30 py-2 pl-9 pr-9 text-sm"
              />
              {entriesSearch.trim() ? (
                <button
                  type="button"
                  onClick={() => setEntriesSearch('')}
                  className="absolute right-2 top-2 rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {loading ? <p className="text-sm text-white/70">Loading...</p> : null}

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className={`w-full rounded-lg border px-3 py-2 transition ${
                  selectedId === entry.id
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                    : 'border-white/15 bg-black/25 hover:border-white/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => selectEntry(entry)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-semibold">{entry.title}</p>
                    <p className="mt-1 text-xs text-white/70">{entry.areaId} / {entry.sectionId}</p>
                    {entry.submissionDisplayName ? (
                      <p className="mt-1 text-[11px] text-white/55">Submitted by: {entry.submissionDisplayName}</p>
                    ) : null}
                  </button>
                  <div className="flex items-center gap-1">
                    {entry.isNew ? <span className="rounded-full bg-[#D4AF37]/20 px-2 py-0.5 text-[10px] uppercase text-[#F5D37A]">New</span> : null}
                    {entry.confirmed ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : null}
                    <button
                      type="button"
                      onClick={() => openCloneModal(entry)}
                      className="ml-1 rounded-md border border-blue-400/35 bg-blue-500/10 p-1.5 text-blue-200 hover:bg-blue-500/20"
                      aria-label={`Duplicate ${entry.title}`}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteTarget({ id: entry.id, title: entry.title })
                        setDeleteConfirmText('')
                        setDeleteCheckboxConfirmed(false)
                        setDeleteError(null)
                      }}
                      className="ml-1 rounded-md border border-red-400/35 bg-red-500/10 p-1.5 text-red-200 hover:bg-red-500/20"
                      aria-label={`Delete ${entry.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!loading && filteredEntries.length === 0 ? (
              <p className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/70">
                No entries match this search.
              </p>
            ) : null}
          </div>
        </div>

        {!mineOnly ? (
          <form onSubmit={onSubmit} className="rounded-2xl border border-white/15 bg-white/[0.03] p-4 max-h-[72vh] flex flex-col">
          <h2 className="mb-3 text-lg font-semibold">{selectedId ? 'Edit Entry' : 'Add Entry'}</h2>
          <div className="space-y-3 overflow-y-auto pr-1">
            <div className={`rounded-lg border border-white/15 bg-black/20 ${sectionHighlightClass('form_core')}`}>
              <button
                type="button"
                onClick={() => toggleFormSection('required')}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold"
              >
                Required
                {sectionOpen.required ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {sectionOpen.required ? (
                <div className="grid gap-3 border-t border-white/10 p-3 md:grid-cols-2">
                  <input
                    value={form.submissionDisplayName}
                    onChange={(e) => setForm((p) => ({ ...p, submissionDisplayName: e.target.value }))}
                    placeholder="your name (used before account creation)"
                    className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm md:col-span-2"
                  />
                  <select
                    value={form.areaId}
                    onChange={(e) => setForm((p) => ({ ...p, areaId: e.target.value }))}
                    className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                  >
                    {formAreaOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={form.sectionId}
                    onChange={(e) => setForm((p) => ({ ...p, sectionId: e.target.value }))}
                    className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                  >
                    {formSectionOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="title" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm md:col-span-2" />
                  <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="description" rows={3} className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm md:col-span-2" />
                </div>
              ) : null}
            </div>

            <div className={`rounded-lg border border-white/15 bg-black/20 ${sectionHighlightClass('form_core')}`}>
              <button
                type="button"
                onClick={() => toggleFormSection('media')}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold"
              >
                Media
                {sectionOpen.media ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {sectionOpen.media ? (
                <div className="grid gap-3 border-t border-white/10 p-3 md:grid-cols-2">
                  <input value={form.videoUrl} onChange={(e) => setForm((p) => ({ ...p, videoUrl: e.target.value }))} placeholder="videoUrl" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm md:col-span-2" />
                  <input value={form.hlsUrl} onChange={(e) => setForm((p) => ({ ...p, hlsUrl: e.target.value }))} placeholder="hlsUrl (optional .m3u8 for adaptive playback)" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm md:col-span-2" />
                  <input value={form.thumbnailUrl} onChange={(e) => setForm((p) => ({ ...p, thumbnailUrl: e.target.value }))} placeholder="thumbnailUrl" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm md:col-span-2" />
                  <input value={form.institutionName} onChange={(e) => setForm((p) => ({ ...p, institutionName: e.target.value }))} placeholder="institutionName" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
                  <input value={form.recordedAt} onChange={(e) => setForm((p) => ({ ...p, recordedAt: e.target.value }))} placeholder="recordedAt (YYYY-MM-DD)" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
                </div>
              ) : null}
            </div>

            {canManageAll ? (
              <div className={`rounded-lg border border-white/15 bg-black/20 ${sectionHighlightClass('form_meta')}`}>
              <button
                type="button"
                onClick={() => toggleFormSection('publishing')}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold"
              >
                Publishing
                {sectionOpen.publishing ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {sectionOpen.publishing ? (
                <div className="grid gap-3 border-t border-white/10 p-3 md:grid-cols-2">
                  <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as 'open' | 'archived' }))} className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm">
                    <option value="open">status: open</option>
                    <option value="archived">status: archived</option>
                  </select>
                  <select value={form.accessLevel} onChange={(e) => setForm((p) => ({ ...p, accessLevel: e.target.value as AccessLevel }))} className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm">
                    <option value="open">access: open</option>
                    <option value="subscriber">access: subscriber</option>
                    <option value="regional">access: regional</option>
                    <option value="institution">access: institution</option>
                  </select>
                  <input type="number" value={form.sortOrder} onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) || 1 }))} placeholder="sortOrder" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm">
                    <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((p) => ({ ...p, isPublished: e.target.checked }))} /> isPublished</label>
                    <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.confirmed} onChange={(e) => setForm((p) => ({ ...p, confirmed: e.target.checked }))} /> confirmed</label>
                    <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.isNew} onChange={(e) => setForm((p) => ({ ...p, isNew: e.target.checked }))} /> isNew</label>
                  </div>
                </div>
              ) : null}
              </div>
            ) : null}

            <div className={`rounded-lg border border-white/15 bg-black/20 ${sectionHighlightClass('form_meta')}`}>
              <button
                type="button"
                onClick={() => toggleFormSection('advanced')}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold"
              >
                Advanced metadata
                {sectionOpen.advanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {sectionOpen.advanced ? (
                <div className="grid gap-3 border-t border-white/10 p-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs text-white/70">Cities</p>
                    <select
                      onChange={(e) => {
                        addCsvToken('cities', e.target.value)
                        e.currentTarget.selectedIndex = 0
                      }}
                      className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                    >
                      <option value="">Add city from list</option>
                      {metadataOptions.cities.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        value={customCity}
                        onChange={(e) => setCustomCity(e.target.value)}
                        placeholder="City not listed? add it"
                        className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => void suggestMetadataOption('cities', customCity)}
                        className="rounded-lg border border-white/25 px-3 py-2 text-xs font-semibold hover:border-[#D4AF37]"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {parseCsv(form.cities).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => removeCsvToken('cities', item)}
                          className="rounded-full border border-white/20 px-2 py-0.5 text-xs hover:border-red-400"
                        >
                          {item} ×
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-white/70">States</p>
                    <select
                      onChange={(e) => {
                        addCsvToken('states', e.target.value)
                        e.currentTarget.selectedIndex = 0
                      }}
                      className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                    >
                      <option value="">Add state from list</option>
                      {metadataOptions.states.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        value={customState}
                        onChange={(e) => setCustomState(e.target.value)}
                        placeholder="State not listed? add it"
                        className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => void suggestMetadataOption('states', customState)}
                        className="rounded-lg border border-white/25 px-3 py-2 text-xs font-semibold hover:border-[#D4AF37]"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {parseCsv(form.states).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => removeCsvToken('states', item)}
                          className="rounded-full border border-white/20 px-2 py-0.5 text-xs hover:border-red-400"
                        >
                          {item} ×
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <p className="text-xs text-white/70">Regions</p>
                    <select
                      onChange={(e) => {
                        addCsvToken('regions', e.target.value)
                        e.currentTarget.selectedIndex = 0
                      }}
                      className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                    >
                      <option value="">Add region from list</option>
                      {metadataOptions.regions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        value={customRegion}
                        onChange={(e) => setCustomRegion(e.target.value)}
                        placeholder="Region not listed? add it"
                        className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => void suggestMetadataOption('regions', customRegion)}
                        className="rounded-lg border border-white/25 px-3 py-2 text-xs font-semibold hover:border-[#D4AF37]"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {parseCsv(form.regions).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => removeCsvToken('regions', item)}
                          className="rounded-full border border-white/20 px-2 py-0.5 text-xs hover:border-red-400"
                        >
                          {item} ×
                        </button>
                      ))}
                    </div>
                  </div>
                  <input value={form.institutions} onChange={(e) => setForm((p) => ({ ...p, institutions: e.target.value }))} placeholder="institutions (csv)" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
                  <input value={form.participantNames} onChange={(e) => setForm((p) => ({ ...p, participantNames: e.target.value }))} placeholder="participantNames (csv)" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
                  <input value={form.relatedVersionIds} onChange={(e) => setForm((p) => ({ ...p, relatedVersionIds: e.target.value }))} placeholder="relatedVersionIds (csv)" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
                  <input value={form.researchStatus} onChange={(e) => setForm((p) => ({ ...p, researchStatus: e.target.value }))} placeholder="researchStatus" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
                  <input value={form.infoUrl} onChange={(e) => setForm((p) => ({ ...p, infoUrl: e.target.value }))} placeholder="infoUrl" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
                </div>
              ) : null}
            </div>
          </div>

          <div className={`mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 ${sectionHighlightClass('submit')}`}>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black hover:bg-[#E6C86A] disabled:opacity-70">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : selectedId ? 'Save Changes' : 'Add Entry'}
            </button>

            {selectedId ? (
              <button
                type="button"
                onClick={() => void confirmEntry(selectedId)}
                className="inline-flex items-center gap-2 rounded-lg border border-green-400/40 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-200 hover:bg-green-500/20"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm Entry
              </button>
            ) : null}
          </div>
          {submitError ? (
            <p className="mt-3 rounded-lg border border-red-400/35 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {submitError}
            </p>
          ) : null}
          {submitSuccess ? (
            <p className="mt-3 rounded-lg border border-green-400/35 bg-green-500/10 px-3 py-2 text-sm text-green-200">
              {submitSuccess}
            </p>
          ) : null}
          </form>
        ) : (
          <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-4">
            <button
              type="button"
              onClick={() => router.push('/studio/viewer-submissions')}
              className="rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black hover:bg-[#E6C86A]"
            >
              Submit Another Entry
            </button>
          </div>
        )}
      </div>

      {canManageAll ? (
        <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Submission Area Options (viewerAreas)</h2>
            <button
              type="button"
              onClick={clearAreaOptionForm}
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-2.5 py-1 text-xs hover:border-[#D4AF37] hover:text-[#F5D37A]"
            >
              <Plus className="h-3.5 w-3.5" />
              New Area
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr,1.3fr]">
            <div className="space-y-2">
              {areas.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pickAreaOption(item)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    areaOptionId === item.id
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                      : 'border-white/15 bg-black/25 hover:border-white/30'
                  }`}
                >
                  <p className="text-sm font-semibold">{item.title || item.id}</p>
                  <p className="mt-1 text-xs text-white/70">{item.id} • order {item.order}</p>
                </button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={areaOptionSlug}
                onChange={(e) => setAreaOptionSlug(e.target.value)}
                placeholder="areaId (slug)"
                className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
              />
              <input
                value={areaOptionForm.title}
                onChange={(e) => setAreaOptionForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="title"
                className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={areaOptionForm.order}
                onChange={(e) => setAreaOptionForm((p) => ({ ...p, order: Number(e.target.value) || 1 }))}
                placeholder="order"
                className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
              />
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={areaOptionForm.active}
                  onChange={(e) => setAreaOptionForm((p) => ({ ...p, active: e.target.checked }))}
                />
                active
              </label>
              <div className="md:col-span-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void saveAreaOption()}
                  disabled={areaOptionSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black hover:bg-[#E6C86A] disabled:opacity-70"
                >
                  <Save className="h-4 w-4" />
                  {areaOptionSaving ? 'Saving Area...' : areaOptionId ? 'Save Area' : 'Add Area'}
                </button>
                <button
                  type="button"
                  onClick={() => void removeAreaOption()}
                  disabled={!areaOptionId}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove Area
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {canManageAll ? (
        <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Metadata Option Lists</h2>
            <p className="text-xs text-white/60">Used by participant metadata dropdowns</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr,1.3fr]">
            <div className="space-y-2">
              {(['cities', 'states', 'regions'] as MetadataCategory[]).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setMetadataCategory(category)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    metadataCategory === category
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                      : 'border-white/15 bg-black/25 hover:border-white/30'
                  }`}
                >
                  <p className="text-sm font-semibold capitalize">{category}</p>
                  <p className="mt-1 text-xs text-white/70">{metadataOptions[category].length} options</p>
                </button>
              ))}
            </div>

            <div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={metadataOptionValue}
                  onChange={(e) => setMetadataOptionValue(e.target.value)}
                  placeholder="value"
                  className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                />
                <input
                  value={metadataOptionLabel}
                  onChange={(e) => setMetadataOptionLabel(e.target.value)}
                  placeholder="label (optional)"
                  className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                />
                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={() => void saveMetadataOption()}
                    disabled={metadataOptionSaving}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black hover:bg-[#E6C86A] disabled:opacity-70"
                  >
                    <Save className="h-4 w-4" />
                    {metadataOptionSaving ? 'Saving Option...' : 'Add / Update Option'}
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {metadataOptions[metadataCategory].map((item) => (
                  <div key={item.value} className="flex items-center justify-between rounded-lg border border-white/15 bg-black/25 px-3 py-2">
                    <div>
                      <p className="text-sm">{item.label}</p>
                      <p className="text-xs text-white/60">{item.value}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeMetadataOption(metadataCategory, item.value)}
                      className="rounded-lg border border-red-400/40 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/20"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {canManageAll ? (
        <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-4">
          <h2 className="mb-3 text-lg font-semibold">Bookings Related To Viewer Flow</h2>
          <div className="space-y-2">
            {bookings.map((booking) => (
              <div key={booking.id} className="rounded-lg border border-white/15 bg-black/25 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{booking.location} • {booking.date}</p>
                  <span className="rounded-full border border-white/20 px-2 py-0.5 text-xs uppercase">{booking.status}</span>
                </div>
                <p className="mt-1 text-xs text-white/70">Instrumentation: {booking.instrumentation}</p>
                <p className="mt-1 text-xs text-white/70">User: {booking.userId} • Credits: {booking.creditsUsed ?? 0}</p>
              </div>
            ))}
            {!loading && bookings.length === 0 ? <p className="text-sm text-white/70">No booking requests found.</p> : null}
          </div>
        </div>
      ) : null}

      {canManageAll ? (
        <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Narrative Arcs (viewerSections)</h2>
            <button
              type="button"
              onClick={clearSectionForm}
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-2.5 py-1 text-xs hover:border-[#D4AF37] hover:text-[#F5D37A]"
            >
              <Plus className="h-3.5 w-3.5" />
              New Arc
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr,1.3fr]">
            <div className="space-y-2">
              {sections.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pickSection(item)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    sectionId === item.id
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                      : 'border-white/15 bg-black/25 hover:border-white/30'
                  }`}
                >
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-white/70">{item.areaId} • {item.availability} • order {item.order}</p>
                </button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={sectionForm.areaId}
                onChange={(e) => setSectionForm((p) => ({ ...p, areaId: e.target.value }))}
                className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
              >
                {formAreaOptions.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.label}
                  </option>
                ))}
              </select>
              <input value={sectionForm.title} onChange={(e) => setSectionForm((p) => ({ ...p, title: e.target.value }))} placeholder="title" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
              <input value={sectionForm.format} onChange={(e) => setSectionForm((p) => ({ ...p, format: e.target.value }))} placeholder="format" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
              <select value={sectionForm.availability} onChange={(e) => setSectionForm((p) => ({ ...p, availability: e.target.value as ViewerSectionDoc['availability'] }))} className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm">
                <option value="open">open</option>
                <option value="subscriber">subscriber</option>
                <option value="regional">regional</option>
                <option value="institution">institution</option>
              </select>
              <textarea value={sectionForm.summary} onChange={(e) => setSectionForm((p) => ({ ...p, summary: e.target.value }))} placeholder="summary" rows={3} className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm md:col-span-2" />
              <input type="number" value={sectionForm.order} onChange={(e) => setSectionForm((p) => ({ ...p, order: Number(e.target.value) || 1 }))} placeholder="order" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={sectionForm.active} onChange={(e) => setSectionForm((p) => ({ ...p, active: e.target.checked }))} /> active</label>
              <div className="md:col-span-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void saveSection()}
                  disabled={sectionSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black hover:bg-[#E6C86A] disabled:opacity-70"
                >
                  <Save className="h-4 w-4" />
                  {sectionSaving ? 'Saving Arc...' : sectionId ? 'Save Arc' : 'Add Arc'}
                </button>
                <button
                  type="button"
                  onClick={() => void removeSection()}
                  disabled={!sectionId}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove Arc
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-white/15 bg-white/[0.03] p-4 text-xs text-white/70">
        <p className="inline-flex items-center gap-2"><Video className="h-3.5 w-3.5" /> Changes write directly to Firestore documents used by viewer playback and overlay metadata.</p>
      </div>

      {mode === 'participant' && !mineOnly && submissionGuideOpen && guideStep ? (
        <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm rounded-2xl border border-[#D4AF37]/35 bg-black/90 p-4 shadow-2xl backdrop-blur-sm sm:bottom-6 sm:right-6">
          <p className="text-xs uppercase tracking-[0.12em] text-[#F5D37A]">
            Submissions Guide {submissionGuideIndex + 1}/{PARTICIPANT_SUBMISSION_GUIDE_STEPS.length}
          </p>
          <h3 className="mt-2 text-base font-semibold text-white">{guideStep.title}</h3>
          <p className="mt-1 text-sm text-white/80">{guideStep.description}</p>
          {focusCooling ? (
            <p className="mt-2 text-xs text-[#F5D37A]">Highlighting focus area...</p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSubmissionGuideIndex((prev) => Math.max(0, prev - 1))}
              disabled={submissionGuideIndex === 0 || focusCooling}
              className="rounded-lg border border-white/25 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (submissionGuideIndex >= PARTICIPANT_SUBMISSION_GUIDE_STEPS.length - 1) {
                  setSubmissionGuideOpen(false)
                  return
                }
                setSubmissionGuideIndex((prev) => Math.min(PARTICIPANT_SUBMISSION_GUIDE_STEPS.length - 1, prev + 1))
              }}
              disabled={focusCooling}
              className="rounded-lg bg-[#D4AF37] px-3 py-2 text-xs font-semibold text-black hover:bg-[#E6C86A] disabled:opacity-70"
            >
              {submissionGuideIndex >= PARTICIPANT_SUBMISSION_GUIDE_STEPS.length - 1 ? 'Finish' : 'Next'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSubmissionGuideOpen(false)
                setSubmissionGuideDisabled(true)
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem(SUBMISSION_GUIDE_DISABLED_KEY, '1')
                }
              }}
              className="rounded-lg border border-white/25 px-3 py-2 text-xs font-semibold text-white"
            >
              Turn Off
            </button>
          </div>
        </div>
      ) : null}

      {mode === 'participant' && !mineOnly && !submissionGuideOpen ? (
        <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
          <button
            type="button"
            onClick={() => {
              if (submissionGuideDisabled && typeof window !== 'undefined') {
                window.localStorage.removeItem(SUBMISSION_GUIDE_DISABLED_KEY)
                setSubmissionGuideDisabled(false)
              }
              setSubmissionGuideIndex(0)
              setSubmissionGuideOpen(true)
            }}
            className="rounded-full border border-white/25 bg-black/80 px-3 py-2 text-xs font-semibold text-white hover:border-[#D4AF37]"
          >
            Open Helper
          </button>
        </div>
      ) : null}

      {cloneTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-blue-400/35 bg-[#111111] p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-blue-200">Duplicate Viewer Entry</h3>
                <p className="mt-1 text-sm text-white/75">
                  Source: {cloneTarget.title} ({cloneTarget.id})
                </p>
              </div>
              <button
                type="button"
                onClick={resetCloneModal}
                className="rounded-md border border-white/20 p-1.5 text-white/80 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-xs uppercase tracking-[0.12em] text-white/70 md:col-span-2">
                New Title
                <input
                  value={cloneTitle}
                  onChange={(event) => setCloneTitle(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs uppercase tracking-[0.12em] text-white/70">
                Area
                <select
                  value={cloneAreaId}
                  onChange={(event) => {
                    const nextAreaId = event.target.value
                    setCloneAreaId(nextAreaId)
                    const firstSection = entries.find((entry) => entry.areaId === nextAreaId)?.sectionId ?? cloneSectionId
                    setCloneSectionId(firstSection)
                  }}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                >
                  {areaOptions.map((area) => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs uppercase tracking-[0.12em] text-white/70">
                Section
                <select
                  value={cloneSectionId}
                  onChange={(event) => setCloneSectionId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                >
                  {sectionOptions.map((section) => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 space-y-2 rounded-lg border border-white/10 bg-black/30 p-3">
              <label className="inline-flex items-center gap-2 text-sm text-white/85">
                <input
                  type="checkbox"
                  checked={cloneCopyMediaUrls}
                  onChange={(event) => setCloneCopyMediaUrls(event.target.checked)}
                />
                Copy Media URLs
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-white/85">
                <input
                  type="checkbox"
                  checked={cloneCopyAdvancedMetadata}
                  onChange={(event) => setCloneCopyAdvancedMetadata(event.target.checked)}
                />
                Copy Advanced Metadata
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-white/85">
                <input
                  type="checkbox"
                  checked={cloneCopyPublishingFlags}
                  onChange={(event) => setCloneCopyPublishingFlags(event.target.checked)}
                />
                Copy Publishing Flags
              </label>
            </div>

            {cloneError ? <p className="mt-3 text-sm text-red-300">{cloneError}</p> : null}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={resetCloneModal}
                className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmCloneEntry()}
                disabled={isCloning}
                className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isCloning ? 'Duplicating...' : 'Create Duplicate'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-xl border border-red-400/35 bg-[#111111] p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-red-200">Delete Viewer Entry</h3>
                <p className="mt-1 text-sm text-white/75">
                  This permanently removes the Firestore document.
                </p>
              </div>
              <button
                type="button"
                onClick={resetDeleteModal}
                className="rounded-md border border-white/20 p-1.5 text-white/80 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-lg border border-white/15 bg-black/30 p-3 text-sm">
              <p><span className="text-white/60">Title:</span> {deleteTarget.title}</p>
              <p className="mt-1"><span className="text-white/60">ID:</span> {deleteTarget.id}</p>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-xs uppercase tracking-[0.12em] text-white/70">
                Type DELETE to confirm (optional if checkbox is checked)
                <input
                  value={deleteConfirmText}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                  placeholder="DELETE"
                  className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                />
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-white/85">
                <input
                  type="checkbox"
                  checked={deleteCheckboxConfirmed}
                  onChange={(event) => setDeleteCheckboxConfirmed(event.target.checked)}
                />
                I understand this action cannot be undone.
              </label>

              {deleteError ? <p className="text-sm text-red-300">{deleteError}</p> : null}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={resetDeleteModal}
                className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteEntry()}
                disabled={isDeleting || (deleteConfirmText.trim() !== 'DELETE' && !deleteCheckboxConfirmed)}
                className="rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isDeleting ? 'Deleting...' : 'Delete Entry'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
