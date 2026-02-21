import AdminComingSoonPage from '@/components/admin/AdminComingSoonPage'

export default function FinancePage() {
  return (
    <AdminComingSoonPage
      title="Finance"
      description="Organize stipend strategy, budgets, revenue tracking, and FCU planning in one workspace."
      plannedFeatures={[
        'Stipend plans and approval workflow by project',
        'Budget allocation and burn tracking for operations',
        'Revenue and investment summaries including equipment spend',
      ]}
    />
  )
}
