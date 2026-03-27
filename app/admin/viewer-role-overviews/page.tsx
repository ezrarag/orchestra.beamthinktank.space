'use client'

import Link from 'next/link'
import ViewerSectionsManager from '@/components/viewer/ViewerSectionsManager'

export default function AdminViewerRoleOverviewsPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-orchestra-gold/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 text-sm text-orchestra-cream/85 shadow-[0_16px_40px_rgba(0,0,0,0.2)]">
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
