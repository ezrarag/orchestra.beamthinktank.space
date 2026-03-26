'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
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
      <div className="space-y-4 p-4 md:p-6">
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
          <p className="font-semibold">Firebase admin access is not active for this session.</p>
          <p className="mt-2 text-red-100/85">
            {claimError ?? 'This page only works when your Firebase ID token includes the beam_admin claim.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="rounded-xl border border-orchestra-gold/25 bg-orchestra-cream/5 p-4 text-sm text-orchestra-cream/85">
        <p>Role slots are now managed under Admin → Areas → &lt;Area&gt; → Roles.</p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link
            href="/admin/areas/professional"
            className="inline-flex font-semibold text-orchestra-gold hover:text-orchestra-gold/80"
          >
            Open Professional Roles
          </Link>
          <Link
            href="/admin/viewer-sections"
            className="inline-flex font-semibold text-orchestra-gold hover:text-orchestra-gold/80"
          >
            Manage Narrative Arcs (viewerSections)
          </Link>
          <Link
            href="/admin/viewer-role-overviews"
            className="inline-flex font-semibold text-orchestra-gold hover:text-orchestra-gold/80"
          >
            Manage Arc Roles Overview Videos
          </Link>
          <Link
            href="/admin/home-slides"
            className="inline-flex font-semibold text-orchestra-gold hover:text-orchestra-gold/80"
          >
            Manage Home Slides (1-5)
          </Link>
        </div>
      </div>
      <ViewerEntryManager mode="admin" />
    </div>
  )
}
