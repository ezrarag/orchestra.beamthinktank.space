import AdminScaffold from '@/components/portal/AdminScaffold'
import { fetchAdminRows } from '@/lib/api'
import { DEFAULT_NGO } from '@/lib/config/ngoConfigs'
import { getPortalContext } from '@/lib/portal/page-data'

export default async function AdminHomePage() {
  const { config, locale } = getPortalContext(DEFAULT_NGO)
  const rowsByTab = await fetchAdminRows(config.id)

  return (
    <div className="overflow-hidden rounded-[28px] border border-orchestra-gold/15 bg-white shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
      <AdminScaffold title={locale.admin.title} labels={locale.admin} rowsByTab={rowsByTab} />
    </div>
  )
}
