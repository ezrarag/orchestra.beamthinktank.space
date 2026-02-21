import SlideHero from '@/components/portal/SlideHero'
import { DEFAULT_NGO } from '@/lib/config/ngoConfigs'
import { getPortalContext } from '@/lib/portal/page-data'

export default function StudioRecordingsPage() {
  const { config } = getPortalContext(DEFAULT_NGO)

  return (
    <div className="min-h-screen bg-slate-950">
      <SlideHero
        slides={config.recordingSlides}
        ngo={config.id}
        scopedRoutes={false}
        preloadImages
      />
    </div>
  )
}
