import CohortApplicationForm from '@/components/public/CohortApplicationForm'
import PublicFlowShell from '@/components/public/PublicFlowShell'

export default function JoinCohortPage() {
  return (
    <PublicFlowShell
      title="Recruit & Mentor Cohort"
      subtitle="Graduate and undergraduate musicians can join the recruitment cohort for weekly school visits, auditions, and mentorship at MPS schools."
      backHref="/join"
      backLabel="Back to Join"
    >
      <CohortApplicationForm />
    </PublicFlowShell>
  )
}
