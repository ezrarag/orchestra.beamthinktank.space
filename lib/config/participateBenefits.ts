export interface CompensationRate {
  activity: string
  duration: string
  usdRate: number
  beamCoinRate: number
}

export interface RedemptionItem {
  id: string
  title: string
  cost: string
  beamCost: number
  category: string
  phase: 1 | 2
  status: 'live' | 'coming_soon'
  description: string
  iconName: string
}

export interface BenefitsConfig {
  heroTitle: string
  heroSubtitle: string
  maxUsdPerProject: number
  maxBeamCoinsPerProject: number
  rates: CompensationRate[]
  redemptions: RedemptionItem[]
  progressionSteps: {
    step: number
    title: string
    description: string
  }[]
}

export const PARTICIPATE_BENEFITS_CONFIG: BenefitsConfig = {
  heroTitle: 'Participants in BEAM earn through their work.',
  heroSubtitle: 'Direct USD stipends paired with BEAM Coin credits cover your current performance time and invest in your ongoing artistic life.',
  maxUsdPerProject: 495,
  maxBeamCoinsPerProject: 21,
  rates: [
    { activity: 'Sectional Rehearsal', duration: '3 Hours', usdRate: 75, beamCoinRate: 3 },
    { activity: 'Full Orchestra Rehearsal', duration: '4 Hours', usdRate: 100, beamCoinRate: 4 },
    { activity: 'Dress Rehearsal', duration: '4 Hours', usdRate: 120, beamCoinRate: 4 },
    { activity: 'Concert Performance', duration: '2 Hours', usdRate: 200, beamCoinRate: 10 }
  ],
  redemptions: [
    // Phase 1 (Live)
    { id: 'lessons', title: 'Private Music Lessons', cost: '10 BEAM', beamCost: 10, category: 'Education', phase: 1, status: 'live', description: 'One-on-one sessions with master faculty and guest conductors.', iconName: 'BookOpen' },
    { id: 'equipment', title: 'Equipment Rental', cost: '15 BEAM', beamCost: 15, category: 'Gear', phase: 1, status: 'live', description: 'Access to pro instruments, mutes, stands, and audio recording gear.', iconName: 'Tool' },
    { id: 'tickets', title: 'Concert Tickets', cost: '8 BEAM', beamCost: 8, category: 'Events', phase: 1, status: 'live', description: 'Reserved seating for partner symphony performances & galas.', iconName: 'Ticket' },
    { id: 'masterclasses', title: 'Masterclass Access', cost: '12 BEAM', beamCost: 12, category: 'Professional', phase: 1, status: 'live', description: 'Exclusive entry to intense artistic development workshops.', iconName: 'Award' },
    
    // Phase 2 (Coming Soon)
    { id: 'housing', title: 'Housing Credit', cost: 'Phase 2', beamCost: 50, category: 'Living', phase: 2, status: 'coming_soon', description: 'Direct credits toward residency and artist housing stipends.', iconName: 'Home' },
    { id: 'food', title: 'Food & Nutrition Access', cost: 'Phase 2', beamCost: 30, category: 'Living', phase: 2, status: 'coming_soon', description: 'Catered rehearsal meals and community partner grocery stipends.', iconName: 'Utensils' },
    { id: 'fleet', title: 'Fleet Transportation', cost: 'Phase 2', beamCost: 25, category: 'Mobility', phase: 2, status: 'coming_soon', description: 'Shuttle and fleet vehicle credits for tour & rehearsal commutes.', iconName: 'Truck' }
  ],
  progressionSteps: [
    { step: 1, title: 'Contribute', description: 'Participate in sectionals, full orchestra rehearsals, and live concert performances.' },
    { step: 2, title: 'Earn', description: 'Receive competitive USD stipends via direct transfer alongside BEAM Coin credits.' },
    { step: 3, title: 'Redeem', description: 'Exchange BEAM Coins for lessons, equipment, housing credits, and career infrastructure.' }
  ]
}
