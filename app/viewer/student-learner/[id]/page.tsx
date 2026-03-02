'use client'

import { RoleDashboardPage } from '@/app/viewer/_components/RoleDashboardPage'

const studentActions = [
  { title: 'Practice Log', subtitle: 'Track goals, repetitions, and notes per session.' },
  { title: 'Upload Recording', subtitle: 'Submit takes for guided feedback and review.' },
  { title: 'Open Score / Documents', subtitle: 'Open annotations, references, and source materials.' },
  { title: 'Camera Coach', subtitle: 'Start posture and movement capture workflows.' },
]

export default function StudentLearnerPage() {
  return (
    <RoleDashboardPage
      mode="student"
      title="Student Learner Dashboard"
      badgeLabel="Student Learner"
      actionTiles={studentActions}
    />
  )
}
