'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { signInWithCustomToken, signOut } from 'firebase/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import ParticipantShell from '@/components/participant/ParticipantShell'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { auth, db } from '@/lib/firebase'
import { createAdminStaffJoinRequest, type AdminStaffAreaSelectionPayload } from '@/lib/api/adminStaff'
import {
  clearBeamReturnHash,
  clearPendingAdminStaffJoin,
  readBeamReturnIdTokenFromHash,
  readPendingAdminStaffJoin,
} from '@/lib/beamHome'
import { fetchCommitments, fetchOpenCalls, fetchUserProfile } from '@/lib/api'
import {
  claimExistingContributions,
  getContributionClaimStorageKey,
  markContributionClaimed,
  writeCachedParticipantRole,
  writeCachedParticipantRoles,
} from '@/lib/participantOnboarding'
import { resolvePortalPath } from '@/lib/portal/routes'
import { OpenCallCard, SessionCard } from '@/components/portal/SessionCard'
import { PARTICIPANT_UI } from '@/components/participant/ui'
import type { CommitmentSummary, OpenCallSummary, UserProfileSummary } from '@/lib/types/portal'
import type { ViewerAreaId } from '@/lib/config/viewerRoleTemplates'
import { loadViewerAreaRolesMap, type ViewerAreaRolesDoc } from '@/lib/viewerAreaRoles'

interface ParticipantDashboardClientProps {
  ngo: string
  scopedRoutes?: boolean
  copy: {
    title: string
    schedule: string
    openCalls: string
    profile: string
  }
}

const AREA_TITLES: Record<ViewerAreaId, string> = {
  professional: 'Professional Orchestra',
  community: 'Repertoire Orchestra',
  chamber: 'Chamber Series',
  publishing: 'Publishing',
  business: 'The Business',
}

