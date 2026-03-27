'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { ArrowLeft, ArrowUpRight, BookOpenText, Loader2, Search, Trash2 } from 'lucide-react'
import { db } from '@/lib/firebase'
import {
  createClientResearchRefId,
  getFirestoreTimestampMillis,
  humanizeChamberSlug,
  normalizeChamberWorkDocument,
  trimChamberValue,
} from '@/lib/chamberWorks'
import { useUserRole } from '@/lib/hooks/useUserRole'
import type { ChamberResearchSource, ChamberWorkDocument } from '@/lib/types/chamber'

type ResearchFormState = {
  source: ChamberResearchSource
  title: string
  author: string
  year: string
  url: string
  excerpt: string
  imageUrl: string
  relevantTo: string
}

type SearchResult = {
  id: string
  source: ChamberResearchSource
  title: string
  author?: string
  year?: string
  url: string
  excerpt?: string
  imageUrl?: string
}

const EMPTY_FORM: ResearchFormState = {
  source: 'manual',
  title: '',
  author: '',
  year: '',
  url: '',
  excerpt: '',
  imageUrl: '',
  relevantTo: '',
}

const SOURCE_OPTIONS: Array<{ value: ChamberResearchSource; label: string }> = [
  { value: 'manual', label: 'Manual' },
  { value: 'doaj', label: 'DOAJ' },
  { value: 'europeana', label: 'Europeana' },
  { value: 'jstor', label: 'JSTOR' },
  { value: 'hathitrust', label: 'HathiTrust' },
]

const INPUT_CLASS_NAME =
  'w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-orchestra-gold/60 focus:bg-black/40'

function sourceLabel(source: ChamberResearchSource): string {
  return SOURCE_OPTIONS.find((option) => option.value === source)?.label ?? source
}

function fallbackWorkTitle(workId: string, explicitTitle?: string, explicitSlug?: string): string {
  if (trimChamberValue(explicitTitle)) return trimChamberValue(explicitTitle)
  if (trimChamberValue(explicitSlug)) return humanizeChamberSlug(explicitSlug)
  const [, workSlugPart] = workId.split('__')
  return humanizeChamberSlug(workSlugPart || workId) || 'Untitled Work'
}

function fallbackComposerName(workId: string, explicitName?: string, explicitSlug?: string): string {
  if (trimChamberValue(explicitName)) return trimChamberValue(explicitName)
  if (trimChamberValue(explicitSlug)) return humanizeChamberSlug(explicitSlug)
  const [composerSlugPart] = workId.split('__')
  return humanizeChamberSlug(composerSlugPart) || 'Composer metadata pending'
}

function parseDoajResults(payload: unknown): SearchResult[] {
  const results = Array.isArray((payload as { results?: unknown[] })?.results)
    ? ((payload as { results: unknown[] }).results ?? [])
    : []

  const normalized: SearchResult[] = []

  results.forEach((entry, index) => {
    const item = entry as {
      id?: string
      bibjson?: {
        title?: string
        year?: string | number
        abstract?: string
        author?: Array<{ name?: string }>
        link?: Array<{ url?: string }>
      }
    }
    const title = trimChamberValue(item.bibjson?.title)
    const url = item.bibjson?.link?.find((link) => trimChamberValue(link?.url))?.url?.trim() ?? ''
    if (!title || !url) return

    const author = (item.bibjson?.author ?? [])
      .map((authorEntry) => trimChamberValue(authorEntry?.name))
      .filter(Boolean)
      .join(', ')

    normalized.push({
      id: trimChamberValue(item.id) || `doaj-${index + 1}`,
      source: 'doaj',
      title,
      author: author || undefined,
      year:
        typeof item.bibjson?.year === 'number'
          ? String(item.bibjson.year)
          : trimChamberValue(item.bibjson?.year) || undefined,
      url,
      excerpt: trimChamberValue(item.bibjson?.abstract) || undefined,
    })
  })

  return normalized.slice(0, 5)
}

