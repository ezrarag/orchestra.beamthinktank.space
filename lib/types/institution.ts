export type InstitutionAccountStatus = 'pending' | 'active' | 'paused'

export type InstitutionProjectStatus = 'planning' | 'active' | 'completed' | 'paused'

export interface InstitutionContact {
  name: string
  email: string
  role?: string
  phone?: string
}

export interface InstitutionAccount {
  id: string
  name: string
  shortName: string
  status: InstitutionAccountStatus
  type: 'school' | 'venue' | 'nonprofit' | 'partner' | 'other'
  city?: string
  state?: string
  website?: string
  contactEmails: string[]
  emailDomains: string[]
  userIds: string[]
  projectIds: string[]
  contacts: InstitutionContact[]
  dashboardSummary?: string
  notes?: string
  createdAt?: unknown
  updatedAt?: unknown
}

export interface InstitutionMilestone {
  label: string
  status: 'pending' | 'in_progress' | 'complete'
  dueDate?: string
}

export interface InstitutionProject {
  id: string
  institutionId: string
  projectId: string
  title: string
  status: InstitutionProjectStatus
  summary: string
  location?: string
  performanceDate?: string
  rehearsalWindow?: string
  rosterTarget?: number
  confirmedMusicians?: number
  prospectCount?: number
  mediaCount?: number
  nextActions: string[]
  programHighlights: string[]
  milestones: InstitutionMilestone[]
  createdAt?: unknown
  updatedAt?: unknown
}

export interface InstitutionDashboardData {
  accounts: InstitutionAccount[]
  projects: InstitutionProject[]
}
