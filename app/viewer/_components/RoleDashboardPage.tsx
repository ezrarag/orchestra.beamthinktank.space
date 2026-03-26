'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

type LearnerContent = {
  id: string
  areaId?: string
  sectionId?: string
  title?: string
  composer?: string
  slug?: string
  projectId?: string
  institutionName?: string
  geo?: {
    cities?: string[]
    states?: string[]
    regions?: string[]
  }
}

type DashboardAction = {
  title: string
  subtitle: string
}

type RoleDashboardPageProps = {
  mode: 'student' | 'instructor' | 'partner'
  title: string
  badgeLabel: string
  actionTiles: DashboardAction[]
}

const SERIES_LABELS: Record<string, string> = {
  professional: 'Professional Orchestra',
  community: 'Repertoire Orchestra',
  chamber: 'Chamber Series',
  publishing: 'Publishing',
  business: 'The Business',
}

function notFoundMessageFor(mode: RoleDashboardPageProps['mode']): string {
  if (mode === 'student') return 'Learner item not found.'
  if (mode === 'instructor') return 'Instructor item not found.'
  return 'Partner item not found.'
}

function RoleDashboardPageContent({ mode, title, badgeLabel, actionTiles }: RoleDashboardPageProps) {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const idParam = decodeURIComponent(params.id || '')
  const requestedContentId = searchParams.get('contentId') || ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState<LearnerContent | null>(null)

  useEffect(() => {
    if (!db || !idParam) {
      setLoading(false)
      if (!idParam) setError('Missing content identifier.')
      return
    }

    let mounted = true

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        if (requestedContentId) {
          const explicitDoc = await getDoc(doc(db, 'viewerContent', requestedContentId))
          if (mounted && explicitDoc.exists()) {
            setContent({ id: explicitDoc.id, ...(explicitDoc.data() as Omit<LearnerContent, 'id'>) })
            setLoading(false)
            return
          }
        }

        const direct = await getDoc(doc(db, 'viewerContent', idParam))
        if (mounted && direct.exists()) {
          setContent({ id: direct.id, ...(direct.data() as Omit<LearnerContent, 'id'>) })
          setLoading(false)
          return
        }

        const slugQuery = query(collection(db, 'viewerContent'), where('slug', '==', idParam), limit(1))
        const slugSnapshot = await getDocs(slugQuery)
        if (mounted && !slugSnapshot.empty) {
          const match = slugSnapshot.docs[0]
          setContent({ id: match.id, ...(match.data() as Omit<LearnerContent, 'id'>) })
          setLoading(false)
          return
        }

        const projectQuery = query(collection(db, 'viewerContent'), where('projectId', '==', idParam), limit(1))
        const projectSnapshot = await getDocs(projectQuery)
        if (mounted && !projectSnapshot.empty) {
          const match = projectSnapshot.docs[0]
          setContent({ id: match.id, ...(match.data() as Omit<LearnerContent, 'id'>) })
          setLoading(false)
          return
        }

        if (mounted) {
          setError(notFoundMessageFor(mode))
          setLoading(false)
        }
      } catch (loadError) {
        console.error(`Error loading ${mode} dashboard content:`, loadError)
        if (mounted) {
          setError(`Unable to load ${mode} dashboard right now.`)
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [idParam, mode, requestedContentId])

  const seriesLabel = useMemo(() => {
    if (!content?.areaId) return 'Viewer Series'
    return SERIES_LABELS[content.areaId] ?? content.areaId
  }, [content?.areaId])

  const locationLabel = useMemo(() => {
    const city = content?.geo?.cities?.[0]
    const state = content?.geo?.states?.[0]
    const region = content?.geo?.regions?.[0]
    if (city && state) return `${city}, ${state}`
    if (city) return city
    if (state) return state
    if (region) return region
    return 'Location not listed'
  }, [content?.geo])

  const backHref = useMemo(() => {
    if (content?.id) return `/viewer?contentId=${encodeURIComponent(content.id)}`
    if (requestedContentId) return `/viewer?contentId=${encodeURIComponent(requestedContentId)}`
    return '/viewer'
  }, [content?.id, requestedContentId])

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07080B] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(212,175,55,0.16),transparent_42%),radial-gradient(circle_at_82%_26%,rgba(68,110,150,0.24),transparent_36%),linear-gradient(135deg,rgba(9,10,15,0.92),rgba(8,10,18,0.9))]" />

      <div className="relative z-10 px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="rounded-2xl border border-white/15 bg-black/35 p-4 backdrop-blur-xl sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">BEAM Viewer</p>
                <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{title}</h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-[#D4AF37]/45 bg-[#D4AF37]/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F2D48D]">
                  {badgeLabel}
                </span>
                <Link
                  href={backHref}
                  className="inline-flex items-center rounded-full border border-white/30 bg-black/35 px-4 py-2 text-sm font-semibold text-white transition hover:border-[#D4AF37] hover:text-[#F5D37A]"
                >
                  Back to Viewer
                </Link>
              </div>
            </div>
          </header>

          {loading ? (
            <section className="rounded-2xl border border-white/15 bg-black/35 p-6 backdrop-blur-xl">
              Loading dashboard context...
            </section>
          ) : null}

          {!loading && error ? (
            <section className="rounded-2xl border border-red-400/35 bg-red-500/10 p-6 text-red-100">
              <p className="font-semibold">{error}</p>
              <Link href="/viewer" className="mt-3 inline-flex text-sm font-semibold text-[#F5D37A] hover:text-[#EACE7B]">
                Return to Viewer
              </Link>
            </section>
          ) : null}

          {!loading && !error && content ? (
            <>
              <section className="rounded-2xl border border-white/15 bg-black/35 p-6 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.14em] text-[#F5D37A]">Mission Header</p>
                <h2 className="mt-2 text-3xl font-semibold">{content.title || 'Untitled Piece'}</h2>
                <p className="mt-2 text-sm text-white/80">
                  Studying: {content.title || 'Untitled Piece'}
                  {content.composer ? ` by ${content.composer}` : ''}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm">Series: {seriesLabel}</div>
                  <div className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm">Location: {locationLabel}</div>
                  <div className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm">
                    Institution: {content.institutionName || 'Not listed'}
                  </div>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border border-white/15 bg-black/35 p-5 backdrop-blur-xl">
                  <p className="text-xs uppercase tracking-[0.12em] text-white/60">Progress</p>
                  <p className="mt-2 text-2xl font-semibold">0 pts</p>
                  <p className="mt-1 text-sm text-white/70">Streak: 0 days</p>
                  <p className="mt-1 text-sm text-white/70">Last activity: Not started</p>
                </article>
                <article className="rounded-2xl border border-white/15 bg-black/35 p-5 backdrop-blur-xl md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.12em] text-white/60">Action Tiles</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {actionTiles.map((tile) => (
                      <button
                        key={tile.title}
                        type="button"
                        className="rounded-xl border border-white/20 bg-black/35 px-4 py-3 text-left transition hover:border-[#D4AF37]"
                      >
                        <span className="block text-sm font-semibold text-white">{tile.title}</span>
                        <span className="mt-1 block text-xs text-white/65">{tile.subtitle}</span>
                      </button>
                    ))}
                  </div>
                </article>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function RoleDashboardPage(props: RoleDashboardPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center">
          <p className="text-sm uppercase tracking-[0.18em] text-white/70">Loading Dashboard...</p>
        </div>
      }
    >
      <RoleDashboardPageContent {...props} />
    </Suspense>
  )
}
