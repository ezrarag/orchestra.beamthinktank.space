'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { loadViewerAreaRolesMap, type ViewerAreaRolesDoc } from '@/lib/viewerAreaRoles'
import { createAdminStaffJoinRequest } from '@/lib/api/adminStaff'
import type { ViewerAreaId } from '@/lib/config/viewerRoleTemplates'
import { db } from '@/lib/firebase'

const AREA_TITLES: Record<ViewerAreaId, string> = {
  professional: 'Professional Orchestra',
  community: 'Community Orchestra',
  chamber: 'Chamber Series',
  publishing: 'Publishing',
  business: 'The Business',
}

const AREA_ORDER: ViewerAreaId[] = ['professional', 'community', 'chamber', 'publishing', 'business']

type AreaSelectionState = {
  roleIds: string[]
  intent: string
}

export default function JoinAdminStaffPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useUserRole()

  const [rolesMap, setRolesMap] = useState<Record<ViewerAreaId, ViewerAreaRolesDoc> | null>(null)
  const [selectedAreas, setSelectedAreas] = useState<ViewerAreaId[]>([])
  const [areaSelections, setAreaSelections] = useState<Partial<Record<ViewerAreaId, AreaSelectionState>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db) return
    let mounted = true

    const loadRoles = async () => {
      try {
        const next = await loadViewerAreaRolesMap(db)
        if (mounted) {
          setRolesMap(next)
        }
      } catch (loadError) {
        console.error('Error loading admin/staff area roles:', loadError)
      }
    }

    void loadRoles()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const preselected = searchParams.get('areas')
    if (!preselected) return

    const next = preselected
      .split(',')
      .map((item) => item.trim() as ViewerAreaId)
      .filter((item): item is ViewerAreaId => AREA_ORDER.includes(item))

    if (next.length > 0) {
      setSelectedAreas((prev) => Array.from(new Set([...prev, ...next])))
    }
  }, [searchParams])

  const cartSelections = useMemo(() => {
    return selectedAreas
      .map((areaId) => {
        const roles = rolesMap?.[areaId]?.roles ?? []
        const selected = areaSelections[areaId]
        const roleIds = selected?.roleIds ?? []
        const roleTitles = roleIds
          .map((roleId) => roles.find((role) => role.id === roleId)?.title)
          .filter((title): title is string => Boolean(title))

        return {
          areaId,
          areaTitle: AREA_TITLES[areaId],
          roleIds,
          roleTitles,
          intent: selected?.intent?.trim() ?? '',
        }
      })
      .filter((selection) => selection.roleIds.length > 0)
  }, [selectedAreas, areaSelections, rolesMap])

  const toggleArea = (areaId: ViewerAreaId) => {
    setError(null)
    setSelectedAreas((prev) => {
      if (prev.includes(areaId)) {
        const next = prev.filter((item) => item !== areaId)
        return next
      }
      return [...prev, areaId]
    })
  }

  const toggleRole = (areaId: ViewerAreaId, roleId: string) => {
    setError(null)
    setAreaSelections((prev) => {
      const existing = prev[areaId] ?? { roleIds: [], intent: '' }
      const hasRole = existing.roleIds.includes(roleId)
      const roleIds = hasRole
        ? existing.roleIds.filter((item) => item !== roleId)
        : [...existing.roleIds, roleId]

      return {
        ...prev,
        [areaId]: {
          ...existing,
          roleIds,
        },
      }
    })
  }

  const setAreaIntent = (areaId: ViewerAreaId, value: string) => {
    setAreaSelections((prev) => {
      const existing = prev[areaId] ?? { roleIds: [], intent: '' }
      return {
        ...prev,
        [areaId]: {
          ...existing,
          intent: value,
        },
      }
    })
  }

  const handleSubmit = async () => {
    setError(null)

    if (!user) {
      setError('Please sign in before submitting your admin/staff cart.')
      return
    }

    if (selectedAreas.length === 0) {
      setError('Add at least one area to your cart.')
      return
    }

    const missingRoles = selectedAreas.find((areaId) => {
      const selected = areaSelections[areaId]
      return !selected || selected.roleIds.length === 0
    })

    if (missingRoles) {
      setError(`Choose at least one role for ${AREA_TITLES[missingRoles]}.`)
      return
    }

    setSubmitting(true)
    try {
      await createAdminStaffJoinRequest({
        selections: cartSelections,
      })
      router.push('/dashboard')
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to submit admin/staff request.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/5 p-8">
          <p className="text-white/80">Loading admin/staff onboarding...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/join/participant" className="mb-6 inline-flex items-center gap-2 text-sm text-white/70 hover:text-[#D4AF37]">
          <ArrowLeft className="h-4 w-4" />
          Back to Participant Paths
        </Link>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
          <h1 className="text-3xl font-bold">Join Admin/Staff</h1>
          <p className="mt-2 text-white/80">
            Build your role cart by selecting one or more areas, then choose what you want to do in each area.
          </p>

          {!user ? (
            <div className="mt-4 rounded-lg border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-4 py-3 text-sm text-[#F6E6A8]">
              You can browse this flow without signing in. Sign in is required when you submit.
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-4">
              {AREA_ORDER.map((areaId) => {
                const isSelected = selectedAreas.includes(areaId)
                const roles = rolesMap?.[areaId]?.roles ?? []
                const selectedRoleIds = areaSelections[areaId]?.roleIds ?? []

                return (
                  <div
                    key={areaId}
                    className={`rounded-xl border p-4 ${
                      isSelected ? 'border-[#D4AF37]/70 bg-[#D4AF37]/10' : 'border-white/15 bg-black/20'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-white/60">{areaId}</p>
                        <h2 className="text-lg font-semibold text-white">{AREA_TITLES[areaId]}</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleArea(areaId)}
                        className={`inline-flex rounded-lg px-3 py-2 text-sm font-semibold ${
                          isSelected
                            ? 'bg-white/15 text-white hover:bg-white/25'
                            : 'bg-[#D4AF37] text-black hover:bg-[#E5C86A]'
                        }`}
                      >
                        {isSelected ? 'Remove from Cart' : 'Add to Cart'}
                      </button>
                    </div>

                    {isSelected ? (
                      <div className="mt-4 space-y-4 rounded-lg border border-white/10 bg-black/25 p-3">
                        <div>
                          <p className="text-sm font-semibold text-[#F0D68A]">Choose role(s)</p>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {roles.map((role) => (
                              <label
                                key={role.id}
                                className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedRoleIds.includes(role.id)}
                                  onChange={() => toggleRole(areaId, role.id)}
                                  className="mt-0.5 h-4 w-4"
                                />
                                <span>{role.title}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <label className="block">
                          <span className="mb-1 block text-sm text-white/80">What do you want to do in this area?</span>
                          <textarea
                            rows={2}
                            value={areaSelections[areaId]?.intent ?? ''}
                            onChange={(event) => setAreaIntent(areaId, event.target.value)}
                            className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]"
                            placeholder="Example: production planning, artist outreach, score review"
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>

            <aside className="h-fit rounded-xl border border-white/15 bg-black/30 p-4">
              <h3 className="text-base font-semibold text-white">Role Cart</h3>
              <p className="mt-1 text-sm text-white/70">Selected areas: {selectedAreas.length}</p>

              {cartSelections.length === 0 ? (
                <p className="mt-3 text-sm text-white/60">No area roles selected yet.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {cartSelections.map((selection) => (
                    <div key={selection.areaId} className="rounded-lg border border-white/10 bg-black/35 p-3">
                      <p className="text-sm font-semibold text-white">{selection.areaTitle}</p>
                      <p className="mt-1 text-xs text-white/70">{selection.roleTitles.join(', ')}</p>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="mt-4 w-full rounded-lg bg-[#D4AF37] px-4 py-2.5 text-sm font-semibold text-black hover:bg-[#E5C86A] disabled:opacity-70"
              >
                {submitting ? 'Submitting...' : 'Submit Cart and Continue'}
              </button>

              <Link
                href="/dashboard"
                className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Back to Dashboard
              </Link>
            </aside>
          </div>

          {error ? (
            <div className="mt-6 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
