'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { addDoc, collection, doc, getDoc, getDocs, limit, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { normalizeViewerAreaRolesDoc, type ViewerAreaRolesDoc } from '@/lib/viewerAreaRoles'
import type { ViewerAreaId } from '@/lib/config/viewerRoleTemplates'

type RoleOverviewContent = {
  id: string
  areaId?: string
  sectionId?: string
  title?: string
  description?: string
  slug?: string
  projectId?: string
  roleId?: string
  roleTitle?: string
  roleDescription?: string
  tags?: string[]
  contentType?: string
  series?: string
  roleOverview?: {
    roleId?: string
    title?: string
    description?: string
    whatYouDo?: string[] | string
    requirements?: {
      time?: string
      skill?: string
      equipment?: string
    }
    whatYouGain?: string[] | string
  }
  whatYouDo?: string[] | string
  requirementsTime?: string
  requirementsSkill?: string
  requirementsEquipment?: string
  whatYouGain?: string[] | string
}

const AREA_LABELS: Record<ViewerAreaId, string> = {
  professional: 'Professional Orchestra',
  community: 'Repertoire Orchestra',
  chamber: 'Chamber Series',
  publishing: 'Publishing',
  business: 'The Business',
}

function isViewerAreaId(value: string): value is ViewerAreaId {
  return value in AREA_LABELS
}

function toArray(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0)
  }
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((item) => item.replace(/^[-*]\s*/, '').trim())
      .filter((item) => item.length > 0)
  }
  return []
}

