'use client'

import { RoleDashboardPage } from '@/app/viewer/_components/RoleDashboardPage'

const instructorActions = [
  { title: 'Review Learner Progress', subtitle: 'See progress markers and coaching checkpoints.' },
  { title: 'Add Pedagogical Notes', subtitle: 'Attach instruction notes to this specific work.' },
  { title: 'Open Scores / Documents', subtitle: 'Manage learning materials tied to this piece.' },
  { title: 'Assessment Queue', subtitle: 'Queue feedback, rubrics, and improvement tasks.' },
]

export default function InstructorDashboardPage() {
  return (
    <RoleDashboardPage
      mode="instructor"
      title="Institutional Instructor Dashboard"
      badgeLabel="Institutional Instructor"
      actionTiles={instructorActions}
    />
  )
}
