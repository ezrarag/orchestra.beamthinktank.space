'use client'

import ViewerEntryManager from '@/components/viewer/ViewerEntryManager'
import ParticipantShell from '@/components/participant/ParticipantShell'

export default function ViewerSubmissionPage() {
  return (
    <ParticipantShell title="Submit To Viewer" subtitle="Add a participant entry with mapped area/section metadata and media links.">
      <ViewerEntryManager mode="participant" />
    </ParticipantShell>
  )
}
