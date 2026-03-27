import { Suspense } from 'react'
import ParticipantDashboardClient from '@/components/portal/ParticipantDashboardClient'
import ParticipantShell from '@/components/participant/ParticipantShell'
import { DEFAULT_NGO } from '@/lib/config/ngoConfigs'
import { getPortalContext } from '@/lib/portal/page-data'

export default function DashboardPage() {
  const { config, locale } = getPortalContext(DEFAULT_NGO)

  return (
    <Suspense
      fallback={
        <ParticipantShell title="Participant Dashboard" subtitle="Schedule, calls, profile context, and role tracks in one workspace.">
          <div className="mx-auto max-w-6xl px-4 py-10 text-white/80 sm:px-6">Loading dashboard...</div>
        </ParticipantShell>
      }
    >
        <ParticipantDashboardClient ngo={config.id} copy={locale.dashboard} scopedRoutes={false} />
    </Suspense>
  )
}
