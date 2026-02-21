'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
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
  updateDoc,
  where,
} from 'firebase/firestore'
import { CheckCircle2, ChevronDown, ChevronUp, Plus, RefreshCw, Save, Search, Trash2, Video, X } from 'lucide-react'
import { db } from '@/lib/firebase'

type AccessLevel = 'open' | 'subscriber' | 'regional' | 'institution'

type ViewerEntry = {
  id: string
  areaId: string
  sectionId: string
  title: string
  description: string
  videoUrl: string
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

type Props = {
  mode: 'admin' | 'participant'
}

type SubmissionGuideFocus = 'entries' | 'form_core' | 'form_meta' | 'submit'

type SubmissionGuideStep = {
  id: string
  title: string
  description: string
  focus: SubmissionGuideFocus
}

type FormState = {
  areaId: string
  sectionId: string
  title: string
  description: string
  videoUrl: string
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

const DEFAULT_FORM: FormState = {
  areaId: 'community',
  sectionId: 'community-lead',
  title: '',
  description: '',
  videoUrl: '',
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

export default function ViewerEntryManager({ mode }: Props) {
  const [entries, setEntries] = useState<ViewerEntry[]>([])
  const [bookings, setBookings] = useState<BookingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteCheckboxConfirmed, setDeleteCheckboxConfirmed] = useState(false)
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

  const canManageAll = mode === 'admin'
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

  const loadData = async () => {
    if (!db) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      let snapshot
      try {
        const entriesQuery = canManageAll
          ? query(collection(db, 'viewerContent'), orderBy('updatedAt', 'desc'))
          : query(
              collection(db, 'viewerContent'),
              where('createdByUid', '==', '__participant__'),
              orderBy('updatedAt', 'desc'),
            )
        snapshot = await getDocs(entriesQuery)
      } catch (queryError) {
        // Fallback path if indexes/order constraints are not available.
        const fallbackQuery = canManageAll
          ? query(collection(db, 'viewerContent'))
          : query(collection(db, 'viewerContent'), where('createdByUid', '==', '__participant__'))
        snapshot = await getDocs(fallbackQuery)
        console.warn('Falling back to client-side sorting for viewer entries:', queryError)
      }

      const rows = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<ViewerEntry, 'id'>) }))
        .sort((a, b) => {
          const updatedDelta = toMillis((b as any).updatedAt) - toMillis((a as any).updatedAt)
          if (updatedDelta !== 0) return updatedDelta
          return toMillis((b as any).createdAt) - toMillis((a as any).createdAt)
        })
      setEntries(rows)

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
    void loadData()
  }, [canManageAll])

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

  const sectionHighlightClass = (focus: SubmissionGuideFocus) => {
    if (mode !== 'participant') return ''
    if (!submissionGuideOpen) return ''
    if (guideStep?.focus !== focus) return ''
    return 'ring-2 ring-[#D4AF37]/70 shadow-[0_0_0_2px_rgba(212,175,55,0.25)]'
  }

  const selectEntry = (entry: ViewerEntry) => {
    setSelectedId(entry.id)
    setForm({
      areaId: entry.areaId,
      sectionId: entry.sectionId,
      title: entry.title,
      description: entry.description,
      videoUrl: entry.videoUrl,
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
    setForm(DEFAULT_FORM)
  }

  const toPayload = () => {
    return {
      areaId: form.areaId,
      sectionId: form.sectionId,
      title: form.title.trim(),
      description: form.description.trim(),
      videoUrl: form.videoUrl.trim(),
      thumbnailUrl: form.thumbnailUrl.trim(),
      accessLevel: form.accessLevel,
      isPublished: form.isPublished,
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
      status: form.status,
      isNew: form.isNew,
      confirmed: form.confirmed,
      confirmedAt: form.confirmed ? new Date().toISOString() : '',
      createdByUid: selectedEntry?.createdByUid ?? '',
      updatedAt: serverTimestamp(),
    }
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!db) return

    if (!form.title.trim() || !form.description.trim() || !form.areaId.trim() || !form.sectionId.trim()) {
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
    } catch (error) {
      console.error('Error saving viewer entry:', error)
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

  const toggleFormSection = (section: 'required' | 'media' | 'publishing' | 'advanced') => {
    setSectionOpen((current) => ({ ...current, [section]: !current[section] }))
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

  return (
    <div className="space-y-6 text-white">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{mode === 'admin' ? 'Viewer Content Admin' : 'Participant Viewer Submissions'}</h1>
        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/5 px-3 py-2 text-sm hover:border-[#D4AF37] hover:text-[#F5D37A]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

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

      <div className="grid gap-6 lg:grid-cols-[1fr,1.4fr]">
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
                  </button>
                  <div className="flex items-center gap-1">
                    {entry.isNew ? <span className="rounded-full bg-[#D4AF37]/20 px-2 py-0.5 text-[10px] uppercase text-[#F5D37A]">New</span> : null}
                    {entry.confirmed ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : null}
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
                  <input value={form.areaId} onChange={(e) => setForm((p) => ({ ...p, areaId: e.target.value }))} placeholder="areaId" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
                  <input value={form.sectionId} onChange={(e) => setForm((p) => ({ ...p, sectionId: e.target.value }))} placeholder="sectionId" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
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
                  <input value={form.thumbnailUrl} onChange={(e) => setForm((p) => ({ ...p, thumbnailUrl: e.target.value }))} placeholder="thumbnailUrl" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm md:col-span-2" />
                  <input value={form.institutionName} onChange={(e) => setForm((p) => ({ ...p, institutionName: e.target.value }))} placeholder="institutionName" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
                  <input value={form.recordedAt} onChange={(e) => setForm((p) => ({ ...p, recordedAt: e.target.value }))} placeholder="recordedAt (YYYY-MM-DD)" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
                </div>
              ) : null}
            </div>

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
                  <input value={form.cities} onChange={(e) => setForm((p) => ({ ...p, cities: e.target.value }))} placeholder="geo.cities (csv)" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
                  <input value={form.states} onChange={(e) => setForm((p) => ({ ...p, states: e.target.value }))} placeholder="geo.states (csv)" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
                  <input value={form.regions} onChange={(e) => setForm((p) => ({ ...p, regions: e.target.value }))} placeholder="geo.regions (csv)" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
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
        </form>
      </div>

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

      <div className="rounded-xl border border-white/15 bg-white/[0.03] p-4 text-xs text-white/70">
        <p className="inline-flex items-center gap-2"><Video className="h-3.5 w-3.5" /> Changes write directly to Firestore documents used by viewer playback and overlay metadata.</p>
      </div>

      {mode === 'participant' && submissionGuideOpen && guideStep ? (
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

      {mode === 'participant' && !submissionGuideOpen ? (
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
