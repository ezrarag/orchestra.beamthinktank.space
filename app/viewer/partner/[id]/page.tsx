'use client'

import { RoleDashboardPage } from '@/app/viewer/_components/RoleDashboardPage'

const partnerActions = [
  { title: 'Partner Activity', subtitle: 'View partner-side engagement for this content.' },
  { title: 'Post Collaboration Notes', subtitle: 'Capture contextual notes for the production team.' },
  { title: 'Open Shared Documents', subtitle: 'Access score packets, plans, and references.' },
  { title: 'Booking + Follow-up', subtitle: 'Prepare requests and next-step collaboration flow.' },
]

export default function PartnerDashboardPage() {
  return (
    <RoleDashboardPage
      mode="partner"
      title="Partner Dashboard"
      badgeLabel="Partner"
      actionTiles={partnerActions}
    />
  )
}
