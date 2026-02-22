'use client'

import Link from 'next/link'
import ViewerEntryManager from '@/components/viewer/ViewerEntryManager'

export default function AdminViewerPage() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="rounded-xl border border-orchestra-gold/25 bg-orchestra-cream/5 p-4 text-sm text-orchestra-cream/85">
        <p>Role slots are now managed under Admin → Areas → &lt;Area&gt; → Roles.</p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link
            href="/admin/areas/professional"
            className="inline-flex font-semibold text-orchestra-gold hover:text-orchestra-gold/80"
          >
            Open Professional Roles
          </Link>
          <Link
            href="/admin/viewer-sections"
            className="inline-flex font-semibold text-orchestra-gold hover:text-orchestra-gold/80"
          >
            Manage Narrative Arcs (viewerSections)
          </Link>
          <Link
            href="/admin/viewer-role-overviews"
            className="inline-flex font-semibold text-orchestra-gold hover:text-orchestra-gold/80"
          >
            Manage Arc Roles Overview Videos
          </Link>
          <Link
            href="/admin/home-slides"
            className="inline-flex font-semibold text-orchestra-gold hover:text-orchestra-gold/80"
          >
            Manage Home Slides (1-5)
          </Link>
        </div>
      </div>
      <ViewerEntryManager mode="admin" />
    </div>
  )
}
