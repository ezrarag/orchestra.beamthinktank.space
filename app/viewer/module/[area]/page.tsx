import { redirect } from 'next/navigation'
import type { ViewerAreaId } from '@/lib/config/viewerRoleTemplates'

const validAreas: ViewerAreaId[] = ['professional', 'community', 'chamber', 'publishing', 'business']

export default function ViewerModulePage({ params }: { params: { area: string } }) {
  const area = params.area as ViewerAreaId
  if (!validAreas.includes(area)) {
    redirect('/viewer')
  }
  redirect(`/viewer?area=${area}&module=1`)
}
