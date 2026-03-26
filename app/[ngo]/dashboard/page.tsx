import { Suspense } from 'react'
import PortalNav from '@/components/portal/PortalNav'
import ParticipantDashboardClient from '@/components/portal/ParticipantDashboardClient'
import { getPortalContext, getPortalNav } from '@/lib/portal/page-data'

export default async function NgoDashboardPage({ params }: { params: Promise<{ ngo: string }> }) {
  const { ngo } = await params
  const { config, locale } = getPortalContext(ngo)

  return (
    <div className="min-h-screen bg-white">
      <PortalNav links={getPortalNav(config.id, true)} />
      <Suspense fallback={<main className="mx-auto max-w-6xl px-4 py-10 text-white/80 sm:px-6">Loading dashboard...</main>}>
        <ParticipantDashboardClient ngo={config.id} copy={locale.dashboard} scopedRoutes />
      </Suspense>
    </div>
  )
}