export default function ParticipantDashboardClient({
  ngo,
  scopedRoutes = false,
  copy,
}: ParticipantDashboardClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useUserRole({ allowAdminBypass: false })
  const allowTestAccess = process.env.NODE_ENV !== 'production'
  const [commitments, setCommitments] = useState<CommitmentSummary[]>([])
  const [openCalls, setOpenCalls] = useState<OpenCallSummary[]>([])
  const [profile, setProfile] = useState<UserProfileSummary | null>(null)
  const [viewerAreaRolesMap, setViewerAreaRolesMap] = useState<Record<ViewerAreaId, ViewerAreaRolesDoc> | null>(null)
  const [dashboardDataLoading, setDashboardDataLoading] = useState(false)
  const [beamReturnStatus, setBeamReturnStatus] = useState<'idle' | 'processing' | 'ready' | 'error'>('idle')
  const [beamReturnError, setBeamReturnError] = useState<string | null>(null)
  const [adminStaffResumeStatus, setAdminStaffResumeStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [adminStaffResumeError, setAdminStaffResumeError] = useState<string | null>(null)
  const [restoredSelections, setRestoredSelections] = useState<AdminStaffAreaSelectionPayload[]>([])
  const [signingOut, setSigningOut] = useState(false)

  const selectedAreaIds = useMemo(() => {
    const raw = searchParams.get('areas')
    if (!raw) return []

    return raw
      .split(',')
      .map((item) => item.trim())
      .filter((item): item is ViewerAreaId => item in AREA_TITLES)
  }, [searchParams])

  const isAdminStaffReturn = searchParams.get('intent') === 'admin-staff'

  const participantLabel = useMemo(() => {
    if (profile?.name?.trim()) return profile.name.trim()
    if (user?.displayName?.trim()) return user.displayName.trim()
    if (user?.email?.trim()) return user.email.trim()
    return 'Participant'
  }, [profile?.name, user?.displayName, user?.email])

  useEffect(() => {
    const beamIdToken = readBeamReturnIdTokenFromHash()
    if (!beamIdToken) return

    if (!auth) {
      setBeamReturnStatus('error')
      setBeamReturnError('Firebase Auth is not available to complete the BEAM return.')
      return
    }

    let cancelled = false

    const completeBeamReturn = async () => {
      setBeamReturnStatus('processing')
      setBeamReturnError(null)

      try {
        if (!auth.currentUser) {
          const response = await fetch('/api/auth/beam-handoff', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              idToken: beamIdToken,
            }),
          })

          const payload = (await response.json().catch(() => ({}))) as { customToken?: string; error?: string }
          if (!response.ok || !payload.customToken) {
            throw new Error(payload.error || 'Unable to exchange the BEAM authentication token.')
          }

          await signInWithCustomToken(auth, payload.customToken)
        }

        clearBeamReturnHash()

        if (!cancelled) {
          setBeamReturnStatus('ready')
        }
      } catch (error) {
        if (!cancelled) {
          setBeamReturnStatus('error')
          setBeamReturnError(error instanceof Error ? error.message : 'Unable to complete BEAM sign-in.')
        }
      }
    }

    void completeBeamReturn()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!user && !allowTestAccess) return

    let cancelled = false
    setDashboardDataLoading(true)

    const load = async () => {
      try {
        const [nextCommitments, nextCalls, nextProfile] = await Promise.all([
          fetchCommitments(ngo, user?.uid),
          fetchOpenCalls(ngo),
          fetchUserProfile(ngo, user?.uid),
        ])
        if (cancelled) return
        setCommitments(nextCommitments)
        setOpenCalls(nextCalls)
        setProfile(nextProfile)
      } finally {
        if (!cancelled) {
          setDashboardDataLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [allowTestAccess, ngo, user])

  useEffect(() => {
    if (!user?.uid) return
    const nextRoles = (profile?.membershipRoles ?? []).map((role) => role.trim()).filter(Boolean)
    if (nextRoles.length > 0) {
      writeCachedParticipantRoles(user.uid, nextRoles)
      return
    }

    const nextRole = profile?.membershipRole?.trim()
    if (!nextRole) return
    writeCachedParticipantRole(user.uid, nextRole)
  }, [profile?.membershipRole, profile?.membershipRoles, user?.uid])

  useEffect(() => {
    if (!db) return
    let mounted = true

    const loadRoles = async () => {
      try {
        const rolesMap = await loadViewerAreaRolesMap(db)
        if (!mounted) return
        setViewerAreaRolesMap(rolesMap)
      } catch (error) {
        console.error('Unable to load viewer role tracks for dashboard:', error)
      }
    }

    void loadRoles()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!isAdminStaffReturn || loading || beamReturnStatus === 'processing' || !user) return
    if (adminStaffResumeStatus !== 'idle') return

    const pendingJoin = readPendingAdminStaffJoin()
    if (!pendingJoin || pendingJoin.selections.length === 0) return

    let cancelled = false

    const submitRestoredCart = async () => {
      setRestoredSelections(pendingJoin.selections)
      setAdminStaffResumeStatus('submitting')
      setAdminStaffResumeError(null)

      try {
        await createAdminStaffJoinRequest({
          selections: pendingJoin.selections,
        })

        clearPendingAdminStaffJoin()

        if (!cancelled) {
          setAdminStaffResumeStatus('success')
        }
      } catch (error) {
        if (!cancelled) {
          setAdminStaffResumeStatus('error')
          setAdminStaffResumeError(error instanceof Error ? error.message : 'Unable to restore your admin/staff cart.')
        }
      }
    }

    void submitRestoredCart()

    return () => {
      cancelled = true
    }
  }, [adminStaffResumeStatus, beamReturnStatus, isAdminStaffReturn, loading, user])

  useEffect(() => {
    if (loading || !user?.uid) return
    const membershipRoles = (profile?.membershipRoles ?? []).map((role) => role.trim()).filter(Boolean)
    const membershipRole = profile?.membershipRole?.trim()
    if (membershipRoles.length === 0 && !membershipRole) return
    if (typeof window === 'undefined') return

    const claimStorageKey = getContributionClaimStorageKey(user.uid)
    if (window.localStorage.getItem(claimStorageKey) === 'true') return

    let cancelled = false

    const claim = async () => {
      try {
        await claimExistingContributions(user.uid, [user.email ?? ''])
        if (!cancelled) {
          markContributionClaimed(user.uid)
        }
      } catch (error) {
        console.error('Unable to claim existing participant contributions:', error)
      }
    }

    void claim()

    return () => {
      cancelled = true
    }
  }, [loading, profile?.membershipRole, profile?.membershipRoles, user?.email, user?.uid])

  const handleSignOut = async () => {
    if (!auth) return

    setSigningOut(true)

    try {
      await signOut(auth)
      router.push(resolvePortalPath('/home', ngo, scopedRoutes))
    } catch (error) {
      console.error('Unable to sign out participant:', error)
      setSigningOut(false)
    }
  }

  return (
    <ParticipantShell
      title="Participant Dashboard"
      subtitle="Schedule, calls, profile context, and role tracks in one workspace."
      membershipRole={profile?.membershipRole ?? null}
      membershipRoles={profile?.membershipRoles ?? null}
      membershipRoleLoading={Boolean(user && dashboardDataLoading && !profile?.membershipRole?.trim())}
    >
      {loading || beamReturnStatus === 'processing' ? (
        <div className="mx-auto max-w-6xl px-4 py-10 text-white/80 sm:px-6">Loading dashboard...</div>
      ) : !user && !allowTestAccess ? (
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <h1 className="text-3xl font-semibold text-white">{copy.title}</h1>
          <p className="mt-3 text-white/70">
            {beamReturnError
              ? beamReturnError
              : 'This route is protected. Sign in to access participant scheduling and opportunities.'}
          </p>
          <Link
            href={resolvePortalPath('/home', ngo, scopedRoutes)}
            className="mt-6 inline-flex rounded-lg bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-black hover:bg-[#E5C86A]"
          >
            Return Home
          </Link>
        </div>
      ) : (
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-3">
          {user ? (
            <div className="flex justify-end lg:col-span-3">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="inline-flex rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {signingOut ? 'Signing out...' : 'Log Out'}
              </button>
            </div>
          ) : null}

          {(isAdminStaffReturn || selectedAreaIds.length > 0 || beamReturnStatus === 'ready') && (
            <section className={`${PARTICIPANT_UI.card} lg:col-span-3`}>
              <h2 className="text-xl font-semibold text-white">BEAM Return</h2>
              <p className="mt-2 text-sm text-white/70">
                You came through the shared BEAM login flow and were tagged to `orchestra.beamthinktank.space`.
              </p>
              {adminStaffResumeStatus === 'submitting' ? (
                <p className="mt-3 text-sm text-[#F0D68A]">Restoring your admin/staff cart and submitting it now.</p>
              ) : null}
              {adminStaffResumeStatus === 'success' ? (
                <p className="mt-3 text-sm text-emerald-300">
                  Your admin/staff cart was submitted. Use the area shortcuts below to keep working in the spaces you picked.
                </p>
              ) : null}
              {adminStaffResumeStatus === 'error' ? (
                <p className="mt-3 text-sm text-red-300">
                  {adminStaffResumeError || 'We could not submit the restored admin/staff cart automatically.'}
                </p>
              ) : null}
              {selectedAreaIds.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedAreaIds.map((areaId) => (
                    <Link key={areaId} href={`/viewer?area=${areaId}`} className={PARTICIPANT_UI.buttonGhost}>
                      {AREA_TITLES[areaId]}
                    </Link>
                  ))}
                  <Link href={`/join/admin-staff?areas=${selectedAreaIds.join(',')}`} className={PARTICIPANT_UI.buttonGhost}>
                    Review Admin/Staff Cart
                  </Link>
                </div>
              ) : null}
              {restoredSelections.length > 0 ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {restoredSelections.map((selection) => (
                    <div key={selection.areaId} className="rounded-xl border border-white/10 bg-black/30 p-3">
                      <p className="text-sm font-semibold text-white">{selection.areaTitle}</p>
                      <p className="mt-1 text-xs text-white/70">{selection.roleTitles.join(', ')}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          )}

          <section id="submissions" className={`${PARTICIPANT_UI.card} lg:col-span-3`}>
            <h2 className="text-xl font-semibold text-white">Welcome, {participantLabel}</h2>
            <p className="mt-2 text-sm text-white/70">This is your personal participant workspace after onboarding and submissions.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/studio/viewer-submissions" className={PARTICIPANT_UI.buttonGhost}>
                New Submission
              </Link>
              <Link href="/studio/viewer-submissions/mine" className={PARTICIPANT_UI.buttonGhost}>
                My Submissions
              </Link>
              <Link href="/join" className={PARTICIPANT_UI.buttonGhost}>
                Become a Participant
              </Link>
              <Link href="/join/admin-staff" className={PARTICIPANT_UI.buttonGhost}>
                Join Admin/Staff
              </Link>
              <Link href="/publishing/signup" className={PARTICIPANT_UI.buttonGhost}>
                Publishing Sign-Up
              </Link>
              <Link href="/viewer" className={PARTICIPANT_UI.buttonGhost}>
                Browse Viewer
              </Link>
            </div>
          </section>

          <section id="schedule" className="rounded-2xl border border-white/15 bg-white/[0.03] p-5 lg:col-span-2">
            <h2 className="text-xl font-semibold text-white">{copy.schedule}</h2>
            <div className="mt-4 space-y-3">
              {commitments.map((item) => (
                <SessionCard key={item.id} item={item} />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/15 bg-white/[0.03] p-5">
            <h2 className="text-xl font-semibold text-white">{copy.profile}</h2>
            {profile && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl">
                <div className="space-y-3 text-sm text-white/80">
                  <p><span className="font-semibold text-white">Name:</span> {profile.name || participantLabel}</p>
                  <p><span className="font-semibold text-white">Volunteer Hours:</span> {profile.volunteerHours}</p>
                  <p><span className="font-semibold text-white">Paid Opportunities:</span> {profile.paidOpportunities}</p>
                  <p><span className="font-semibold text-white">Institution Role:</span> {profile.institutionRole ?? 'N/A'}</p>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/15 bg-white/[0.03] p-5 lg:col-span-3">
            <h2 className="text-xl font-semibold text-white">{copy.openCalls}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {openCalls.map((call) => (
                <OpenCallCard key={call.id} call={call} />
              ))}
            </div>
          </section>

          {viewerAreaRolesMap ? (
            <section className="rounded-2xl border border-white/15 bg-white/[0.03] p-5 lg:col-span-3">
              <h2 className="text-xl font-semibold text-white">Viewer Role Tracks</h2>
              <p className="mt-2 text-sm text-white/70">
                Role templates are synced from viewer area slides and used during participant onboarding.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {(Object.entries(viewerAreaRolesMap) as Array<[ViewerAreaId, ViewerAreaRolesDoc]>).map(([areaId, areaDoc]) => (
                  <div key={areaId} className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/60">{areaId}</p>
                    <p className="mt-1 text-sm text-white/80">
                      {areaDoc.roles.slice(0, 4).map((role) => role.title).join(', ')}
                      {areaDoc.roles.length > 4 ? '...' : ''}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </ParticipantShell>
  )
}
