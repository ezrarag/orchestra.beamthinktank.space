export type ProjectType = 'lesson_package' | 'production_ensemble' | 'resident_orchestra' | 'institution_cohort'
export type AreaSource = 'chamber' | 'publishing' | 'business' | 'custom'
export type FillType = 'subscription_covered' | 'sponsor_participant' | 'sweat_equity'

export interface ProjectRoleSlot {
  id: string
  roleId: string
  roleLabel: string
  areaSource: AreaSource
  slotsNeeded: number
  fillType: FillType
  filledBy: string[]
}

export interface ProjectSubscriptionTier {
  tierName: string
  monthlyOrAnnualPrice: number
  includedSeats: Record<string, number>
  includedHours: Record<string, number>
  subscriberOrgId: string
  status: 'draft' | 'active' | 'paused' | 'cancelled'
}

