import PublicFlowShell from '@/components/public/PublicFlowShell'
import JoinIntentClient from '@/components/public/JoinIntentClient'

export default function JoinPage() {
  return (
    <PublicFlowShell
      title="Become a Participant"
      subtitle="Choose how you want to be involved."
    >
      <JoinIntentClient />
    </PublicFlowShell>
  )
}
