import HomeSlidesHero from '@/components/portal/HomeSlidesHero'
import { DEFAULT_NGO } from '@/lib/config/ngoConfigs'
import { getPortalContext } from '@/lib/portal/page-data'

export default function HomePage() {
  const { config } = getPortalContext(DEFAULT_NGO)

  return (
    <div className="min-h-screen bg-slate-950">
      <HomeSlidesHero fallbackSlides={config.homeSlides} ngo={config.id} scopedRoutes={false} />
    </div>
  )
}
