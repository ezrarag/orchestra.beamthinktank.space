import AdminComingSoonPage from '@/components/admin/AdminComingSoonPage'

export default function InfrastructurePage() {
  return (
    <AdminComingSoonPage
      title="Infrastructure"
      description="Track facilities, venue capabilities, acquisition pipeline, and long-range operational capacity."
      plannedFeatures={[
        'Building acquisition pipeline with stage-based statuses',
        'Venue specs and technical requirements inventory',
        'Residency exchange logistics and partner mapping',
      ]}
    />
  )
}
