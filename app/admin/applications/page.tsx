import AdminComingSoonPage from '@/components/admin/AdminComingSoonPage'

export default function ApplicationsPage() {
  return (
    <AdminComingSoonPage
      title="Applications"
      description="Manage app surfaces like a440, release readiness, and platform-level operational visibility."
      plannedFeatures={[
        'a440 status, version tracking, and release notes',
        'Environment and feature-flag overview by app',
        'Release-readiness checklist with schema compatibility notes',
      ]}
    />
  )
}
