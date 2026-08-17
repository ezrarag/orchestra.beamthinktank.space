import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export type RoleCategory = 'performance' | 'production' | 'craft_and_technical'

export interface SystemRoleDoc {
  id: string
  title: string
  category: RoleCategory
  description?: string
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export const DEFAULT_SYSTEM_ROLES: SystemRoleDoc[] = [
  // Performance
  { id: 'violin_1', title: 'Violin I', category: 'performance', description: 'Concertmaster & first violin section', active: true },
  { id: 'violin_2', title: 'Violin II', category: 'performance', description: 'Second violin section player', active: true },
  { id: 'viola', title: 'Viola', category: 'performance', description: 'Viola section instrumentalist', active: true },
  { id: 'cello', title: 'Cello', category: 'performance', description: 'Violoncello section instrumentalist', active: true },
  { id: 'double_bass', title: 'Double Bass', category: 'performance', description: 'Double bass / contrabass instrumentalist', active: true },
  { id: 'flute', title: 'Flute', category: 'performance', description: 'Principal & section flute / piccolo', active: true },
  { id: 'oboe', title: 'Oboe', category: 'performance', description: 'Oboe & English Horn', active: true },
  { id: 'clarinet', title: 'Clarinet', category: 'performance', description: 'Clarinet & Bass Clarinet', active: true },
  { id: 'bassoon', title: 'Bassoon', category: 'performance', description: 'Bassoon & Contrabassoon', active: true },
  { id: 'horn', title: 'French Horn', category: 'performance', description: 'French horn section', active: true },
  { id: 'trumpet', title: 'Trumpet', category: 'performance', description: 'Trumpet section', active: true },
  { id: 'trombone', title: 'Trombone', category: 'performance', description: 'Tenor & Bass Trombone', active: true },
  { id: 'tuba', title: 'Tuba', category: 'performance', description: 'Tuba instrumentalist', active: true },
  { id: 'timpani_percussion', title: 'Timpani & Percussion', category: 'performance', description: 'Timpani & orchestra percussion', active: true },
  { id: 'conductor', title: 'Conductor', category: 'performance', description: 'Music director & guest conductor', active: true },
  
  // Production
  { id: 'media_editor', title: 'Media Editor / Audio Mixer', category: 'production', description: 'Multi-track audio engineering & video post-production', active: true },
  { id: 'stage_manager', title: 'Stage Manager', category: 'production', description: 'Rehearsal logistics & stage ops', active: true },
  { id: 'content_producer', title: 'Content Producer', category: 'production', description: 'Documentary & digital media capture', active: true },

  // Craft & Technical
  { id: 'piano_technician', title: 'Piano Technician / Tuner', category: 'craft_and_technical', description: 'Concert grand tuning, voicing, and regulation', active: true },
  { id: 'acoustic_engineer', title: 'Acoustic Engineer', category: 'craft_and_technical', description: 'Hall acoustic modeling & sound reinforcement', active: true },
  { id: 'luthier', title: 'Luthier / Instrument Repair', category: 'craft_and_technical', description: 'String instrument restoration, setup, and maintenance', active: true },
  { id: 'orchestral_librarian', title: 'Orchestral Librarian', category: 'craft_and_technical', description: 'Score preparation, bowing management, and copyright clearance', active: true }
]

const SYSTEM_ROLES_COLLECTION = 'system_roles'

function normalizeSystemRole(id: string, data: DocumentData): SystemRoleDoc {
  return {
    id,
    title: String(data.title ?? id),
    category: (data.category as RoleCategory) || 'performance',
    description: data.description ? String(data.description) : undefined,
    active: typeof data.active === 'boolean' ? data.active : true,
    createdAt: data.createdAt ? String(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
  }
}

export async function getSystemRoles(): Promise<SystemRoleDoc[]> {
  if (!db) return DEFAULT_SYSTEM_ROLES
  try {
    const querySnapshot = await getDocs(collection(db, SYSTEM_ROLES_COLLECTION))
    if (querySnapshot.empty) {
      return DEFAULT_SYSTEM_ROLES
    }
    const list = querySnapshot.docs.map((docSnap) => normalizeSystemRole(docSnap.id, docSnap.data()))
    return list
  } catch (error) {
    console.error('Error fetching system roles:', error)
    return DEFAULT_SYSTEM_ROLES
  }
}

export async function upsertSystemRole(role: SystemRoleDoc): Promise<void> {
  if (!db) return
  const id = role.id || role.title.toLowerCase().replace(/[^a-z0-9]/g, '_')
  const docRef = doc(db, SYSTEM_ROLES_COLLECTION, id)
  const data = {
    ...role,
    id,
    updatedAt: new Date().toISOString(),
    createdAt: role.createdAt || new Date().toISOString(),
  }
  await setDoc(docRef, data, { merge: true })
}

export async function toggleSystemRoleActive(id: string, active: boolean): Promise<void> {
  if (!db) return
  const docRef = doc(db, SYSTEM_ROLES_COLLECTION, id)
  await setDoc(docRef, { active, updatedAt: new Date().toISOString() }, { merge: true })
}

export async function deleteSystemRole(id: string): Promise<void> {
  if (!db) return
  const docRef = doc(db, SYSTEM_ROLES_COLLECTION, id)
  await deleteDoc(docRef)
}
