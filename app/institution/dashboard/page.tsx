'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Building2, CalendarDays, CheckCircle2, Loader2, MapPin, Music2, Users } from 'lucide-react'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { fetchInstitutionDashboardForUser } from '@/lib/api/institutions'
import type { InstitutionAccount, InstitutionProject } from '@/lib/types/institution'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'active'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
      : status === 'completed'
        ? 'border-sky-300/30 bg-sky-400/10 text-sky-100'
        : status === 'paused'
          ? 'border-orange-300/30 bg-orange-400/10 text-orange-100'
          : 'border-white/20 bg-white/10 text-white/75'

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

function metricLabel(value: number | undefined, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export default function InstitutionDashboardPage() {
  const { user, loading } = useUserRole({ allowAdminBypass: false })
  const [state, setState] = useState<LoadState>('idle')
  const [accounts, setAccounts] = useState<InstitutionAccount[]>([])
  const [projects, setProjects] = useState<InstitutionProject[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return
    if (!user) {
      setState('ready')
      setAccounts([])
      setProjects([])
      return
    }

    let cancelled = false
    setState('loading')
    setError(null)

    const load = async () => {
      try {
        const data = await fetchInstitutionDashboardForUser(user)
        if (cancelled) return
        setAccounts(data.accounts)
        setProjects(data.projects)
        setState('ready')
      } catch (loadError) {
        if (cancelled) return
        setError(loadError instanceof Error ? loadError.message : 'Unable to load institution dashboard.')
        setState('error')
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [loading, user])

  const primaryAccount = accounts[0] ?? null
  const dashboardTitle = primaryAccount?.name ?? 'Institution Dashboard'
  const totals = useMemo(
    () => ({
      activeProjects: projects.filter((project) => project.status === 'active').length,
      confirmedMusicians: projects.reduce((sum, project) => sum + metricLabel(project.confirmedMusicians), 0),
      prospects: projects.reduce((sum, project) => sum + metricLabel(project.prospectCount), 0),
      media: projects.reduce((sum, project) => sum + metricLabel(project.mediaCount), 0),
    }),
    [projects],
  )

  if (loading || state === 'loading' || state === 'idle') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="flex items-center gap-3 text-white/75">
          <Loader2 className="h-5 w-5 animate-spin text-[#D4AF37]" />
          Loading institution workspace...
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-black px-4 py-10 text-white">
        <section className="mx-auto max-w-3xl border border-white/15 bg-white/[0.04] p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">Institution Access</p>
          <h1 className="mt-3 text-3xl font-semibold">Sign in to view your institution dashboard.</h1>
          <p className="mt-3 text-white/70">
            This workspace is for verified school, venue, nonprofit, and partner contacts connected to BEAM Orchestra projects.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dashboard" className="rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black">
              Participant sign-in
            </Link>
            <Link href="/join/institution" className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white">
              Request institution access
            </Link>
          </div>
        </section>
      </main>
    )
  }

  if (state === 'error') {
    return (
      <main className="min-h-screen bg-black px-4 py-10 text-white">
        <section className="mx-auto max-w-3xl border border-red-300/25 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold">Institution dashboard unavailable</h1>
          <p className="mt-3 text-red-100/80">{error}</p>
        </section>
      </main>
    )
  }

  if (accounts.length === 0) {
    return (
      <main className="min-h-screen bg-black px-4 py-10 text-white">
        <section className="mx-auto max-w-3xl border border-white/15 bg-white/[0.04] p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">No Linked Institution</p>
          <h1 className="mt-3 text-3xl font-semibold">No institution account is linked to {user.email}.</h1>
          <p className="mt-3 text-white/70">
            Ask a BEAM admin to add your email, email domain, or user id to an institution account.
          </p>
          <Link href="/join/institution" className="mt-6 inline-flex rounded-lg border border-[#D4AF37]/50 px-4 py-2 text-sm font-semibold text-[#F5D37A]">
            Submit institution request
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.22),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0))] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">Institution Workspace</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-normal text-white sm:text-5xl">{dashboardTitle}</h1>
              <p className="mt-3 max-w-3xl text-base text-white/72">
                {primaryAccount?.dashboardSummary ||
                  'Operational view for institution-linked BEAM Orchestra projects, roster readiness, programming notes, and next actions.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {accounts.map((account) => (
                <div key={account.id} className="rounded-lg border border-white/15 bg-black/35 px-3 py-2">
                  <p className="text-xs text-white/55">{account.shortName}</p>
                  <StatusPill status={account.status} />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Active Projects', value: totals.activeProjects, icon: Music2 },
              { label: 'Confirmed Musicians', value: totals.confirmedMusicians, icon: Users },
              { label: 'Prospects', value: totals.prospects, icon: CheckCircle2 },
              { label: 'Media Items', value: totals.media, icon: Building2 },
            ].map((metric) => {
              const Icon = metric.icon
              return (
                <div key={metric.label} className="border border-white/12 bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-white/65">{metric.label}</p>
                    <Icon className="h-4 w-4 text-[#D4AF37]" />
                  </div>
                  <p className="mt-3 text-3xl font-semibold">{metric.value}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[1.5fr_0.8fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Projects</h2>
              <Link href="/join/institution" className="text-sm font-semibold text-[#F5D37A]">
                Request changes
              </Link>
            </div>

            {projects.length === 0 ? (
              <div className="border border-white/12 bg-white/[0.04] p-5 text-white/70">
                No institution projects are linked yet.
              </div>
            ) : (
              projects.map((project) => (
                <article key={project.id} className="border border-white/12 bg-white/[0.04] p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">{project.title}</h3>
                        <StatusPill status={project.status} />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/68">{project.summary}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="flex gap-2 text-sm text-white/70">
                      <CalendarDays className="mt-0.5 h-4 w-4 text-[#D4AF37]" />
                      <span>{project.performanceDate || project.rehearsalWindow || 'Date pending'}</span>
                    </div>
                    <div className="flex gap-2 text-sm text-white/70">
                      <MapPin className="mt-0.5 h-4 w-4 text-[#D4AF37]" />
                      <span>{project.location || 'Location pending'}</span>
                    </div>
                    <div className="text-sm text-white/70">
                      {metricLabel(project.confirmedMusicians)} / {metricLabel(project.rosterTarget)} musicians confirmed
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">Program</p>
                      <ul className="mt-2 space-y-2 text-sm text-white/70">
                        {(project.programHighlights.length > 0 ? project.programHighlights : ['Program details pending']).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">Next Actions</p>
                      <ul className="mt-2 space-y-2 text-sm text-white/70">
                        {(project.nextActions.length > 0 ? project.nextActions : ['No open actions listed']).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">Milestones</p>
                      <ul className="mt-2 space-y-2 text-sm text-white/70">
                        {(project.milestones.length > 0
                          ? project.milestones
                          : [{ label: 'Milestones pending', status: 'pending' as const }]
                        ).map((milestone) => (
                          <li key={`${milestone.label}-${milestone.dueDate ?? ''}`} className="flex items-center justify-between gap-3">
                            <span>{milestone.label}</span>
                            <span className="text-xs capitalize text-white/45">{milestone.status.replace(/_/g, ' ')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          <aside className="space-y-4">
            <h2 className="text-xl font-semibold">Institution Contacts</h2>
            {accounts.map((account) => (
              <section key={account.id} className="border border-white/12 bg-white/[0.04] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{account.name}</h3>
                    <p className="mt-1 text-sm text-white/55">
                      {[account.city, account.state].filter(Boolean).join(', ') || 'Location not listed'}
                    </p>
                  </div>
                  <StatusPill status={account.status} />
                </div>
                <div className="mt-4 space-y-3 text-sm text-white/70">
                  {(account.contacts.length > 0
                    ? account.contacts
                    : account.contactEmails.map((email) => ({ name: email, email, role: undefined }))
                  ).map((contact) => (
                    <div key={`${account.id}-${contact.email || contact.name}`} className="border-t border-white/10 pt-3">
                      <p className="font-medium text-white">{contact.name}</p>
                      {contact.role ? <p className="text-white/50">{contact.role}</p> : null}
                      {contact.email ? <p className="text-white/65">{contact.email}</p> : null}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </aside>
        </div>
      </section>
    </main>
  )
}