function parseEuropeanaResults(payload: unknown): SearchResult[] {
  const items = Array.isArray((payload as { items?: unknown[] })?.items)
    ? ((payload as { items: unknown[] }).items ?? [])
    : []

  const normalized: SearchResult[] = []

  items.forEach((entry, index) => {
    const item = entry as {
      id?: string
      guid?: string
      title?: string[] | string
      dcCreator?: string[] | string
      year?: string[] | string
      edmPreview?: string[] | string
      dataProvider?: string[] | string
    }
    const titleValue = Array.isArray(item.title) ? item.title[0] : item.title
    const title = trimChamberValue(titleValue)
    const guid = trimChamberValue(item.guid)
    const recordId = trimChamberValue(item.id)
    const url = guid || (recordId ? `https://www.europeana.eu/item${recordId}` : '')
    if (!title || !url) return

    const creatorValue = Array.isArray(item.dcCreator) ? item.dcCreator.join(', ') : item.dcCreator
    const yearValue = Array.isArray(item.year) ? item.year[0] : item.year
    const imageValue = Array.isArray(item.edmPreview) ? item.edmPreview[0] : item.edmPreview
    const providerValue = Array.isArray(item.dataProvider) ? item.dataProvider[0] : item.dataProvider

    normalized.push({
      id: recordId || `europeana-${index + 1}`,
      source: 'europeana',
      title,
      author: trimChamberValue(creatorValue) || undefined,
      year: trimChamberValue(yearValue) || undefined,
      url,
      excerpt: trimChamberValue(providerValue) || undefined,
      imageUrl: trimChamberValue(imageValue) || undefined,
    })
  })

  return normalized.slice(0, 5)
}

