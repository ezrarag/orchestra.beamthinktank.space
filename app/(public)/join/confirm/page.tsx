import JoinConfirmClient from '@/components/public/JoinConfirmClient'
import PublicFlowShell from '@/components/public/PublicFlowShell'

export default async function JoinConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>
}) {
  const params = await searchParams

  return (
    <PublicFlowShell
      title="Confirm your role"
      subtitle="We’ll attach your participant role to orchestra and route you into the right workspace."
      backHref="/join"
      backLabel="Back to Join"
    >
      <JoinConfirmClient initialIntent={params.intent ?? null} />
    </PublicFlowShell>
  )
}
