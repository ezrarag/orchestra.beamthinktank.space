import HomeSlidesHero from '@/components/portal/HomeSlidesHero'
import { getPortalContext } from '@/lib/portal/page-data'

export default async function NgoHomePage({ params }: { params: Promise<{ ngo: string }> }) {
  const { ngo } = await params
  const { config } = getPortalContext(ngo)

  return (
    <div className="min-h-screen bg-slate-950">
      <HomeSlidesHero fallbackSlides={config.homeSlides} ngo={config.id} scopedRoutes />
    </div>
  )
}