export default function RoleOverviewPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const { user } = useUserRole()
  const idParam = decodeURIComponent(params.id || '')
  const requestedContentId = searchParams.get('contentId') || ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState<RoleOverviewContent | null>(null)
  const [areaRolesDoc, setAreaRolesDoc] = useState<ViewerAreaRolesDoc | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitState, setSubmitState] = useState<'idle' | 'success' | 'error'>('idle')
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!db || !idParam) {
      setLoading(false)
      if (!idParam) setError('Missing role overview identifier.')
      return
    }

    let mounted = true

    const load = async () => {
      setLoading(true)
      setError(null)
      setContent(null)
      setAreaRolesDoc(null)
      try {
        if (requestedContentId) {
          const explicitDoc = await getDoc(doc(db, 'viewerContent', requestedContentId))
          if (mounted && explicitDoc.exists()) {
            setContent({ id: explicitDoc.id, ...(explicitDoc.data() as Omit<RoleOverviewContent, 'id'>) })
            setLoading(false)
            return
          }
        }

        const direct = await getDoc(doc(db, 'viewerContent', idParam))
        if (mounted && direct.exists()) {
          setContent({ id: direct.id, ...(direct.data() as Omit<RoleOverviewContent, 'id'>) })
          setLoading(false)
          return
        }

        const slugQuery = query(collection(db, 'viewerContent'), where('slug', '==', idParam), limit(1))
        const slugSnapshot = await getDocs(slugQuery)
        if (mounted && !slugSnapshot.empty) {
          const match = slugSnapshot.docs[0]
          setContent({ id: match.id, ...(match.data() as Omit<RoleOverviewContent, 'id'>) })
          setLoading(false)
          return
        }

        const projectQuery = query(collection(db, 'viewerContent'), where('projectId', '==', idParam), limit(1))
        const projectSnapshot = await getDocs(projectQuery)
        if (mounted && !projectSnapshot.empty) {
          const match = projectSnapshot.docs[0]
          setContent({ id: match.id, ...(match.data() as Omit<RoleOverviewContent, 'id'>) })
          setLoading(false)
          return
        }

        if (isViewerAreaId(idParam)) {
          const areaRolesSnapshot = await getDoc(doc(db, 'viewerAreaRoles', idParam))
          const normalized = normalizeViewerAreaRolesDoc(
            idParam,
            areaRolesSnapshot.exists() ? (areaRolesSnapshot.data() as Partial<ViewerAreaRolesDoc>) : undefined
          )
          if (mounted) {
            setAreaRolesDoc(normalized)
            setLoading(false)
            return
          }
        }

        if (mounted) {
          setError('Role overview content not found.')
          setLoading(false)
        }
      } catch (loadError) {
        console.error('Error loading role overview content:', loadError)
        if (mounted) {
          setError('Unable to load role overview right now.')
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [idParam, requestedContentId])

  const roleTitle = useMemo(() => {
    return content?.roleOverview?.title || content?.roleTitle || content?.title || 'Role Overview'
  }, [content])

  const roleDescription = useMemo(() => {
    return (
      content?.roleOverview?.description ||
      content?.roleDescription ||
      content?.description ||
      'This role supports BEAM productions and learning pathways.'
    )
  }, [content])

  const whatYouDo = useMemo(() => {
    const fromContent = toArray(content?.roleOverview?.whatYouDo)
    if (fromContent.length > 0) return fromContent
    const fromTopLevel = toArray(content?.whatYouDo)
    if (fromTopLevel.length > 0) return fromTopLevel
    return [
      'Contribute to rehearsals and project checkpoints',
      'Collaborate with ensemble and production leads',
      'Support delivery standards across your assigned track',
    ]
  }, [content])

  const requirements = useMemo(() => {
    return {
      time:
        content?.roleOverview?.requirements?.time ||
        content?.requirementsTime ||
        'Expected weekly commitment varies by production cycle.',
      skill:
        content?.roleOverview?.requirements?.skill ||
        content?.requirementsSkill ||
        'Baseline musical or production readiness for the assigned track.',
      equipment:
        content?.roleOverview?.requirements?.equipment ||
        content?.requirementsEquipment ||
        'A reliable device, internet connection, and role-appropriate tools.',
    }
  }, [content])

  const whatYouGain = useMemo(() => {
    const fromContent = toArray(content?.roleOverview?.whatYouGain)
    if (fromContent.length > 0) return fromContent
    const fromTopLevel = toArray(content?.whatYouGain)
    if (fromTopLevel.length > 0) return fromTopLevel
    return ['Training pathways', 'Credits and portfolio visibility', 'Compensation opportunities', 'Network growth']
  }, [content])

  const backHref = useMemo(() => {
    if (areaRolesDoc?.areaId) return `/viewer?area=${encodeURIComponent(areaRolesDoc.areaId)}`
    if (content?.id) return `/viewer?contentId=${encodeURIComponent(content.id)}`
    if (requestedContentId) return `/viewer?contentId=${encodeURIComponent(requestedContentId)}`
    return '/viewer'
  }, [areaRolesDoc?.areaId, content?.id, requestedContentId])

  const submitRequest = async () => {
    if (!db || !content?.id || submitting) return
    setSubmitting(true)
    setSubmitState('idle')
    setSubmitMessage(null)
    try {
      await addDoc(collection(db, 'roleInterestRequests'), {
        roleId: content.roleOverview?.roleId || content.roleId || content.slug || content.id,
        contentId: content.id,
        userId: user?.uid ?? null,
        email: user?.email ?? null,
        createdAt: serverTimestamp(),
        status: 'new',
      })
      setSubmitState('success')
      setSubmitMessage('Request submitted. We will follow up with next steps.')
    } catch (submitError) {
      console.error('Error creating role interest request:', submitError)
      setSubmitState('error')
      setSubmitMessage('Unable to submit request right now. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07080B] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(212,175,55,0.12),transparent_40%),radial-gradient(circle_at_82%_20%,rgba(80,120,166,0.2),transparent_35%),linear-gradient(135deg,rgba(9,10,15,0.94),rgba(10,12,20,0.9))]" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-white/15 bg-black/35 p-5 backdrop-blur-xl">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">BEAM Viewer</p>
          <h1 className="mt-2 text-3xl font-semibold">Role Overview</h1>
        </header>

        {loading ? (
          <section className="mt-5 rounded-2xl border border-white/15 bg-black/35 p-6 backdrop-blur-xl">Loading role overview...</section>
        ) : null}

        {!loading && error ? (
          <section className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-red-100">
            <p className="font-semibold">{error}</p>
            <Link href="/viewer" className="mt-3 inline-flex text-sm font-semibold text-[#F5D37A] hover:text-[#EACE7B]">
              Return to Viewer
            </Link>
          </section>
        ) : null}

        {!loading && !error && content ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr,0.85fr]">
            <section className="space-y-5 rounded-2xl border border-white/15 bg-black/35 p-6 backdrop-blur-xl">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[#F5D37A]">Role</p>
                <h2 className="mt-2 text-3xl font-semibold">{roleTitle}</h2>
                <p className="mt-3 text-sm text-white/85">{roleDescription}</p>
              </div>

              <article>
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/75">What You Do</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/85">
                  {whatYouDo.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              <article>
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/75">Requirements</h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm">
                    <p className="text-[11px] uppercase tracking-[0.1em] text-[#F5D37A]">Time</p>
                    <p className="mt-1 text-white/85">{requirements.time}</p>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm">
                    <p className="text-[11px] uppercase tracking-[0.1em] text-[#F5D37A]">Skill</p>
                    <p className="mt-1 text-white/85">{requirements.skill}</p>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm">
                    <p className="text-[11px] uppercase tracking-[0.1em] text-[#F5D37A]">Equipment</p>
                    <p className="mt-1 text-white/85">{requirements.equipment}</p>
                  </div>
                </div>
              </article>

              <article>
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/75">What You Gain</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/85">
                  {whatYouGain.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            </section>

            <aside className="rounded-2xl border border-white/15 bg-black/35 p-6 backdrop-blur-xl">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#F5D37A]">Action</p>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  void submitRequest()
                }}
                className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-[#D4AF37] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#E6C86A] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Request to Join This Role'}
              </button>

              <Link
                href={backHref}
                className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-white/30 bg-black/25 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-[#D4AF37] hover:text-[#F5D37A]"
              >
                Back to Viewer
              </Link>

              {submitMessage ? (
                <p className={`mt-3 text-sm ${submitState === 'error' ? 'text-red-200' : 'text-white/85'}`}>{submitMessage}</p>
              ) : null}
            </aside>
          </div>
        ) : null}

        {!loading && !error && !content && areaRolesDoc ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr,0.85fr]">
            <section className="space-y-5 rounded-2xl border border-white/15 bg-black/35 p-6 backdrop-blur-xl">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[#F5D37A]">Area Roles</p>
                <h2 className="mt-2 text-3xl font-semibold">{AREA_LABELS[areaRolesDoc.areaId]} Roles</h2>
                <p className="mt-3 text-sm text-white/85">
                  Role slots currently available for this viewer area. Participant assignments happen through onboarding.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {areaRolesDoc.roles.map((role) => (
                  <article key={role.id} className="rounded-xl border border-white/15 bg-black/25 px-4 py-3">
                    <p className="text-sm font-semibold">{role.title}</p>
                    <p className="mt-1 text-sm text-white/80">{role.description || 'Role description not provided.'}</p>
                  </article>
                ))}
              </div>
            </section>
            <aside className="rounded-2xl border border-white/15 bg-black/35 p-6 backdrop-blur-xl">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#F5D37A]">Action</p>
              <Link
                href={backHref}
                className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-white/30 bg-black/25 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-[#D4AF37] hover:text-[#F5D37A]"
              >
                Back to Viewer
              </Link>
              {areaRolesDoc.explainerVideoUrl ? (
                <a
                  href={areaRolesDoc.explainerVideoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-[#D4AF37] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#E6C86A]"
                >
                  Open Roles Explainer Video
                </a>
              ) : null}
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  )
}