export default function AdminWorkResearchPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { user, role, loading: roleLoading } = useUserRole()
  const workIdParam = params?.workId
  const workId = decodeURIComponent(Array.isArray(workIdParam) ? workIdParam[0] : workIdParam ?? '')
  const [work, setWork] = useState<ChamberWorkDocument | null>(null)
  const [workExists, setWorkExists] = useState(false)
  const [rawResearchRefsById, setRawResearchRefsById] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [form, setForm] = useState<ResearchFormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [doajQuery, setDoajQuery] = useState('')
  const [doajResults, setDoajResults] = useState<SearchResult[]>([])
  const [doajLoading, setDoajLoading] = useState(false)
  const [doajError, setDoajError] = useState<string | null>(null)
  const [europeanaQuery, setEuropeanaQuery] = useState('')
  const [europeanaResults, setEuropeanaResults] = useState<SearchResult[]>([])
  const [europeanaLoading, setEuropeanaLoading] = useState(false)
  const [europeanaError, setEuropeanaError] = useState<string | null>(null)

  const hasAccess = role === 'beam_admin' || role === 'partner_admin' || role === 'admin_staff'
  const queryComposerName = searchParams.get('composerName') ?? ''
  const queryComposerSlug = searchParams.get('composerSlug') ?? ''
  const queryWorkTitle = searchParams.get('workTitle') ?? ''
  const queryWorkSlug = searchParams.get('workSlug') ?? ''
  const europeanaKey = process.env.NEXT_PUBLIC_EUROPEANA_KEY?.trim() ?? ''

  const fallbackWork = useMemo<ChamberWorkDocument>(() => {
    const composerSlug = trimChamberValue(queryComposerSlug) || workId.split('__')[0] || 'composer-metadata-needed'
    const workSlug = trimChamberValue(queryWorkSlug) || workId.split('__')[1] || 'untitled-work'

    return {
      id: workId,
      composerName: fallbackComposerName(workId, queryComposerName, composerSlug),
      composerSlug,
      workTitle: fallbackWorkTitle(workId, queryWorkTitle, workSlug),
      workSlug,
      researchRefs: [],
    }
  }, [queryComposerName, queryComposerSlug, queryWorkTitle, queryWorkSlug, workId])

  const sortedRefs = useMemo(() => {
    return [...(work?.researchRefs ?? [])].sort(
      (a, b) => getFirestoreTimestampMillis(b.addedAt) - getFirestoreTimestampMillis(a.addedAt),
    )
  }, [work?.researchRefs])

  const loadWork = useCallback(async () => {
    if (!db || !workId) {
      setLoadError('Chamber work research is unavailable because Firebase is not configured.')
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError(null)

    try {
      const workRef = doc(db, 'chamberWorks', workId)
      const snapshot = await getDoc(workRef)
      if (snapshot.exists()) {
        const data = snapshot.data()
        const normalized = normalizeChamberWorkDocument(snapshot.id, data)
        const rawMap = Array.isArray(data.researchRefs)
          ? data.researchRefs.reduce<Record<string, unknown>>((acc, entry) => {
              const refId =
                entry && typeof entry === 'object' && 'id' in entry
                  ? trimChamberValue((entry as { id?: unknown }).id as string)
                  : ''
              if (refId) acc[refId] = entry
              return acc
            }, {})
          : {}

        setWork(normalized)
        setWorkExists(true)
        setRawResearchRefsById(rawMap)
      } else {
        setWork(fallbackWork)
        setWorkExists(false)
        setRawResearchRefsById({})
      }
    } catch (error) {
      console.error('Error loading chamber work research:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      setLoadError(`Unable to load work research: ${message}`)
      setWork(fallbackWork)
      setWorkExists(false)
      setRawResearchRefsById({})
    } finally {
      setLoading(false)
    }
  }, [fallbackWork, workId])

  useEffect(() => {
    void loadWork()
  }, [loadWork])

  const handlePrefill = (result: SearchResult) => {
    setForm((current) => ({
      ...current,
      source: result.source,
      title: result.title,
      author: result.author ?? '',
      year: result.year ?? '',
      url: result.url,
      excerpt: result.excerpt ?? '',
      imageUrl: result.imageUrl ?? '',
    }))
    setFormError(null)
    setFormSuccess(null)
  }

  const searchDoaj = async () => {
    const queryText = doajQuery.trim()
    if (!queryText) {
      setDoajError('Enter a query before searching DOAJ.')
      setDoajResults([])
      return
    }

    setDoajLoading(true)
    setDoajError(null)
    setDoajResults([])

    try {
      const response = await fetch(`https://doaj.org/api/search/articles/${encodeURIComponent(queryText)}?pageSize=5`)
      if (!response.ok) {
        throw new Error(`DOAJ returned ${response.status}`)
      }
      const payload = (await response.json()) as unknown
      setDoajResults(parseDoajResults(payload))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setDoajError(`DOAJ search failed: ${message}`)
    } finally {
      setDoajLoading(false)
    }
  }

  const searchEuropeana = async () => {
    const queryText = europeanaQuery.trim()
    if (!queryText) {
      setEuropeanaError('Enter a query before searching Europeana.')
      setEuropeanaResults([])
      return
    }
    if (!europeanaKey) {
      setEuropeanaError('NEXT_PUBLIC_EUROPEANA_KEY is not set in .env.local.')
      setEuropeanaResults([])
      return
    }

    setEuropeanaLoading(true)
    setEuropeanaError(null)
    setEuropeanaResults([])

    try {
      const url = `https://api.europeana.eu/record/v2/search.json?query=${encodeURIComponent(queryText)}&wskey=${encodeURIComponent(europeanaKey)}&rows=5`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Europeana returned ${response.status}`)
      }
      const payload = (await response.json()) as unknown
      setEuropeanaResults(parseEuropeanaResults(payload))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setEuropeanaError(`Europeana search failed: ${message}`)
    } finally {
      setEuropeanaLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!db || !workId) {
      setFormError('Database is not initialized for this work.')
      return
    }
    if (!user) {
      setFormError('You must be signed in to add research references.')
      return
    }

    const title = form.title.trim()
    const url = form.url.trim()
    const excerpt = form.excerpt.trim()
    if (!title || !url) {
      setFormError('Title and URL are required.')
      return
    }
    if (excerpt.length > 280) {
      setFormError('Excerpt must be 280 characters or fewer.')
      return
    }

    setIsSaving(true)
    setFormError(null)
    setFormSuccess(null)

    try {
      const nextRef = {
        id: createClientResearchRefId(),
        source: form.source,
        title,
        author: form.author.trim() || undefined,
        year: form.year.trim() || undefined,
        url,
        excerpt: excerpt || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        relevantTo: form.relevantTo.trim() || undefined,
        addedBy: user.uid,
        addedAt: serverTimestamp(),
      }

      const payload: Record<string, unknown> = {
        composerName: work?.composerName ?? fallbackWork.composerName,
        composerSlug: work?.composerSlug ?? fallbackWork.composerSlug,
        workTitle: work?.workTitle ?? fallbackWork.workTitle,
        workSlug: work?.workSlug ?? fallbackWork.workSlug,
        researchRefs: arrayUnion(nextRef),
        updatedAt: serverTimestamp(),
      }
      if (!workExists) {
        payload.createdAt = serverTimestamp()
      }

      await setDoc(doc(db, 'chamberWorks', workId), payload, { merge: true })
      setForm(EMPTY_FORM)
      setFormSuccess('Research reference added.')
      await loadWork()
    } catch (error) {
      console.error('Error adding research reference:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      setFormError(`Unable to add research reference: ${message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (referenceId: string) => {
    if (!db || !workId) return
    const rawRef = rawResearchRefsById[referenceId]
    if (!rawRef) {
      setFormError('The selected research reference could not be removed because its raw Firestore value is unavailable.')
      return
    }

    setDeletingId(referenceId)
    setFormError(null)
    setFormSuccess(null)

    try {
      await updateDoc(doc(db, 'chamberWorks', workId), {
        researchRefs: arrayRemove(rawRef),
        updatedAt: serverTimestamp(),
      })
      setFormSuccess('Research reference removed.')
      await loadWork()
    } catch (error) {
      console.error('Error deleting research reference:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      setFormError(`Unable to remove research reference: ${message}`)
    } finally {
      setDeletingId(null)
    }
  }

  const currentWork = work ?? fallbackWork
  const referenceCount = sortedRefs.length
  const excerptLength = form.excerpt.length

  if (roleLoading || loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-orchestra-gold" />
      </div>
    )
  }

  if (!user || !hasAccess) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
          This page requires admin access.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-white xl:space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-orchestra-gold/20 bg-[radial-gradient(circle_at_top_left,_rgba(212,175,55,0.22),_transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)] xl:p-8">
          <div className="space-y-5">
            <div className="space-y-3">
              <Link
                href="/admin/viewer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-orchestra-gold transition hover:text-orchestra-gold/80"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Viewer Admin
              </Link>
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-orchestra-gold/20 bg-orchestra-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orchestra-gold/90">
                  <BookOpenText className="h-3.5 w-3.5" />
                  Work Research
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                    {currentWork.workTitle}
                  </h1>
                  <p className="mt-2 text-base text-orchestra-cream/70">{currentWork.composerName}</p>
                </div>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-orchestra-cream/70">
                Manage the work-level references surfaced in the Chamber viewer. Discovery tools stay on the right,
                while the saved bibliography remains visible for review and cleanup on the left.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {loadError ? (
                <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {loadError}
                </div>
              ) : null}
              {!workExists ? (
                <div className="rounded-2xl border border-orchestra-gold/30 bg-orchestra-gold/10 px-4 py-3 text-sm text-[#F5D37A]">
                  This work document does not exist yet. Adding the first reference will create it.
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orchestra-gold/70">Document</p>
              <p className="mt-3 break-all text-sm text-white/85">chamberWorks/{workId}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orchestra-gold/70">Status</p>
              <p className="mt-3 text-sm text-white/85">
                {workExists ? 'Work document is active.' : 'Pending first research entry.'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orchestra-gold/70">References</p>
              <p className="mt-3 text-2xl font-semibold text-white">{referenceCount}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">Attached to this work</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] xl:items-start">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.035] shadow-[0_16px_60px_rgba(0,0,0,0.24)]">
            <div className="border-b border-white/10 px-5 py-4 md:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">Current References</h2>
                  <p className="mt-1 text-sm text-orchestra-cream/65">
                    Review the saved bibliography exactly as it will appear in the viewer research panel.
                  </p>
                </div>
                <div className="rounded-full border border-orchestra-gold/25 bg-orchestra-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-orchestra-gold">
                  {referenceCount} {referenceCount === 1 ? 'item' : 'items'}
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5 md:p-6">
              {referenceCount === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-5 py-8 text-center text-sm text-orchestra-cream/70">
                  No research references added yet.
                </div>
              ) : (
                sortedRefs.map((reference) => (
                  <article
                    key={reference.id}
                    className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(0,0,0,0.16))] p-4 shadow-[0_12px_32px_rgba(0,0,0,0.18)] md:p-5"
                  >
                    <div className="grid gap-4 md:grid-cols-[88px,minmax(0,1fr)] xl:grid-cols-[96px,minmax(0,1fr)_auto] xl:items-start">
                      <div className="flex md:justify-start">
                        {reference.imageUrl ? (
                          <img
                            src={reference.imageUrl}
                            alt={reference.title}
                            className="h-[88px] w-[88px] rounded-2xl border border-white/10 object-cover"
                          />
                        ) : (
                          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 text-[11px] uppercase tracking-[0.18em] text-white/35">
                            No Image
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-orchestra-gold/35 bg-orchestra-gold/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F5D37A]">
                            {sourceLabel(reference.source)}
                          </span>
                          {reference.relevantTo ? (
                            <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/60">
                              {reference.relevantTo}
                            </span>
                          ) : null}
                        </div>

                        <a
                          href={reference.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-start gap-2 text-left text-base font-semibold text-white transition hover:text-[#F5D37A]"
                        >
                          <span>{reference.title}</span>
                          <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0" />
                        </a>

                        {reference.author || reference.year ? (
                          <p className="mt-2 text-sm text-white/65">
                            {[reference.author, reference.year].filter(Boolean).join(' • ')}
                          </p>
                        ) : null}

                        {reference.excerpt ? (
                          <p className="mt-3 text-sm leading-6 text-orchestra-cream/75">{reference.excerpt}</p>
                        ) : null}
                      </div>

                      <div className="flex md:justify-end xl:justify-start">
                        <button
                          type="button"
                          onClick={() => void handleDelete(reference.id)}
                          disabled={deletingId === reference.id}
                          className="inline-flex items-center gap-2 rounded-full border border-red-400/35 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {deletingId === reference.id ? 'Removing…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6">
          <section className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.035] shadow-[0_16px_60px_rgba(0,0,0,0.24)]">
            <div className="border-b border-white/10 px-5 py-4 md:px-6">
              <h2 className="text-xl font-semibold text-white">Research Discovery</h2>
              <p className="mt-1 text-sm text-orchestra-cream/65">
                Search source APIs, prefill the form, then review before saving the reference onto this work.
              </p>
            </div>

            <div className="divide-y divide-white/10">
              <div className="space-y-4 px-5 py-5 md:px-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-orchestra-gold/85">DOAJ</h3>
                    <p className="mt-1 text-sm text-white/60">Search open-access scholarship and prefill article metadata.</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={doajQuery}
                    onChange={(event) => setDoajQuery(event.target.value)}
                    placeholder="Search DOAJ articles"
                    className={INPUT_CLASS_NAME}
                  />
                  <button
                    type="button"
                    onClick={() => void searchDoaj()}
                    disabled={doajLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orchestra-gold/35 bg-orchestra-gold/10 px-4 py-3 text-sm font-semibold text-[#F5D37A] transition hover:bg-orchestra-gold/15 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[132px]"
                  >
                    <Search className="h-4 w-4" />
                    {doajLoading ? 'Searching…' : 'Search'}
                  </button>
                </div>

                {doajError ? <p className="text-sm text-red-200">{doajError}</p> : null}

                <div className="space-y-2">
                  {doajResults.length === 0 && !doajLoading && !doajError ? (
                    <p className="text-sm text-white/45">No DOAJ results loaded.</p>
                  ) : null}

                  {doajResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handlePrefill(result)}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:border-orchestra-gold/35 hover:bg-black/25"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-orchestra-gold/25 bg-orchestra-gold/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-orchestra-gold">
                          {sourceLabel(result.source)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-white">{result.title}</p>
                      <p className="mt-1 text-xs text-white/60">
                        {[result.author, result.year].filter(Boolean).join(' • ') || 'Open-access article'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 px-5 py-5 md:px-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-orchestra-gold/85">Europeana</h3>
                  <p className="mt-1 text-sm text-white/60">
                    Search archival records and artworks using your public Europeana API key.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={europeanaQuery}
                    onChange={(event) => setEuropeanaQuery(event.target.value)}
                    placeholder="Search Europeana records"
                    className={INPUT_CLASS_NAME}
                  />
                  <button
                    type="button"
                    onClick={() => void searchEuropeana()}
                    disabled={europeanaLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orchestra-gold/35 bg-orchestra-gold/10 px-4 py-3 text-sm font-semibold text-[#F5D37A] transition hover:bg-orchestra-gold/15 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[132px]"
                  >
                    <Search className="h-4 w-4" />
                    {europeanaLoading ? 'Searching…' : 'Search'}
                  </button>
                </div>

                {europeanaError ? <p className="text-sm text-red-200">{europeanaError}</p> : null}

                <div className="space-y-2">
                  {europeanaResults.length === 0 && !europeanaLoading && !europeanaError ? (
                    <p className="text-sm text-white/45">No Europeana results loaded.</p>
                  ) : null}

                  {europeanaResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handlePrefill(result)}
                      className="grid w-full gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:border-orchestra-gold/35 hover:bg-black/25 md:grid-cols-[72px,minmax(0,1fr)]"
                    >
                      {result.imageUrl ? (
                        <img
                          src={result.imageUrl}
                          alt={result.title}
                          className="h-[72px] w-[72px] rounded-xl border border-white/10 object-cover"
                        />
                      ) : (
                        <div className="hidden h-[72px] w-[72px] rounded-xl border border-dashed border-white/10 bg-black/20 md:block" />
                      )}
                      <div className="min-w-0">
                        <div className="inline-flex rounded-full border border-orchestra-gold/25 bg-orchestra-gold/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-orchestra-gold">
                          {sourceLabel(result.source)}
                        </div>
                        <p className="mt-2 text-sm font-semibold text-white">{result.title}</p>
                        <p className="mt-1 text-xs text-white/60">
                          {[result.author, result.year].filter(Boolean).join(' • ') || 'Archival record'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.035] shadow-[0_16px_60px_rgba(0,0,0,0.24)]">
            <div className="border-b border-white/10 px-5 py-4 md:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">Compose Reference</h2>
                  <p className="mt-1 text-sm text-orchestra-cream/65">
                    Add manual entries or refine the values pulled in from the quick-search helpers.
                  </p>
                </div>
                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/50">
                  {sourceLabel(form.source)}
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5 md:p-6">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr),120px]">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-orchestra-gold/80">Source</span>
                  <select
                    value={form.source}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        source: event.target.value as ChamberResearchSource,
                      }))
                    }
                    className={INPUT_CLASS_NAME}
                  >
                    {SOURCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-orchestra-gold/80">Year</span>
                  <input
                    value={form.year}
                    onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))}
                    placeholder="1849"
                    className={INPUT_CLASS_NAME}
                  />
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-orchestra-gold/80">
                  Title *
                </span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Article or document title"
                  className={INPUT_CLASS_NAME}
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-orchestra-gold/80">URL *</span>
                <input
                  value={form.url}
                  onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
                  placeholder="https://..."
                  className={INPUT_CLASS_NAME}
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-orchestra-gold/80">Author</span>
                  <input
                    value={form.author}
                    onChange={(event) => setForm((current) => ({ ...current, author: event.target.value }))}
                    placeholder="Author or editor"
                    className={INPUT_CLASS_NAME}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-orchestra-gold/80">
                    Relevant To
                  </span>
                  <input
                    value={form.relevantTo}
                    onChange={(event) => setForm((current) => ({ ...current, relevantTo: event.target.value }))}
                    placeholder="Why this matters to the work"
                    className={INPUT_CLASS_NAME}
                  />
                </label>
              </div>

              <label className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-orchestra-gold/80">Excerpt</span>
                  <span className="text-xs text-white/45">{excerptLength}/280</span>
                </div>
                <textarea
                  rows={5}
                  value={form.excerpt}
                  maxLength={280}
                  onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))}
                  placeholder="Short contextual snippet for the viewer research card"
                  className={`${INPUT_CLASS_NAME} min-h-[132px] resize-y`}
                />
              </label>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr),128px]">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-orchestra-gold/80">
                    Image URL
                  </span>
                  <input
                    value={form.imageUrl}
                    onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
                    placeholder="Optional thumbnail"
                    className={INPUT_CLASS_NAME}
                  />
                </label>

                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-orchestra-gold/80">
                    Preview
                  </span>
                  <div className="flex h-[84px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                    {form.imageUrl ? (
                      <img
                        src={form.imageUrl}
                        alt="Reference preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[11px] uppercase tracking-[0.16em] text-white/35">Optional</span>
                    )}
                  </div>
                </div>
              </div>

              {formError ? (
                <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {formError}
                </p>
              ) : null}

              {formSuccess ? (
                <p className="rounded-2xl border border-green-400/30 bg-green-500/10 px-4 py-3 text-sm text-green-100">
                  {formSuccess}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-white/55">
                  Saved references are written onto the work document, not individual versions.
                </p>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center rounded-full border border-orchestra-gold/40 bg-orchestra-gold/14 px-5 py-2.5 text-sm font-semibold text-[#F5D37A] transition hover:bg-orchestra-gold/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Saving…' : 'Add Research Reference'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
