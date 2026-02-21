'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { db } from '@/lib/firebase'
import { fetchCommitments, fetchOpenCalls, fetchUserProfile } from '@/lib/api'
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

export default function ParticipantDashboardClient({
  ngo,
  scopedRoutes = false,
  copy,
}: ParticipantDashboardClientProps) {
  const { user, loading } = useUserRole()
  const allowTestAccess = process.env.NODE_ENV !== 'production'
  const [commitments, setCommitments] = useState<CommitmentSummary[]>([])
  const [openCalls, setOpenCalls] = useState<OpenCallSummary[]>([])
  const [profile, setProfile] = useState<UserProfileSummary | null>(null)
  const [viewerAreaRolesMap, setViewerAreaRolesMap] = useState<Record<ViewerAreaId, ViewerAreaRolesDoc> | null>(null)

  useEffect(() => {
    if (!user && !allowTestAccess) return

    const load = async () => {
      const [nextCommitments, nextCalls, nextProfile] = await Promise.all([
        fetchCommitments(ngo, user?.uid),
        fetchOpenCalls(ngo),
        fetchUserProfile(ngo, user?.uid),
      ])
      setCommitments(nextCommitments)
      setOpenCalls(nextCalls)
      setProfile(nextProfile)
    }

    load()
  }, [allowTestAccess, ngo, user])

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

  if (loading) {
    return <main className="mx-auto max-w-6xl px-4 py-10 text-white/80 sm:px-6">Loading dashboard...</main>
  }

  if (!user && !allowTestAccess) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold text-white">{copy.title}</h1>
        <p className="mt-3 text-white/70">This route is protected. Sign in to access participant scheduling and opportunities.</p>
        <Link
          href={resolvePortalPath('/home', ngo, scopedRoutes)}
          className="mt-6 inline-flex rounded-lg bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-black hover:bg-[#E5C86A]"
        >
          Return Home
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-3">
      <section className={`${PARTICIPANT_UI.card} lg:col-span-3`}>
        <h2 className="text-xl font-semibold text-white">Participant Workspace</h2>
        <p className="mt-2 text-sm text-white/70">Use this dashboard as your home base after onboarding and submissions.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/studio/viewer-submissions" className={PARTICIPANT_UI.buttonGhost}>
            New Submission
          </Link>
          <Link href="/studio/viewer-submissions/mine" className={PARTICIPANT_UI.buttonGhost}>
            My Submissions
          </Link>
          <Link href="/join/participant" className={PARTICIPANT_UI.buttonGhost}>
            Participant Paths
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

      <section className="rounded-2xl border border-white/15 bg-white/[0.03] p-5 lg:col-span-2">
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
          <div className="mt-4 space-y-2 text-sm text-white/80">
            <p><span className="font-semibold">Name:</span> {profile.name}</p>
            <p><span className="font-semibold">Volunteer Hours:</span> {profile.volunteerHours}</p>
            <p><span className="font-semibold">Paid Opportunities:</span> {profile.paidOpportunities}</p>
            <p><span className="font-semibold">Institution Role:</span> {profile.institutionRole ?? 'N/A'}</p>
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
    </main>
  )
}
