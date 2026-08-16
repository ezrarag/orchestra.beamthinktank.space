export type ProfileType = 'musician' | 'professional' | 'organization'

export type MusicianRole = 'instrumentalist' | 'conductor' | 'composer' | 'arranger'

export interface Profile {
  id: string
  name: string
  photoUrl?: string
  location: string
  contact: string
  email?: string
  types: ProfileType[]

  // Musician-specific fields
  instrument?: string
  section?: string
  musicianRoles?: MusicianRole[]

  // Professional-specific fields
  specialty?: string
  rate?: number

  // Organization-specific fields
  city?: string
  budget?: number
  rosterSize?: number

  createdAt?: string
  updatedAt?: string
}
