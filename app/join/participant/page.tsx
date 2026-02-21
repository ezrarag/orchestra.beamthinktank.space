'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { createCommunityBookingInterest } from '@/lib/api/bookings'
import { setUserInstitutionAndInstrument } from '@/lib/api/users'
import type { ViewerAreaId } from '@/lib/config/viewerRoleTemplates'
import { loadViewerAreaRolesMap, type ViewerAreaRolesDoc } from '@/lib/viewerAreaRoles'
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore'

type ParticipantPathway = 'community' | 'institution' | 'admin'

const institutions = [
  { id: 'uwm', name: 'University of Wisconsin-Milwaukee' },
  { id: 'marquette', name: 'Marquette University' },
  { id: 'msoe', name: 'MSOE Conservatory Network' },
]

const communityOrchestras = [
  { id: 'mke-community-orchestra', name: 'Milwaukee Community Orchestra' },
  { id: 'north-side-strings', name: 'North Side Strings Collective' },
  { id: 'lakefront-chamber', name: 'Lakefront Chamber Ensemble' },
]

type ViewerAreaSummary = {
  id: ViewerAreaId
  title: string
  narrative: string
  sections: Array<{ id: string; title: string; summary: string }>
}

type ViewerContentPreview = {
  id: string
  areaId: ViewerAreaId
  title: string
  description: string
  sortOrder: number
}

type GuideFocus = 'mirror' | 'community' | 'institution' | 'admin' | 'publishing' | 'viewer'

type GuideStep = {
  id: string
  title: string
  description: string
  focus: GuideFocus
}

type PageGuideDoc = {
  pageKey?: string
  enabled?: boolean
  steps?: Array<Partial<GuideStep> & { order?: number }>
}

const PAGE_GUIDE_DOC_ID = 'join-participant'
const GUIDE_DISABLED_KEY = 'guide-disabled:join-participant'

const defaultGuideSteps: GuideStep[] = [
  {
    id: 'step-1',
    title: 'Start With The Viewer Mirror',
    description:
      'Each card maps directly to a Viewer area so the structure stays consistent while you decide where to join.',
    focus: 'mirror',
  },
  {
    id: 'step-2',
    title: 'Choose Join Admin/Staff Or Contribute Material',
    description:
      'Use each area card action buttons to pick staff interest or material contribution before final onboarding.',
    focus: 'admin',
  },
  {
    id: 'step-3',
    title: 'Contribute Material In Context',
    description:
      'Publishing routes to publishing sign-up; other areas route to viewer submissions for that module.',
    focus: 'publishing',
  },
  {
    id: 'step-4',
    title: 'Finalize Participant Pathway',
    description:
      'Complete Community, Institution, or Administrative onboarding so your role request is written to Firestore.',
    focus: 'institution',
  },
]

