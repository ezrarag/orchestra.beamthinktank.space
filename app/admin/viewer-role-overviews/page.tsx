'use client'

import Link from 'next/link'
import ViewerSectionsManager from '@/components/viewer/ViewerSectionsManager'

export default function AdminViewerRoleOverviewsPage() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="rounded-xl border border-orchestra-gold/25 bg-orchestra-cream/5 p-4 text-sm text-orchestra-cream/85">
        <p>Role overview videos are managed per narrative arc (viewerSections). Edit an arc and use the “Roles Overview” fields.</p>
        <div className="mt-2">
          <Link
            href="/admin/viewer-sections"
            className="inline-flex font-semibold text-orchestra-gold hover:text-orchestra-gold/80"
          >
            Open Narrative Arcs Manager
          </Link>
        </div>
      </div>
      <ViewerSectionsManager />
    </div>
  )
}
