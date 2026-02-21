'use client'

import ViewerEntryManager from '@/components/viewer/ViewerEntryManager'

export default function ViewerSubmissionPage() {
  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <ViewerEntryManager mode="participant" />
    </div>
  )
}
