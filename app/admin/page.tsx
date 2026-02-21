import AdminScaffold from '@/components/portal/AdminScaffold'
import { fetchAdminRows } from '@/lib/api'
import { DEFAULT_NGO } from '@/lib/config/ngoConfigs'
import { getPortalContext } from '@/lib/portal/page-data'

export default async function AdminHomePage() {
  const { config, locale } = getPortalContext(DEFAULT_NGO)
  const rowsByTab = await fetchAdminRows(config.id)

  return (
    <div className="min-h-screen bg-white">
      <AdminScaffold title={locale.admin.title} labels={locale.admin} rowsByTab={rowsByTab} />
    </div>
  )
}
