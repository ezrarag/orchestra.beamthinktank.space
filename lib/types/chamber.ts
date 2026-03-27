import type { Timestamp } from 'firebase/firestore'

export type ChamberResearchSource = 'doaj' | 'europeana' | 'jstor' | 'hathitrust' | 'manual'

export type ChamberResearchRef = {
  id: string
  source: ChamberResearchSource
  title: string
  author?: string
  year?: string
  url: string
  excerpt?: string
  imageUrl?: string
  relevantTo?: string
  addedBy: string
  addedAt: Timestamp | null
}

export type ChamberWorkDocument = {
  id: string
  composerName?: string
  composerSlug: string
  workTitle: string
  workSlug: string
  description?: string
  imageUrl?: string
  researchRefs?: ChamberResearchRef[]
  createdAt?: Timestamp | null
  updatedAt?: Timestamp | null
}

export type ChamberWorkIdentitySource = {
  id?: string
  title?: string
  composer?: string
  composerName?: string
  composerSlug?: string
  workTitle?: string
  workSlug?: string
}
