import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Profile, ProfileType, CurrentLiveLocation } from '@/lib/types/profile'

const PROFILES_COLLECTION = 'profiles'

function normalizeProfile(id: string, data: DocumentData): Profile {
  const rawCoords = data.location_coordinates || data.locationCoordinates
  const rawInfra = data.infrastructure_needs || data.infrastructureNeeds
  const rawAffiliations = data.ensemble_affiliations || data.ensembleAffiliations

  const coords = rawCoords && typeof rawCoords === 'object' ? {
    lat: Number(rawCoords.lat ?? 0),
    lng: Number(rawCoords.lng ?? 0),
  } : undefined

  const infra = rawInfra && typeof rawInfra === 'object' ? {
    housing: Boolean(rawInfra.housing),
    flights_transport: Boolean(rawInfra.flights_transport ?? rawInfra.flightsTransport),
    flightsTransport: Boolean(rawInfra.flightsTransport ?? rawInfra.flights_transport),
    meals_per_diem: Boolean(rawInfra.meals_per_diem ?? rawInfra.mealsPerDiem),
    mealsPerDiem: Boolean(rawInfra.mealsPerDiem ?? rawInfra.meals_per_diem),
    equipment_details: rawInfra.equipment_details ? String(rawInfra.equipment_details) : rawInfra.equipmentDetails ? String(rawInfra.equipmentDetails) : undefined,
    equipmentDetails: rawInfra.equipmentDetails ? String(rawInfra.equipmentDetails) : rawInfra.equipment_details ? String(rawInfra.equipment_details) : undefined,
  } : undefined

  const willingnessToTravel = typeof data.willingness_to_travel === 'boolean' 
    ? data.willingness_to_travel 
    : typeof data.willingnessToTravel === 'boolean'
    ? data.willingnessToTravel
    : undefined

  const cityState = data.city_state ? String(data.city_state) : data.cityState ? String(data.cityState) : undefined
  const pipelineSource = data.pipeline_source ? String(data.pipeline_source) : data.pipelineSource ? String(data.pipelineSource) : undefined
  const ensembleAffiliations = Array.isArray(rawAffiliations) ? rawAffiliations.map(String) : undefined

  // Roaming & Active City Presence
  const rawRoaming = data.active_roaming_cities || data.activeRoamingCities
  const activeRoamingCities = Array.isArray(rawRoaming) ? rawRoaming.map(String) : undefined

  const rawLiveLoc = data.current_live_location || data.currentLiveLocation
  const currentLiveLocation: CurrentLiveLocation | undefined = rawLiveLoc && typeof rawLiveLoc === 'object' ? {
    cityState: String(rawLiveLoc.cityState || rawLiveLoc.city_state || ''),
    activeUntil: rawLiveLoc.activeUntil || rawLiveLoc.active_until ? String(rawLiveLoc.activeUntil || rawLiveLoc.active_until) : undefined,
    updatedAt: rawLiveLoc.updatedAt || rawLiveLoc.updated_at ? String(rawLiveLoc.updatedAt || rawLiveLoc.updated_at) : undefined,
  } : undefined

  return {
    id,
    name: String(data.name ?? ''),
    photoUrl: data.photoUrl ? String(data.photoUrl) : undefined,
    location: String(data.location ?? ''),
    contact: String(data.contact ?? ''),
    email: data.email ? String(data.email) : undefined,
    types: Array.isArray(data.types) ? (data.types as ProfileType[]) : [],

    // Location & Travel fields
    location_coordinates: coords,
    locationCoordinates: coords,
    city_state: cityState,
    cityState: cityState,
    willingness_to_travel: willingnessToTravel,
    willingnessToTravel: willingnessToTravel,

    // Multi-City Roaming & Presence
    active_roaming_cities: activeRoamingCities,
    activeRoamingCities: activeRoamingCities,
    current_live_location: currentLiveLocation,
    currentLiveLocation: currentLiveLocation,

    // Infrastructure Needs
    infrastructure_needs: infra,
    infrastructureNeeds: infra,

    // Pipeline Source & Ensemble Affiliations
    pipeline_source: pipelineSource,
    pipelineSource: pipelineSource,
    ensemble_affiliations: ensembleAffiliations,
    ensembleAffiliations: ensembleAffiliations,

    // Musician-specific fields
    instrument: data.instrument ? String(data.instrument) : undefined,
    section: data.section ? String(data.section) : undefined,
    musicianRoles: Array.isArray(data.musicianRoles) ? data.musicianRoles : undefined,

    // Professional-specific fields
    specialty: data.specialty ? String(data.specialty) : undefined,
    rate: typeof data.rate === 'number' ? data.rate : undefined,

    // Organization-specific fields
    city: data.city ? String(data.city) : undefined,
    budget: typeof data.budget === 'number' ? data.budget : undefined,
    rosterSize: typeof data.rosterSize === 'number' ? data.rosterSize : undefined,

    createdAt: data.createdAt ? String(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
  }
}

export async function getProfiles(): Promise<Profile[]> {
  if (!db) return []
  try {
    const querySnapshot = await getDocs(collection(db, PROFILES_COLLECTION))
    return querySnapshot.docs.map((doc) => normalizeProfile(doc.id, doc.data()))
  } catch (error) {
    console.error('Error fetching profiles:', error)
    return []
  }
}

export async function getProfilesByType(type: ProfileType): Promise<Profile[]> {
  if (!db) return []
  try {
    const q = query(collection(db, PROFILES_COLLECTION), where('types', 'array-contains', type))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => normalizeProfile(doc.id, doc.data()))
  } catch (error) {
    console.error(`Error fetching profiles of type ${type}:`, error)
    return []
  }
}

export async function getProfilesByPipelineSource(source: string): Promise<Profile[]> {
  if (!db) return []
  try {
    const q = query(collection(db, PROFILES_COLLECTION), where('pipeline_source', '==', source))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => normalizeProfile(doc.id, doc.data()))
  } catch (error) {
    console.error(`Error fetching profiles for pipeline source ${source}:`, error)
    return []
  }
}

export async function getProfileById(id: string): Promise<Profile | null> {
  if (!db) return null
  try {
    const docRef = doc(db, PROFILES_COLLECTION, id)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return normalizeProfile(docSnap.id, docSnap.data())
    }
    return null
  } catch (error) {
    console.error(`Error fetching profile ${id}:`, error)
    return null
  }
}

export async function upsertProfile(profile: Profile): Promise<void> {
  if (!db) return
  const id = profile.id
  const docRef = doc(db, PROFILES_COLLECTION, id)
  const data = {
    ...profile,
    updatedAt: new Date().toISOString(),
  }
  await setDoc(docRef, data, { merge: true })
}

export async function updateParticipantRoamingPresence(
  id: string,
  roamingCities: string[],
  currentLiveLoc?: CurrentLiveLocation
): Promise<void> {
  if (!db) return
  const docRef = doc(db, PROFILES_COLLECTION, id)
  const data = {
    active_roaming_cities: roamingCities,
    activeRoamingCities: roamingCities,
    current_live_location: currentLiveLoc || null,
    currentLiveLocation: currentLiveLoc || null,
    updatedAt: new Date().toISOString(),
  }
  await setDoc(docRef, data, { merge: true })
}

export async function deleteProfile(id: string): Promise<void> {
  if (!db) return
  const docRef = doc(db, PROFILES_COLLECTION, id)
  await deleteDoc(docRef)
}