const viewerAreaSummaries: ViewerAreaSummary[] = [
  {
    id: 'professional',
    title: 'Professional Orchestra',
    narrative: 'Flagship performance narrative and contract ensemble tracks.',
    sections: [
      { id: 'pro-origin', title: 'Origin Stories', summary: 'Season concept to launch.' },
      { id: 'pro-rehearsal', title: 'Rehearsal Intelligence', summary: 'Conductor and section process notes.' },
      { id: 'pro-premieres', title: 'Premiere Nights', summary: 'Curated multicam performance captures.' },
    ],
  },
  {
    id: 'community',
    title: 'Community Orchestra',
    narrative: 'Neighborhood ensembles, schools, and local partner collaborations.',
    sections: [
      { id: 'community-lead', title: 'Community Leads', summary: 'Participant-led stories and performances.' },
      { id: 'community-stages', title: 'Regional Stages', summary: 'City/state location-aware performance rails.' },
      { id: 'community-youth', title: 'Youth + Mentor Tracks', summary: 'Intergenerational learning pathways.' },
    ],
  },
  {
    id: 'chamber',
    title: 'Chamber Series',
    narrative: 'Small ensemble narratives from rehearsal draft to release.',
    sections: [
      { id: 'chamber-cycle', title: 'Cycle Releases', summary: 'Program arcs in chapter format.' },
      { id: 'chamber-process', title: 'Process Room', summary: 'Versioned rehearsal and interpretation edits.' },
      { id: 'chamber-archive', title: 'Archive Selects', summary: 'Regional anthology content.' },
    ],
  },
  {
    id: 'publishing',
    title: 'Publishing',
    narrative: 'Compose, arrange, edit, and publish collaborative works.',
    sections: [
      { id: 'publishing-main', title: 'Publishing Main', summary: 'Active scores and publishing projects.' },
      { id: 'publishing-catalog', title: 'Catalog Highlights', summary: 'Featured releases across markets.' },
      { id: 'publishing-scholarship', title: 'Scholarship Notes', summary: 'Composer context and educational notes.' },
    ],
  },
  {
    id: 'business',
    title: 'The Business',
    narrative: 'Operations, partnerships, development, and impact reporting.',
    sections: [
      { id: 'business-partnerships', title: 'Partnership Diaries', summary: 'Institution and sponsor strategy.' },
      { id: 'business-production', title: 'Production Logic', summary: 'Workflow and delivery governance.' },
      { id: 'business-impact', title: 'Impact Reports', summary: 'Audience and outcome metrics.' },
    ],
  },
]

