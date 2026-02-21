import SlideHero from '@/components/portal/SlideHero'
import { getPortalContext } from '@/lib/portal/page-data'

export default function NgoStudioRecordingsPage({ params }: { params: { ngo: string } }) {
  const { config } = getPortalContext(params.ngo)

  return (
    <div className="min-h-screen bg-slate-950">
      <SlideHero
        slides={config.recordingSlides}
        ngo={config.id}
        scopedRoutes
        preloadImages
      />
    </div>
  )
}
