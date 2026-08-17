import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface RegionalNodeDoc {
  id: string
  name: string
  cityState: string
  coordinates: { lat: number; lng: number }
  facilityPartner: string
  projectAnchor: string
  status: 'Active' | 'Upcoming' | 'Planning'
  notes?: string
  updatedAt?: string
}

export const DEFAULT_REGIONAL_NODES: RegionalNodeDoc[] = [
  {
    id: 'node_milwaukee',
    name: 'Milwaukee Regional Node',
    cityState: 'Milwaukee, WI',
    coordinates: { lat: 43.0389, lng: -87.9065 },
    facilityPartner: 'Bradley Symphony Center & Milwaukee Youth Arts Center',
    projectAnchor: 'Black Diaspora Symphony Orchestra',
    status: 'Active',
    notes: 'Primary Midwest symphonic hub and recording center'
  },
  {
    id: 'node_concord',
    name: 'Concord Regional Node',
    cityState: 'Concord',
    coordinates: { lat: 43.2081, lng: -71.5376 },
    facilityPartner: 'Concord Arts Center',
    projectAnchor: 'Concord Symphony / Chamber Orchestra',
    status: 'Active',
    notes: 'Chamber orchestra project directed by Jamin Hoffman'
  },
  {
    id: 'node_orlando',
    name: 'Orlando Regional Node',
    cityState: 'Orlando, FL',
    coordinates: { lat: 28.5383, lng: -81.3792 },
    facilityPartner: 'Steinway Gallery Node — Orlando',
    projectAnchor: 'Florida Steinway Recordings & Dance Collaboration',
    status: 'Active',
    notes: 'Steinway grand recording and interdisciplinary dance project'
  },
  {
    id: 'node_tampa',
    name: 'Tampa Regional Node',
    cityState: 'Tampa, FL',
    coordinates: { lat: 27.9506, lng: -82.4572 },
    facilityPartner: 'Straz Center for the Performing Arts',
    projectAnchor: 'Tampa Bay Symphony Exchange',
    status: 'Active',
    notes: 'Gulf Coast performance & outreach node'
  },
  {
    id: 'node_atlanta',
    name: 'Atlanta Regional Node',
    cityState: 'Atlanta, GA',
    coordinates: { lat: 33.749, lng: -84.388 },
    facilityPartner: 'Atlanta Symphony Center Node',
    projectAnchor: 'Southeast Regional Talent Pipeline',
    status: 'Active',
    notes: 'Southeast talent pipeline hub for ASO / MYSO candidates'
  }
]

const SYSTEM_NODES_COLLECTION = 'system_nodes'

function normalizeRegionalNode(id: string, data: DocumentData): RegionalNodeDoc {
  return {
    id,
    name: String(data.name ?? id),
    cityState: String(data.cityState || data.city_state || 'Regional'),
    coordinates: data.coordinates && typeof data.coordinates === 'object' ? {
      lat: Number(data.coordinates.lat ?? 0),
      lng: Number(data.coordinates.lng ?? 0),
    } : { lat: 0, lng: 0 },
    facilityPartner: String(data.facilityPartner || data.facility_partner || 'Partner Venue'),
    projectAnchor: String(data.projectAnchor || data.project_anchor || 'BEAM Contract Project'),
    status: (data.status as RegionalNodeDoc['status']) || 'Active',
    notes: data.notes ? String(data.notes) : undefined,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
  }
}

export async function getRegionalNodes(): Promise<RegionalNodeDoc[]> {
  if (!db) return DEFAULT_REGIONAL_NODES
  try {
    const querySnapshot = await getDocs(collection(db, SYSTEM_NODES_COLLECTION))
    if (querySnapshot.empty) {
      return DEFAULT_REGIONAL_NODES
    }
    const list = querySnapshot.docs.map((docSnap) => normalizeRegionalNode(docSnap.id, docSnap.data()))
    return list
  } catch (error) {
    console.error('Error fetching regional nodes:', error)
    return DEFAULT_REGIONAL_NODES
  }
}

export async function upsertRegionalNode(node: RegionalNodeDoc): Promise<void> {
  if (!db) return
  const id = node.id || `node_${node.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
  const docRef = doc(db, SYSTEM_NODES_COLLECTION, id)
  const data = {
    ...node,
    id,
    updatedAt: new Date().toISOString(),
  }
  await setDoc(docRef, data, { merge: true })
}

export async function deleteRegionalNode(id: string): Promise<void> {
  if (!db) return
  const docRef = doc(db, SYSTEM_NODES_COLLECTION, id)
  await deleteDoc(docRef)
}
