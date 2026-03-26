import SlideHero from '@/components/portal/SlideHero'
import { getPortalContext } from '@/lib/portal/page-data'

export default async function NgoStudioRecordingsPage({ params }: { params: Promise<{ ngo: string }> }) {
  const { ngo } = await params
  const { config } = getPortalContext(ngo)

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
