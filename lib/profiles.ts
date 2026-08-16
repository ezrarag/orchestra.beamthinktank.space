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
import type { Profile, ProfileType } from '@/lib/types/profile'

const PROFILES_COLLECTION = 'profiles'

function normalizeProfile(id: string, data: DocumentData): Profile {
  return {
    id,
    name: String(data.name ?? ''),
    photoUrl: data.photoUrl ? String(data.photoUrl) : undefined,
    location: String(data.location ?? ''),
    contact: String(data.contact ?? ''),
    email: data.email ? String(data.email) : undefined,
    types: Array.isArray(data.types) ? (data.types as ProfileType[]) : [],

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

export async function deleteProfile(id: string): Promise<void> {
  if (!db) return
  const docRef = doc(db, PROFILES_COLLECTION, id)
  await deleteDoc(docRef)
}
