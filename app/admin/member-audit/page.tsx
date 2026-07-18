'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Shield, Users } from 'lucide-react'

type AuditRow = {
  uid: string
  email: string
  displayName: string
  authRole: string
  beamAdmin: boolean
  partnerAdmin: boolean
  board: boolean
  userDocRole: string
  subscriber: boolean
  membershipRole: string
  membershipRoles: string[]
  bdsoRows: number
  sources: string[]
  lastSignIn: string
  createdAt: string
  effectiveAdmin: boolean
  allowlisted: boolean
}

type AuditPayload =
  | {
      success: true
      gatewayDisabled: boolean
      allowlist: string[]
      counts: {
        authUsers: number
        userDocs: number
        memberships: number
        bdsoProjectMusicians: number
        rows: number
        effectiveAdmins: number
      }
      rows: AuditRow[]
    }
  | {
      success: false
      gatewayDisabled: boolean
      allowlist: string[]
      error: string
      requiredEnv: string[]
    }

function roleLabel(row: AuditRow) {
  if (row.effectiveAdmin) return 'Admin'
  if (row.partnerAdmin || row.authRole === 'partner_admin' || row.userDocRole === 'partner_admin') return 'Partner Admin'
  if (row.board || row.authRole === 'board' || row.userDocRole === 'board') return 'Board'
  if (row.subscriber) return 'Subscriber'
  return row.userDocRole || row.membershipRole || row.authRole || 'Unassigned'
}

export default function MemberAuditPage() {
  const [payload, setPayload] = useState<AuditPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const loadAudit = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/member-audit')
      const data = (await response.json().catch(() => null)) as AuditPayload | null
      if (!data) throw new Error('Audit response was not valid JSON.')
      setPayload(data)
    } catch (error) {
      setPayload({
        success: false,
        gatewayDisabled: true,
        allowlist: [],
        error: error instanceof Error ? error.message : 'Unable to load member audit.',
        requiredEnv: [],
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAudit()
  }, [])

  const filteredRows = useMemo(() => {
    if (!payload?.success) return []
    const needle = query.trim().toLowerCase()
    if (!needle) return payload.rows
    return payload.rows.filter((row) =>
      [row.email, row.displayName, row.uid, roleLabel(row), row.sources.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    )
  }, [payload, query])

  return (
    <div className="space-y-5 text-orchestra-cream">
      <section className="border border-orchestra-gold/20 bg-black/25 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orchestra-gold/75">Access Audit</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Members and admin roles</h2>
            <p className="mt-2 max-w-3xl text-sm text-orchestra-cream/65">
              Current Auth users, Firestore user records, NGO memberships, and BDSO project musician rows. Admin gateways are currently disabled.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAudit()}
            className="inline-flex items-center gap-2 rounded-lg border border-orchestra-gold/30 px-3 py-2 text-sm font-semibold text-orchestra-gold"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center gap-3 border border-white/10 bg-white/[0.04] p-5 text-sm text-orchestra-cream/70">
          <Loader2 className="h-4 w-4 animate-spin text-orchestra-gold" />
          Loading member audit...
        </div>
      ) : null}

      {payload && !payload.success ? (
        <section className="border border-red-300/25 bg-red-500/10 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-1 h-5 w-5 text-red-200" />
            <div>
              <h3 className="font-semibold text-red-100">Live audit unavailable</h3>
              <p className="mt-2 text-sm text-red-100/80">{payload.error}</p>
              {payload.requiredEnv.length > 0 ? (
                <p className="mt-3 text-xs text-red-100/70">
                  Required env: {payload.requiredEnv.join(', ')}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {payload?.success ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: 'Rows', value: payload.counts.rows, icon: Users },
              { label: 'Auth Users', value: payload.counts.authUsers, icon: Shield },
              { label: 'User Docs', value: payload.counts.userDocs, icon: Users },
              { label: 'BDSO Rows', value: payload.counts.bdsoProjectMusicians, icon: Users },
              { label: 'Effective Admins', value: payload.counts.effectiveAdmins, icon: CheckCircle2 },
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

          <section className="border border-white/10 bg-white/[0.04] p-4">
            <label className="text-sm font-semibold text-orchestra-cream/70">
              Search members
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="email, name, uid, role, source"
                className="mt-2 w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm font-normal text-white outline-none focus:border-orchestra-gold"
              />
            </label>
          </section>

          <section className="overflow-hidden border border-white/10 bg-white/[0.04]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-black/35 text-orchestra-cream/70">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Member</th>
                    <th className="px-3 py-2 font-semibold">Effective Role</th>
                    <th className="px-3 py-2 font-semibold">Auth Claims</th>
                    <th className="px-3 py-2 font-semibold">Firestore</th>
                    <th className="px-3 py-2 font-semibold">Sources</th>
                    <th className="px-3 py-2 font-semibold">Last Sign-In</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={`${row.uid}-${row.email}`} className="border-t border-white/10">
                      <td className="px-3 py-3 align-top">
                        <p className="font-medium text-white">{row.displayName || row.email || row.uid}</p>
                        <p className="mt-1 text-xs text-orchestra-cream/55">{row.email || 'No email'}</p>
                        <p className="mt-1 text-xs text-orchestra-cream/35">{row.uid}</p>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span className="rounded-full border border-orchestra-gold/25 bg-orchestra-gold/10 px-2.5 py-1 text-xs font-semibold text-orchestra-gold">
                          {roleLabel(row)}
                        </span>
                        {row.allowlisted ? <p className="mt-2 text-xs text-emerald-200">Allowlisted</p> : null}
                      </td>
                      <td className="px-3 py-3 align-top text-orchestra-cream/70">
                        <p>role: {row.authRole || 'none'}</p>
                        <p>beam_admin: {String(row.beamAdmin)}</p>
                        <p>partner_admin: {String(row.partnerAdmin)}</p>
                        <p>board: {String(row.board)}</p>
                      </td>
                      <td className="px-3 py-3 align-top text-orchestra-cream/70">
                        <p>user role: {row.userDocRole || 'none'}</p>
                        <p>subscriber: {String(row.subscriber)}</p>
                        <p>membership: {row.membershipRoles.join(', ') || row.membershipRole || 'none'}</p>
                        <p>BDSO rows: {row.bdsoRows}</p>
                      </td>
                      <td className="px-3 py-3 align-top text-orchestra-cream/70">{row.sources.join(', ')}</td>
                      <td className="px-3 py-3 align-top text-orchestra-cream/70">{row.lastSignIn || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
