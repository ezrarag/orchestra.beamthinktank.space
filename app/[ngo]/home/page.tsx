import SlideHero from '@/components/portal/SlideHero'
import { getPortalContext } from '@/lib/portal/page-data'

export default function NgoHomePage({ params }: { params: { ngo: string } }) {
  const { config } = getPortalContext(params.ngo)

  return (
    <div className="min-h-screen bg-slate-950">
      <SlideHero slides={config.homeSlides} ngo={config.id} scopedRoutes />
    </div>
  )
}
