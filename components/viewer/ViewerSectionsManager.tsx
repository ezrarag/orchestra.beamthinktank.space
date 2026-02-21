'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { CheckCircle2, Plus, RefreshCw, Save, Search, Trash2, X } from 'lucide-react'
import { db } from '@/lib/firebase'

type SectionAvailability = 'open' | 'subscriber' | 'regional' | 'institution'

type ViewerSection = {
  id: string
  areaId: string
  title: string
  format: string
  summary: string
  availability: SectionAvailability
  order: number
  active: boolean
  createdAt?: unknown
  updatedAt?: unknown
}

type FormState = {
  sectionId: string
  areaId: string
  title: string
  format: string
  summary: string
  availability: SectionAvailability
  order: number
  active: boolean
}

const DEFAULT_FORM: FormState = {
  sectionId: '',
  areaId: 'professional',
  title: '',
  format: 'Narrative Arc',
  summary: '',
  availability: 'open',
  order: 1,
  active: true,
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
    if (typeof maybeTimestamp.toMillis === 'function') return maybeTimestamp.toMillis()
    if (typeof maybeTimestamp.seconds === 'number') return maybeTimestamp.seconds * 1000
  }
  return 0
}

export default function ViewerSectionsManager() {
  const [sections, setSections] = useState<ViewerSection[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Pick<ViewerSection, 'id' | 'title'> | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sections
    return sections.filter((section) => {
      const haystack = [
        section.id,
        section.areaId,
        section.title,
        section.format,
        section.summary,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [search, sections])

  const loadData = async () => {
    setLoading(true)
    setLoadError(null)
    let apiErrorMessage: string | null = null
    try {
      const response = await fetch('/api/admin/viewer-sections', { cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const details = typeof data?.details === 'string' ? data.details : ''
        throw new Error([data?.error || 'Failed to load viewerSections via API', details].filter(Boolean).join(': '))
      }

      const rows = ((data?.sections as Omit<ViewerSection, 'id'>[] | undefined) ?? [])
        .map((section) => ({ ...section } as ViewerSection))
        .sort((a, b) => {
          const updatedDelta = toMillis(b.updatedAt) - toMillis(a.updatedAt)
          if (updatedDelta !== 0) return updatedDelta
          return toMillis(b.createdAt) - toMillis(a.createdAt)
        })
      setSections(rows)
    } catch (error) {
      console.error('Error loading viewer sections via API, trying client SDK fallback:', error)
      apiErrorMessage = error instanceof Error ? error.message : 'Unknown API error'

      if (!db) {
        setLoadError(`Load failed: ${apiErrorMessage}`)
      } else {
        try {
          const snapshot = await getDocs(collection(db, 'viewerSections'))
          const rows = snapshot.docs
            .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<ViewerSection, 'id'>) }))
            .sort((a, b) => {
              const updatedDelta = toMillis(b.updatedAt) - toMillis(a.updatedAt)
              if (updatedDelta !== 0) return updatedDelta
              return toMillis(b.createdAt) - toMillis(a.createdAt)
            })
          setSections(rows)
          setLoadError(null)
        } catch (fallbackError) {
          console.error('Client SDK fallback failed for viewer sections:', fallbackError)
          const message = fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
          setLoadError(`Load failed: API(${apiErrorMessage ?? 'unknown'}) · Client(${message})`)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const selectSection = (section: ViewerSection) => {
    setSelectedId(section.id)
    setSubmitError(null)
    setForm({
      sectionId: section.id,
      areaId: section.areaId,
      title: section.title,
      format: section.format,
      summary: section.summary,
      availability: section.availability,
      order: Number.isFinite(section.order) ? section.order : 1,
      active: section.active !== false,
    })
  }

  const clearForm = () => {
    setSelectedId(null)
    setSubmitError(null)
    setForm(DEFAULT_FORM)
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const sectionId = form.sectionId.trim()
    if (!sectionId || !form.areaId.trim() || !form.title.trim()) {
      setSubmitError('Required fields: sectionId, areaId, and title.')
      return
    }

    setSaving(true)
    setSubmitError(null)
    try {
      const payload: Record<string, unknown> = {
        sectionId,
        areaId: form.areaId.trim(),
        title: form.title.trim(),
        format: form.format.trim() || 'Narrative Arc',
        summary: form.summary.trim(),
        availability: form.availability,
        order: Number.isFinite(form.order) ? form.order : 1,
        active: form.active,
      }

      const method = selectedId ? 'PATCH' : 'POST'
      const response = await fetch('/api/admin/viewer-sections', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || `Failed to ${selectedId ? 'update' : 'create'} viewer section via API`)
      }

      await loadData()
      clearForm()
    } catch (error) {
      console.error('Error saving viewer section via API, trying client SDK fallback:', error)
      if (!db) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        setSubmitError(`Save failed: ${message}`)
      } else {
        try {
          const payload = {
            areaId: form.areaId.trim(),
            title: form.title.trim(),
            format: form.format.trim() || 'Narrative Arc',
            summary: form.summary.trim(),
            availability: form.availability,
            order: Number.isFinite(form.order) ? form.order : 1,
            active: form.active,
            updatedAt: serverTimestamp(),
          }

          if (selectedId) {
            await updateDoc(doc(db, 'viewerSections', selectedId), payload)
          } else {
            await setDoc(doc(db, 'viewerSections', sectionId), {
              ...payload,
              createdAt: serverTimestamp(),
            })
          }

          await loadData()
          clearForm()
          setSubmitError(null)
        } catch (fallbackError) {
          console.error('Client SDK fallback save failed for viewer section:', fallbackError)
          const message = fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
          setSubmitError(`Save failed: ${message}`)
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const response = await fetch(`/api/admin/viewer-sections?sectionId=${encodeURIComponent(deleteTarget.id)}`, {
        method: 'DELETE',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete viewer section via API')
      }

      setSections((current) => current.filter((section) => section.id !== deleteTarget.id))
      if (selectedId === deleteTarget.id) clearForm()
      setDeleteTarget(null)
      setDeleteConfirm(false)
    } catch (error) {
      console.error('Error deleting viewer section via API, trying client SDK fallback:', error)
      if (!db) {
        setDeleteError('Delete failed. Verify permissions and try again.')
      } else {
        try {
          await deleteDoc(doc(db, 'viewerSections', deleteTarget.id))
          setSections((current) => current.filter((section) => section.id !== deleteTarget.id))
          if (selectedId === deleteTarget.id) clearForm()
          setDeleteTarget(null)
          setDeleteConfirm(false)
          setDeleteError(null)
        } catch (fallbackError) {
          console.error('Client SDK fallback delete failed for viewer section:', fallbackError)
          setDeleteError('Delete failed. Verify permissions and try again.')
        }
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6 text-white">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Viewer Sections Admin</h1>
        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/5 px-3 py-2 text-sm hover:border-[#D4AF37] hover:text-[#F5D37A]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,1.4fr]">
        <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-4 max-h-[72vh] flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Narrative Arcs (viewerSections)</h2>
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
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search id, title, area, format, summary"
                className="w-full rounded-lg border border-white/20 bg-black/30 py-2 pl-9 pr-9 text-sm"
              />
              {search.trim() ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-2 rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {loading ? <p className="text-sm text-white/70">Loading...</p> : null}
          {loadError ? (
            <p className="mb-2 rounded-lg border border-red-400/35 bg-red-500/10 p-3 text-sm text-red-200">
              {loadError}
            </p>
          ) : null}

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {filteredSections.map((section) => (
              <div
                key={section.id}
                className={`w-full rounded-lg border px-3 py-2 transition ${
                  selectedId === section.id
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                    : 'border-white/15 bg-black/25 hover:border-white/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => selectSection(section)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-semibold">{section.title}</p>
                    <p className="mt-1 text-xs text-white/70">{section.id} · {section.areaId} · #{section.order}</p>
                  </button>
                  <div className="flex items-center gap-1">
                    {section.active ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : null}
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteTarget({ id: section.id, title: section.title })
                        setDeleteConfirm(false)
                        setDeleteError(null)
                      }}
                      className="rounded-md border border-red-400/35 bg-red-500/10 p-1.5 text-red-200 hover:bg-red-500/20"
                      aria-label={`Delete ${section.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!loading && filteredSections.length === 0 ? (
              <p className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/70">
                No narrative arcs match this search.
              </p>
            ) : null}
          </div>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl border border-white/15 bg-white/[0.03] p-4 max-h-[72vh] flex flex-col">
          <h2 className="mb-3 text-lg font-semibold">{selectedId ? 'Edit Narrative Arc' : 'Add Narrative Arc'}</h2>

          <div className="space-y-3 overflow-y-auto pr-1">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs uppercase tracking-[0.12em] text-white/70 md:col-span-2">
                sectionId
                <input
                  value={form.sectionId}
                  onChange={(e) => setForm((p) => ({ ...p, sectionId: e.target.value }))}
                  placeholder="e.g. publishing-main"
                  disabled={Boolean(selectedId)}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm disabled:opacity-60"
                />
              </label>
              <input
                value={form.areaId}
                onChange={(e) => setForm((p) => ({ ...p, areaId: e.target.value }))}
                placeholder="areaId"
                className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
              />
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="title"
                className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
              />
              <input
                value={form.format}
                onChange={(e) => setForm((p) => ({ ...p, format: e.target.value }))}
                placeholder="format"
                className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
              />
              <select
                value={form.availability}
                onChange={(e) => setForm((p) => ({ ...p, availability: e.target.value as SectionAvailability }))}
                className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
              >
                <option value="open">availability: open</option>
                <option value="subscriber">availability: subscriber</option>
                <option value="regional">availability: regional</option>
                <option value="institution">availability: institution</option>
              </select>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm((p) => ({ ...p, order: Number(e.target.value) || 1 }))}
                placeholder="order"
                className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
              />
              <textarea
                value={form.summary}
                onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
                placeholder="summary"
                rows={4}
                className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm md:col-span-2"
              />
              <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                />
                active
              </label>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black hover:bg-[#E6C86A] disabled:opacity-70">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : selectedId ? 'Save Changes' : 'Add Arc'}
            </button>
          </div>

          {submitError ? (
            <p className="mt-3 rounded-lg border border-red-400/35 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {submitError}
            </p>
          ) : null}
        </form>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-xl border border-red-400/35 bg-[#111111] p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-red-200">Delete Narrative Arc</h3>
                <p className="mt-1 text-sm text-white/75">This permanently removes the viewerSections document.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null)
                  setDeleteConfirm(false)
                  setDeleteError(null)
                }}
                className="rounded-md border border-white/20 p-1.5 text-white/80 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-lg border border-white/15 bg-black/30 p-3 text-sm">
              <p><span className="text-white/60">Title:</span> {deleteTarget.title}</p>
              <p className="mt-1"><span className="text-white/60">ID:</span> {deleteTarget.id}</p>
            </div>

            <label className="mt-4 inline-flex items-center gap-2 text-sm text-white/85">
              <input type="checkbox" checked={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.checked)} />
              I understand this action cannot be undone.
            </label>

            {deleteError ? <p className="mt-3 text-sm text-red-300">{deleteError}</p> : null}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null)
                  setDeleteConfirm(false)
                  setDeleteError(null)
                }}
                className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={!deleteConfirm || isDeleting}
                className="rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isDeleting ? 'Deleting...' : 'Delete Arc'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
