import PortalNav from '@/components/portal/PortalNav'
import ParticipantDashboardClient from '@/components/portal/ParticipantDashboardClient'
import { DEFAULT_NGO } from '@/lib/config/ngoConfigs'
import { getPortalContext, getPortalNav } from '@/lib/portal/page-data'

export default function DashboardPage() {
  const { config, locale } = getPortalContext(DEFAULT_NGO)

  return (
    <div className="min-h-screen bg-white">
      <PortalNav links={getPortalNav(config.id, false)} />
      <ParticipantDashboardClient ngo={config.id} copy={locale.dashboard} scopedRoutes={false} />
    </div>
  )
}
