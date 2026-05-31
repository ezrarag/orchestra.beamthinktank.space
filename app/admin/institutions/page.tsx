'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Building2, CheckCircle2, Loader2, RefreshCw, School, Users } from 'lucide-react'
import { auth } from '@/lib/firebase'
import type { InstitutionAccount, InstitutionProject } from '@/lib/types/institution'

type LoadState = 'idle' | 'loading' | 'ready' | 'error' | 'saving'

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'active'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
      : status === 'completed'
        ? 'border-sky-300/30 bg-sky-400/10 text-sky-100'
        : status === 'paused'
          ? 'border-orange-300/30 bg-orange-400/10 text-orange-100'
          : 'border-white/20 bg-white/10 text-white/75'

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>{status}</span>
}

async function authHeaders(): Promise<Record<string, string>> {
  if (process.env.NODE_ENV !== 'production') return {}
  const token = await auth?.currentUser?.getIdToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function AdminInstitutionsPage() {
  const [accounts, setAccounts] = useState<InstitutionAccount[]>([])
  const [projects, setProjects] = useState<InstitutionProject[]>([])
  const [state, setState] = useState<LoadState>('idle')
  const [error, setError] = useState<string | null>(null)

  const projectsByInstitution = useMemo(() => {
    const grouped = new Map<string, InstitutionProject[]>()
    projects.forEach((project) => {
      const bucket = grouped.get(project.institutionId) ?? []
      bucket.push(project)
      grouped.set(project.institutionId, bucket)
    })
    return grouped
  }, [projects])

  const totals = useMemo(
    () => ({
      institutions: accounts.length,
      activeInstitutions: accounts.filter((account) => account.status === 'active').length,
      projects: projects.length,
      activeProjects: projects.filter((project) => project.status === 'active').length,
    }),
    [accounts, projects],
  )

  const load = async () => {
    setState('loading')
    setError(null)

    try {
      const response = await fetch('/api/admin/institutions', {
        headers: await authHeaders(),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        accounts?: InstitutionAccount[]
        projects?: InstitutionProject[]
        error?: string
      }
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to load institution records.')
      }
      setAccounts(payload.accounts ?? [])
      setProjects(payload.projects ?? [])
      setState('ready')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load institution records.')
      setState('error')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const updateAccountStatus = async (account: InstitutionAccount, status: InstitutionAccount['status']) => {
    setState('saving')
    setError(null)
    try {
      const response = await fetch('/api/admin/institutions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(await authHeaders()),
        },
        body: JSON.stringify({
          kind: 'account',
          ...account,
          status,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Unable to update account.')
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update account.')
      setState('error')
    }
  }

  const updateProjectStatus = async (project: InstitutionProject, status: InstitutionProject['status']) => {
    setState('saving')
    setError(null)
    try {
      const response = await fetch('/api/admin/institutions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(await authHeaders()),
        },
        body: JSON.stringify({
          kind: 'project',
          ...project,
          status,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Unable to update project.')
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update project.')
      setState('error')
    }
  }

  return (
    <div className="space-y-5 text-orchestra-cream">
      <section className="border border-orchestra-gold/20 bg-black/25 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orchestra-gold/75">Institution Accounts</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Partner institution operations</h2>
            <p className="mt-2 max-w-3xl text-sm text-orchestra-cream/65">
              Manage institution account visibility, linked project status, and dashboard readiness for schools, venues, nonprofits, and partners.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-lg border border-orchestra-gold/30 px-3 py-2 text-sm font-semibold text-orchestra-gold"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <Link href="/institution/dashboard" className="rounded-lg bg-orchestra-gold px-3 py-2 text-sm font-semibold text-black">
              Institution view
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <div className="border border-red-300/25 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Institutions', value: totals.institutions, icon: Building2 },
          { label: 'Active Institutions', value: totals.activeInstitutions, icon: CheckCircle2 },
          { label: 'Projects', value: totals.projects, icon: School },
          { label: 'Active Projects', value: totals.activeProjects, icon: Users },
        ].map((metric) => {
          const Icon = metric.icon
          return (
            <div key={metric.label} className="border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-orchestra-cream/65">{metric.label}</p>
                <Icon className="h-4 w-4 text-orchestra-gold" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-white">{metric.value}</p>
            </div>
          )
        })}
      </section>

      {state === 'loading' || state === 'idle' || state === 'saving' ? (
        <div className="flex items-center gap-3 border border-white/10 bg-white/[0.04] p-5 text-sm text-orchestra-cream/70">
          <Loader2 className="h-4 w-4 animate-spin text-orchestra-gold" />
          {state === 'saving' ? 'Saving institution record...' : 'Loading institution records...'}
        </div>
      ) : null}

      <section className="space-y-4">
        {accounts.length === 0 && state === 'ready' ? (
          <div className="border border-white/10 bg-white/[0.04] p-5 text-orchestra-cream/70">
            No institution accounts exist yet. Run the BDSO institution seed in dry-run mode first, then apply it after reviewing the payload.
          </div>
        ) : null}

        {accounts.map((account) => {
          const accountProjects = projectsByInstitution.get(account.id) ?? []
          return (
            <article key={account.id} className="border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{account.name}</h3>
                    <StatusPill status={account.status} />
                  </div>
                  <p className="mt-2 max-w-3xl text-sm text-orchestra-cream/65">
                    {account.dashboardSummary || 'No dashboard summary has been written for this institution.'}
                  </p>
                  <p className="mt-2 text-xs text-orchestra-cream/50">
                    Access: {[...account.contactEmails, ...account.emailDomains.map((domain) => `@${domain}`), ...account.userIds].join(', ') || 'No access identifiers'}
                  </p>
                </div>

                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-orchestra-cream/55">
                  Account Status
                  <select
                    value={account.status}
                    onChange={(event) => void updateAccountStatus(account, event.target.value as InstitutionAccount['status'])}
                    className="mt-2 block rounded-lg border border-white/15 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white"
                  >
                    <option value="pending">pending</option>
                    <option value="active">active</option>
                    <option value="paused">paused</option>
                  </select>
                </label>
              </div>

              <div className="mt-5 overflow-hidden border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-black/35 text-orchestra-cream/70">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Project</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Roster</th>
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold">Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountProjects.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="border-t border-white/10 px-3 py-3 text-orchestra-cream/55">
                          No projects linked.
                        </td>
                      </tr>
                    ) : (
                      accountProjects.map((project) => (
                        <tr key={project.id} className="border-t border-white/10">
                          <td className="px-3 py-3 text-white">
                            <p className="font-medium">{project.title}</p>
                            <p className="mt-1 text-xs text-orchestra-cream/50">{project.location || 'Location pending'}</p>
                          </td>
                          <td className="px-3 py-3">
                            <StatusPill status={project.status} />
                          </td>
                          <td className="px-3 py-3 text-orchestra-cream/70">
                            {project.confirmedMusicians ?? 0} / {project.rosterTarget ?? 0}
                          </td>
                          <td className="px-3 py-3 text-orchestra-cream/70">{project.performanceDate || project.rehearsalWindow || 'Pending'}</td>
                          <td className="px-3 py-3">
                            <select
                              value={project.status}
                              onChange={(event) => void updateProjectStatus(project, event.target.value as InstitutionProject['status'])}
                              className="rounded-lg border border-white/15 bg-black px-3 py-2 text-sm text-white"
                            >
                              <option value="planning">planning</option>
                              <option value="active">active</option>
                              <option value="paused">paused</option>
                              <option value="completed">completed</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