export default function JoinParticipantPage() {
  const router = useRouter()
  const { user, role, loading } = useUserRole()
  const [viewerAreaRolesMap, setViewerAreaRolesMap] = useState<Record<ViewerAreaId, ViewerAreaRolesDoc> | null>(null)
  const [viewerContentByArea, setViewerContentByArea] = useState<Record<ViewerAreaId, ViewerContentPreview[]>>({
    professional: [],
    community: [],
    chamber: [],
    publishing: [],
    business: [],
  })
  const [selectedPathway, setSelectedPathway] = useState<ParticipantPathway | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guideSteps, setGuideSteps] = useState<GuideStep[]>(defaultGuideSteps)
  const [guideEnabled, setGuideEnabled] = useState(true)
  const [guideOpen, setGuideOpen] = useState(false)
  const [guideIndex, setGuideIndex] = useState(0)
  const [guideDisabled, setGuideDisabled] = useState(false)
  const [guideLoading, setGuideLoading] = useState(true)
  const [showGuideEditor, setShowGuideEditor] = useState(false)
  const [editingGuideSteps, setEditingGuideSteps] = useState<GuideStep[]>(defaultGuideSteps)
  const [savingGuide, setSavingGuide] = useState(false)
  const [guideSaveError, setGuideSaveError] = useState<string | null>(null)

  const [institutionId, setInstitutionId] = useState('')
  const [institutionInstrument, setInstitutionInstrument] = useState('')
  const [institutionRole, setInstitutionRole] = useState('')

  const [communityInstrument, setCommunityInstrument] = useState('')
  const isParticipantOrAdmin =
    role === 'musician' || role === 'beam_admin' || role === 'partner_admin' || role === 'board'
  const canEditGuide = role === 'beam_admin' || role === 'partner_admin'

  useEffect(() => {
    if (!db) return
    let mounted = true
    const load = async () => {
      try {
        const map = await loadViewerAreaRolesMap(db)
        if (!mounted) return
        setViewerAreaRolesMap(map)
      } catch (error) {
        console.error('Error loading viewer area role templates:', error)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const disabled = window.localStorage.getItem(GUIDE_DISABLED_KEY) === '1'
    setGuideDisabled(disabled)
  }, [])

  useEffect(() => {
    if (!db) {
      setGuideLoading(false)
      setGuideOpen(!guideDisabled)
      return
    }
    let mounted = true

    const loadGuide = async () => {
      try {
        const guideSnap = await getDoc(doc(db, 'pageGuides', PAGE_GUIDE_DOC_ID))
        if (!mounted) return

        if (guideSnap.exists()) {
          const data = guideSnap.data() as PageGuideDoc
          const nextEnabled = data.enabled !== false
          const rawSteps = Array.isArray(data.steps) ? data.steps : []
          const normalized = rawSteps
            .map((step, index) => ({
              id: typeof step.id === 'string' && step.id.trim() ? step.id : `step-${index + 1}`,
              title: typeof step.title === 'string' ? step.title.trim() : '',
              description: typeof step.description === 'string' ? step.description.trim() : '',
              focus: (step.focus as GuideFocus) || 'mirror',
              order: typeof step.order === 'number' ? step.order : index + 1,
            }))
            .filter((step) => step.title && step.description)
            .sort((a, b) => a.order - b.order)
            .map(({ id, title, description, focus }) => ({ id, title, description, focus }))

          if (normalized.length > 0) {
            setGuideSteps(normalized)
            setEditingGuideSteps(normalized)
          }
          setGuideEnabled(nextEnabled)
        }
      } catch (error) {
        console.error('Error loading page guide:', error)
      } finally {
        if (mounted) {
          setGuideLoading(false)
        }
      }
    }

    void loadGuide()
    return () => {
      mounted = false
    }
  }, [guideDisabled])

  useEffect(() => {
    if (guideLoading) return
    if (!guideEnabled || guideDisabled || guideSteps.length === 0) return
    setGuideOpen(true)
  }, [guideLoading, guideEnabled, guideDisabled, guideSteps.length])

  useEffect(() => {
    if (!guideOpen) return
    const current = guideSteps[guideIndex]
    if (!current) return

    if (current.focus === 'community') {
      setSelectedPathway('community')
    } else if (current.focus === 'institution') {
      setSelectedPathway('institution')
    } else if (current.focus === 'admin') {
      setSelectedPathway('admin')
    }
  }, [guideOpen, guideIndex, guideSteps])

  useEffect(() => {
    if (!db) return
    let mounted = true

    const loadViewerContent = async () => {
      try {
        const contentQuery = query(collection(db, 'viewerContent'), where('isPublished', '==', true))
        const snapshot = await getDocs(contentQuery)
        if (!mounted) return

        const next: Record<ViewerAreaId, ViewerContentPreview[]> = {
          professional: [],
          community: [],
          chamber: [],
          publishing: [],
          business: [],
        }

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>
          const areaId = data.areaId as ViewerAreaId
          if (!(areaId in next)) return

          next[areaId].push({
            id: docSnap.id,
            areaId,
            title: typeof data.title === 'string' ? data.title : 'Untitled',
            description: typeof data.description === 'string' ? data.description : '',
            sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 999,
          })
        })

        ;(Object.keys(next) as ViewerAreaId[]).forEach((areaId) => {
          next[areaId].sort((a, b) => a.sortOrder - b.sortOrder)
        })

        setViewerContentByArea(next)
      } catch (error) {
        console.error('Error loading viewer content for participant mirror:', error)
      }
    }

    void loadViewerContent()
    return () => {
      mounted = false
    }
  }, [])

  const institutionRoleOptions = useMemo(() => {
    const roleList = [
      ...(viewerAreaRolesMap?.professional?.roles ?? []),
      ...(viewerAreaRolesMap?.chamber?.roles ?? []),
      ...(viewerAreaRolesMap?.publishing?.roles ?? []),
    ]
    const unique = new Map<string, { value: string; label: string }>()
    roleList.forEach((role) => {
      if (!unique.has(role.id)) {
        unique.set(role.id, { value: role.id, label: role.title })
      }
    })
    return Array.from(unique.values())
  }, [viewerAreaRolesMap])

  const currentGuideStep = guideSteps[guideIndex] ?? null

  useEffect(() => {
    if (!institutionRole && institutionRoleOptions.length > 0) {
      setInstitutionRole(institutionRoleOptions[0].value)
    }
  }, [institutionRole, institutionRoleOptions])

  const handleInstitutionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!user) {
      setError('Please sign in to continue.')
      return
    }

    if (!institutionId) {
      setError('Institution is required.')
      return
    }

    if (!institutionInstrument.trim()) {
      setError('Instrument is required for performer pathways.')
      return
    }

    setSubmitting(true)
    try {
      await setUserInstitutionAndInstrument(user.uid, {
        institutionId,
        instrument: institutionInstrument.trim(),
        preferredRoles: [institutionRole],
      })
      router.push('/dashboard')
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save your participant profile.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCommunityApply = async (orchestraId: string, orchestraName: string) => {
    setError(null)

    if (!user) {
      setError('Please sign in to continue.')
      return
    }

    if (!communityInstrument.trim()) {
      setError('Instrument is required for performer pathways.')
      return
    }

    setSubmitting(true)
    try {
      await createCommunityBookingInterest({
        orchestraId,
        orchestraName,
        instrument: communityInstrument.trim(),
      })
      router.push('/dashboard')
      router.refresh()
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Failed to submit your community orchestra application.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleDisableGuide = () => {
    setGuideOpen(false)
    setGuideDisabled(true)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(GUIDE_DISABLED_KEY, '1')
    }
  }

  const handleEnableGuide = () => {
    setGuideDisabled(false)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(GUIDE_DISABLED_KEY)
    }
    if (guideEnabled && guideSteps.length > 0) {
      setGuideIndex(0)
      setGuideOpen(true)
    }
  }

  const saveGuideConfig = async () => {
    if (!db || !user || !canEditGuide) {
      setGuideSaveError('Only admin users can save guide changes.')
      return
    }

    const cleaned = editingGuideSteps
      .map((step, index) => ({
        id: step.id.trim() || `step-${index + 1}`,
        title: step.title.trim(),
        description: step.description.trim(),
        focus: step.focus,
        order: index + 1,
      }))
      .filter((step) => step.title && step.description)

    if (cleaned.length === 0) {
      setGuideSaveError('Add at least one guide step before saving.')
      return
    }

    setSavingGuide(true)
    setGuideSaveError(null)
    try {
      await setDoc(
        doc(db, 'pageGuides', PAGE_GUIDE_DOC_ID),
        {
          pageKey: PAGE_GUIDE_DOC_ID,
          enabled: guideEnabled,
          steps: cleaned,
          updatedBy: user.uid,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
      setGuideSteps(cleaned.map(({ id, title, description, focus }) => ({ id, title, description, focus })))
      setShowGuideEditor(false)
      setGuideIndex(0)
    } catch (error) {
      console.error('Error saving guide configuration:', error)
      setGuideSaveError('Failed to save guide configuration.')
    } finally {
      setSavingGuide(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-8">
          <p className="text-white/80">Loading participant onboarding...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/home" className="mb-6 inline-flex items-center gap-2 text-sm text-white/70 hover:text-[#D4AF37]">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
          <h1 className="text-3xl font-bold">BEAM Orchestra</h1>
          <p className="mt-2 text-lg text-[#F0D68A]">Become a Participant</p>
          <p className="mt-3 text-white/80">
            Choose how you would like to get involved, then complete the matching onboarding step.
          </p>
          {!isParticipantOrAdmin && (
            <p className="mt-2 text-sm text-white/60">
              You are currently in viewer mode. You can still submit a participant onboarding request.
            </p>
          )}
          {!user && (
            <div className="mt-4 rounded-lg border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-4 py-3 text-sm text-[#F6E6A8]">
              You are browsing as a viewer. Sign in is only required when you submit an action.
              <Link href="/sign-in" className="ml-2 font-semibold underline underline-offset-4 hover:text-white">
                Sign In
              </Link>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-semibold text-[#F0D68A]">Participant Mirror of Viewer Structure</p>
            <p className="mt-1 text-sm text-white/75">
              This mirrors `/viewer` so each area has clear participant actions: join admin/staff or contribute material.
            </p>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {viewerAreaSummaries.map((area) => (
                <div key={area.id} className="rounded-xl border border-white/10 bg-black/25 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-white/60">{area.id}</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{area.title}</h3>
                  <p className="mt-1 text-sm text-white/75">{area.narrative}</p>

                  <div className="mt-3 space-y-1">
                    {area.sections.map((section) => (
                      <p key={section.id} className="text-xs text-white/70">
                        <span className="font-semibold text-white/85">{section.title}:</span> {section.summary}
                      </p>
                    ))}
                  </div>

                  <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/60">Pulled From Viewer Content</p>
                    {viewerContentByArea[area.id].length > 0 ? (
                      <ul className="mt-2 space-y-1 text-sm text-white/80">
                        {viewerContentByArea[area.id].slice(0, 3).map((item) => (
                          <li key={item.id}>{item.title}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-white/60">No published entries loaded for this area yet.</p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        router.push(`/join/admin-staff?areas=${area.id}`)
                      }}
                      className="inline-flex items-center justify-center rounded-lg bg-[#D4AF37] px-3 py-2 text-sm font-semibold text-black hover:bg-[#E5C86A]"
                    >
                      Join Admin/Staff
                    </button>
                    <Link
                      href={area.id === 'publishing' ? '/publishing/signup' : `/studio/viewer-submissions?area=${area.id}`}
                      className="inline-flex items-center justify-center rounded-lg border border-white/25 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                    >
                      Contribute Material
                    </Link>
                    <Link
                      href={`/viewer/module/${area.id}`}
                      className="inline-flex items-center justify-center rounded-lg border border-white/25 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                    >
                      Browse in Viewer
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() => {
                setSelectedPathway('community')
                setError(null)
              }}
              className={`rounded-xl border px-4 py-4 text-left transition ${
                selectedPathway === 'community'
                  ? 'border-[#D4AF37] bg-[#D4AF37]/15'
                  : 'border-white/15 bg-black/20 hover:border-white/30'
              }`}
            >
              <p className="font-semibold">Community Orchestra Performer</p>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedPathway('institution')
                setError(null)
              }}
              className={`rounded-xl border px-4 py-4 text-left transition ${
                selectedPathway === 'institution'
                  ? 'border-[#D4AF37] bg-[#D4AF37]/15'
                  : 'border-white/15 bg-black/20 hover:border-white/30'
              }`}
            >
              <p className="font-semibold">Institution Performer/Recorder</p>
            </button>
            <button
              type="button"
              onClick={() => {
                router.push('/join/admin-staff')
              }}
              className={`rounded-xl border px-4 py-4 text-left transition ${
                selectedPathway === 'admin'
                  ? 'border-[#D4AF37] bg-[#D4AF37]/15'
                  : 'border-white/15 bg-black/20 hover:border-white/30'
              }`}
            >
              <p className="font-semibold">Administrative / Other Roles</p>
            </button>
          </div>

          {viewerAreaRolesMap ? (
            <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-semibold text-[#F0D68A]">Role Tracks By Slide Area</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {(Object.entries(viewerAreaRolesMap) as Array<[ViewerAreaId, ViewerAreaRolesDoc]>).map(([areaId, areaDoc]) => (
                  <div key={areaId} className="rounded-lg border border-white/10 bg-black/25 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/60">{areaId}</p>
                    <p className="mt-1 text-sm text-white/85">
                      {areaDoc.roles.slice(0, 4).map((role) => role.title).join(', ')}
                      {areaDoc.roles.length > 4 ? '...' : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {error && (
            <div className="mt-6 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {selectedPathway === 'institution' && (
            <form className="mt-6 space-y-4 rounded-xl border border-white/10 bg-black/25 p-5" onSubmit={handleInstitutionSubmit}>
              <h2 className="text-xl font-semibold">Institution Performer/Recorder</h2>
              <label className="block">
                <span className="mb-1 block text-sm text-white/80">Institution</span>
                <select
                  value={institutionId}
                  onChange={(event) => setInstitutionId(event.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                >
                  <option value="">Select an institution</option>
                  {institutions.map((institution) => (
                    <option key={institution.id} value={institution.id}>
                      {institution.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-white/80">Instrument</span>
                <input
                  value={institutionInstrument}
                  onChange={(event) => setInstitutionInstrument(event.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                  placeholder="Violin, Cello, Flute, etc."
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-white/80">Preferred Role</span>
                <select
                  value={institutionRole}
                  onChange={(event) => setInstitutionRole(event.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                >
                  {institutionRoleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                  {institutionRoleOptions.length === 0 ? <option value="">No roles available</option> : null}
                </select>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-lg bg-[#D4AF37] px-5 py-3 font-semibold text-black hover:bg-[#E5C86A] disabled:opacity-70"
              >
                {submitting ? 'Saving...' : 'Save and Continue'}
              </button>
            </form>
          )}

          {selectedPathway === 'community' && (
            <div className="mt-6 space-y-4 rounded-xl border border-white/10 bg-black/25 p-5">
              <h2 className="text-xl font-semibold">Community Orchestra Performer</h2>
              <label className="block">
                <span className="mb-1 block text-sm text-white/80">Instrument</span>
                <input
                  value={communityInstrument}
                  onChange={(event) => setCommunityInstrument(event.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                  placeholder="Violin, Cello, Percussion, etc."
                />
              </label>

              <div className="space-y-3">
                {communityOrchestras.map((orchestra) => (
                  <div
                    key={orchestra.id}
                    className="flex flex-col gap-3 rounded-lg border border-white/15 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="font-medium text-white/90">{orchestra.name}</p>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleCommunityApply(orchestra.id, orchestra.name)}
                      className="inline-flex items-center justify-center rounded-lg bg-[#D4AF37] px-4 py-2.5 font-semibold text-black hover:bg-[#E5C86A] disabled:opacity-70"
                    >
                      {submitting ? 'Submitting...' : 'Apply'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </section>
      </div>

      {guideOpen && currentGuideStep && (
        <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm rounded-2xl border border-[#D4AF37]/35 bg-black/90 p-4 shadow-2xl backdrop-blur-md sm:bottom-6 sm:right-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[#F0D68A]">
              Participant Guide {guideIndex + 1}/{guideSteps.length}
            </p>
            <button
              type="button"
              onClick={() => setGuideOpen(false)}
              className="text-xs font-semibold text-white/70 hover:text-white"
            >
              Close
            </button>
          </div>
          <h3 className="mt-2 text-base font-semibold text-white">{currentGuideStep.title}</h3>
          <p className="mt-1 text-sm text-white/80">{currentGuideStep.description}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setGuideIndex((prev) => Math.max(0, prev - 1))}
              disabled={guideIndex === 0}
              className="rounded-lg border border-white/25 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (guideIndex >= guideSteps.length - 1) {
                  setGuideOpen(false)
                  return
                }
                setGuideIndex((prev) => Math.min(guideSteps.length - 1, prev + 1))
              }}
              className="rounded-lg bg-[#D4AF37] px-3 py-2 text-xs font-semibold text-black hover:bg-[#E5C86A]"
            >
              {guideIndex >= guideSteps.length - 1 ? 'Finish' : 'Next'}
            </button>
            {!guideDisabled ? (
              <button
                type="button"
                onClick={handleDisableGuide}
                className="rounded-lg border border-white/25 px-3 py-2 text-xs font-semibold text-white"
              >
                Turn Off On Load
              </button>
            ) : null}
            {canEditGuide ? (
              <button
                type="button"
                onClick={() => {
                  setEditingGuideSteps(guideSteps)
                  setGuideSaveError(null)
                  setShowGuideEditor(true)
                }}
                className="rounded-lg border border-[#D4AF37]/45 px-3 py-2 text-xs font-semibold text-[#F0D68A]"
              >
                Edit Guide
              </button>
            ) : null}
          </div>
        </div>
      )}

      {!guideOpen && (
        <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
          <div className="flex items-center gap-2">
            {guideDisabled ? (
              <button
                type="button"
                onClick={handleEnableGuide}
                className="rounded-full border border-[#D4AF37]/45 bg-black/80 px-3 py-2 text-xs font-semibold text-[#F0D68A]"
              >
                Enable Helper
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (guideSteps.length === 0) return
                setGuideIndex(0)
                setGuideOpen(true)
              }}
              className="rounded-full border border-white/25 bg-black/80 px-3 py-2 text-xs font-semibold text-white hover:border-[#D4AF37]"
            >
              Open Helper
            </button>
          </div>
        </div>
      )}

      {showGuideEditor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-white/15 bg-[#0A0A0A] p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">Edit Participant Guide Overlay</h3>
              <button
                type="button"
                onClick={() => setShowGuideEditor(false)}
                className="text-sm font-semibold text-white/70 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <label className="text-sm text-white/80">Guide Enabled</label>
              <input
                type="checkbox"
                checked={guideEnabled}
                onChange={(event) => setGuideEnabled(event.target.checked)}
                className="h-4 w-4"
              />
            </div>

            <div className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
              {editingGuideSteps.map((step, index) => (
                <div key={`${step.id}-${index}`} className="rounded-lg border border-white/15 bg-black/40 p-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs text-white/70">Title</span>
                      <input
                        value={step.title}
                        onChange={(event) =>
                          setEditingGuideSteps((prev) =>
                            prev.map((item, row) => (row === index ? { ...item, title: event.target.value } : item)),
                          )
                        }
                        className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-white/70">Focus</span>
                      <select
                        value={step.focus}
                        onChange={(event) =>
                          setEditingGuideSteps((prev) =>
                            prev.map((item, row) =>
                              row === index ? { ...item, focus: event.target.value as GuideFocus } : item,
                            ),
                          )
                        }
                        className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white"
                      >
                        <option value="mirror">mirror</option>
                        <option value="community">community</option>
                        <option value="institution">institution</option>
                        <option value="admin">admin</option>
                        <option value="publishing">publishing</option>
                        <option value="viewer">viewer</option>
                      </select>
                    </label>
                  </div>
                  <label className="mt-3 block">
                    <span className="mb-1 block text-xs text-white/70">Description</span>
                    <textarea
                      rows={2}
                      value={step.description}
                      onChange={(event) =>
                        setEditingGuideSteps((prev) =>
                          prev.map((item, row) => (row === index ? { ...item, description: event.target.value } : item)),
                        )
                      }
                      className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingGuideSteps((prev) => prev.filter((_, row) => row !== index))
                      }
                      className="rounded-lg border border-red-400/40 px-2 py-1 text-xs font-semibold text-red-200"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {guideSaveError ? (
              <p className="mt-3 text-sm text-red-300">{guideSaveError}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setEditingGuideSteps((prev) => [
                    ...prev,
                    {
                      id: `step-${prev.length + 1}`,
                      title: 'New Step',
                      description: 'Describe what the user should do.',
                      focus: 'mirror',
                    },
                  ])
                }
                className="rounded-lg border border-white/25 px-3 py-2 text-sm font-semibold text-white"
              >
                Add Step
              </button>
              <button
                type="button"
                onClick={saveGuideConfig}
                disabled={savingGuide}
                className="rounded-lg bg-[#D4AF37] px-3 py-2 text-sm font-semibold text-black hover:bg-[#E5C86A] disabled:opacity-60"
              >
                {savingGuide ? 'Saving...' : 'Save Guide'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
