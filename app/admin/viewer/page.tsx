'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpenText, House, LayoutPanelTop, Loader2, ShieldCheck, Video } from 'lucide-react'
import ViewerEntryManager from '@/components/viewer/ViewerEntryManager'
import { useRequireRole } from '@/lib/hooks/useUserRole'

export default function AdminViewerPage() {
  const router = useRouter()
  const { user, hasAccess, loading: roleLoading, redirect } = useRequireRole('beam_admin')
  const [claimsLoading, setClaimsLoading] = useState(true)
  const [hasAdminClaim, setHasAdminClaim] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)

  useEffect(() => {
    if (roleLoading) return

    if (redirect || !hasAccess || !user) {
      setClaimsLoading(false)
      setHasAdminClaim(false)
      router.push('/admin/dashboard')
      return
    }

    let active = true

    const verifyAdminClaim = async () => {
      setClaimsLoading(true)
      setClaimError(null)

      try {
        const token = await user.getIdTokenResult(true)
        if (!active) return

        const claims = token.claims as Record<string, unknown>
        const isAdmin = claims.role === 'beam_admin' || claims.beam_admin === true
        setHasAdminClaim(isAdmin)
        if (!isAdmin) {
          setClaimError('Your session does not currently include the beam_admin Firebase claim. Refresh auth or sign out and sign back in.')
        }
      } catch (error) {
        if (!active) return
        const message = error instanceof Error ? error.message : 'Unknown Firebase auth error'
        setHasAdminClaim(false)
        setClaimError(`Unable to refresh Firebase admin claims: ${message}`)
      } finally {
        if (active) {
          setClaimsLoading(false)
        }
      }
    }

    void verifyAdminClaim()

    return () => {
      active = false
    }
  }, [hasAccess, redirect, roleLoading, router, user])

  if (roleLoading || claimsLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-orchestra-gold" />
      </div>
    )
  }

  if (redirect || !hasAccess) {
    return null
  }

  if (!hasAdminClaim) {
    return (
      <div className="space-y-4">
        <div className="rounded-[24px] border border-red-400/30 bg-red-500/10 p-5 text-sm text-red-100">
          <p className="font-semibold">Firebase admin access is not active for this session.</p>
          <p className="mt-2 text-red-100/85">
            {claimError ?? 'This page only works when your Firebase ID token includes the beam_admin claim.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-orchestra-gold/20 bg-[radial-gradient(circle_at_top_left,_rgba(212,175,55,0.22),_transparent_30%),radial-gradient(circle_at_80%_12%,rgba(255,255,255,0.08),_transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:p-8">
          <div className="space-y-4 text-white">
            <div className="inline-flex rounded-full border border-orchestra-gold/20 bg-orchestra-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orchestra-gold/90">
              Viewer Operations
            </div>
            <div className="space-y-3">
              <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
                Refine the viewer workspace with the same layered card language used on the public site.
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-orchestra-cream/72">
                Manage library entries, chamber metadata, homepage overlays, and narrative structure from one left-aligned workspace.
                Role slots now live under Admin → Areas → &lt;Area&gt; → Roles.
              </p>
            </div>

            <Link
              href="/admin/areas/professional"
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/90 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white"
            >
              <ShieldCheck className="h-4 w-4" />
              Open Professional Roles
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/admin/viewer-sections"
              className="group rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-white shadow-[0_18px_48px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              <LayoutPanelTop className="h-5 w-5 text-orchestra-gold" />
              <h3 className="mt-4 text-base font-semibold">Narrative Arcs</h3>
              <p className="mt-2 text-sm leading-6 text-white/64">Adjust arc ordering, availability, and viewer structure.</p>
            </Link>
            <Link
              href="/admin/viewer-role-overviews"
              className="group rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-white shadow-[0_18px_48px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              <Video className="h-5 w-5 text-orchestra-gold" />
              <h3 className="mt-4 text-base font-semibold">Roles Overview Videos</h3>
              <p className="mt-2 text-sm leading-6 text-white/64">Update arc-level overview media and entry points into the viewer.</p>
            </Link>
            <Link
              href="/admin/home-slides"
              className="group rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-white shadow-[0_18px_48px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              <House className="h-5 w-5 text-orchestra-gold" />
              <h3 className="mt-4 text-base font-semibold">Home Hero</h3>
              <p className="mt-2 text-sm leading-6 text-white/64">Control the first impression of the site’s landing experience.</p>
            </Link>
            <div className="rounded-[24px] border border-white/10 bg-black/18 p-5 text-white/72 shadow-[0_18px_48px_rgba(0,0,0,0.18)]">
              <BookOpenText className="h-5 w-5 text-orchestra-gold" />
              <h3 className="mt-4 text-base font-semibold text-white">Chamber Research</h3>
              <p className="mt-2 text-sm leading-6">
                Chamber research refs are edited per work from the entry list using the research shortcut.
              </p>
            </div>
          </div>
        </div>
      </section>

      <ViewerEntryManager mode="admin" />
    </div>
  )
}
