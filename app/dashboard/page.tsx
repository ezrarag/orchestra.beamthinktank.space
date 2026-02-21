import ParticipantDashboardClient from '@/components/portal/ParticipantDashboardClient'
import ParticipantShell from '@/components/participant/ParticipantShell'
import { DEFAULT_NGO } from '@/lib/config/ngoConfigs'
import { getPortalContext } from '@/lib/portal/page-data'

export default function DashboardPage() {
  const { config, locale } = getPortalContext(DEFAULT_NGO)

  return (
    <ParticipantShell title="Participant Dashboard" subtitle="Schedule, calls, profile context, and role tracks in one workspace.">
      <ParticipantDashboardClient ngo={config.id} copy={locale.dashboard} scopedRoutes={false} />
    </ParticipantShell>
  )
}
