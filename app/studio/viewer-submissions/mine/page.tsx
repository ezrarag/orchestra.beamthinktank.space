'use client'

import ViewerEntryManager from '@/components/viewer/ViewerEntryManager'
import ParticipantShell from '@/components/participant/ParticipantShell'

export default function ViewerMySubmissionPage() {
  return (
    <ParticipantShell title="My Viewer Submissions" subtitle="Track and manage what you submitted before moving deeper into dashboard tools.">
      <ViewerEntryManager mode="participant" scope="mine" />
    </ParticipantShell>
  )
}
