import PortalNav from '@/components/portal/PortalNav'
import AdminScaffold from '@/components/portal/AdminScaffold'
import { fetchAdminRows } from '@/lib/api'
import { getPortalContext, getPortalNav } from '@/lib/portal/page-data'

export default async function NgoAdminPage({ params }: { params: { ngo: string } }) {
  const { config, locale } = getPortalContext(params.ngo)
  const rowsByTab = await fetchAdminRows(config.id)

  return (
    <div className="min-h-screen bg-white">
      <PortalNav links={getPortalNav(config.id, true)} />
      <AdminScaffold title={`${config.shortName} ${locale.admin.title}`} labels={locale.admin} rowsByTab={rowsByTab} />
    </div>
  )
}
