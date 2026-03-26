import { redirect } from 'next/navigation'
import type { ViewerAreaId } from '@/lib/config/viewerRoleTemplates'

const validAreas: ViewerAreaId[] = ['professional', 'community', 'chamber', 'publishing', 'business']

export default async function ViewerModulePage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params
  const viewerArea = area as ViewerAreaId
  if (!validAreas.includes(viewerArea)) {
    redirect('/viewer')
  }
  redirect(`/viewer?area=${viewerArea}&module=1`)
}
