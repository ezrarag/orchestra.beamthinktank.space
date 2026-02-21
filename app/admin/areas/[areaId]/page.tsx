import { notFound } from 'next/navigation'
import AreaRolesEditor from '@/components/admin/areas/AreaRolesEditor'
import type { ViewerAreaId } from '@/lib/config/viewerRoleTemplates'

const AREA_LABELS = {
  professional: 'Professional',
  community: 'Community',
  chamber: 'Chamber',
  publishing: 'Publishing',
  business: 'Business',
} as const

type AreaId = keyof typeof AREA_LABELS

export default function AreaPage({ params }: { params: { areaId: string } }) {
  const areaId = params.areaId as AreaId
  const areaName = AREA_LABELS[areaId]

  if (!areaName) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-orchestra-gold/20 bg-orchestra-cream/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orchestra-gold/80">Areas</p>
        <h1 className="mt-2 text-3xl font-bold text-orchestra-gold">Area: {areaName}</h1>
        <p className="mt-2 text-sm text-orchestra-cream/80">
          This area page will become the home for role templates + narrative arcs.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-orchestra-gold/20 bg-orchestra-cream/5 p-5">
          <h2 className="text-lg font-semibold text-orchestra-gold">Overview</h2>
          <p className="mt-2 text-sm text-orchestra-cream/75">
            Placeholder module for overview in the {areaName} area.
          </p>
        </article>
        <article className="rounded-xl border border-orchestra-gold/20 bg-orchestra-cream/5 p-5">
          <h2 className="text-lg font-semibold text-orchestra-gold">Narrative Arcs</h2>
          <p className="mt-2 text-sm text-orchestra-cream/75">
            Placeholder module for narrative arcs in the {areaName} area.
          </p>
        </article>
        <article className="rounded-xl border border-orchestra-gold/20 bg-orchestra-cream/5 p-5 md:col-span-2">
          <h2 className="mb-3 text-lg font-semibold text-orchestra-gold">Roles</h2>
          <AreaRolesEditor areaId={areaId as ViewerAreaId} />
        </article>
        <article className="rounded-xl border border-orchestra-gold/20 bg-orchestra-cream/5 p-5 md:col-span-2">
          <h2 className="text-lg font-semibold text-orchestra-gold">Media</h2>
          <p className="mt-2 text-sm text-orchestra-cream/75">
            Placeholder module for media in the {areaName} area.
          </p>
        </article>
      </section>
    </div>
  )
}
