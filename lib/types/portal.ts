export type PortalPath =
  | '/home'
  | '/studio/recordings'
  | '/projects'
  | '/dashboard'
  | '/admin'
  | '/viewer'
  | '/viewer/book'
  | '/subscriber'
  | '/sign-in'
  | '/musician/select-project'
  | '/join/participant'
  | '/publishing/signup'

export interface HeroSlide {
  id: string
  title: string
  subtitle: string
  ctaLabel: string
  ctaPath: PortalPath
  imageSrc: string
  imageAlt: string
  audience?: 'all' | 'viewer' | 'participant_admin'
  videoUrl?: string
}

export interface ProjectSummary {
  id: string
  name: string
  summary: string
  status: 'Planning' | 'Active' | 'In Review'
  href: string
}

export interface SessionSummary {
  id: string
  title: string
  date: string
  location: string
  type: 'Recording' | 'Performance' | 'Workshop'
}

export interface CommitmentSummary {
  id: string
  title: string
  time: string
  location: string
}

export interface OpenCallSummary {
  id: string
  title: string
  details: string
  paid: boolean
}

export interface UserProfileSummary {
  name: string
  volunteerHours: number
  paidOpportunities: number
  institutionRole?: string
}

export interface AdminTableRow {
  id: string
  title: string
  owner: string
  status: string
  updatedAt: string
}

export interface NGOConfig {
  id: string
  displayName: string
  shortName: string
  description: string
  homeSlides: HeroSlide[]
  recordingSlides: HeroSlide[]
  projects: ProjectSummary[]
}
