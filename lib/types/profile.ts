export type ProfileType = 'musician' | 'professional' | 'organization'

export type MusicianRole = 'instrumentalist' | 'conductor' | 'composer' | 'arranger'

export type PipelineSourceTag = 
  | 'MYSO Alumni' 
  | 'ASO Sub/Reject List' 
  | 'BDSO Core' 
  | 'Concord Candidate' 
  | string

export interface LocationCoordinates {
  lat: number
  lng: number
}

export interface InfrastructureNeeds {
  housing?: boolean
  flights_transport?: boolean
  flightsTransport?: boolean
  meals_per_diem?: boolean
  mealsPerDiem?: boolean
  equipment_details?: string
  equipmentDetails?: string
}

export interface Profile {
  id: string
  name: string
  photoUrl?: string
  location: string
  contact: string
  email?: string
  types: ProfileType[]

  // Location & Travel fields
  location_coordinates?: LocationCoordinates
  locationCoordinates?: LocationCoordinates
  city_state?: string
  cityState?: string
  willingness_to_travel?: boolean
  willingnessToTravel?: boolean

  // Infrastructure Needs (Wraparound support)
  infrastructure_needs?: InfrastructureNeeds
  infrastructureNeeds?: InfrastructureNeeds

  // Pipeline Source & Ensemble Affiliations
  pipeline_source?: PipelineSourceTag
  pipelineSource?: PipelineSourceTag
  ensemble_affiliations?: string[]
  ensembleAffiliations?: string[]

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
